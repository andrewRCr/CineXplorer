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
from allauth.account.models import EmailAddress, EmailConfirmation, EmailConfirmationHMAC

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
        # Configure email_address to raise AttributeError when accessed
        mock_confirmation.configure_mock(**{'email_address': Mock()})
        del mock_confirmation.email_address  # Delete to cause AttributeError on access

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
# Test: POST /api/resend-verification/ - Success Cases
# ============================================================================


@pytest.mark.django_db
def test_resend_verification_with_existing_email_address_success(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test resending verification to existing EmailAddress succeeds.

    Covers lines 877-881 in api.py (existing EmailAddress.send_confirmation path).
    """
    # Create unverified EmailAddress
    EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    resend_data = {"email": unverified_user.email}

    # Mock send_confirmation to avoid actual email sending
    with patch.object(EmailAddress, 'send_confirmation') as mock_send:
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
def test_resend_verification_creates_missing_email_address(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Test resending verification creates EmailAddress if missing.

    Covers lines 882-885 in api.py (EmailAddress.DoesNotExist path).
    """
    # Ensure no EmailAddress exists for user
    EmailAddress.objects.filter(user=unverified_user).delete()

    resend_data = {"email": unverified_user.email}

    # Mock EmailAddress.objects.add_email to avoid actual email sending
    with patch.object(EmailAddress.objects, 'add_email') as mock_add:
        response = api_client.post(
            "/api/resend-verification/",
            data=resend_data,
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["message"] == "Verification email sent successfully."
    mock_add.assert_called_once()


# ============================================================================
# Test: POST /api/resend-verification/ - Error Cases
# ============================================================================


@pytest.mark.django_db
def test_resend_verification_with_already_verified_email_returns_400(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test resending verification to already-verified email returns 400.

    Covers lines 873-874 in api.py (already verified check).
    """
    # Get the already-verified EmailAddress created by the fixture
    email_address = EmailAddress.objects.get(user=verified_user, email=verified_user.email)
    assert email_address.verified is True  # Verify it's already verified

    resend_data = {"email": verified_user.email}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    data = response.json()
    assert data["error"] == "This email address is already verified."


@pytest.mark.django_db
def test_resend_verification_with_nonexistent_user_returns_success(
    api_client: Client,
) -> None:
    """Test resending verification to non-existent email returns success (security).

    Covers lines 887-889 in api.py (User.DoesNotExist path).
    Returns success without revealing if email exists (security best practice).
    """
    resend_data = {"email": "nonexistent@example.com"}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Should return 200 without revealing if email exists (security)
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "verification email has been sent" in data["message"].lower()
