"""Public HTTP contract for the homepage film."""

from unittest.mock import patch

import pytest
from django.test import Client, override_settings

from apps.core.services.api_response import ApiResponse
from apps.movie.featured import FEATURED_FILM_IDS
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
    return ApiResponse(status_code=200, data=movie.model_dump())


@pytest.mark.parametrize("debug", [False, True])
def test_public_featured_contract(api_client: Client, debug: bool) -> None:
    override = max(FEATURED_FILM_IDS) + 1
    with (
        override_settings(DEBUG=debug),
        patch(TMDB_CLIENT_GET_MOVIE_DETAILS, side_effect=detail_response),
        patch(TMDB_CLIENT_GET, side_effect=AssertionError("Extra TMDB request")),
    ):
        response = api_client.get(f"/api/movies/featured?film={override}")
    assert response.status_code == 200
    body = response.json()
    movie_id = body["tmdb_id"]
    assert movie_id == override if debug else movie_id in FEATURED_FILM_IDS
    assert body == {
        "tmdb_id": movie_id,
        "title": f"Film {movie_id}",
        "release_date": "1962-12-11",
        "backdrop_path": "/still.jpg",
        "tagline": "An epic.",
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
