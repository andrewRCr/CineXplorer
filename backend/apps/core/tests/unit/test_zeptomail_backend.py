"""Unit tests for the configured ZeptoMail email backend.

Tests name the ZeptoMail backend explicitly so development mail overrides cannot
replace the transport under test. A stand-in for the ZeptoMail API at requests' transport
layer receives each prepared request and answers as the real API does, so the
tests check the HTTP request that would go on the wire.
"""

import json
import logging

import pytest
import requests
from django.core.mail import EmailMessage, EmailMultiAlternatives, get_connection
from django.test import override_settings

from apps.core.tests.email_transport import ERROR_RESPONSE_BODY, zeptomail_api_stand_in
from apps.core.tests.test_helpers import load_settings

ZEPTOMAIL_SEND_URL = "https://api.zeptomail.com/v1.1/email"


@override_settings(ZOHO_ZEPTOMAIL_API_KEY_TOKEN="test-api-key")
def test_multipart_email_sends_text_and_html_as_separate_fields() -> None:
    message = EmailMultiAlternatives(
        subject="Verify your email",
        body="Plain-text body",
        from_email="CineXplorer <cinexplorer@example.com>",
        to=["user@example.com"],
    )
    message.attach_alternative("<p>HTML body</p>", "text/html")

    with zeptomail_api_stand_in() as transport:
        sent = get_connection("apps.core.email_backend.ZeptoMailEmailBackend").send_messages(
            [message]
        )

    assert sent == 1
    assert [(request.method, request.url) for request in transport.requests] == [
        ("POST", ZEPTOMAIL_SEND_URL)
    ]
    body = transport.requests[0].body
    assert isinstance(body, bytes)
    payload = json.loads(body)
    assert payload["textbody"] == "Plain-text body"
    assert payload["htmlbody"] == "<p>HTML body</p>"


@pytest.mark.parametrize("outcome", ["accepted", "timeout", "connection", "refused", "gateway"])
@override_settings(ZOHO_ZEPTOMAIL_API_KEY_TOKEN="private-mail-key")
def test_send_outcomes_are_bounded_quiet_and_sanitized(
    outcome: str,
    caplog: pytest.LogCaptureFixture,
    capsys: pytest.CaptureFixture[str],
) -> None:
    message = EmailMessage(
        subject="Private subject",
        body="Private message content",
        from_email="sender@example.com",
        to=["recipient@example.com"],
    )
    error = (
        requests.Timeout("private-mail-key recipient@example.com Private message content")
        if outcome == "timeout"
        else requests.ConnectionError("recipient@example.com")
        if outcome == "connection"
        else None
    )
    status = 400 if outcome == "refused" else 502 if outcome == "gateway" else 201
    body = (
        "<html>private-mail-key recipient@example.com</html>"
        if outcome == "gateway"
        else ERROR_RESPONSE_BODY
    )
    if outcome == "accepted":
        from apps.core.tests.email_transport import ACCEPTED_RESPONSE_BODY

        body = ACCEPTED_RESPONSE_BODY
    caplog.set_level(logging.INFO)
    with zeptomail_api_stand_in(status=status, body=body, error=error) as transport:
        sent = get_connection("apps.core.email_backend.ZeptoMailEmailBackend").send_messages(
            [message]
        )
    assert sent == (1 if outcome == "accepted" else 0)
    assert transport.timeouts == [(10, 10)]
    assert capsys.readouterr().out == ""
    records = [record for record in caplog.records if record.name == "apps.core.email_backend"]
    assert len(records) == 1
    record = records[0]
    assert record.levelno == (logging.INFO if outcome == "accepted" else logging.WARNING)
    text = record.getMessage()
    assert all(
        value not in text
        for value in (
            "private-mail-key",
            "recipient@example.com",
            "Private subject",
            "Private message content",
        )
    )
    assert record.exc_info is None
    expected = (
        "Timeout"
        if outcome == "timeout"
        else "ConnectionError"
        if outcome == "connection"
        else str(status)
    )
    assert expected in text
    if outcome == "accepted":
        assert "test-request" in text
    if outcome == "refused":
        assert "failed-request" in text
        assert "TM_4001" in text


@override_settings(
    ZOHO_ZEPTOMAIL_API_KEY_TOKEN="updated-key", ZOHO_ZEPTOMAIL_HOSTED_REGION="zeptomail.zoho.eu"
)
def test_send_uses_the_current_key_and_hosted_region() -> None:
    message = EmailMessage("Subject", "Body", "sender@example.com", ["recipient@example.com"])
    with zeptomail_api_stand_in() as transport:
        assert (
            get_connection("apps.core.email_backend.ZeptoMailEmailBackend").send_messages(
                [message]
            )
            == 1
        )
    assert transport.requests[0].url == "https://api.zeptomail.eu/v1.1/email"
    assert transport.requests[0].headers["Authorization"] == "updated-key"


def test_missing_key_imports_and_sends_nothing_without_transport() -> None:
    values = load_settings(
        {
            "ZEPTOMAIL_API_KEY": "",
            "ZEPTOMAIL_HOSTED_REGION": None,
            "ENVIRONMENT": "development",
            "DEBUG": "True",
        },
        ["sent_count", "request_count", "warning_count"],
        before_import="""
import logging
from unittest.mock import patch
from django.core.mail import EmailMessage, get_connection

records = []
class Capture(logging.Handler):
    def emit(self, record):
        records.append(record)
logging.getLogger().addHandler(Capture())
request_count = 0
def refuse_network(*args, **kwargs):
    global request_count
    request_count += 1
    raise AssertionError("No request should be made without a key")
with patch("requests.adapters.HTTPAdapter.send", side_effect=refuse_network):
    backend = get_connection("apps.core.email_backend.ZeptoMailEmailBackend")
    message = EmailMessage("Subject", "Body", "sender@example.com", ["recipient@example.com"])
    sent_count = backend.send_messages([message])
warning_count = sum(record.levelno == logging.WARNING for record in records)
""",
    )
    assert values == {"sent_count": 0, "request_count": 0, "warning_count": 1}
