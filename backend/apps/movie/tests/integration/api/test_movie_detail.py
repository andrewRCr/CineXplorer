"""Integration tests for movie detail endpoint.

Tests the /api/movies/{tmdb_id} endpoint which returns detailed movie information
including user-specific data when authenticated.
"""

from typing import cast
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client

from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET, TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import create_mock_movie_detail_response
from apps.user_movie_data.models import UserMovieData

pytestmark = pytest.mark.django_db


def movie_detail_url(tmdb_id: int) -> str:
    """Return the detail URL for a movie by TMDB ID."""
    return f"/api/movies/{tmdb_id}"


def create_movie_stub(
    tmdb_id: int,
    title: str = "Default Movie Title",
    poster_path: str | None = "/default.jpg",
    release_date: str | None = "2025-01-01",
) -> Movie:
    """Create and return a new Movie stub object for testing."""
    return Movie.objects.create(
        tmdb_id=tmdb_id,
        title=title,
        poster_path=poster_path,
        release_date=release_date,
    )


@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_movie_detail_authenticated(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    api_client: Client,
    user: object,
) -> None:
    """Test retrieving movie details with user_movie_data for an authenticated user."""
    # Arrange: Create the local movie stub and user data
    movie_stub = create_movie_stub(78, title="Blade Runner")
    UserMovieData.objects.create(
        user=user,  # type: ignore[arg-type]
        movie=movie_stub,
        user_rating=9,
        user_review="Great movie!",
    )

    # Arrange: Mock the TMDB client API responses for movie info and credits
    mock_info_response = create_mock_movie_detail_response(
        tmdb_id=78,
        title="Blade Runner",
        overview="A classic.",
        poster_path="/br.jpg",
        release_date="1982-06-25",
        vote_average=8.1,
        vote_count=100,
    )

    mock_credits_response = ApiResponse(
        status_code=200,
        data={"crew": [], "cast": []},
    )

    # Set up the mock returns for each TMDB client method
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act
    api_client.force_login(cast(AbstractBaseUser, user))
    url = movie_detail_url(movie_stub.tmdb_id)
    res = api_client.get(url)

    # Assert
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert data["tmdb_id"] == movie_stub.tmdb_id
    assert "title" in data
    assert "user_movie_data" in data
    user_data = data["user_movie_data"]
    # User integration now implemented (Task 7 - OAuth headless migration)
    # Movie detail endpoint enriches response with user-specific data
    assert user_data is not None
    assert user_data["user_rating"] == 9
    assert user_data["user_review"] == "Great movie!"


@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_movie_detail_unauthenticated(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    api_client: Client,
) -> None:
    """Test retrieving movie details without user_movie_data for an unauthenticated user."""
    # Arrange
    tmdb_id = 78
    create_movie_stub(tmdb_id, title="Blade Runner")

    mock_info_response = create_mock_movie_detail_response(
        tmdb_id=tmdb_id,
        title="Blade Runner",
        overview="A classic.",
        poster_path="/br.jpg",
        release_date="1982-06-25",
        vote_average=8.1,
        vote_count=100,
    )
    mock_credits_response = ApiResponse(
        status_code=200,
        data={"crew": [], "cast": []},
    )
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act
    url = movie_detail_url(tmdb_id)
    res = api_client.get(url)

    # Assert
    assert res.status_code == HTTPStatus.OK
    data = res.json()
    assert data["tmdb_id"] == tmdb_id
    assert "user_movie_data" in data
    assert data["user_movie_data"] is None
