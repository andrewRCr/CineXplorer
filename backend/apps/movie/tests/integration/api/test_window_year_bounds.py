"""Curated release windows ignore year bounds derived from caller dates."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from unittest.mock import Mock
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from django.test import Client, override_settings
from requests.adapters import HTTPAdapter

from apps.movie.services import movie_service
from apps.movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("endpoint", "movie_date", "lower", "upper"),
    [
        ("now-playing", "2026-11-12", "2026-10-13", "2026-11-17"),
        ("upcoming", "2026-11-22", "2026-11-17", "2027-01-16"),
    ],
)
@pytest.mark.parametrize(
    ("date_filter", "value"),
    [
        ("release_date_gte", "2030-01-01"),
        ("release_date_lte", "2000-12-31"),
    ],
    ids=["derived-lower-year", "derived-upper-year"],
)
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_release_window_ignores_derived_year_bounds(
    api_client: Client,
    monkeypatch: pytest.MonkeyPatch,
    endpoint: str,
    movie_date: str,
    lower: str,
    upper: str,
    date_filter: str,
    value: str,
) -> None:
    clock = Mock(wraps=datetime)
    clock.now.return_value = datetime(2026, 11, 12, 12, tzinfo=UTC)
    monkeypatch.setattr(movie_service, "datetime", clock)
    movie = create_tmdb_movie(1_101_001, "The Crossing", movie_date, 8.0)
    received: list[dict[str, list[str]]] = []

    def respond(
        _adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        assert request.url is not None
        url = urlsplit(request.url)
        assert url.path == "/3/discover/movie"
        query = parse_qs(url.query)
        received.append(query)
        start = query.get("primary_release_date.gte", ["0001-01-01"])[0]
        end = query.get("primary_release_date.lte", ["9999-12-31"])[0]
        films = [movie] if start <= movie_date <= end else []
        payload = create_paginated_tmdb_response(films).model_dump_json().encode()
        response = requests.Response()
        response.status_code = 200
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(payload)
        response.url = request.url
        response.request = request
        return response

    monkeypatch.setattr(HTTPAdapter, "send", respond)

    response = api_client.get(f"/api/movies/{endpoint}", {date_filter: value, "genres": "18"})

    assert response.status_code == 200
    assert [item["tmdb_id"] for item in response.json()["results"]] == [movie.id]
    [query] = received
    assert query["primary_release_date.gte"] == [lower]
    assert query["primary_release_date.lte"] == [upper]
    assert query["with_genres"] == ["18"]
