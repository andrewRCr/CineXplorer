"""
Tests for email backend integration with django-zoho-zeptomail.

These tests verify:
1. Test environment uses locmem backend (emails captured, not sent)
2. Email verification flow sends emails to outbox
3. Resend verification sends emails to outbox
4. Registration sends verification email to outbox
5. Email content is correct (subject, recipients, body)
6. EmailDeliveryError raised when send fails
7. Email templates render with expected context variables

Uses Django's in-memory email backend (locmem) which captures all sent
emails in django.core.mail.outbox for assertion.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest
from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.authentication.adapters import CustomAccountAdapter, EmailDeliveryError
from apps.authentication.tests.fixtures import get_resend_token_from_login

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# Test: Email Backend Configuration
# ============================================================================


@pytest.mark.django_db
def test_email_backend_is_locmem_in_tests() -> None:
    """Verify test settings use locmem email backend.

    This ensures emails are captured in outbox, not actually sent.
    """
    from django.conf import settings

    assert settings.EMAIL_BACKEND == "django.core.mail.backends.locmem.EmailBackend"


@pytest.mark.django_db
def test_email_outbox_starts_empty() -> None:
    """Verify email outbox is empty at test start."""
    assert len(mail.outbox) == 0


# ============================================================================
# Test: Email Sent During Resend Verification (Token-Based Flow)
# ============================================================================
#
# The resend-verification endpoint uses token-based authentication.
# Tokens are generated when login fails due to unverified email.
# ============================================================================


@pytest.mark.django_db
def test_resend_verification_sends_email_to_outbox(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify resend verification actually sends email to outbox.

    With the new email backend, we can verify emails are captured
    in django.core.mail.outbox instead of mocking send_confirmation.
    """
    # Create unverified EmailAddress
    EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Get resend token by attempting login
    resend_token = get_resend_token_from_login(api_client, unverified_user.username, "testpass123")
    assert resend_token is not None

    # Clear any existing emails (login attempt may send verification email)
    mail.outbox.clear()

    resend_data = {"resend_token": resend_token}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK

    # Verify email was sent to outbox
    assert len(mail.outbox) == 1
    sent_email = mail.outbox[0]

    # Verify recipient
    assert unverified_user.email in sent_email.to

    # Verify subject contains expected text
    assert "confirm" in sent_email.subject.lower() or "verify" in sent_email.subject.lower()


@pytest.mark.django_db
def test_resend_verification_email_contains_verification_link(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify resent verification email contains verification link."""
    # Create unverified EmailAddress
    EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Get resend token by attempting login
    resend_token = get_resend_token_from_login(api_client, unverified_user.username, "testpass123")
    assert resend_token is not None

    mail.outbox.clear()

    resend_data = {"resend_token": resend_token}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK
    assert len(mail.outbox) == 1

    sent_email = mail.outbox[0]

    # Check email body contains verification URL
    # The body could be plain text or HTML
    email_body = sent_email.body
    if isinstance(sent_email, EmailMultiAlternatives) and sent_email.alternatives:
        # Get HTML body if available
        html_body = sent_email.alternatives[0][0]
        email_body = str(html_body)

    # Verify the email contains a verification link
    # allauth uses either /verify-email/ or /auth/verify-email based on HEADLESS_FRONTEND_URLS
    assert "verify" in email_body.lower()


@pytest.mark.django_db
def test_resend_verification_does_not_send_email_for_invalid_token(
    api_client: Client,
) -> None:
    """Verify no email sent for invalid token (but still returns success for security)."""
    mail.outbox.clear()

    resend_data = {"resend_token": "invalid-token-that-does-not-exist"}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Returns success to prevent token enumeration
    assert response.status_code == HTTPStatus.OK

    # But no email should actually be sent
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_resend_verification_does_not_send_email_for_already_verified(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify no email sent if user verified between token generation and use.

    Edge case: User gets token, then verifies email through another means,
    then tries to use the resend token. No email should be sent.
    """
    # Create unverified EmailAddress
    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Get resend token while unverified
    resend_token = get_resend_token_from_login(api_client, unverified_user.username, "testpass123")
    assert resend_token is not None

    # Now verify the email (simulating user verified via another path)
    email_address.verified = True
    email_address.save()

    mail.outbox.clear()

    resend_data = {"resend_token": resend_token}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Returns success (security - don't reveal verification status)
    assert response.status_code == HTTPStatus.OK

    # No email should be sent since already verified
    assert len(mail.outbox) == 0


# ============================================================================
# Test: Email Verification Success (no email sent on verify, just confirmation)
# ============================================================================


@pytest.mark.django_db
def test_email_verification_success_sends_welcome_email(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify successful email verification sends welcome email."""
    # Create EmailAddress for unverified user
    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    # Generate valid confirmation key
    confirmation = EmailConfirmationHMAC(email_address)
    valid_key = confirmation.key

    mail.outbox.clear()

    verification_data = {"key": valid_key}

    response = api_client.post(
        "/api/verify-email/",
        data=verification_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK

    # Welcome email should be sent after successful verification
    assert len(mail.outbox) == 1
    welcome_email = mail.outbox[0]

    # Verify recipient
    assert unverified_user.email in welcome_email.to

    # Verify it's a welcome email (not verification email)
    assert "welcome" in welcome_email.subject.lower()


@pytest.mark.django_db
def test_welcome_email_contains_username(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify welcome email contains the user's username."""
    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    confirmation = EmailConfirmationHMAC(email_address)
    valid_key = confirmation.key

    mail.outbox.clear()

    response = api_client.post(
        "/api/verify-email/",
        data={"key": valid_key},
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK
    assert len(mail.outbox) == 1

    welcome_email = mail.outbox[0]

    # Check email body contains username
    email_body: str = welcome_email.body
    if isinstance(welcome_email, EmailMultiAlternatives) and welcome_email.alternatives:
        email_body = str(welcome_email.alternatives[0][0])

    assert unverified_user.username in email_body


@pytest.mark.django_db
def test_welcome_email_contains_frontend_link(
    api_client: Client,
    unverified_user: User,
) -> None:
    """Verify welcome email contains link to frontend."""
    from django.conf import settings

    email_address = EmailAddress.objects.create(
        user=unverified_user,
        email=unverified_user.email,
        primary=True,
        verified=False,
    )

    confirmation = EmailConfirmationHMAC(email_address)
    valid_key = confirmation.key

    mail.outbox.clear()

    response = api_client.post(
        "/api/verify-email/",
        data={"key": valid_key},
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.OK
    assert len(mail.outbox) == 1

    welcome_email = mail.outbox[0]

    # Check email body contains frontend URL
    email_body: str = welcome_email.body
    if isinstance(welcome_email, EmailMultiAlternatives) and welcome_email.alternatives:
        email_body = str(welcome_email.alternatives[0][0])

    frontend_url = getattr(settings, "FRONTEND_URL", "")
    assert frontend_url in email_body


# ============================================================================
# Test: Registration Sends Verification Email
# ============================================================================


@pytest.mark.django_db
def test_registration_sends_verification_email_to_outbox(
    api_client: Client,
) -> None:
    """Verify user registration sends verification email to mail.outbox.

    This is the critical integration test that ensures the full registration
    flow actually sends an email, not just that mocks are configured correctly.
    """
    mail.outbox.clear()

    # Use unique email to avoid conflicts with fixtures
    register_data = {
        "username": "emailtestuser",
        "email": "emailtest@example.com",
        "password": "SecurePass123!",
        "first_name": "Email",
        "last_name": "Tester",
    }

    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.CREATED

    # Verify email was sent to outbox
    assert len(mail.outbox) == 1
    sent_email = mail.outbox[0]

    # Verify recipient matches registered email
    assert register_data["email"] in sent_email.to

    # Verify it's a verification email (not welcome)
    assert "confirm" in sent_email.subject.lower() or "verify" in sent_email.subject.lower()


@pytest.mark.django_db
def test_registration_email_contains_verification_link(
    api_client: Client,
) -> None:
    """Verify registration email contains verification link with frontend URL."""
    from django.conf import settings

    mail.outbox.clear()

    register_data = {
        "username": "linktestuser",
        "email": "linktest@example.com",
        "password": "SecurePass123!",
        "first_name": "Link",
        "last_name": "Tester",
    }

    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.CREATED
    assert len(mail.outbox) == 1

    sent_email = mail.outbox[0]

    # Get email body (HTML or plain text)
    email_body: str = sent_email.body
    if isinstance(sent_email, EmailMultiAlternatives) and sent_email.alternatives:
        email_body = str(sent_email.alternatives[0][0])

    # Verify email contains frontend verification URL
    # CustomAccountAdapter uses /login?verify={key} pattern
    frontend_url = getattr(settings, "FRONTEND_URL", "")
    assert "/login?verify=" in email_body
    assert frontend_url in email_body or "testserver" in email_body  # testserver in tests


@pytest.mark.django_db
def test_registration_email_contains_username(
    api_client: Client,
) -> None:
    """Verify registration email greets the user by username."""
    mail.outbox.clear()

    register_data = {
        "username": "greetingtestuser",
        "email": "greetingtest@example.com",
        "password": "SecurePass123!",
        "first_name": "Greeting",
        "last_name": "Tester",
    }

    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )

    assert response.status_code == HTTPStatus.CREATED
    assert len(mail.outbox) == 1

    sent_email = mail.outbox[0]

    # Get email body
    email_body: str = sent_email.body
    if isinstance(sent_email, EmailMultiAlternatives) and sent_email.alternatives:
        email_body = str(sent_email.alternatives[0][0])

    # Verify username appears in email
    assert register_data["username"] in email_body


# ============================================================================
# Test: EmailDeliveryError Raised on Send Failure
# ============================================================================


@pytest.mark.django_db
def test_adapter_raises_email_delivery_error_when_send_returns_zero() -> None:
    """Verify CustomAccountAdapter.send_mail raises EmailDeliveryError when send fails.

    The adapter overrides send_mail to check msg.send() return value.
    If it returns 0 (no emails sent), EmailDeliveryError should be raised.
    """
    adapter = CustomAccountAdapter()

    # Create a mock message where send() returns 0
    mock_message = Mock()
    mock_message.send.return_value = 0

    # Mock render_mail to return our mock message
    with patch.object(adapter, "render_mail", return_value=mock_message):
        with pytest.raises(EmailDeliveryError) as exc_info:
            adapter.send_mail(
                template_prefix="account/email/email_confirmation",
                email="test@example.com",
                context={"user": Mock(username="testuser")},
            )

        # Verify error message contains relevant info
        assert "test@example.com" in str(exc_info.value)
        assert "email_confirmation" in str(exc_info.value)


@pytest.mark.django_db
def test_adapter_succeeds_when_send_returns_nonzero() -> None:
    """Verify CustomAccountAdapter.send_mail succeeds when send returns 1+."""
    adapter = CustomAccountAdapter()

    # Create a mock message where send() returns 1 (success)
    mock_message = Mock()
    mock_message.send.return_value = 1

    # Mock render_mail to return our mock message
    with patch.object(adapter, "render_mail", return_value=mock_message):
        # Should not raise
        adapter.send_mail(
            template_prefix="account/email/email_confirmation",
            email="test@example.com",
            context={"user": Mock(username="testuser")},
        )

    # Verify send was called
    mock_message.send.assert_called_once()


# ============================================================================
# Test: Email Template Rendering
# ============================================================================


@pytest.mark.django_db
def test_email_confirmation_template_renders_with_context() -> None:
    """Verify email confirmation template renders with expected context variables.

    Smoke test to ensure templates exist and render without errors.
    """
    context = {
        "user": Mock(username="templateuser"),
        "activate_url": "https://example.com/verify-email/abc123",
        "email": "template@example.com",
        "expiry_days": 3,  # Mimics what CustomAccountAdapter.send_mail injects
    }

    # Test HTML template
    html_content = render_to_string(
        "account/email/email_confirmation_message.html",
        context,
    )

    # Verify context variables appear in rendered output
    assert "templateuser" in html_content
    assert "https://example.com/verify-email/abc123" in html_content
    assert "template@example.com" in html_content
    assert "CineXplorer" in html_content
    assert "3 day" in html_content  # expiry_days rendered in template

    # Test TXT template
    txt_content = render_to_string(
        "account/email/email_confirmation_message.txt",
        context,
    )

    # Verify context variables appear in plain text version
    assert "templateuser" in txt_content
    assert "https://example.com/verify-email/abc123" in txt_content
    assert "template@example.com" in txt_content
    assert "3 day" in txt_content  # expiry_days rendered in template


@pytest.mark.django_db
def test_email_confirmation_subject_template_renders() -> None:
    """Verify email confirmation subject template renders."""
    context = {
        "email": "subject@example.com",
    }

    subject = render_to_string(
        "account/email/email_confirmation_subject.txt",
        context,
    )

    # Subject should not be empty and should contain relevant text
    assert subject.strip()
    assert "confirm" in subject.lower() or "verify" in subject.lower()


@pytest.mark.django_db
def test_password_reset_template_exists() -> None:
    """Verify password reset email templates exist for future use.

    Note: Password reset API endpoint is not yet implemented.
    This test ensures templates are available when the feature is added.
    """
    context = {
        "user": Mock(username="resetuser"),
        "password_reset_url": "https://example.com/reset/token123",
        "email": "reset@example.com",
    }

    # HTML template should exist and render
    html_content = render_to_string(
        "account/email/password_reset_key_message.html",
        context,
    )
    assert html_content  # Non-empty

    # Subject template should exist
    subject = render_to_string(
        "account/email/password_reset_key_subject.txt",
        context,
    )
    assert subject.strip()  # Non-empty
