"""Tests that the backend's logs hold no email address or email-verification key.

A typed sign-in name can be an email address, and an exception's text can quote the recipient,
so the authentication and email logs identify a user by ID. These loggers don't propagate to the
root logger, so the tests attach a handler to each one directly.
"""

from __future__ import annotations

import logging
from collections.abc import Generator, Iterable
from contextlib import contextmanager
from http import HTTPStatus
from smtplib import SMTPRecipientsRefused
from typing import TYPE_CHECKING

import pytest
from allauth.account.models import EmailAddress, EmailConfirmation
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage
from django.test import override_settings
from django.utils import timezone
from django.utils.crypto import get_random_string

from apps.core.tests.test_helpers import create_user, json_post

if TYPE_CHECKING:
    from django.test import Client

ADDRESS = "private.person@example.com"
PASSWORD = "testpass123"
LOGGERS = ("cinexplorer.auth", "apps.core.services.email_service")


class RefusingEmailBackend(BaseEmailBackend):
    """Sends nothing, as when the email provider declines a message."""

    def send_messages(self, email_messages: Iterable[EmailMessage]) -> int:
        return 0


class RejectingEmailBackend(BaseEmailBackend):
    """Raises the error SMTP gives for a refused recipient, whose text quotes the address."""

    def send_messages(self, email_messages: Iterable[EmailMessage]) -> int:
        refused = {
            address: (550, b"Mailbox unavailable")
            for message in email_messages
            for address in message.recipients()
        }
        raise SMTPRecipientsRefused(refused)


class _Collector(logging.Handler):
    def __init__(self) -> None:
        super().__init__(level=logging.DEBUG)
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


@contextmanager
def captured_logs() -> Generator[list[logging.LogRecord]]:
    """Collect every record the authentication and email loggers emit, at any level."""
    collector = _Collector()
    loggers = [logging.getLogger(name) for name in LOGGERS]
    levels = [logger.level for logger in loggers]
    for logger in loggers:
        logger.addHandler(collector)
        logger.setLevel(logging.DEBUG)
    try:
        yield collector.records
    finally:
        for logger, level in zip(loggers, levels, strict=True):
            logger.removeHandler(collector)
            logger.setLevel(level)


def logged_text(records: list[logging.LogRecord]) -> str:
    """Each record's message and attributes, extra fields and exception included."""
    return "\n".join(f"{record.getMessage()} {vars(record)}" for record in records)


def register(client: Client, username: str) -> int:
    """Register an account with ADDRESS and return the response status."""
    payload: dict[str, object] = {
        "username": username,
        "email": ADDRESS,
        "password": "TestPass123!",
    }
    return json_post(client, "/api/register/", payload).status_code


def sign_in(client: Client, login: str, password: str) -> int:
    """Sign in and return the response status."""
    return json_post(client, "/api/token/", {"login": login, "password": password}).status_code


def verify(client: Client, key: str) -> int:
    """Submit an email verification key and return the response status."""
    return json_post(client, "/api/verify-email/", {"key": key}).status_code


def verification_key() -> str:
    """Create an account with an unverified ADDRESS and return a stored verification key.

    A stored key, unlike allauth's signed one, still resolves once the address is verified,
    so a second use reaches the already-verified branch.
    """
    user = create_user(username="privateperson", email=ADDRESS, email_verified=False)
    address = EmailAddress.objects.create(user=user, email=ADDRESS, verified=False, primary=True)
    confirmation = EmailConfirmation.objects.create(
        email_address=address, key=get_random_string(64).lower(), sent=timezone.now()
    )
    return confirmation.key


@pytest.mark.django_db
def test_registration_logs_no_address(api_client: Client) -> None:
    """Registering, then registering the same address again, logs no address."""
    with captured_logs() as records:
        assert register(api_client, "privateperson") == HTTPStatus.CREATED
        assert register(api_client, "someoneelse") == HTTPStatus.CONFLICT

    text = logged_text(records)
    assert "Registration successful" in text
    assert "Email already exists" in text
    assert ADDRESS not in text


@pytest.mark.django_db
def test_declined_verification_email_logs_no_address(api_client: Client) -> None:
    """A verification email the provider declines is logged by error type, not by address."""
    with (
        override_settings(EMAIL_BACKEND=f"{__name__}.RefusingEmailBackend"),
        captured_logs() as records,
    ):
        assert register(api_client, "privateperson") == HTTPStatus.INTERNAL_SERVER_ERROR

    text = logged_text(records)
    assert "error_type=EmailDeliveryError" in text
    assert ADDRESS not in text


@pytest.mark.django_db
def test_sign_in_by_email_logs_no_address(api_client: Client) -> None:
    """Signing in by email logs the user's ID or nothing about them, never the address."""
    unverified = "unverified.person@example.com"
    create_user(username="privateperson", email=ADDRESS, password=PASSWORD)
    create_user(username="unverified", email=unverified, password=PASSWORD, email_verified=False)

    with captured_logs() as records:
        assert sign_in(api_client, ADDRESS, PASSWORD) == HTTPStatus.OK
        assert sign_in(api_client, ADDRESS, "wrongpassword") == HTTPStatus.UNAUTHORIZED
        assert sign_in(api_client, unverified, PASSWORD) == HTTPStatus.FORBIDDEN

    text = logged_text(records)
    assert "Login successful" in text
    assert "Invalid credentials" in text
    assert "Email not verified" in text
    assert ADDRESS not in text
    assert unverified not in text


@pytest.mark.django_db
def test_email_verification_logs_no_address_or_key(api_client: Client) -> None:
    """Verifying an address, then verifying it again, logs neither the address nor the key."""
    key = verification_key()

    with captured_logs() as records:
        assert verify(api_client, key) == HTTPStatus.OK
        assert verify(api_client, key) == HTTPStatus.BAD_REQUEST

    text = logged_text(records)
    assert "Welcome email sent successfully" in text
    assert "already verified" in text
    assert ADDRESS not in text
    assert key[:8] not in text


@pytest.mark.django_db
def test_failed_welcome_email_logs_no_address(api_client: Client) -> None:
    """A welcome email the mail server refuses is logged by error type, not by address."""
    key = verification_key()

    with (
        override_settings(EMAIL_BACKEND=f"{__name__}.RejectingEmailBackend"),
        captured_logs() as records,
    ):
        assert verify(api_client, key) == HTTPStatus.OK

    text = logged_text(records)
    assert "Error sending welcome email" in text
    assert "SMTPRecipientsRefused" in text
    assert ADDRESS not in text
