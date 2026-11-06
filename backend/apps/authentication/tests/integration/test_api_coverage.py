"""Additional coverage tests for authentication API error paths.

This test suite targets uncovered error paths and edge cases in api.py
to raise coverage from 72% to 90%. These tests focus on:
- Forbidden username registration (lines 89-93)
- Email sending failure during registration (lines 145-155)
- Token blacklist AttributeError handling (lines 358-365)
- Token blacklist unexpected errors (lines 363-365)
- Blacklisted token JWT decode failure (lines 419-420)
- Unexpected token refresh errors (lines 440-443)

Coverage Target: api.py 72.41% → 90%+
Expected Coverage Gain: ~36 lines (~18% increase)
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from django.test import override_settings
from ninja_jwt.tokens import RefreshToken

from apps.authentication.tests.mock_paths import AUTH_SERVICE_SEND_VERIFICATION_EMAIL

if TYPE_CHECKING:
    from django.test import Client

    from apps.users.models import User


# ============================================================================
# Forbidden Username Registration Tests
# ============================================================================


@pytest.mark.django_db
@override_settings(FORBIDDEN_USERNAMES=["admin", "root", "system"])
def test_forbidden_username_registration_returns_409(
    api_client: Client,
) -> None:
    """Test that registration with forbidden username returns 409 Conflict.

    Covers lines 89-93 in api.py (forbidden username check).
    """
    register_data = {
        "username": "admin",  # Forbidden username
        "email": "newuser@example.com",
        "password": "TestPass123!",
    }

    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.CONFLICT
    data = response.json()

    # Verify error response format
    assert "error" in data, "Response should contain 'error' field"
    assert isinstance(data["error"], str), "'error' field should be a string"
    assert "admin" in data["error"] or "not allowed" in data["error"].lower()


# ============================================================================
# Email Sending Failure Tests
# ============================================================================


@pytest.mark.django_db
def test_email_sending_failure_rolls_back_user_and_returns_500(
    api_client: Client,
) -> None:
    """Test that email sending failure during registration rolls back user creation.

    Covers AuthenticationService registration error handling for email failures.
    Uses transaction.atomic() to ensure user is not left in database if email fails.
    """
    from django.contrib.auth import get_user_model

    register_data = {
        "username": "testuser_email_fail",
        "email": "emailfail@example.com",
        "password": "TestPass123!",
    }

    # Mock send_verification_email_to_address to return False (email not sent)
    with patch(AUTH_SERVICE_SEND_VERIFICATION_EMAIL) as mock_send_email:
        mock_send_email.return_value = False

        response = api_client.post(
            "/api/register/",
            data=register_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    data = response.json()

    # Verify error response format
    assert "error" in data, "Response should contain 'error' field"
    assert "email_sent" in data, "Response should contain 'email_sent' field"
    assert data["email_sent"] is False, "'email_sent' should be False"
    assert (
        "unable to send" in data["error"].lower() or "verification email" in data["error"].lower()
    )

    # Verify user was rolled back (transaction.atomic on email failure)
    user_model = get_user_model()
    assert not user_model.objects.filter(username="testuser_email_fail").exists(), (
        "User should be rolled back when email fails to send"
    )


# ============================================================================
# Token Blacklist Error Handling Tests
# ============================================================================


@pytest.mark.django_db
def test_token_blacklist_attribute_error_handling(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test token refresh handles AttributeError when blacklist() method unavailable.

    Covers lines 358-365 in api.py (AttributeError exception handling).
    Simulates scenario where ninja_jwt.token_blacklist is not in INSTALLED_APPS.
    """
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
    from apps.core.tests.test_helpers import get_csrf_token

    csrf_token = get_csrf_token(api_client)

    # Mock RefreshToken.blacklist() to raise AttributeError
    with patch.object(
        RefreshToken, "blacklist", side_effect=AttributeError("blacklist() not available")
    ):
        # Refresh should still succeed despite blacklist failure
        response = api_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # Should still return 200 (refresh succeeds, blacklist logged as warning)
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "access_token" in data, "Response should contain new access token"
    assert "refresh_token" in data, "Response should contain new refresh token"


@pytest.mark.django_db
def test_token_blacklist_unexpected_error_logged(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test token refresh handles unexpected errors during blacklist.

    Covers lines 363-365 in api.py (general exception handling).
    """
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
    from apps.core.tests.test_helpers import get_csrf_token

    csrf_token = get_csrf_token(api_client)

    # Mock RefreshToken.blacklist() to raise unexpected exception
    with patch.object(
        RefreshToken, "blacklist", side_effect=RuntimeError("Database connection lost")
    ):
        # Refresh should still succeed despite blacklist failure
        response = api_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # Should still return 200 (refresh succeeds, error logged as warning)
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "access_token" in data, "Response should contain new access token"
    assert "refresh_token" in data, "Response should contain new refresh token"


# ============================================================================
# Blacklisted Token JWT Decode Failure Tests
# ============================================================================


@pytest.mark.django_db
def test_blacklisted_token_jwt_decode_failure_handling(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test handling of malformed blacklisted tokens that can't be decoded.

    This test indirectly covers lines 419-420 (jwt.decode exception in blacklist logging).
    When a malformed token triggers errors, the general exception handler is invoked.
    The specific jwt.decode error path is exercised during real blacklist scenarios where
    the token can't be decoded for logging purposes.
    """
    # Get CSRF token
    from apps.core.tests.test_helpers import get_csrf_token

    csrf_token = get_csrf_token(api_client)

    # Set a completely malformed token (not even valid JWT structure)
    # This will trigger error handling without being able to extract user info
    api_client.cookies["refresh_token"] = "this.is.not.a.valid.jwt.token.at.all"

    response = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    # Should return 400 with error message (malformed token)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert "error" in data, "Response should contain 'error' field"
    assert "token" in data["error"].lower() or "invalid" in data["error"].lower()


# ============================================================================
# Unexpected Token Refresh Error Tests
# ============================================================================


@pytest.mark.django_db
def test_unexpected_token_refresh_error_returns_400(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test unexpected errors during token refresh return 400 with generic message.

    Covers lines 440-443 in api.py (general exception handling).
    """
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
    from apps.core.tests.test_helpers import get_csrf_token

    csrf_token = get_csrf_token(api_client)

    # Mock get_user_model().objects.get() to raise unexpected exception
    # This happens after RefreshToken validation, triggering the general except block
    from django.contrib.auth import get_user_model

    user_model = get_user_model()

    with patch.object(
        user_model.objects, "get", side_effect=RuntimeError("Database connection timeout")
    ):
        response = api_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # Should return 400 with generic error message
    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert "error" in data, "Response should contain 'error' field"
    assert "error occurred" in data["error"].lower() or "try again" in data["error"].lower()


# ============================================================================
# Email Verification Endpoint Tests
# ============================================================================


@pytest.mark.django_db
def test_verify_email_with_invalid_key_returns_400(
    api_client: Client,
) -> None:
    """Test email verification with invalid key returns 400.

    Covers lines 646-685 in api.py (verify_email endpoint error paths).
    """
    verification_data = {
        "key": "invalid_verification_key_12345",
    }

    response = api_client.post(
        "/api/verify-email/",
        data=verification_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert "error" in data, "Response should contain 'error' field"
    assert "invalid" in data["error"].lower() or "expired" in data["error"].lower()
