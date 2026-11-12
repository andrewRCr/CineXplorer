"""Production log records remain structured and safe at their output boundary."""

from __future__ import annotations

import json
from io import BytesIO
from textwrap import indent
from time import strptime
from typing import cast
from unittest import TestCase

import pytest
import requests
from urllib3.response import HTTPResponse

from apps.core.services.base_api_client import BaseApiClient
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.tests.test_helpers import load_settings


def _render(script: str, environment: str) -> str:
    before_import = """
import contextlib
import io
import logging
import logging.config

stdout = io.StringIO()
stderr = io.StringIO()
with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
    settings = importlib.import_module("config.settings")
    logging.config.dictConfig(settings.LOGGING)
"""
    before_import += indent(script, "    ")
    before_import += """
captured_stdout = stdout.getvalue()
logging.shutdown()
"""
    values = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["captured_stdout"],
        before_import=before_import,
    )
    output = values["captured_stdout"]
    assert isinstance(output, str)
    return output


def _one_record(output: str) -> dict[str, object]:
    assert len(output.splitlines()) == 1
    record = json.loads(output)
    assert isinstance(record, dict)
    return cast(dict[str, object], record)


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_deployed_logs_escape_quotes_newlines_and_unicode(environment: str) -> None:
    output = _render(
        r"""
logging.getLogger("cinexplorer").info('Movie "quoted"\nUnicode: %s', "夜")
""",
        environment,
    )
    record = _one_record(output)
    assert record["message"] == 'Movie "quoted"\nUnicode: 夜'


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_deployed_logs_keep_extra_fields_and_existing_metadata(environment: str) -> None:
    output = _render(
        """
logging.getLogger("cinexplorer").info(
    "Processed %s", "movie",
    extra={
        "correlation_id": "json-correlation",
        "error_type": "upstream_error",
        "details": {"attempt": 2, "cached": False, "ids": [10, 20]},
    },
)
""",
        environment,
    )
    record = _one_record(output)
    assert record["correlation_id"] == "json-correlation"
    assert record["error_type"] == "upstream_error"
    assert record["details"] == {"attempt": 2, "cached": False, "ids": [10, 20]}
    assert record["message"] == "Processed movie"
    assert record["level"] == "INFO"
    assert record["logger"] == "cinexplorer"
    assert isinstance(record["module"], str)
    assert record["function"] == "<module>"
    assert isinstance(record["line"], int)
    timestamp = record["timestamp"]
    assert isinstance(timestamp, str)
    strptime(timestamp, "%Y-%m-%d %H:%M:%S")


def test_exception_logs_are_one_json_object_with_their_context() -> None:
    output = _render(
        r"""
try:
    raise ValueError('safe "diagnostic"\nnext line')
except ValueError:
    logging.getLogger("cinexplorer").exception(
        "Operation failed", extra={"correlation_id": "exception-correlation"}
    )
""",
        "production",
    )
    record = _one_record(output)
    assert record["message"] == "Operation failed"
    assert record["correlation_id"] == "exception-correlation"
    exception = record["exc_info"]
    assert isinstance(exception, str)
    assert "ValueError" in exception
    assert 'safe "diagnostic"\nnext line' in exception


@pytest.mark.parametrize("use_base_handler", [True, False])
def test_http_error_logs_keep_metadata_without_raw_response_content(
    use_base_handler: bool,
) -> None:
    marker = "json-log-private-key-marker"
    body = json.dumps({"status_message": f"Request failed for api_key={marker}"}).encode()
    response = requests.Response()
    response.status_code = 503
    response.encoding = "utf-8"
    response.raw = HTTPResponse(body=BytesIO(body), preload_content=False)
    client = TMDBApiClient()
    with TestCase().assertLogs(client.logger.name, level="ERROR") as captured:
        if use_base_handler:
            result = BaseApiClient.process_error_response(
                client, response, "private-response-correlation", "/movie", 1
            )
        else:
            result = client.process_error_response(
                response, "private-response-correlation", "/movie", 1
            )
    assert result.status_code == 503
    assert result.raw_response is response
    assert all(marker not in repr(record.__dict__) for record in captured.records)
    assert all(
        getattr(record, "correlation_id", None) == "private-response-correlation"
        for record in captured.records
    )
    assert all(getattr(record, "status_code", None) == 503 for record in captured.records)
    assert all(
        getattr(record, "response_size_bytes", None) == len(body) for record in captured.records
    )


def test_json_logs_preserve_redaction_of_real_request_errors() -> None:
    output = _render(
        """
import django
django.setup()
from django.test import override_settings
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.tests.test_helpers import closed_local_port

with override_settings(
    TMDB_API_KEY="json-log-private-key-marker",
    TMDB_READ_ACCESS_TOKEN="json-log-private-token-marker",
):
    client = TMDBApiClient(timeout=1)
    client.base_url = f"http://127.0.0.1:{closed_local_port()}/3"
    result = client.get("genre/movie/list")
    assert result.status_code == 502
""",
        "production",
    )
    records = [_one_record(line) for line in output.splitlines()]
    [record] = [record for record in records if record["message"] == "API connection error"]
    assert record["error_type"] == "connection_error"
    diagnostic = record["connection_error"]
    assert isinstance(diagnostic, str)
    assert "/3/genre/movie/list" in diagnostic
    assert "api_key=" not in diagnostic
    assert record["params"] == {}
    assert "json-log-private-key-marker" not in output
    assert "json-log-private-token-marker" not in output


def _render_frontend(payload: dict[str, object], environment: str) -> str:
    return _render(
        f"""
import django
django.setup()
from django.test import Client
response = Client().post(
    "/api/logs/", data={payload!r}, content_type="application/json", secure=True,
)
assert response.status_code == 201, response.content
""",
        environment,
    )


def _frontend_payload() -> dict[str, object]:
    return {
        "level": "ERROR",
        "message": "Email verification error:",
        "timestamp": "2026-11-04T20:00:00Z",
        "correlation_id": "browser-error-correlation",
        "url": "https://example.com/login",
    }


@pytest.mark.parametrize("environment", ["production", "staging"])
@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "https://private-user:private-password@example.com:8443/login"
            "?verify=private-verification#private-fragment",
            "https://example.com:8443/login",
        ),
        ("/login?reset=private-reset#private-fragment", "/login"),
        ("https://[broken?verify=private-verification", ""),
    ],
)
def test_frontend_url_context_omits_credentials(environment: str, url: str, expected: str) -> None:
    payload = {
        **_frontend_payload(),
        "url": url,
        "data": {"context": {"url": url, "previous": url, "action": url, "attempt": 2}},
        "browser_info": {"language": "en-US", "viewport": {"width": 1280, "height": 720}},
        "recent_interactions": [{"type": "navigation", "url": url, "previous": url}],
    }
    output = _render_frontend(payload, environment)
    records = [_one_record(line) for line in output.splitlines()]
    records = [record for record in records if record.get("frontend_log") is True]
    assert {record["logger"] for record in records} == {"frontend", "app"}
    for record in records:
        assert record["frontend_url"] == expected
        assert record["frontend_data"] == {
            "context": {"url": expected, "previous": expected, "action": expected, "attempt": 2}
        }
        assert record["recent_interactions"] == [
            {"type": "navigation", "url": expected, "previous": expected}
        ]
        assert record["browser_info"] == payload["browser_info"]
        assert record["correlation_id"] == "browser-error-correlation"
    assert "private-" not in output


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_frontend_errors_omit_serialized_request_bodies(environment: str) -> None:
    # AxiosError.toJSON serializes config.data as a JSON string, not an object.
    error = {
        "message": "Request failed with status code 500",
        "name": "AxiosError",
        "code": "ERR_BAD_RESPONSE",
        "status": 500,
        "config": {
            "method": "post",
            "url": "/verify-email/",
            "headers": {"Content-Type": "application/json"},
            "data": json.dumps({"key": "private-verification-body"}),
        },
    }
    output = _render_frontend({**_frontend_payload(), "data": error}, environment)
    records = [_one_record(line) for line in output.splitlines()]
    records = [record for record in records if record.get("frontend_log") is True]
    assert records
    for record in records:
        assert record["frontend_data"] == {
            "message": "Request failed with status code 500",
            "name": "AxiosError",
            "code": "ERR_BAD_RESPONSE",
            "status": 500,
        }
        assert record["correlation_id"] == "browser-error-correlation"
    assert "private-verification-body" not in output


def test_frontend_truncated_data_omits_opaque_serialized_content() -> None:
    # Oversized frontend diagnostics arrive as a truncated serialized data string.
    output = _render_frontend(
        {
            **_frontend_payload(),
            "data": {
                "_truncated": True,
                "_originalSize": 12000,
                "data": '{"config":{"data":"private-verification-body"...[truncated]',
            },
        },
        "production",
    )
    records = [_one_record(line) for line in output.splitlines()]
    records = [record for record in records if record.get("frontend_log") is True]
    assert records
    assert all(
        record["frontend_data"] == {"_truncated": True, "_originalSize": 12000}
        for record in records
    )
    assert "private-verification-body" not in output


@pytest.mark.parametrize("environment", ["production", "staging"])
@pytest.mark.parametrize(
    ("referer", "expected"),
    [
        (
            "https://private-user:private-password@example.com/login"
            "?verify=private-verification#private-fragment",
            "https://example.com/login",
        ),
        ("https://[broken?verify=private-verification", ""),
    ],
)
def test_request_logs_sanitize_referer(environment: str, referer: str, expected: str) -> None:
    output = _render(
        f"""
import django
django.setup()
from django.http import HttpResponse
from django.test import RequestFactory
from middleware.logging import RequestLoggingMiddleware
http_request = RequestFactory().get("/api/movies/", HTTP_REFERER={referer!r})
RequestLoggingMiddleware(lambda request: HttpResponse())(http_request)
""",
        environment,
    )
    records = [_one_record(line) for line in output.splitlines()]
    [started] = [record for record in records if record.get("event_type") == "request_start"]
    assert started["referer"] == expected
    assert started["path"] == "/api/movies/"
    assert "private-" not in output


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_request_query_logs_redact_search_text_and_credentials(
    environment: str,
) -> None:
    parameters = {
        "vErIfY": "private-verification",
        "reset": "private-reset",
        "code": "private-oauth-code",
        "state": "private-oauth-state",
        "access_token": "private-access-token",
        "refresh_token": "private-refresh-token",
        "id_token": "private-id-token",
        "key": "private-key",
        "QuErY": "private-search-text",
        "page": "2",
    }
    output = _render(
        f"""
import django
django.setup()
from django.http import HttpResponse
from django.test import RequestFactory
from middleware.logging import RequestLoggingMiddleware
http_request = RequestFactory().get("/accounts/google/login/callback/", data={parameters!r})
middleware = RequestLoggingMiddleware(lambda request: HttpResponse())
middleware(http_request)
try:
    raise ValueError("Safe diagnostic")
except ValueError as exc:
    middleware.process_exception(http_request, exc)
""",
        environment,
    )
    from urllib.parse import parse_qsl, urlsplit

    records = [_one_record(line) for line in output.splitlines()]
    assert {record["event_type"] for record in records} == {
        "request_start",
        "request_complete",
        "request_exception",
    }
    expected = {key: "2" if key == "page" else "[REDACTED]" for key in parameters}
    for record in records:
        full_url = record["full_url"]
        assert isinstance(full_url, str)
        assert dict(parse_qsl(urlsplit(full_url).query)) == expected
        assert record["method"] == "GET"
        assert isinstance(record["correlation_id"], str)
        if record["event_type"] == "request_start":
            query_string = record["query_string"]
            assert isinstance(query_string, str)
            assert dict(parse_qsl(query_string)) == expected
    assert "private-" not in output


@pytest.mark.parametrize("environment", ["production", "staging"])
@pytest.mark.parametrize("failure", [None, "Timeout", "ConnectionError", "RequestException"])
def test_tmdb_logs_redact_search_text_without_changing_the_request(
    environment: str,
    failure: str | None,
) -> None:
    output = _render(
        f"""
import django
django.setup()
import requests
from apps.core.services.tmdb_api_client import TMDBApiClient
from urllib.parse import parse_qs, urlsplit
from apps.core.tests.integration.test_tmdb_authentication import tmdb_transport
error_type = getattr(requests.exceptions, {failure!r}) if {failure!r} else None
params = {{
    "query": ["private-search &/夜", "private-second-search"],
    "page": 2,
    "api_key": "private-api-key",
    "access_token": "private-access-token",
}}
original = params.copy()
with tmdb_transport(error_type) as received:
    result = TMDBApiClient().get("search/movie", params=params)
expected_status = 200 if error_type is None else 504 if {failure!r} == "Timeout" else 502
assert result.status_code == expected_status
[prepared] = received
assert parse_qs(urlsplit(prepared.url).query) == {{"query": params["query"], "page": ["2"]}}
assert params == original
""",
        environment,
    )
    records = [_one_record(line) for line in output.splitlines()]
    [started] = [record for record in records if record["message"] == "API request started"]
    assert started["params"] == {"query": "[REDACTED]", "page": 2}
    if failure is not None:
        [error] = [record for record in records if record["level"] == "ERROR"]
        assert error["params"] == started["params"]
    assert "private-" not in output


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_not_found_logs_omit_the_raw_request_and_keep_safe_metadata(environment: str) -> None:
    output = _render(
        """
import django
django.setup()
from django.test import Client
response = Client().get(
    "/api/redaction-probe/",
    data={"code": "private-code", "key": "private-key", "query": "private-search", "page": "2"},
    HTTP_REFERER="https://example.com/login?key=private-referer-key",
    HTTP_X_FORWARDED_PROTO="https",
)
assert response.status_code == 404
""",
        environment,
    )
    records = [_one_record(line) for line in output.splitlines()]
    [django_record] = [record for record in records if record["logger"] == "django.request"]
    assert django_record["status_code"] == 404
    assert django_record["message"] == "Not Found: /api/redaction-probe/"
    [started] = [record for record in records if record.get("event_type") == "request_start"]
    [completed] = [record for record in records if record.get("event_type") == "request_complete"]
    assert started["path"] == completed["path"] == "/api/redaction-probe/"
    assert started["referer"] == "https://example.com/login"
    assert completed["status_code"] == 404
    assert started["correlation_id"] == completed["correlation_id"]
    assert isinstance(started["correlation_id"], str)
    assert all("request" not in record for record in records)
    assert "private-" not in output
