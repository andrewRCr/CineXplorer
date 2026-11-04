"""Movie endpoints answer an unreachable TMDB with a fixed gateway error.

TMDB is made unreachable by pointing every request at a closed local port, so
requests raises a real connection error whose text includes the request URL and
its API key. The client must see neither.
"""

from __future__ import annotations

import pytest
from django.test import Client, override_settings

from apps.core.services.base_api_client import BaseApiClient
from apps.core.tests.test_helpers import closed_local_port

SECRET_KEY = "tmdb-key-that-must-not-leak"


@pytest.fixture
def tmdb_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Send every TMDB request to a local port with nothing listening on it."""
    port = closed_local_port()

    def build_url(self: BaseApiClient, endpoint: str) -> str:
        return f"http://127.0.0.1:{port}/3/{endpoint.lstrip('/')}"

    monkeypatch.setattr(BaseApiClient, "build_url", build_url)


@pytest.mark.django_db
@pytest.mark.usefixtures("tmdb_unreachable")
@override_settings(TMDB_API_KEY=SECRET_KEY)
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
    assert "Max retries" not in body
    assert response.json() == {"detail": "External API error"}
