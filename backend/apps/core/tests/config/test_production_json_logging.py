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

with override_settings(TMDB_API_KEY="json-log-private-key-marker"):
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
    assert "/3/genre/movie/list?api_key=[REDACTED]" in diagnostic
    assert record["params"] == {}
    assert "json-log-private-key-marker" not in output
