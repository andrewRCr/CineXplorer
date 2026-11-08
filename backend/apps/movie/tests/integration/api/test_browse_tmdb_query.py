"""Browse pagination sends only TMDB query parameters upstream."""

from __future__ import annotations

import io
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from django.test import Client, override_settings
from requests.adapters import HTTPAdapter

from apps.movie.tests.tmdb_test_builders import (
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


@pytest.mark.django_db
@override_settings(TMDB_READ_ACCESS_TOKEN="synthetic-read-token")
def test_browse_cursor_selects_page_without_becoming_a_tmdb_query_parameter(
    api_client: Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    movies = [
        create_tmdb_movie(movie_id, f"Movie {movie_id}", "2023-01-01", 8.0)
        for movie_id in range(1_000_001, 1_000_021)
    ]
    payload = (
        create_paginated_tmdb_response(movies, page=5, total_pages=10, total_results=200)
        .model_dump_json()
        .encode()
    )
    received: list[requests.PreparedRequest] = []

    def respond(
        _adapter: HTTPAdapter, request: requests.PreparedRequest, *_args: object, **_kwargs: object
    ) -> requests.Response:
        received.append(request)
        response = requests.Response()
        response.status_code = 200
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.raw = io.BytesIO(payload)
        response.url = request.url or ""
        response.request = request
        return response

    monkeypatch.setattr(HTTPAdapter, "send", respond)
    response = api_client.get(
        "/api/movies/browse", {"page": 1, "tmdb_page_start": 5, "with_genres": "18"}
    )

    assert response.status_code == 200
    assert {movie["tmdb_id"] for movie in response.json()["results"]} == {
        movie.id for movie in movies
    }
    assert response.json()["next_tmdb_page_start"] == 6
    [request] = received
    assert request.url is not None
    url = urlsplit(request.url)
    assert url.path == "/3/discover/movie"
    query = parse_qs(url.query)
    assert query["page"] == ["5"]
    assert query["with_genres"] == ["18"]
    assert "tmdb_page_start" not in query
