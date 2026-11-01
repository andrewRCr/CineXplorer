"""
Unit tests for the configured ZeptoMail email backend.

Test settings swap in Django's locmem backend, so these tests load the backend the
base settings configure. A stand-in for the ZeptoMail API at requests' transport
layer receives each prepared request and answers as the real API does, so the
tests check the HTTP request that would go on the wire.
"""

import io
import json
from collections.abc import Generator
from contextlib import contextmanager
from unittest.mock import patch

import requests
from django.core.mail import EmailMultiAlternatives, get_connection
from django.test import override_settings
from requests.adapters import HTTPAdapter

from config import settings as base_settings

ZEPTOMAIL_SEND_URL = "https://api.zeptomail.com/v1.1/email"

# ZeptoMail's response to an accepted send request
ACCEPTED_RESPONSE_BODY = json.dumps(
    {
        "data": [{"code": "EM_104", "additional_info": [], "message": "Email request received"}],
        "message": "OK",
        "request_id": "test-request",
        "object": "email",
    }
)


@contextmanager
def zeptomail_api_stand_in() -> Generator[list[requests.PreparedRequest]]:
    """Receive outgoing HTTP requests in place of the ZeptoMail API.

    Yields the requests received, each answered with ZeptoMail's 201 acceptance.
    """
    received: list[requests.PreparedRequest] = []

    def accept(
        _adapter: HTTPAdapter,
        request: requests.PreparedRequest,
        *_args: object,
        **_kwargs: object,
    ) -> requests.Response:
        received.append(request)
        response = requests.Response()
        response.status_code = 201
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(ACCEPTED_RESPONSE_BODY.encode())
        response.url = request.url or ""
        response.request = request
        return response

    with patch("requests.adapters.HTTPAdapter.send", autospec=True, side_effect=accept):
        yield received


@override_settings(ZOHO_ZEPTOMAIL_API_KEY_TOKEN="test-api-key")
def test_multipart_email_sends_text_and_html_as_separate_fields() -> None:
    message = EmailMultiAlternatives(
        subject="Verify your email",
        body="Plain-text body",
        from_email="CineXplorer <cinexplorer@example.com>",
        to=["user@example.com"],
    )
    message.attach_alternative("<p>HTML body</p>", "text/html")

    with zeptomail_api_stand_in() as received:
        sent = get_connection(base_settings.EMAIL_BACKEND).send_messages([message])

    assert sent == 1
    assert [(request.method, request.url) for request in received] == [
        ("POST", ZEPTOMAIL_SEND_URL)
    ]
    body = received[0].body
    assert isinstance(body, bytes)
    payload = json.loads(body)
    assert payload["textbody"] == "Plain-text body"
    assert payload["htmlbody"] == "<p>HTML body</p>"
