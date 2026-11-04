"""Tests for the welcome email's delivery result."""

from __future__ import annotations

import logging
from collections.abc import Iterable

import pytest
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage
from django.test import override_settings

from apps.core.services.email_service import send_welcome_email
from apps.core.tests.test_helpers import create_user


class RefusingEmailBackend(BaseEmailBackend):
    """Sends nothing, as when the email provider declines a message."""

    def send_messages(self, email_messages: Iterable[EmailMessage]) -> int:
        return 0


@pytest.mark.django_db
def test_welcome_email_the_backend_declines_reports_failure(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A mail backend that sends nothing is a failed delivery, logged as an error by user ID."""
    user = create_user(username="newcomer", email="newcomer@example.com")

    with (
        override_settings(EMAIL_BACKEND=f"{__name__}.RefusingEmailBackend"),
        caplog.at_level(logging.INFO, logger="apps.core.services.email_service"),
    ):
        assert send_welcome_email(user) is False

    by_message = {record.getMessage(): record for record in caplog.records}
    assert "Welcome email sent successfully" not in by_message
    failure = by_message["Welcome email not sent"]
    assert failure.levelno == logging.ERROR
    assert getattr(failure, "user_id", None) == user.pk
    assert user.email not in caplog.text
