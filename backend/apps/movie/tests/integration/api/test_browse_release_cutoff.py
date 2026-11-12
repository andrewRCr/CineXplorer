"""Newest-first browse defaults to released films through the external TMDB boundary."""

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
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)

pytestmark = pytest.mark.django_db

TODAY = "2026-11-12"
TODAY_ID = 1_100_001
TOMORROW_ID = 1_100_002


@pytest.fixture
def tmdb_dates(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, list[str]]]:
    """Serve dated films using the actual prepared discover query."""
    clock = Mock(wraps=datetime)
    clock.now.return_value = datetime(2026, 11, 12, 12, tzinfo=UTC)
    monkeypatch.setattr(movie_service, "datetime", clock)
    movies = [
        create_tmdb_movie(TODAY_ID, "The Harbor", TODAY, 0.0, vote_count=0),
        create_tmdb_movie(TOMORROW_ID, "The Horizon", "2026-11-13", 0.0, vote_count=0),
        create_tmdb_movie(1_100_003, "The Crossing", "2026-11-22", 0.0, vote_count=0),
        create_tmdb_movie(1_100_004, "The Journey", "2030-07-01", 8.0, vote_count=100),
    ]
    received: list[dict[str, list[str]]] = []

    def respond(
        _adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        assert request.url is not None
        url = urlsplit(request.url)
        assert url.path == "/3/discover/movie"
        query = parse_qs(url.query)
        received.append(query)
        selected = list(movies)
        if "primary_release_date.gte" in query:
            selected = [
                movie
                for movie in selected
                if movie.release_date is not None
                and movie.release_date >= query["primary_release_date.gte"][0]
            ]
        if "primary_release_date.lte" in query:
            selected = [
                movie
                for movie in selected
                if movie.release_date is not None
                and movie.release_date <= query["primary_release_date.lte"][0]
            ]
        if "year" in query:
            selected = [
                movie
                for movie in selected
                if movie.release_date is not None and movie.release_date[:4] == query["year"][0]
            ]
        if query.get("sort_by") == ["primary_release_date.desc"]:
            selected.sort(key=lambda movie: movie.release_date or "", reverse=True)
        payload = create_paginated_tmdb_response(selected).model_dump_json().encode()
        response = requests.Response()
        response.status_code = 200
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(payload)
        response.url = request.url
        response.request = request
        return response

    monkeypatch.setattr(HTTPAdapter, "send", respond)
    return received


@pytest.mark.parametrize("sort_by", ["release_date.desc", "primary_release_date.desc"])
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_newest_browse_includes_today_and_excludes_tomorrow(
    api_client: Client, tmdb_dates: list[dict[str, list[str]]], sort_by: str
) -> None:
    response = api_client.get("/api/movies/browse", {"sort_by": sort_by})

    assert response.status_code == 200
    assert [movie["tmdb_id"] for movie in response.json()["results"]] == [TODAY_ID]
    [query] = tmdb_dates
    assert query["primary_release_date.lte"] == [TODAY]


@pytest.mark.parametrize("sort_by", ["release_date.desc", "primary_release_date.desc"])
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_direct_newest_discovery_shares_cutoff_without_mutating_caller(
    tmdb_dates: list[dict[str, list[str]]],
    sort_by: str,
) -> None:
    params = BrowseServiceParams(sort_by=sort_by, min_vote_count=None)
    original = params.model_dump()

    result = MovieService().discover_movies(params=params)

    assert [movie.tmdb_id for movie in result.results] == [TODAY_ID]
    assert params.model_dump() == original
    [query] = tmdb_dates
    assert query["primary_release_date.lte"] == [TODAY]


@pytest.mark.parametrize(
    ("query", "upper", "lower"),
    [
        ({"sort_by": "release_date.desc", "year": "2030"}, None, None),
        (
            {"sort_by": "release_date.desc", "release_date_gte": "2030-01-01"},
            None,
            "2030-01-01",
        ),
        (
            {"sort_by": "release_date.desc", "release_date_lte": "2030-12-31"},
            "2030-12-31",
            None,
        ),
        ({"sort_by": "popularity.desc"}, None, None),
    ],
    ids=["explicit-year", "lower-bound-only", "explicit-upper-bound", "popular-order"],
)
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_explicit_horizons_and_other_orders_keep_future_films(
    api_client: Client,
    tmdb_dates: list[dict[str, list[str]]],
    query: dict[str, str],
    upper: str | None,
    lower: str | None,
) -> None:
    response = api_client.get("/api/movies/browse", query)

    assert response.status_code == 200
    assert 1_100_004 in {movie["tmdb_id"] for movie in response.json()["results"]}
    [prepared_query] = tmdb_dates
    assert prepared_query.get("primary_release_date.lte") == ([upper] if upper else None)
    assert prepared_query.get("primary_release_date.gte") == ([lower] if lower else None)


@pytest.mark.parametrize("bounds", [{"year_min": 2030}, {"year_max": 2030}])
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_direct_year_bounds_preserve_the_requested_horizon(
    tmdb_dates: list[dict[str, list[str]]], bounds: dict[str, int]
) -> None:
    params = BrowseServiceParams.model_validate(
        {"sort_by": "release_date.desc", "min_vote_count": None, **bounds}
    )

    result = MovieService().discover_movies(params=params)

    assert 1_100_004 in {movie.tmdb_id for movie in result.results}
    [query] = tmdb_dates
    assert "primary_release_date.lte" not in query


@pytest.mark.parametrize(
    ("endpoint", "upper", "future_id"),
    [
        ("now-playing", "2026-11-17", TOMORROW_ID),
        ("upcoming", "2027-01-16", 1_100_003),
    ],
)
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_newest_release_windows_keep_their_future_upper_bounds(
    api_client: Client,
    tmdb_dates: list[dict[str, list[str]]],
    endpoint: str,
    upper: str,
    future_id: int,
) -> None:
    response = api_client.get(f"/api/movies/{endpoint}", {"sort_by": "release_date.desc"})

    assert response.status_code == 200
    assert future_id in {movie["tmdb_id"] for movie in response.json()["results"]}
    [query] = tmdb_dates
    assert query["primary_release_date.lte"] == [upper]
