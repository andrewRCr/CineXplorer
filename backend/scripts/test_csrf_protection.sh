#!/usr/bin/env bash
#
# CSRF Protection Validation Script
# Tests Django Ninja + Django CsrfViewMiddleware integration after bug fix
#
# Expected behavior after removing csrf=True from JWTCookieAuth:
# 1. Login/register endpoints (auth=None) work WITHOUT CSRF tokens ✓
# 2. Protected endpoints BLOCK requests WITHOUT CSRF tokens (403) ✓
# 3. Protected endpoints ACCEPT requests WITH valid CSRF tokens (200) ✓
#
# Usage: ./backend/scripts/test_csrf_protection.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
COOKIE_FILE=$(mktemp)
USERNAME_FILE=$(mktemp)

# Cleanup function - runs on script exit
cleanup() {
    rm -f "$COOKIE_FILE"

    # Delete test user if created
    if [[ -f "$USERNAME_FILE" ]]; then
        local username=$(cat "$USERNAME_FILE")
        if [[ -n "$username" ]]; then
            log_info "Cleaning up test user: ${username}"

            # Delete via Django shell (works in both Docker and host environments)
            local delete_cmd="from django.contrib.auth import get_user_model; User = get_user_model(); deleted = User.objects.filter(username='${username}').delete(); print(f'Deleted {deleted[0]} user(s)')"

            # Try Docker first (most common dev environment)
            if docker compose -f infrastructure/docker-compose.yml exec -T backend python manage.py shell -c "$delete_cmd" 2>/dev/null; then
                log_success "Test user deleted via Docker"
            # Fallback to host venv if Docker not available
            elif [[ -f "../.venv-backend/bin/python" ]]; then
                cd backend && ../.venv-backend/bin/python manage.py shell -c "$delete_cmd" && cd .. && log_success "Test user deleted via host venv"
            else
                log_info "Could not delete test user automatically (Docker/venv not available)"
                log_info "  Manual cleanup: User.objects.filter(username='${username}').delete()"
            fi
        fi
        rm -f "$USERNAME_FILE"
    fi
}

trap cleanup EXIT

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_section() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW} $1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Test setup: Create test user and login
setup_test_user() {
    local username="csrf_test_$(date +%s)"
    local password="testpass123"
    local email="${username}@test.local"

    log_section "Setup: Creating Test User"

    # Register test user
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_BASE_URL}/api/register/" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"email\":\"${email}\"}")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        log_success "Test user created: ${username}"
    else
        log_error "Failed to create test user (HTTP ${http_code})"
        echo "Response: $body"
        exit 1
    fi

    # Login to get JWT cookies
    response=$(curl -s -w "\n%{http_code}" -c "$COOKIE_FILE" -X POST \
        "${API_BASE_URL}/api/token/" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"password\":\"${password}\"}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "200" ]]; then
        log_success "Successfully logged in (JWT cookies stored)"
    else
        log_error "Failed to login (HTTP ${http_code})"
        echo "Response: $body"
        exit 1
    fi

    # Save username for cleanup
    echo "$username" > "$USERNAME_FILE"
}

# Test 1: Login endpoint works WITHOUT CSRF token (auth=None)
test_login_without_csrf() {
    log_section "Test 1: Login Endpoint (auth=None) Works Without CSRF"

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_BASE_URL}/api/token/" \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","password":"wrongpass"}')

    local http_code=$(echo "$response" | tail -n1)

    # Should get 401 (wrong credentials) NOT 403 (CSRF failure)
    if [[ "$http_code" == "401" ]]; then
        log_success "Login endpoint accessible without CSRF token (HTTP 401 - wrong credentials)"
        log_info "  ✓ CSRF protection correctly exempts auth=None endpoints"
    elif [[ "$http_code" == "403" ]]; then
        log_error "Login endpoint blocked by CSRF (HTTP 403)"
        log_info "  ✗ auth=None endpoints should be CSRF-exempt"
    else
        log_error "Unexpected status code: HTTP ${http_code}"
    fi
}

# Test 2: Get CSRF token from endpoint
get_csrf_token() {
    log_section "Test 2: Get CSRF Token from /api/csrf/"

    local response=$(curl -s -w "\n%{http_code}" -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
        "${API_BASE_URL}/api/csrf/")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "200" ]]; then
        CSRF_TOKEN=$(echo "$body" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
        if [[ -n "$CSRF_TOKEN" ]]; then
            log_success "CSRF token retrieved: ${CSRF_TOKEN:0:20}..."
            log_info "  Cookie file: $COOKIE_FILE"

            # Verify csrftoken cookie was set
            if grep -q "csrftoken" "$COOKIE_FILE"; then
                log_success "csrftoken cookie set in cookie file"
            else
                log_error "csrftoken cookie NOT found in cookie file"
            fi
        else
            log_error "CSRF token not found in response body"
            echo "Response: $body"
        fi
    else
        log_error "Failed to get CSRF token (HTTP ${http_code})"
        echo "Response: $body"
    fi
}

# Test 3: Protected endpoint BLOCKS request WITHOUT CSRF token
test_protected_without_csrf() {
    log_section "Test 3: Protected Endpoint Blocks Request WITHOUT CSRF Token"

    local response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X PATCH \
        "${API_BASE_URL}/api/profile/" \
        -H "Content-Type: application/json" \
        -d '{"first_name":"Test"}')

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "403" ]]; then
        log_success "Protected endpoint correctly blocked without CSRF token (HTTP 403)"
        log_info "  ✓ Django CsrfViewMiddleware is active and enforcing CSRF"

        # Check for CSRF-specific error message
        if echo "$body" | grep -qi "csrf"; then
            log_success "Response contains CSRF error message"
        fi
    else
        log_error "Protected endpoint NOT blocked without CSRF (HTTP ${http_code})"
        log_info "  ✗ Expected HTTP 403 (CSRF verification failed)"
        echo "Response: $body"
    fi
}

# Test 4: Protected endpoint ACCEPTS request WITH valid CSRF token
test_protected_with_csrf() {
    log_section "Test 4: Protected Endpoint Accepts Request WITH Valid CSRF Token"

    if [[ -z "${CSRF_TOKEN:-}" ]]; then
        log_error "No CSRF token available (Test 2 must run first)"
        return 1
    fi

    local response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X PATCH \
        "${API_BASE_URL}/api/profile/" \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: ${CSRF_TOKEN}" \
        -d '{"first_name":"CSRF Test User"}')

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "200" ]]; then
        log_success "Protected endpoint accepted request with valid CSRF token (HTTP 200)"
        log_info "  ✓ Django Ninja + Django CSRF integration working correctly"

        # Verify the update was applied
        if echo "$body" | grep -q "CSRF Test User"; then
            log_success "Profile update applied successfully"
        fi
    else
        log_error "Protected endpoint rejected valid CSRF token (HTTP ${http_code})"
        log_info "  ✗ Expected HTTP 200 (successful request)"
        echo "Response: $body"

        # Provide debugging info
        if [[ "$http_code" == "403" ]]; then
            log_info "  Debugging: CSRF token may be invalid or header name incorrect"
            log_info "  Token sent: ${CSRF_TOKEN:0:30}..."
            log_info "  Header used: X-CSRFToken"
        fi
    fi
}

# Test 5: Verify CSRF token in cookie matches header requirement
test_csrf_cookie_header_match() {
    log_section "Test 5: Verify CSRF Cookie/Header Integration"

    # Extract csrftoken cookie value
    local cookie_value=$(grep -o 'csrftoken[[:space:]]*[^[:space:]]*' "$COOKIE_FILE" | awk '{print $NF}')

    if [[ -n "$cookie_value" ]]; then
        log_success "csrftoken cookie value: ${cookie_value:0:30}..."

        if [[ "$cookie_value" == "$CSRF_TOKEN" ]]; then
            log_success "CSRF token matches cookie value (correct)"
        else
            log_error "CSRF token does NOT match cookie value"
            log_info "  Cookie: ${cookie_value:0:30}..."
            log_info "  Token:  ${CSRF_TOKEN:0:30}..."
        fi
    else
        log_error "Could not extract csrftoken cookie value"
    fi
}

# Test 6: Test with wrong CSRF token (should fail)
test_protected_with_wrong_csrf() {
    log_section "Test 6: Protected Endpoint Rejects Invalid CSRF Token"

    local fake_token="invalid-csrf-token-12345"

    local response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X PATCH \
        "${API_BASE_URL}/api/profile/" \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: ${fake_token}" \
        -d '{"first_name":"Should Fail"}')

    local http_code=$(echo "$response" | tail -n1)

    if [[ "$http_code" == "403" ]]; then
        log_success "Protected endpoint correctly rejected invalid CSRF token (HTTP 403)"
        log_info "  ✓ CSRF validation is working properly"
    else
        log_error "Protected endpoint accepted invalid CSRF token (HTTP ${http_code})"
        log_info "  ✗ This is a security vulnerability"
    fi
}

# Main test execution
main() {
    log_section "CSRF Protection Test Suite"
    log_info "Testing Django Ninja + Django CsrfViewMiddleware integration"
    log_info "Base URL: ${API_BASE_URL}"
    log_info ""
    log_info "Expected behavior after bug fix:"
    log_info "  • auth=None endpoints work without CSRF"
    log_info "  • Protected endpoints block requests without CSRF (403)"
    log_info "  • Protected endpoints accept valid CSRF tokens (200)"

    # Run setup
    setup_test_user

    # Run tests
    test_login_without_csrf
    get_csrf_token
    test_protected_without_csrf
    test_protected_with_csrf
    test_csrf_cookie_header_match
    test_protected_with_wrong_csrf

    # Summary
    log_section "Test Summary"
    echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All CSRF protection tests passed! ✓"
        log_info ""
        log_info "Django Ninja CSRF integration is working correctly:"
        log_info "  ✓ csrf=True parameter removed (bug #1464 avoided)"
        log_info "  ✓ Django Ninja auto-detection enabled"
        log_info "  ✓ Django CsrfViewMiddleware handling validation"
        log_info "  ✓ auth=None endpoints properly exempt"
        log_info "  ✓ Protected endpoints enforcing CSRF"
        exit 0
    else
        log_error "Some tests failed - CSRF integration has issues"
        log_info ""
        log_info "Troubleshooting steps:"
        log_info "  1. Verify CsrfViewMiddleware is enabled in settings.py"
        log_info "  2. Ensure csrf=True is NOT passed to JWTCookieAuth.__init__()"
        log_info "  3. Check that /api/csrf/ uses Django's get_token()"
        log_info "  4. Verify frontend sends X-CSRFToken header (not X-XSRF-TOKEN)"
        exit 1
    fi
}

# Run tests
main
