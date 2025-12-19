"""
Tests for email backend integration with django-zoho-zeptomail.

These tests verify:
1. Test environment uses locmem backend (emails captured, not sent)
2. Email verification flow sends emails to outbox
3. Resend verification sends emails to outbox
4. Email content is correct (subject, recipients, body)

Uses Django's in-memory email backend (locmem) which captures all sent
emails in django.core.mail.outbox for assertion.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING

import pytest
from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from django.core import mail
from django.core.mail import EmailMultiAlternatives

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
# Test: Email Sent During Resend Verification
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

    # Clear any existing emails
    mail.outbox.clear()

    resend_data = {"email": unverified_user.email}

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

    mail.outbox.clear()

    resend_data = {"email": unverified_user.email}

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
def test_resend_verification_does_not_send_email_for_nonexistent_user(
    api_client: Client,
) -> None:
    """Verify no email sent for non-existent user (but still returns success for security)."""
    mail.outbox.clear()

    resend_data = {"email": "nonexistent@example.com"}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Returns success to prevent email enumeration
    assert response.status_code == HTTPStatus.OK

    # But no email should actually be sent
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_resend_verification_does_not_send_email_for_already_verified(
    api_client: Client,
    verified_user: User,
) -> None:
    """Verify no email sent for already verified user."""
    mail.outbox.clear()

    resend_data = {"email": verified_user.email}

    response = api_client.post(
        "/api/resend-verification/",
        data=resend_data,
        content_type="application/json",
    )

    # Returns error for already verified
    assert response.status_code == HTTPStatus.BAD_REQUEST

    # No email should be sent
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
