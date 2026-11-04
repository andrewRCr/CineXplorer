"""Privacy checks for failures from authentication and mail dependencies."""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from io import BytesIO
from unittest import TestCase

import pytest
import requests
from django.core.mail import EmailMessage
from django.core.mail.backends.base import BaseEmailBackend
from django.http import HttpResponse
from django.test import RequestFactory, override_settings
from ninja_jwt.tokens import RefreshToken
from urllib3.response import HTTPResponse

from apps.authentication.services.authentication_service import AuthenticationService
from apps.authentication.utils import get_jwt_settings
from apps.core.services.email_service import send_welcome_email

PRIVATE_MARKER = "private-provider-value-7d2b@example.invalid"


class FailingRefreshToken(RefreshToken):
    """Token decoder that cannot complete its dependency operation."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        raise RuntimeError(PRIVATE_MARKER)


class FailingEmailBackend(BaseEmailBackend):
    """Mail transport that reports an exception containing a recipient."""

    def send_messages(self, email_messages: Iterable[EmailMessage]) -> int:
        raise RuntimeError(PRIVATE_MARKER)


@dataclass
class Recipient:
    """User fields consumed by the welcome template and transport."""

    id: int = 7
    username: str = "reader"
    email: str = PRIVATE_MARKER


def test_refresh_failure_preserves_response_without_logging_dependency_text() -> None:
    service = AuthenticationService(refresh_token_cls=FailingRefreshToken)
    request = RequestFactory().post("/api/token/refresh/")
    request.COOKIES[get_jwt_settings().refresh_token_name] = "test-refresh-value"
    with TestCase().assertLogs("cinexplorer.auth", level="ERROR") as captured:
        status, payload = service.refresh_token(request, HttpResponse())

    assert status == 400
    assert payload == {"error": "An error occurred during token refresh. Please try again."}
    assert PRIVATE_MARKER not in " ".join(captured.output)
    assert "RuntimeError" in " ".join(captured.output)
    assert all(PRIVATE_MARKER not in repr(record.__dict__) for record in captured.records)
    assert all(record.exc_info is None for record in captured.records)


@override_settings(EMAIL_BACKEND="apps.core.tests.unit.test_exception_logging.FailingEmailBackend")
def test_welcome_failure_stays_best_effort_without_logging_recipient() -> None:
    with TestCase().assertLogs("apps.core.services.email_service", level="ERROR") as captured:
        delivered = send_welcome_email(Recipient())

    assert delivered is False
    assert PRIVATE_MARKER not in " ".join(captured.output)
    assert "RuntimeError" in " ".join(captured.output)
    assert all(PRIVATE_MARKER not in repr(record.__dict__) for record in captured.records)
    assert all(record.exc_info is None for record in captured.records)


@pytest.mark.parametrize("use_base_parser", [True, False])
def test_invalid_json_logging_excludes_response_body(use_base_parser: bool) -> None:
    """Both HTTP response parsers report metadata without response text."""
    from apps.core.services.base_api_client import BaseApiClient
    from apps.core.services.tmdb_api_client import TMDBApiClient

    client = TMDBApiClient()
    response = requests.Response()
    response.status_code = 200
    response.encoding = "utf-8"
    response.raw = HTTPResponse(body=BytesIO(PRIVATE_MARKER.encode()), preload_content=False)
    with TestCase().assertLogs(client.logger.name, level="ERROR") as captured:
        if use_base_parser:
            result = BaseApiClient.process_successful_response(
                client, response, "test-correlation", "/movie", 1
            )
        else:
            result = client.process_successful_response(response, "test-correlation", "/movie", 1)
    assert result.status_code == (500 if use_base_parser else 502)
    assert "JSONDecodeError" in " ".join(captured.output)
    assert all(PRIVATE_MARKER not in repr(record.__dict__) for record in captured.records)
    assert all(record.exc_info is None for record in captured.records)


def test_debug_response_logging_keeps_all_json_rows_and_response_data() -> None:
    """Detailed diagnostics preserve movie order and malformed-row placeholders."""
    from apps.core.services.tmdb_api_client import TMDBApiClient

    payload = {
        "page": 1,
        "total_pages": 1,
        "results": [{"id": 1, "title": "First"}, None, {"id": 2, "title": "Last"}],
    }
    response = requests.Response()
    response.status_code = 200
    response.encoding = "utf-8"
    response.raw = HTTPResponse(body=BytesIO(json.dumps(payload).encode()), preload_content=False)
    client = TMDBApiClient()
    with TestCase().assertLogs(client.logger.name, level="DEBUG") as captured:
        result = client.process_successful_response(response, "test-correlation", "/movie", 1)

    assert result.status_code == 200
    assert result.data == payload
    details = next(
        record.getMessage()
        for record in captured.records
        if "ALL 3 results" in record.getMessage()
    )
    assert details.index("First") < details.index("Last")
    assert "'tmdb_id': None" in details
