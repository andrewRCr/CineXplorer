"""Search and detail identify a film by its primary release date."""

from __future__ import annotations

import io
from datetime import date
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from django.test import Client, override_settings
from requests.adapters import HTTPAdapter

from apps.movie.services.api_boundary import SearchServiceParams
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
    create_tmdb_movie_detail,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def regional_tmdb(monkeypatch: pytest.MonkeyPatch) -> None:
    """Model TMDB's regional search date and primary detail date at HTTP transport."""

    def respond(
        _adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        assert request.url is not None
        url = urlsplit(request.url)
        if url.path == "/3/search/movie":
            # TMDB presents a country's date when region is supplied, primary otherwise.
            query = parse_qs(url.query)
            release = "1998-03-11" if query.get("region") == ["US"] else "1997-09-11"
            movie = create_tmdb_movie(10234, "Funny Games", release, 7.3)
            payload = create_paginated_tmdb_response([movie]).model_dump_json()
        elif url.path == "/3/movie/10234":
            payload = create_tmdb_movie_detail(
                10234, "Funny Games", "1997-09-11", 7.3
            ).model_dump_json()
        elif url.path == "/3/movie/10234/credits":
            payload = '{"cast": [], "crew": []}'
        else:
            raise AssertionError(f"Unexpected TMDB endpoint: {url.path}")

        response = requests.Response()
        response.status_code = 200
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(payload.encode())
        response.url = request.url
        response.request = request
        return response

    monkeypatch.setattr(HTTPAdapter, "send", respond)


@pytest.mark.usefixtures("regional_tmdb")
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_search_and_detail_return_the_same_primary_release_date(api_client: Client) -> None:
    search = api_client.get("/api/movies/search", {"query": "Funny Games"})
    detail = api_client.get("/api/movies/10234")

    assert search.status_code == detail.status_code == 200
    [movie] = search.json()["results"]
    assert movie["tmdb_id"] == detail.json()["tmdb_id"] == 10234
    assert movie["release_date"] == detail.json()["release_date"] == "1997-09-11"


@pytest.mark.parametrize(("year", "expected_ids"), [(1997, [10234]), (1998, [])])
@pytest.mark.usefixtures("regional_tmdb")
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_search_year_bounds_use_the_primary_release(year: int, expected_ids: list[int]) -> None:
    results = (
        MovieService()
        .search_movies(
            params=SearchServiceParams(query="Funny Games", year_min=year, year_max=year)
        )
        .results
    )

    assert [movie.tmdb_id for movie in results] == expected_ids
    assert all(movie.release_date == date(1997, 9, 11) for movie in results)
