"""
Error response format tests for authentication endpoints.

Tests the standardized error response format implemented in Task 6:
- All errors use {"error": "message"} format for user-facing errors
- DEBUG=True adds {"detail": "..."} field for technical details
- DEBUG=False excludes {"detail": "..."} field (production mode)
- CSRF middleware uses consistent error format

These tests validate error responses across various HTTP status codes:
- 401 Unauthorized (invalid credentials)
- 403 Forbidden (email not verified)
- 409 Conflict (username/email exists)
- 429 Too Many Requests (rate limit exceeded)
- 400 Bad Request (invalid token)
"""

from __future__ import annotations

import json as json_module
from http import HTTPStatus
from typing import TYPE_CHECKING

import pytest
from django.test import override_settings

from apps.core.tests.test_helpers import get_csrf_token

if TYPE_CHECKING:
    from collections.abc import Iterator

    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# 401 Unauthorized Error Format Tests
# ============================================================================


@pytest.mark.django_db
def test_401_invalid_credentials_uses_error_format(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that 401 responses for invalid credentials use {"error": "message"} format."""
    login_data = {
        "login": verified_user.username,
        "password": "wrongpassword",
    }

    response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    data = response.json()

    # Verify standardized error format
    assert "error" in data, "Response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "authenticate" in data["error"].lower() or "credentials" in data["error"].lower()


# ============================================================================
# 403 Forbidden Error Format Tests
# ============================================================================


@pytest.mark.django_db
def test_403_email_not_verified_uses_error_format(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test that 403 responses for unverified email use {"error": "message"} format."""
    login_data = {
        "login": unverified_user.username,
        "password": "testpass123",
    }

    response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    data = response.json()

    # Verify standardized error format
    assert "error" in data, "Response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "verify" in data["error"].lower() or "email" in data["error"].lower()

    # Verify masked email is included for resend functionality
    assert "email" in data, "Response should contain 'email' field"
    assert "***@" in data["email"], "Email should be masked"
    assert data["email"].endswith(unverified_user.email.split("@")[1])


# ============================================================================
# 409 Conflict Error Format Tests
# ============================================================================


@pytest.mark.django_db
def test_409_username_exists_uses_error_format(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that 409 responses for existing username use {"error": "message"} format."""
    register_data = {
        "username": verified_user.username,  # Existing username
        "email": "newemail@example.com",
        "password": "TestPass123!",
    }

    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.CONFLICT
    data = response.json()

    # Verify standardized error format
    assert "error" in data, "Response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "username" in data["error"].lower() or "exists" in data["error"].lower()


# ============================================================================
# 429 Rate Limit Error Format Tests
# ============================================================================


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY="",  # Prevent real email sending (triggers dev_mode in adapters)
)
def test_429_rate_limit_uses_error_format(
    api_client: Client,
    verified_user: User,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 429 responses for rate limit exceeded use error format.

    Note: Django Ninja's built-in throttle returns {"detail": "..."} format,
    which differs from our custom {"error": "..."} format. This is acceptable
    as it's a framework response, not our code. We document this exception.
    """
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }

    # Make 5 successful attempts to hit rate limit
    for _ in range(5):
        response = api_client.post(
            "/api/token/",
            data=login_data,
            content_type="application/json",
        )
        assert response.status_code == HTTPStatus.OK

    # 6th attempt should be throttled
    response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS
    data = response.json()

    # Django Ninja throttle uses {"detail": "..."} format
    # This is framework behavior, documented as exception to our standard
    assert "detail" in data, "Django Ninja throttle response should contain 'detail' field"
    assert isinstance(data["detail"], str), "'detail' field should be a string"
    assert "too many" in data["detail"].lower() or "request" in data["detail"].lower()


# ============================================================================
# 400 Bad Request Error Format Tests
# ============================================================================


@pytest.mark.django_db
def test_400_invalid_token_uses_error_format(
    api_client: Client,
) -> None:
    """Test that 400 responses for invalid token use {"error": "message"} format."""
    # Set an invalid refresh token cookie
    api_client.cookies["refresh_token"] = "invalid_token_value"

    # Get CSRF token for refresh endpoint
    csrf_token = get_csrf_token(api_client)

    response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()

    # Verify standardized error format
    assert "error" in data, "Response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "token" in data["error"].lower() or "invalid" in data["error"].lower()


# ============================================================================
# DEBUG Mode Detail Field Tests
# ============================================================================


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_debug_true_includes_detail_field_for_blacklisted_token(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that DEBUG=True includes {"detail": "..."} field for technical details."""
    # Login to get tokens
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

    # First refresh succeeds and blacklists the old token
    first_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh.status_code == HTTPStatus.OK

    # Get the old refresh token that was just blacklisted
    # (The original token is now blacklisted after successful rotation)
    # We need to manually set it back to test blacklist error
    old_token = login_response.json()["refresh_token"]
    api_client.cookies["refresh_token"] = old_token

    # Second refresh with blacklisted token should return 401 with detail
    second_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert second_refresh.status_code == HTTPStatus.UNAUTHORIZED
    data = second_refresh.json()

    # Verify both error and detail fields present in DEBUG mode
    assert "error" in data, "Response should contain 'error' field"
    assert "detail" in data, "DEBUG=True should include 'detail' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert isinstance(data["detail"], str), "'detail' field should be a string"
    assert "revoked" in data["error"].lower() or "blacklist" in data["error"].lower()


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_debug_false_excludes_detail_field_for_blacklisted_token(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that DEBUG=False excludes {"detail": "..."} field (production mode)."""
    # Login to get tokens
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

    # First refresh succeeds and blacklists the old token
    first_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh.status_code == HTTPStatus.OK

    # Get the old refresh token that was just blacklisted
    old_token = login_response.json()["refresh_token"]
    api_client.cookies["refresh_token"] = old_token

    # Second refresh with blacklisted token should return 401 WITHOUT detail
    second_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert second_refresh.status_code == HTTPStatus.UNAUTHORIZED
    data = second_refresh.json()

    # Verify only error field present in production mode
    assert "error" in data, "Response should contain 'error' field"
    assert "detail" not in data, "DEBUG=False should exclude 'detail' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "revoked" in data["error"].lower() or "blacklist" in data["error"].lower()


# ============================================================================
# CSRF Middleware Error Format Tests
# ============================================================================


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_csrf_error_uses_error_format_production(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that CSRF middleware uses {"error": "message"} format (production mode).

    Hybrid Authentication Pattern:
    - Login returns access token in response body
    - Test must manually set access token cookie for authentication
    """
    # Login to get JWT tokens
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

    # Set access token cookie for authentication
    response_data = json_module.loads(login_response.content.decode())
    api_client.cookies["access_token"] = response_data["access_token"]

    # Try to refresh token WITHOUT CSRF token (should be rejected by middleware)
    response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        # No HTTP_X_CSRFTOKEN header
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    data = response.json()

    # Verify CSRF middleware uses standardized error format
    assert "error" in data, "CSRF error response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "csrf" in data["error"].lower() or "token" in data["error"].lower()

    # In production mode (DEBUG=False), detail field should NOT be present
    assert "detail" not in data, "DEBUG=False should exclude 'detail' field"


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_csrf_error_includes_detail_in_debug_mode(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that CSRF middleware includes {"detail": "..."} in DEBUG mode.

    Hybrid Authentication Pattern:
    - Login returns access token in response body
    - Test must manually set access token cookie for authentication
    """
    # Login to get JWT tokens
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

    # Set access token cookie for authentication
    response_data = json_module.loads(login_response.content.decode())
    api_client.cookies["access_token"] = response_data["access_token"]

    # Try to refresh token WITHOUT CSRF token (should be rejected by middleware)
    response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        # No HTTP_X_CSRFTOKEN header
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    data = response.json()

    # Verify CSRF middleware uses standardized error format with detail
    assert "error" in data, "CSRF error response should contain 'error' field"
    assert "detail" in data, "DEBUG=True should include 'detail' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert isinstance(data["detail"], str), "'detail' field should be a string"
    assert "csrf" in data["error"].lower() or "token" in data["error"].lower()
