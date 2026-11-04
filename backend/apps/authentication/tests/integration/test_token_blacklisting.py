"""
Token blacklisting tests for authentication endpoints.

Tests the token rotation and blacklisting implementation from Task 4:
- Token refresh succeeds on first use (rotation generates new tokens)
- Old refresh token is blacklisted after rotation
- Reusing old token returns 401 with "revoked" error message
- New refresh token continues to work after old one blacklisted
- Blacklist database tables track revoked and outstanding tokens

Token rotation security (BLACKLIST_AFTER_ROTATION):
- Each refresh generates a completely new refresh token
- Old refresh token is automatically blacklisted
- Prevents token reuse attacks (stolen token detection)
- Outstanding tokens table tracks all issued tokens for audit
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING

import pytest
from ninja_jwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.core.tests.test_helpers import get_csrf_token

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# Token Rotation Flow Tests
# ============================================================================


@pytest.mark.django_db
def test_first_token_refresh_succeeds(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that first token refresh succeeds and issues new tokens."""
    # Login to get initial refresh token
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK

    # Extract initial tokens from response
    initial_tokens = login_response.json()
    initial_access = initial_tokens["access_token"]
    initial_refresh = initial_tokens["refresh_token"]

    # Get CSRF token for refresh endpoint
    csrf_token = get_csrf_token(api_client)

    # Refresh token - should succeed
    refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert refresh_response.status_code == HTTPStatus.OK

    # Verify new tokens issued
    new_tokens = refresh_response.json()
    new_access = new_tokens["access_token"]
    new_refresh = new_tokens["refresh_token"]

    # New tokens should be different from initial tokens
    assert new_access != initial_access, "Access token should be rotated"
    assert new_refresh != initial_refresh, "Refresh token should be rotated"

    # Response should include user_id and email_verified
    assert "user_id" in new_tokens
    assert new_tokens["user_id"] == verified_user.id
    assert new_tokens["email_verified"] is True


@pytest.mark.django_db
def test_reusing_old_refresh_token_returns_401(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that reusing old refresh token after rotation returns 401 Unauthorized."""
    # Login to get initial tokens
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # First refresh - should succeed and blacklist old token
    first_refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh_response.status_code == HTTPStatus.OK

    # Attempt to reuse the ORIGINAL refresh token (now blacklisted)
    # We need to manually set the old refresh token cookie
    initial_refresh = login_response.json()["refresh_token"]
    api_client.cookies["refresh_token"] = initial_refresh

    # Second refresh attempt with old token - should fail
    reuse_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert reuse_response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.django_db
def test_blacklisted_token_error_includes_revoked_message(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that error response includes 'revoked' message for blacklisted token."""
    # Login to get initial tokens
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK
    initial_refresh = login_response.json()["refresh_token"]

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # First refresh - blacklists old token
    first_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh.status_code == HTTPStatus.OK

    # Manually set old token cookie
    api_client.cookies["refresh_token"] = initial_refresh

    # Attempt reuse - should get revoked error
    reuse_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert reuse_response.status_code == HTTPStatus.UNAUTHORIZED

    error_data = reuse_response.json()
    assert "error" in error_data
    error_message = error_data["error"].lower()
    assert "revoked" in error_message, (
        f"Error message should mention 'revoked': {error_data['error']}"
    )


@pytest.mark.django_db
def test_new_refresh_token_works_after_old_blacklisted(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that new refresh token continues to work after old one blacklisted."""
    # Login to get initial tokens
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # First refresh - should succeed and issue NEW tokens
    first_refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh_response.status_code == HTTPStatus.OK
    first_new_tokens = first_refresh_response.json()

    # Note: The NEW refresh token is automatically set as cookie by the endpoint
    # We don't need to manually set it - it's already in the client's cookies

    # Second refresh with NEW token - should also succeed
    second_refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert second_refresh_response.status_code == HTTPStatus.OK
    second_new_tokens = second_refresh_response.json()

    # Verify continuous rotation works
    assert second_new_tokens["access_token"] != first_new_tokens["access_token"]
    assert second_new_tokens["refresh_token"] != first_new_tokens["refresh_token"]


# ============================================================================
# Database Blacklist Table Tests
# ============================================================================


@pytest.mark.django_db
def test_blacklist_table_contains_revoked_token(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that database blacklist table contains entry for revoked token."""
    # Clear any existing entries for THIS USER only (avoid affecting other tests)
    OutstandingToken.objects.filter(user=verified_user).delete()  # type: ignore[misc]

    # Login to get initial tokens
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK

    # Verify refresh token cookie was set
    assert "refresh_token" in api_client.cookies, "Login should set refresh_token cookie"

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # Count blacklist entries for THIS USER before refresh
    initial_user_blacklist = BlacklistedToken.objects.filter(
        token__user=verified_user  # type: ignore[misc]
    ).count()

    # Refresh token - this should blacklist the old one
    refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert refresh_response.status_code == HTTPStatus.OK

    # Verify blacklist entry was created for THIS USER
    final_user_blacklist = BlacklistedToken.objects.filter(
        token__user=verified_user  # type: ignore[misc]
    ).count()
    assert final_user_blacklist > initial_user_blacklist, (
        "Blacklist table should contain entry for revoked token"
    )


@pytest.mark.django_db
def test_outstanding_tokens_table_tracks_issued_tokens(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that database outstanding tokens table tracks all issued tokens."""
    # Clear any existing tokens for clean test
    OutstandingToken.objects.filter(user=verified_user).delete()  # type: ignore[misc]

    # Login to get initial tokens
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }
    login_response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK

    # Verify outstanding token created for login
    outstanding_after_login = OutstandingToken.objects.filter(
        user=verified_user  # type: ignore[misc]
    ).count()
    assert outstanding_after_login == 1, "Login should create 1 outstanding token"

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # Refresh token - creates new outstanding token
    refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert refresh_response.status_code == HTTPStatus.OK

    # Verify outstanding token count increased
    outstanding_after_refresh = OutstandingToken.objects.filter(
        user=verified_user  # type: ignore[misc]
    ).count()
    assert outstanding_after_refresh == 2, "Refresh should create new outstanding token (2 total)"

    # Refresh again - creates another outstanding token
    second_refresh_response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert second_refresh_response.status_code == HTTPStatus.OK

    # Verify all tokens tracked
    outstanding_after_second_refresh = OutstandingToken.objects.filter(
        user=verified_user  # type: ignore[misc]
    ).count()
    assert outstanding_after_second_refresh == 3, (
        "Second refresh should create 3rd outstanding token"
    )

    # Verify tokens belong to correct user
    user_tokens = OutstandingToken.objects.filter(user=verified_user)  # type: ignore[misc]
    for token in user_tokens:
        assert token.user == verified_user, "All tokens should belong to test user"
