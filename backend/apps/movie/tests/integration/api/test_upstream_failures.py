"""Movie endpoints answer an unreachable TMDB with a fixed gateway error."""

from __future__ import annotations

from urllib.parse import urlsplit

import pytest
import requests
from django.test import Client, override_settings
from requests.adapters import HTTPAdapter

from apps.core.tests.test_helpers import closed_local_port

SECRET_KEY = "tmdb-key-that-must-not-leak"
READ_TOKEN = "tmdb-read-token-that-must-not-leak"


@pytest.fixture
def tmdb_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Send every TMDB request to a local port with nothing listening on it."""
    port = closed_local_port()

    send = HTTPAdapter.send

    def refuse_at_local_socket(
        adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        assert request.url is not None
        url = urlsplit(request.url)
        request.url = f"http://127.0.0.1:{port}{url.path}"
        if url.query:
            request.url += f"?{url.query}"
        return send(adapter, request, timeout=2)

    monkeypatch.setattr(HTTPAdapter, "send", refuse_at_local_socket)


@pytest.mark.django_db
@pytest.mark.usefixtures("tmdb_unreachable")
@override_settings(TMDB_API_KEY=SECRET_KEY, TMDB_READ_ACCESS_TOKEN=READ_TOKEN)
@pytest.mark.parametrize(
    "path",
    [
        "/api/genres",  # typed validator
        "/api/movies/now-playing",  # typed paginated validator
        "/api/movies/550",  # error mapper, movie details
        "/api/keywords",  # error mapper, validated response helper
    ],
)
def test_unreachable_tmdb_returns_a_fixed_bad_gateway(api_client: Client, path: str) -> None:
    response = api_client.get(path)

    assert response.status_code == 502
    body = response.content.decode()
    assert SECRET_KEY not in body
    assert READ_TOKEN not in body
    assert "Max retries" not in body
    assert response.json() == {"detail": "External API error"}
