"""
Unit tests for the configured ZeptoMail email backend.

Test settings swap in Django's locmem backend, so these tests load the backend the
base settings configure and stop at the HTTP boundary, checking the payload that
would reach the ZeptoMail API.
"""

import json
from unittest.mock import Mock, patch

from django.core.mail import EmailMultiAlternatives, get_connection
from django.test import override_settings

from config import settings as base_settings

ZEPTOMAIL_POST = "zoho_zeptomail.emails.requests.post"

# ZeptoMail's response to an accepted send request
ACCEPTED_RESPONSE_BODY = json.dumps(
    {
        "data": [{"code": "EM_104", "additional_info": [], "message": "Email request received"}],
        "message": "OK",
        "request_id": "test-request",
        "object": "email",
    }
)


@override_settings(ZOHO_ZEPTOMAIL_API_KEY_TOKEN="test-api-key")
def test_multipart_email_sends_text_and_html_as_separate_fields() -> None:
    message = EmailMultiAlternatives(
        subject="Verify your email",
        body="Plain-text body",
        from_email="CineXplorer <cinexplorer@example.com>",
        to=["user@example.com"],
    )
    message.attach_alternative("<p>HTML body</p>", "text/html")
    accepted = Mock(status_code=201, text=ACCEPTED_RESPONSE_BODY)

    with patch(ZEPTOMAIL_POST, return_value=accepted) as post:
        sent = get_connection(base_settings.EMAIL_BACKEND).send_messages([message])

    assert sent == 1
    payload = post.call_args.kwargs["json"]
    assert payload["textbody"] == "Plain-text body"
    assert payload["htmlbody"] == "<p>HTML body</p>"
