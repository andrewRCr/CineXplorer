"""Public HTTP contract for the homepage film."""

from unittest.mock import patch

import pytest
from django.test import Client, override_settings

from apps.core.services.api_response import ApiResponse
from apps.movie.featured import FEATURED_FILMS
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET, TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import create_mock_error_response
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail

pytestmark = pytest.mark.django_db


def detail_response(movie_id: int, **kwargs: object) -> ApiResponse:
    movie = create_tmdb_movie_detail(
        movie_id,
        f"Film {movie_id}",
        "1962-12-11",
        8.0,
        backdrop_path="/still.jpg",
        tagline="An epic.",
    )
    data = movie.model_dump()
    if kwargs.get("append_to_response") == "credits":
        data["credits"] = {
            "cast": [],
            "crew": [{"id": 900, "name": "Director", "job": "Director"}],
        }
    return ApiResponse(status_code=200, data=data)


@pytest.mark.parametrize("debug", [False, True])
def test_public_featured_contract(api_client: Client, debug: bool) -> None:
    override = max(entry.tmdb_id for entry in FEATURED_FILMS) + 1
    with (
        override_settings(DEBUG=debug),
        patch(TMDB_CLIENT_GET_MOVIE_DETAILS, side_effect=detail_response),
        patch(TMDB_CLIENT_GET, side_effect=AssertionError("Extra TMDB request")),
    ):
        response = api_client.get(f"/api/movies/featured?film={override}")
    assert response.status_code == 200
    body = response.json()
    movie_id = body["tmdb_id"]
    assert (
        movie_id == override if debug else movie_id in {entry.tmdb_id for entry in FEATURED_FILMS}
    )
    point = next(
        (entry.focus_point for entry in FEATURED_FILMS if entry.tmdb_id == movie_id), None
    )
    assert body == {
        "tmdb_id": movie_id,
        "title": f"Film {movie_id}",
        "release_date": "1962-12-11",
        "backdrop_path": "/still.jpg",
        "tagline": "An epic.",
        "directors": ["Director"],
        "focus_point": point.model_dump() if point is not None else None,
    }


@pytest.mark.parametrize("status", [500, 404])
def test_lookup_failure_has_domain_error_body(api_client: Client, status: int) -> None:
    with patch(
        TMDB_CLIENT_GET_MOVIE_DETAILS, return_value=create_mock_error_response(status_code=status)
    ):
        response = api_client.get("/api/movies/featured")
    assert response.status_code == (404 if status == 404 else 502)
    assert set(response.json()) == {"detail"}
    assert isinstance(response.json()["detail"], str)


def test_malformed_success_is_bad_gateway(api_client: Client) -> None:
    with patch(
        TMDB_CLIENT_GET_MOVIE_DETAILS, return_value=ApiResponse(status_code=200, data={"id": 1})
    ):
        response = api_client.get("/api/movies/featured")
    assert response.status_code == 502
    assert set(response.json()) == {"detail"}
