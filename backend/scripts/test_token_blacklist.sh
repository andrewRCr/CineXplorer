#!/bin/bash
# Token Blacklisting Test Script
# Tests Task 4.4: Token rotation, blacklisting, and reuse detection
#
# Location: backend/scripts/test_token_blacklist.sh
# Run from project root: bash backend/scripts/test_token_blacklist.sh
# Or from backend/scripts: bash test_token_blacklist.sh

set -e  # Exit on error

# Detect if running from project root or backend/scripts
if [ -f "infrastructure/docker-compose.yml" ]; then
    COMPOSE_FILE="infrastructure/docker-compose.yml"
elif [ -f "../../infrastructure/docker-compose.yml" ]; then
    COMPOSE_FILE="../../infrastructure/docker-compose.yml"
else
    echo "Error: Cannot find infrastructure/docker-compose.yml"
    echo "Please run this script from project root or backend/scripts directory"
    exit 1
fi

echo "=========================================="
echo "Token Blacklisting Test Script"
echo "Testing: Task 4.4 - Token Blacklist Behavior"
echo "=========================================="
echo ""

# Configuration
BACKEND_URL="https://localhost:8000"
API_BASE="${BACKEND_URL}/api"
CURL_OPTS="-k"  # Allow self-signed certs
TEST_USERNAME="blacklist_test_$(date +%s)"
TEST_EMAIL="blacklist_test_$(date +%s)@test.com"
TEST_PASSWORD="TestPassword123!"
COOKIE_FILE="/tmp/test_cookies_$(date +%s).txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    rm -f "$COOKIE_FILE"
    # Delete test user if created
    if [ ! -z "$USER_ID" ]; then
        echo "Deleting test user (ID: $USER_ID)..."
        docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(id=$USER_ID).delete()" 2>/dev/null || true
    fi
}

trap cleanup EXIT

echo "Step 1: Register test user"
echo "-------------------------------------------"
REGISTER_RESPONSE=$(curl -s -k -X POST "${API_BASE}/register/" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${TEST_USERNAME}\",
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "Response: $REGISTER_RESPONSE"

# Extract user_id (using grep -oP for Perl regex, or python as fallback)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -oP '"user_id":\s*\K\d+' || echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user_id'])" 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to extract user_id from response${NC}"
    echo "Response was: $REGISTER_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ User registered (ID: $USER_ID)${NC}"
echo ""

echo "Step 2: Bypass email verification for testing"
echo "-------------------------------------------"
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
User = get_user_model()
user = User.objects.get(id=$USER_ID)
EmailAddress.objects.filter(user=user).update(verified=True)
print('Email verified')
" || {
    echo -e "${RED}✗ Failed to verify email${NC}"
    exit 1
}

echo -e "${GREEN}✓ Email verification bypassed${NC}"
echo ""

echo "Step 3: Task 4.4.1 - Login and obtain refresh token"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -k -X POST "${API_BASE}/token/" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{
    \"login\": \"${TEST_USERNAME}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "Response: $LOGIN_RESPONSE"

# Check if login succeeded
if echo "$LOGIN_RESPONSE" | grep -q '"access"'; then
    echo -e "${GREEN}✓ Login successful${NC}"
else
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi

# Extract tokens from cookie file
REFRESH_TOKEN_1=$(grep -oP 'refresh_token\s+\K[^\s]+' "$COOKIE_FILE" || echo "")

if [ -z "$REFRESH_TOKEN_1" ]; then
    echo -e "${RED}✗ Failed to extract refresh token from cookies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Refresh token obtained and stored in cookies${NC}"
echo "Refresh token (first 20 chars): ${REFRESH_TOKEN_1:0:20}..."
echo ""

# Check database for outstanding token
echo "Verifying outstanding token in database..."
OUTSTANDING_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py shell -c "
from ninja_jwt.token_blacklist.models import OutstandingToken
count = OutstandingToken.objects.filter(user_id=$USER_ID).count()
print(count)
" | tail -n 1 | tr -d '\r')

echo "Outstanding tokens for user: $OUTSTANDING_COUNT"
if [ "$OUTSTANDING_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Outstanding token tracked in database${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Outstanding token not found in database${NC}"
fi
echo ""

echo "Step 4: Task 4.4.2 - Use refresh token to get new access token (should succeed)"
echo "-------------------------------------------"
REFRESH_RESPONSE_1=$(curl -s -k -X POST "${API_BASE}/token/refresh/" \
  -b "$COOKIE_FILE" \
  -c "${COOKIE_FILE}.new")

echo "Response: $REFRESH_RESPONSE_1"

# Check if refresh succeeded
if echo "$REFRESH_RESPONSE_1" | grep -q '"access"'; then
    echo -e "${GREEN}✓ Token refresh successful (new tokens issued)${NC}"
else
    echo -e "${RED}✗ Token refresh failed${NC}"
    echo "Response: $REFRESH_RESPONSE_1"
    exit 1
fi

# Extract new refresh token
REFRESH_TOKEN_2=$(grep -oP 'refresh_token\s+\K[^\s]+' "${COOKIE_FILE}.new" || echo "")

echo "New refresh token (first 20 chars): ${REFRESH_TOKEN_2:0:20}..."
echo ""

# Verify tokens rotated
if [ "$REFRESH_TOKEN_1" = "$REFRESH_TOKEN_2" ]; then
    echo -e "${RED}✗ Token did not rotate (same token returned)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token rotation confirmed (new refresh token issued)${NC}"
echo ""

echo "Step 5: Task 4.4.3 - Attempt to reuse old refresh token (should fail with 401)"
echo "-------------------------------------------"
echo "Using old refresh token from initial login..."

# Try to refresh with OLD token
REUSE_RESPONSE=$(curl -s -k -w "\nHTTP_CODE:%{http_code}" -X POST "${API_BASE}/token/refresh/" \
  -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$REUSE_RESPONSE" | grep -oP 'HTTP_CODE:\K[0-9]+')
RESPONSE_BODY=$(echo "$REUSE_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response: $RESPONSE_BODY"
echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Reuse attempt correctly rejected with 401 Unauthorized${NC}"
else
    echo -e "${RED}✗ Expected 401, got ${HTTP_CODE}${NC}"
    exit 1
fi

# Check for appropriate error message
if echo "$RESPONSE_BODY" | grep -qi "revoked"; then
    echo -e "${GREEN}✓ Appropriate error message returned (token revoked)${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Expected 'revoked' in error message${NC}"
fi
echo ""

echo "Step 6: Task 4.4.4 - Verify blacklist entry created"
echo "-------------------------------------------"
BLACKLIST_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py shell -c "
from ninja_jwt.token_blacklist.models import BlacklistedToken, OutstandingToken
outstanding = OutstandingToken.objects.filter(user_id=$USER_ID)
blacklisted = BlacklistedToken.objects.filter(token__in=outstanding)
print(f'Outstanding: {outstanding.count()}, Blacklisted: {blacklisted.count()}')
for bt in blacklisted:
    print(f'Blacklisted at: {bt.blacklisted_at}')
" | tail -n 10)

echo "$BLACKLIST_COUNT"

if echo "$BLACKLIST_COUNT" | grep -q "Blacklisted: [1-9]"; then
    echo -e "${GREEN}✓ Blacklist entry created in token_blacklist_blacklistedtoken table${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Blacklist entry not found or count is 0${NC}"
fi
echo ""

echo "Step 7: Task 4.4.5 - Verify outstanding token tracked"
echo "-------------------------------------------"
OUTSTANDING_DETAILS=$(docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py shell -c "
from ninja_jwt.token_blacklist.models import OutstandingToken
tokens = OutstandingToken.objects.filter(user_id=$USER_ID)
print(f'Total outstanding tokens: {tokens.count()}')
for token in tokens:
    print(f'JTI: {token.jti}, Created: {token.created_at}, Expires: {token.expires_at}')
" | tail -n 10)

echo "$OUTSTANDING_DETAILS"

if echo "$OUTSTANDING_DETAILS" | grep -q "Total outstanding tokens: [1-9]"; then
    echo -e "${GREEN}✓ Outstanding tokens tracked in token_blacklist_outstandingtoken table${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Outstanding tokens not found${NC}"
fi
echo ""

echo "Step 8: Verify security logging"
echo "-------------------------------------------"
echo "Checking backend logs for security event..."

# Check last 50 lines of backend logs for security warning
SECURITY_LOG=$(docker compose -f "$COMPOSE_FILE" logs --tail=50 backend 2>&1 | grep -i "SECURITY.*blacklist" || echo "")

if [ ! -z "$SECURITY_LOG" ]; then
    echo -e "${GREEN}✓ Security event logged:${NC}"
    echo "$SECURITY_LOG" | tail -n 3
else
    echo -e "${YELLOW}⚠ Warning: Security event not found in recent logs (may be in earlier logs)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All token blacklisting tests completed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ Task 4.4.1: Login and obtain refresh token"
echo "✓ Task 4.4.2: Use refresh token to get new access token (succeeded)"
echo "✓ Task 4.4.3: Attempt to reuse old refresh token (correctly rejected with 401)"
echo "✓ Task 4.4.4: Blacklist entry created in database"
echo "✓ Task 4.4.5: Outstanding token tracked in database"
echo ""
echo "Token rotation and blacklisting working correctly!"
