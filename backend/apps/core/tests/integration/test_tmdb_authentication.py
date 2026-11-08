"""TMDB authentication stays in prepared request headers."""

from __future__ import annotations

import io
import json
import logging
from collections.abc import Generator
from contextlib import contextmanager
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from requests.adapters import HTTPAdapter

from apps.core.services.tmdb_api_client import TMDBApiClient

LEGACY_KEY = "legacy-key-must-not-travel"
READ_TOKEN = "tmdb-read-token-must-stay-in-header"


@contextmanager
def tmdb_transport() -> Generator[list[requests.PreparedRequest]]:
    received: list[requests.PreparedRequest] = []

    def respond(
        _adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        received.append(request)
        response = requests.Response()
        response.status_code = 200
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(
            json.dumps({"page": 1, "results": [], "total_pages": 0, "total_results": 0}).encode()
        )
        response.url = request.url or ""
        response.request = request
        return response

    with patch("requests.adapters.HTTPAdapter.send", autospec=True, side_effect=respond):
        yield received


@override_settings(TMDB_API_KEY=LEGACY_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
@pytest.mark.parametrize(
    "headers",
    [
        None,
        {"authorization": "Bearer caller-token"},
        {"Authorization": "Bearer first-token", "authorization": "Bearer second-token"},
    ],
)
def test_prepared_request_uses_only_the_configured_bearer_credential(
    headers: dict[str, str] | None,
) -> None:
    params: dict[str, object] = {
        "page": 1,
        "language": "en-US",
        "api_key": LEGACY_KEY,
        "access_token": READ_TOKEN,
    }
    original_params = params.copy()
    with tmdb_transport() as received:
        response = TMDBApiClient().get("movie/popular", params=params, headers=headers)

    assert response.is_success()
    [request] = received
    assert request.url is not None
    assert parse_qs(urlsplit(request.url).query) == {"page": ["1"], "language": ["en-US"]}
    assert LEGACY_KEY not in request.url
    assert READ_TOKEN not in request.url
    assert request.headers["Authorization"] == f"Bearer {READ_TOKEN}"
    assert sum(name.lower() == "authorization" for name in request.headers) == 1
    assert params == original_params


@override_settings(TMDB_API_KEY=LEGACY_KEY)
@pytest.mark.parametrize("token", [None, ""])
def test_missing_read_token_does_not_fall_back_to_the_legacy_key(token: str | None) -> None:
    with (
        override_settings(TMDB_READ_ACCESS_TOKEN=token),
        tmdb_transport() as received,
        pytest.raises(ImproperlyConfigured, match="TMDB_READ_ACCESS_TOKEN"),
    ):
        TMDBApiClient().get("movie/popular")
    assert received == []


@override_settings(TMDB_READ_ACCESS_TOKEN="private-prefix\nprivate-suffix")
def test_invalid_header_keeps_credential_fragments_out_of_errors_and_logs(
    caplog: pytest.LogCaptureFixture,
) -> None:
    logger = logging.getLogger("cinexplorer.tmdb")
    logger.addHandler(caplog.handler)
    try:
        with caplog.at_level(logging.DEBUG, logger=logger.name), tmdb_transport() as received:
            response = TMDBApiClient().get("movie/popular")
    finally:
        logger.removeHandler(caplog.handler)

    assert response.status_code == 502
    assert received == []
    exposed = f"{response.error_message} {response.error_details}"
    logged = repr([record.__dict__ for record in caplog.records])
    for fragment in ["private-prefix", "private-suffix"]:
        assert fragment not in exposed
        assert fragment not in logged
