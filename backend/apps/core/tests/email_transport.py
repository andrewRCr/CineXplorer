"""A requests transport boundary for transactional email tests."""

from __future__ import annotations

import io
import json
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass, field
from unittest.mock import patch

import requests
from requests import PreparedRequest
from requests.adapters import HTTPAdapter

ACCEPTED_RESPONSE_BODY = json.dumps(
    {
        "data": [{"code": "EM_104", "additional_info": [], "message": "Email request received"}],
        "message": "OK",
        "request_id": "test-request",
        "object": "email",
    }
)
# Error envelope documented at https://www.zoho.com.cn/zeptomail/help/api/email-sending.html.
ERROR_RESPONSE_BODY = json.dumps(
    {
        "error": {
            "code": "TM_4001",
            "details": [
                {"code": "SM_113", "message": "Invalid email address", "target": "bounce_address"}
            ],
            "message": "Access Denied",
            "request_id": "failed-request",
        },
    }
)


@dataclass
class MailTransport:
    requests: list[PreparedRequest] = field(default_factory=list[PreparedRequest])
    timeouts: list[object] = field(default_factory=list[object])


@contextmanager
def zeptomail_api_stand_in(
    *,
    status: int = 201,
    body: str = ACCEPTED_RESPONSE_BODY,
    error: requests.RequestException | None = None,
) -> Generator[MailTransport]:
    received = MailTransport()

    def respond(
        _adapter: HTTPAdapter,
        request: requests.PreparedRequest,
        *_args: object,
        **kwargs: object,
    ) -> requests.Response:
        received.requests.append(request)
        received.timeouts.append(kwargs.get("timeout"))
        if error is not None:
            raise error
        response = requests.Response()
        response.status_code = status
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(body.encode())
        response.url = request.url or ""
        response.request = request
        return response

    with patch("requests.adapters.HTTPAdapter.send", autospec=True, side_effect=respond):
        yield received
