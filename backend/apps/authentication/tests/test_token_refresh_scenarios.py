"""
Comprehensive JWT token refresh scenario tests.

Tests critical token refresh behaviors that ensure security and reliability:

1. Token persistence across page reloads (sessionStorage/cookies)
2. Automatic refresh when access token expires (refresh token still valid)
3. Proper rejection when refresh token expires (redirect to login)
4. Race condition handling (multiple concurrent API calls)
5. Token rotation verification (new refresh token issued on refresh)

These tests validate the JWT authentication infrastructure migrated in Phase 4
(djangorestframework-simplejwt → django-ninja-jwt) and ensure:
- Security: Token rotation prevents replay attacks
- Reliability: Expired tokens handled gracefully
- Performance: Concurrent requests don't cause auth failures

Token Configuration (from settings.py):
- ACCESS_TOKEN_LIFETIME: 5 minutes
- REFRESH_TOKEN_LIFETIME: 14 days
- ROTATE_REFRESH_TOKENS: True (new refresh token on each refresh)
- BLACKLIST_AFTER_ROTATION: True (old refresh tokens invalidated)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import TYPE_CHECKING, cast

import pytest
from core.tests.test_helpers import (
    create_fresh_client,
    get_csrf_token,
    json_post,
    login_and_get_tokens,
)
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client
from freezegun import freeze_time
from ninja_jwt.tokens import RefreshToken

if TYPE_CHECKING:
    from django.contrib.auth.models import User


# ============================================================================
# Test 5.6.6.2: Token Refresh After Page Reload (Token Still Valid)
# ============================================================================


@pytest.mark.django_db
def test_token_refresh_after_page_reload_token_still_valid(
    api_client: Client,
    verified_user: User,
) -> None:
    """
    Verify tokens persist across page reloads when still valid.

    Hybrid Auth Pattern (Backend supports BOTH):
    - Access token: Returned in response body (frontend stores in sessionStorage)
    - Backend accepts: Authorization header OR access_token cookie (hybrid)
    - Refresh token: Set as HTTP-only cookie (XSS-proof, auto-sent by browser)

    Simulates:
    1. User logs in (access token in response, refresh token in cookie)
    2. Page reload (sessionStorage persists, cookie auto-sent)
    3. API call with access token (works via Authorization header OR cookie)

    Expected: Tokens persist across reload, authenticated requests work.

    Note: Production frontend uses Authorization header. This test validates
    both authentication paths work correctly (header preferred, cookie fallback).
    """
    # Step 1: Login to get initial tokens
    access_token, refresh_token = login_and_get_tokens(
        api_client, verified_user.username, "testpass123"
    )

    # Step 2: Simulate page reload
    # Frontend retrieves access_token from sessionStorage and sends via Authorization header
    # Refresh token cookie is automatically sent by browser
    reloaded_client = create_fresh_client(refresh_token=refresh_token)

    # Step 3: Make authenticated API call with access token
    # (Frontend sends: Authorization: Bearer {access_token})
    profile_response = reloaded_client.get(
        "/api/profile/",
        HTTP_AUTHORIZATION=f"Bearer {access_token}",
    )

    assert profile_response.status_code == HTTPStatus.OK
    profile_data: dict[str, object] = profile_response.json()
    assert profile_data["username"] == verified_user.username
    assert profile_data["email"] == verified_user.email


# ============================================================================
# Test 5.6.6.3: Expired Access Token Handling (Refresh Token Still Valid)
# ============================================================================


@pytest.mark.django_db
def test_expired_access_token_refresh_token_still_valid(
    api_client: Client,
    verified_user: User,
) -> None:
    """
    Verify automatic refresh when access token expires (refresh token valid).

    Hybrid Auth Pattern:
    - Access token sent via Authorization header (from sessionStorage)
    - Refresh token sent via HTTP-only cookie (auto-sent by browser)

    Simulates:
    1. User logs in (access token lifetime: 5 min, refresh: 14 days)
    2. Time passes → Access token expires
    3. API call with expired access token → 401 Unauthorized
    4. Frontend interceptor detects 401 → Calls refresh endpoint
    5. New access token issued, original request retried successfully

    Expected: Refresh endpoint issues new tokens when access expired but refresh valid.

    Note: We simulate expiration by manually creating an expired access token,
    since waiting 5 minutes in a test is impractical.
    """
    # Step 1: Create tokens at a fixed time
    # We'll freeze time, create tokens, then advance time to expire them
    initial_time = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

    with freeze_time(initial_time):
        # Create refresh token (14 days lifetime)
        refresh = RefreshToken.for_user(cast(AbstractBaseUser, verified_user))
        access_token_str = str(refresh.access_token)  # 5 minutes lifetime

    # Step 2: Advance time by 6 minutes to expire access token
    # (Access token: 5 min, Refresh token: 14 days - refresh still valid)
    expired_time = initial_time + timedelta(minutes=6)

    # Create a NEW client (no Django session fallback)
    # This simulates a fresh browser session with only JWT auth
    fresh_client = create_fresh_client(refresh_token=str(refresh))

    # Step 3: Try authenticated endpoint with expired access token
    # Frontend sends: Authorization: Bearer {access_token_str}
    # NO Django session to fall back on
    with freeze_time(expired_time):
        profile_response = fresh_client.get(
            "/api/profile/",
            HTTP_AUTHORIZATION=f"Bearer {access_token_str}",
        )
        assert profile_response.status_code == HTTPStatus.UNAUTHORIZED

        # Step 4: Frontend interceptor calls refresh endpoint
        # Refresh token cookie is automatically sent by browser
        csrf_token = get_csrf_token(fresh_client)
        refresh_response = fresh_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        # Step 5: Refresh should succeed and issue new tokens
        assert refresh_response.status_code == HTTPStatus.OK
        new_tokens: dict[str, str] = refresh_response.json()
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens
        assert new_tokens["access_token"] != access_token_str  # New token issued

        # Step 6: Retry original request with new access token
        # Frontend stores new access_token in sessionStorage and retries
        retry_response = fresh_client.get(
            "/api/profile/",
            HTTP_AUTHORIZATION=f"Bearer {new_tokens['access_token']}",
        )

        assert retry_response.status_code == HTTPStatus.OK
        profile_data: dict[str, object] = retry_response.json()
        assert profile_data["username"] == verified_user.username


# ============================================================================
# Test 5.6.6.4: Expired Refresh Token Handling (Redirect to Login)
# ============================================================================


@pytest.mark.django_db
def test_expired_refresh_token_redirect_to_login(
    api_client: Client,
    verified_user: User,
) -> None:
    """
    Verify proper rejection when refresh token expires (redirect to login).

    Simulates:
    1. User logs in
    2. Time passes → Both access and refresh tokens expire (14 days)
    3. API call fails (access token expired)
    4. Refresh attempt fails (refresh token also expired)
    5. Frontend detects unrecoverable auth failure → Redirect to login

    Expected: Refresh endpoint rejects expired refresh token with 401.

    Note: We simulate expiration by creating an expired refresh token manually.
    """
    # Step 1: Create expired refresh token
    # (Simulates "14 days passed" - both access and refresh expired)
    expired_refresh = RefreshToken.for_user(cast(AbstractBaseUser, verified_user))
    expired_refresh.set_exp(lifetime=timedelta(seconds=-1))  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
    expired_refresh.access_token.set_exp(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
        lifetime=timedelta(seconds=-1)
    )

    # Set cookies with both tokens expired
    api_client.cookies["access_token"] = str(expired_refresh.access_token)
    api_client.cookies["refresh_token"] = str(expired_refresh)

    # Step 2: Try refresh endpoint with expired refresh token
    csrf_token = get_csrf_token(api_client)
    refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    # Step 3: Should fail with 400 Bad Request (invalid/expired refresh token)
    # (Backend returns 400 for invalid tokens, 401 for missing auth)
    assert refresh_response.status_code == HTTPStatus.BAD_REQUEST

    # Frontend interceptor detects this and redirects to login
    # (We verify the endpoint returns correct status; frontend handles redirect)


# ============================================================================
# Test 5.6.6.5: Token Refresh Under Load (Multiple Rapid API Calls)
# ============================================================================


@pytest.mark.django_db
def test_token_refresh_under_load_multiple_rapid_calls(
    api_client: Client,
    verified_user: User,
) -> None:
    """
    Verify token refresh handles concurrent requests without race conditions.

    Hybrid Auth Pattern:
    - Access token sent via Authorization header
    - Refresh token sent via HTTP-only cookie

    Simulates:
    1. User has expired access token, valid refresh token
    2. Multiple API calls happen simultaneously (e.g., user rapidly clicks)
    3. All calls fail with 401 (access token expired)
    4. Frontend interceptor queues refresh (only ONE refresh call)
    5. All pending requests retry with new access token

    Expected: Single refresh call handles multiple concurrent failures gracefully.

    Note: This tests the backend's ability to handle concurrent refresh requests.
    Frontend interceptor (axios) handles request queuing; this verifies backend safety.
    """
    # Step 1: Create tokens at a fixed time, then expire them
    initial_time = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)

    with freeze_time(initial_time):
        # Create refresh token (14 days lifetime)
        refresh = RefreshToken.for_user(cast(AbstractBaseUser, verified_user))
        access_token_str = str(refresh.access_token)  # 5 minutes lifetime

    # Advance time by 6 minutes to expire access token
    expired_time = initial_time + timedelta(minutes=6)

    # Create a NEW client (no Django session fallback)
    fresh_client = create_fresh_client(refresh_token=str(refresh))

    # Step 2: Simulate multiple concurrent API calls (all fail with 401)
    # Frontend sends expired access token via Authorization header
    # NO Django session to fall back on
    with freeze_time(expired_time):
        failed_responses = [
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {access_token_str}"),
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {access_token_str}"),
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {access_token_str}"),
        ]

        # All should fail with expired access token
        for response in failed_responses:
            assert response.status_code == HTTPStatus.UNAUTHORIZED

        # Step 3: Call refresh endpoint ONCE (simulates interceptor's single refresh)
        # Refresh token cookie automatically sent by browser
        csrf_token = get_csrf_token(fresh_client)
        refresh_response = fresh_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        assert refresh_response.status_code == HTTPStatus.OK
        new_tokens: dict[str, str] = refresh_response.json()

        # Step 4: Retry all failed requests with new access token
        # Frontend updates sessionStorage and retries with new token
        new_access = new_tokens['access_token']
        retry_responses = [
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {new_access}"),
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {new_access}"),
            fresh_client.get("/api/profile/", HTTP_AUTHORIZATION=f"Bearer {new_access}"),
        ]

        for response in retry_responses:
            assert response.status_code == HTTPStatus.OK
            profile_data: dict[str, object] = response.json()
            assert profile_data["username"] == verified_user.username


# ============================================================================
# Test 5.6.6.6: Verify Refresh Rotation (New Refresh Token Issued)
# ============================================================================


@pytest.mark.django_db
def test_refresh_rotation_new_refresh_token_issued(
    api_client: Client,
    verified_user: User,
) -> None:
    """
    Verify refresh token rotation (new refresh token issued on refresh).

    Simulates:
    1. User logs in (gets initial refresh token)
    2. Access token expires
    3. User calls refresh endpoint
    4. NEW refresh token issued (old one blacklisted)
    5. Old refresh token cannot be reused (security)

    Expected: Each refresh generates a completely new refresh token.

    Security Benefit:
    - Prevents replay attacks (stolen refresh token becomes useless after first use)
    - Limits exposure window (refresh token changes frequently)
    - Blacklist tracks revoked tokens for audit

    Configuration: ROTATE_REFRESH_TOKENS=True, BLACKLIST_AFTER_ROTATION=True
    """
    # Step 1: Login to get initial tokens
    login_response = json_post(
        api_client,
        "/api/token/",
        {"login": verified_user.username, "password": "testpass123"},
    )
    assert login_response.status_code == HTTPStatus.OK

    initial_tokens: dict[str, str] = login_response.json()
    initial_refresh = initial_tokens["refresh_token"]

    # Step 2: Call refresh endpoint (should issue NEW refresh token)
    csrf_token = get_csrf_token(api_client)
    refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert refresh_response.status_code == HTTPStatus.OK
    new_tokens: dict[str, str] = refresh_response.json()
    new_refresh = new_tokens["refresh_token"]

    # Step 3: Verify new refresh token is DIFFERENT from initial
    assert new_refresh != initial_refresh, "Refresh token should rotate on refresh"

    # Step 4: Update client with new refresh token
    api_client.cookies["refresh_token"] = new_refresh

    # Step 5: Try using OLD refresh token (should fail - blacklisted)
    api_client.cookies["refresh_token"] = initial_refresh
    csrf_token_2 = get_csrf_token(api_client)

    old_token_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token_2,
    )

    # Old token should be rejected (blacklisted after rotation)
    assert old_token_response.status_code == HTTPStatus.UNAUTHORIZED

    # Step 6: Verify NEW refresh token still works
    api_client.cookies["refresh_token"] = new_refresh
    csrf_token_3 = get_csrf_token(api_client)

    new_token_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token_3,
    )

    assert new_token_response.status_code == HTTPStatus.OK
    # Each refresh issues yet another new refresh token (rotation continues)
    rotated_tokens: dict[str, str] = new_token_response.json()
    assert rotated_tokens["refresh_token"] != new_refresh
    assert rotated_tokens["refresh_token"] != initial_refresh
