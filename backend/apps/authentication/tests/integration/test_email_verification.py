"""
Comprehensive email verification endpoint tests.

Tests for POST /api/verify-email/ and POST /api/resend-verification/ endpoints.
Covers lines 828-847 and 873-885 in authentication/api.py.

Target: Raise auth coverage from 71% to 85% by testing email verification flows.
Expected Coverage Gain: ~35 lines
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest
from allauth.account.models import EmailAddress, EmailConfirmationHMAC

from apps.authentication.tests.fixtures import get_resend_token_from_login

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# Test: POST /api/verify-email/ - Success Cases
# ============================================================================


@pytest.mark.django_db
def test_verify_email_with_valid_key_success(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test email verification with valid HMAC key succeeds.

    Covers lines 833-837 in api.py (successful email confirmation flow).
    """
    # Create EmailAddress for unverified user
    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Generate valid confirmation key using allauth's HMAC system
    confirmation = EmailConfirmationHMAC(email_address)
    valid_key = confirmation.key

    verification_data = {"key": valid_key}

    response = api_client.post(
        "/api/verify-email/",
        data=verification_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["message"] == "Email verified successfully."
    assert data["email"] == unverified_user.email  # For pre-filling login form

    # Verify email is now marked as verified
    email_address.refresh_from_db()
    assert email_address.verified is True


# ============================================================================
# Test: POST /api/verify-email/ - Error Cases
# ============================================================================


@pytest.mark.django_db
def test_verify_email_with_already_verified_email_returns_400(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test verification of already-verified email returns 400.

    Covers lines 829-831 in api.py (idempotency check).
    """
    # Create EmailAddress
    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    verification_data = {"key": "some_key"}

    # Mock to return a confirmation for an already-verified email
    with patch('allauth.account.models.EmailConfirmationHMAC.from_key') as mock_from_key:
        mock_confirmation = Mock()
        mock_email_address = Mock()
        mock_email_address.verified = True  # Already verified
        mock_email_address.email = email_address.email
        mock_confirmation.email_address = mock_email_address
        mock_from_key.return_value = mock_confirmation

        response = api_client.post(
            "/api/verify-email/",
            data=verification_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert data["error"] == "Email address is already verified."


@pytest.mark.django_db
def test_verify_email_with_nonexistent_confirmation_returns_400(
    api_client: Client,
) -> None:
    """Test verification with non-existent EmailConfirmation returns 400.

    Covers lines 839-841 in api.py (EmailConfirmation.DoesNotExist).
    """
    verification_data = {
        "key": "nonexistent_confirmation_key_12345",
    }

    response = api_client.post(
        "/api/verify-email/",
        data=verification_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert data["error"] == "Invalid or expired verification link."


@pytest.mark.django_db
def test_verify_email_handles_attribute_error(
    api_client: Client,
) -> None:
    """Test verification handles AttributeError gracefully.

    Covers lines 842-844 in api.py (AttributeError exception handling).
    """
    verification_data = {"key": "some_key"}

    # Mock to return confirmation object that raises AttributeError when accessing email_address
    with patch('allauth.account.models.EmailConfirmationHMAC.from_key') as mock_from_key:
        mock_confirmation = Mock()
        # Standard unittest.mock pattern for AttributeError: create then delete attribute
        # PropertyMock doesn't work here because Mock uses __getattr__ for attribute access
        mock_confirmation.configure_mock(**{'email_address': Mock()})
        del mock_confirmation.email_address

        mock_from_key.return_value = mock_confirmation

        response = api_client.post(
            "/api/verify-email/",
            data=verification_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert data["error"] == "Invalid or expired verification link."


@pytest.mark.django_db
def test_verify_email_handles_unexpected_exception(
    api_client: Client,
) -> None:
    """Test verification handles unexpected exceptions gracefully.

    Covers lines 845-847 in api.py (generic Exception handling).
    """
    verification_data = {"key": "some_key"}

    # Mock EmailConfirmationHMAC.from_key to raise unexpected exception
    with patch('allauth.account.models.EmailConfirmationHMAC.from_key') as mock_from_key:
        mock_from_key.side_effect = RuntimeError("Unexpected database error")

        response = api_client.post(
            "/api/verify-email/",
            data=verification_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert data["error"] == "Invalid or expired verification link."


# ============================================================================
# Test: POST /api/resend-verification/ - Token-Based Flow
# ============================================================================
#
# The resend-verification endpoint uses token-based authentication to prevent
# user enumeration. Tokens are generated when login fails due to unverified email.
#
# Flow:
# 1. User attempts login with unverified email -> 403 with resend_token
# 2. User calls /api/resend-verification/ with that token
# 3. Server validates token, sends verification email, returns 200
# ============================================================================


@pytest.mark.django_db
def test_resend_verification_with_valid_token_success(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test resending verification with valid token succeeds.

    Token-based flow: login failure provides resend_token for resend endpoint.
    """
    # Create unverified EmailAddress
    EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Get resend token by attempting login with unverified user
    resend_token = get_resend_token_from_login(
        api_client, unverified_user.username, "testpass123"
    )
    assert resend_token is not None, "Expected resend_token in 403 response"

    resend_data = {"resend_token": resend_token}

    # Mock send_confirmation to avoid actual email sending
    with patch.object(EmailAddress, "send_confirmation") as mock_send:
        response = api_client.post(
            "/api/resend-verification/",
            data=resend_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["message"] == "Verification email sent successfully."
    mock_send.assert_called_once()


@pytest.mark.django_db
def test_resend_verification_with_invalid_token_returns_success(
    api_client: Client,
) -> None:
    """Test resending verification with invalid token returns success (security).

    Returns 200 without revealing token validity to prevent enumeration.
    """
    resend_data = {"resend_token": "invalid-token-that-does-not-exist"}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Should return 200 without revealing token validity (security)
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["message"] == "Verification email sent successfully."


@pytest.mark.django_db
def test_resend_verification_token_is_consumed_after_use(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test that resend token can only be used once.

    After successful use, the token should be consumed and subsequent
    requests with the same token should still return 200 (security)
    but not send another email.
    """
    # Create unverified EmailAddress
    EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Get resend token
    resend_token = get_resend_token_from_login(
        api_client, unverified_user.username, "testpass123"
    )
    assert resend_token is not None

    resend_data = {"resend_token": resend_token}

    # First use - should send email
    with patch.object(EmailAddress, "send_confirmation") as mock_send:
        response1 = api_client.post(
            "/api/resend-verification/",
            data=resend_data,
            content_type="application/json",
        )
        assert response1.status_code == HTTPStatus.OK
        assert mock_send.call_count == 1

    # Second use - token consumed, no email sent but still returns 200
    with patch.object(EmailAddress, "send_confirmation") as mock_send:
        response2 = api_client.post(
            "/api/resend-verification/",
            data=resend_data,
            content_type="application/json",
        )
        assert response2.status_code == HTTPStatus.OK
        assert mock_send.call_count == 0  # Token was consumed, no email sent
