"""Real TMDB connection failures expose neither credential nor upstream text."""

from __future__ import annotations

import logging
import socket
from collections.abc import Iterator

import pytest
from django.test import override_settings

from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.tests.test_helpers import closed_local_port

SECRET_KEY = "tmdb-key-that-must-not-leak"
READ_TOKEN = "tmdb-read-token-that-must-not-leak"


@pytest.fixture
def silent_port() -> Iterator[int]:
    """Yield a local port that accepts connections but never answers."""
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen()
        yield sock.getsockname()[1]


@pytest.fixture
def tmdb_log_records() -> Iterator[list[logging.LogRecord]]:
    """Collect the TMDB client's log records, which do not propagate to the root logger."""
    records: list[logging.LogRecord] = []

    class Collect(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            records.append(record)

    handler = Collect()
    logger = logging.getLogger("cinexplorer.tmdb")
    logger.addHandler(handler)
    try:
        yield records
    finally:
        logger.removeHandler(handler)


def client_for(port: int, timeout: int = 5) -> TMDBApiClient:
    """Build a TMDB client that sends its requests to a local port."""
    client = TMDBApiClient(timeout=timeout)
    client.base_url = f"http://127.0.0.1:{port}/3"
    return client


def logged_field(records: list[logging.LogRecord], message: str, field: str) -> str:
    """Return one extra field of the single record logged with the given message."""
    [record] = [r for r in records if r.getMessage() == message]
    return str(record.__dict__[field])


@override_settings(TMDB_API_KEY=SECRET_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
def test_connection_error_keeps_key_and_upstream_text_out_of_the_response(
    tmdb_log_records: list[logging.LogRecord],
) -> None:
    response = client_for(closed_local_port()).get("genre/movie/list")

    assert response.status_code == 502
    exposed = f"{response.error_message} {response.error_details}"
    assert SECRET_KEY not in exposed
    assert READ_TOKEN not in exposed
    for record in tmdb_log_records:
        assert SECRET_KEY not in repr(record.__dict__)
        assert READ_TOKEN not in repr(record.__dict__)
    assert "Max retries" not in exposed
    assert "127.0.0.1" not in exposed


@override_settings(TMDB_API_KEY=SECRET_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
def test_connection_error_log_keeps_a_credential_free_url(
    tmdb_log_records: list[logging.LogRecord],
) -> None:
    client_for(closed_local_port()).get("genre/movie/list")

    logged = logged_field(tmdb_log_records, "API connection error", "connection_error")
    assert "/3/genre/movie/list" in logged
    assert "api_key=" not in logged
    assert READ_TOKEN not in logged
    assert SECRET_KEY not in logged


@override_settings(TMDB_API_KEY=SECRET_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
def test_timeout_maps_to_gateway_timeout_without_upstream_text(
    silent_port: int, tmdb_log_records: list[logging.LogRecord]
) -> None:
    response = client_for(silent_port, timeout=1).get("genre/movie/list")

    assert response.status_code == 504
    exposed = f"{response.error_message} {response.error_details}"
    assert SECRET_KEY not in exposed
    assert READ_TOKEN not in exposed
    for record in tmdb_log_records:
        assert SECRET_KEY not in repr(record.__dict__)
        assert READ_TOKEN not in repr(record.__dict__)
    assert "read timeout=" not in exposed
    logged = logged_field(tmdb_log_records, "API request timeout", "timeout_error")
    assert SECRET_KEY not in logged


@override_settings(TMDB_API_KEY=SECRET_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
def test_request_leaves_the_callers_params_without_the_key() -> None:
    params: dict[str, object] = {"page": 1}

    client_for(closed_local_port()).get("movie/popular", params)

    assert params == {"page": 1}
