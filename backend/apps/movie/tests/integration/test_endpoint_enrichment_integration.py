"""Integration tests for movie endpoint enrichment.

These tests verify that movie discovery endpoints correctly integrate with
the MovieEnrichmentService to populate user_movie_data fields for authenticated users.

This is retroactive test coverage for Task 7 (OAuth headless migration) where
the enrichment integration was implemented before tests were written.

Tests verify:
    - Discovery endpoints include user_movie_data for authenticated users
    - Discovery endpoints work for unauthenticated users (user_movie_data is None)
    - Detail endpoint includes user_movie_data for authenticated users
    - Enrichment is transparent (doesn't break existing API contract)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth.base_user import AbstractBaseUser
from django.test import Client

from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET, TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.test_helpers import (
    create_mock_movie_detail_response,
    create_mock_paginated_response,
    create_tmdb_movie,
)
from apps.user_movie_data.models import UserMovieData

if TYPE_CHECKING:
    from apps.users.models import User

# HTTP status codes
HTTP_200_OK = HTTPStatus.OK

# =========================
# Test Setup Helper Methods
# =========================


def create_movie_stub(tmdb_id: int, title: str = "Test Movie") -> Movie:
    """Create and return a new Movie stub object.

    This mimics the behavior of the service layer, which creates a local stub
    for a movie fetched from the TMDB API.
    """
    return Movie.objects.create(
        tmdb_id=tmdb_id, title=title, poster_path="/test.jpg", release_date="2023-01-01"
    )


# =========================
# Endpoint Enrichment Integration Tests
# =========================


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,mock_path",
    [
        (
            "/api/movies/now-playing",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/upcoming", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
        (
            "/api/movies/search?query=test",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/browse", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
    ],
    ids=["now_playing", "upcoming", "search", "browse"],
)
def test_discovery_endpoint_enriches_user_movie_data_for_authenticated_user(
    api_client: Client,
    user: User,  # type: ignore[valid-type]
    endpoint: str,
    mock_path: str,
) -> None:
    """Test that discovery endpoints include user_movie_data for authenticated users.

    Parametrized to test: now-playing, upcoming, search, and discover endpoints.
    All should enrich movies with user-specific data when user is authenticated.

    This verifies the enrichment integration added in Task 7 (OAuth headless migration).
    """
    # Arrange: Create movie stub and user data
    movie_stub = create_movie_stub(tmdb_id=101, title="Blade Runner")
    UserMovieData.objects.create(
        user=user,
        movie=movie_stub,
        user_watched=True,
        user_on_watchlist=True,
        user_liked=True,
        user_rating=9,
        user_review="Classic sci-fi!",
    )

    # Arrange: Mock TMDB API response using test helper
    movies = [create_tmdb_movie(101, "Blade Runner", "1982-06-25", 8.1, poster_path="/test.jpg")]
    mock_api_response = create_mock_paginated_response(movies=movies, page=1, total_pages=1)

    # Act: Call endpoint as authenticated user
    with patch(mock_path, return_value=mock_api_response):
        api_client.force_login(cast(AbstractBaseUser, user))
        res = api_client.get(endpoint)

    # Assert: Response includes enriched user_movie_data
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 1

    # Verify user_movie_data is populated
    movie_data = data["results"][0]
    assert "user_movie_data" in movie_data
    user_data = movie_data["user_movie_data"]
    assert user_data is not None
    assert user_data["user_watched"] is True
    assert user_data["user_on_watchlist"] is True
    assert user_data["user_liked"] is True
    assert user_data["user_rating"] == 9
    assert user_data["user_review"] == "Classic sci-fi!"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,mock_path",
    [
        (
            "/api/movies/now-playing",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/upcoming", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
        (
            "/api/movies/search?query=test",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/browse", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
    ],
    ids=["now_playing", "upcoming", "search", "browse"],
)
def test_discovery_endpoint_works_for_unauthenticated_user(
    api_client: Client, endpoint: str, mock_path: str
) -> None:
    """Test that discovery endpoints work for unauthenticated users.

    Parametrized to test: now-playing, upcoming, search, and discover endpoints.
    All should return movies with user_movie_data as None for unauthenticated users.

    This verifies that enrichment is transparent and doesn't break public API access.
    """
    # Arrange: Create movie stub (but NO UserMovieData since no user is authenticated)
    create_movie_stub(tmdb_id=101, title="Blade Runner")

    # Arrange: Mock TMDB API response using test helper
    movies = [create_tmdb_movie(101, "Blade Runner", "1982-06-25", 8.1, poster_path="/test.jpg")]
    mock_api_response = create_mock_paginated_response(movies=movies, page=1, total_pages=1)

    # Act: Call endpoint without authentication
    with patch(mock_path, return_value=mock_api_response):
        res = api_client.get(endpoint)

    # Assert: Response includes user_movie_data field as None
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 1

    # Verify user_movie_data is None for unauthenticated user
    movie_data = data["results"][0]
    assert "user_movie_data" in movie_data
    assert movie_data["user_movie_data"] is None


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,mock_path",
    [
        (
            "/api/movies/now-playing",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/upcoming", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
        (
            "/api/movies/search?query=test",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/browse", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
    ],
    ids=["now_playing", "upcoming", "search", "browse"],
)
def test_discovery_endpoint_returns_none_for_movies_without_user_data(
    api_client: Client,
    user: User,  # type: ignore[valid-type]
    endpoint: str,
    mock_path: str,
) -> None:
    """Test that discovery endpoints return None for movies without UserMovieData.

    Parametrized to test: now-playing, upcoming, search, and discover endpoints.
    Even with an authenticated user, movies without UserMovieData entries should
    have user_movie_data as None.

    This verifies that enrichment correctly handles sparse user data.
    """
    # Arrange: Create movie stub but NO UserMovieData (user hasn't interacted with this movie)
    create_movie_stub(tmdb_id=101, title="Blade Runner")

    # Arrange: Mock TMDB API response using test helper
    movies = [create_tmdb_movie(101, "Blade Runner", "1982-06-25", 8.1, poster_path="/test.jpg")]
    mock_api_response = create_mock_paginated_response(movies=movies, page=1, total_pages=1)

    # Act: Call endpoint as authenticated user
    with patch(mock_path, return_value=mock_api_response):
        api_client.force_login(cast(AbstractBaseUser, user))
        res = api_client.get(endpoint)

    # Assert: Response includes user_movie_data as None (no data exists for this movie)
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 1

    # Verify user_movie_data is None (movie exists but no user interaction)
    movie_data = data["results"][0]
    assert "user_movie_data" in movie_data
    assert movie_data["user_movie_data"] is None


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_movie_detail_endpoint_enriches_user_movie_data_for_authenticated_user(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    api_client: Client,
    user: User,  # type: ignore[valid-type]
) -> None:
    """Test that movie detail endpoint includes user_movie_data for authenticated users.

    This verifies the enrichment integration added in Task 7 (OAuth headless migration)
    for the detail endpoint specifically.
    """
    # Arrange: Create movie stub and user data
    movie_stub = create_movie_stub(tmdb_id=78, title="Blade Runner")
    UserMovieData.objects.create(
        user=user,
        movie=movie_stub,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review="Masterpiece!",
    )

    # Arrange: Mock TMDB API responses
    mock_info_response = create_mock_movie_detail_response(
        tmdb_id=78,
        title="Blade Runner",
        release_date="1982-06-25",
        vote_average=8.1,
        overview="A blade runner must pursue and terminate four replicants.",
        poster_path="/blade_runner.jpg",
        genres=[],
        production_companies=[],
    )
    mock_credits_response = ApiResponse(status_code=200, data={"crew": [], "cast": []})
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act: Call detail endpoint as authenticated user
    api_client.force_login(cast(AbstractBaseUser, user))
    res = api_client.get(f"/api/movies/{movie_stub.tmdb_id}")

    # Assert: Response includes enriched user_movie_data
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["tmdb_id"] == 78
    assert "user_movie_data" in data

    # Verify user_movie_data is populated
    user_data = data["user_movie_data"]
    assert user_data is not None
    assert user_data["user_watched"] is True
    assert user_data["user_on_watchlist"] is False
    assert user_data["user_liked"] is True
    assert user_data["user_rating"] == 9
    assert user_data["user_review"] == "Masterpiece!"


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_movie_detail_endpoint_works_for_unauthenticated_user(
    mock_get_movie_details: Mock, mock_tmdb_get: Mock, api_client: Client
) -> None:
    """Test that movie detail endpoint works for unauthenticated users.

    This verifies that enrichment is transparent and doesn't break public API access.
    """
    # Arrange: Create movie stub (no UserMovieData)
    tmdb_id = 78
    create_movie_stub(tmdb_id=tmdb_id, title="Blade Runner")

    # Arrange: Mock TMDB API responses
    mock_info_response = create_mock_movie_detail_response(
        tmdb_id=tmdb_id,
        title="Blade Runner",
        release_date="1982-06-25",
        vote_average=8.1,
        overview="A blade runner must pursue and terminate four replicants.",
        poster_path="/blade_runner.jpg",
        genres=[],
        production_companies=[],
    )
    mock_credits_response = ApiResponse(status_code=200, data={"crew": [], "cast": []})
    mock_get_movie_details.return_value = mock_info_response
    mock_tmdb_get.return_value = mock_credits_response

    # Act: Call detail endpoint without authentication
    res = api_client.get(f"/api/movies/{tmdb_id}")

    # Assert: Response includes user_movie_data as None
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["tmdb_id"] == tmdb_id
    assert "user_movie_data" in data
    assert data["user_movie_data"] is None


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint,mock_path",
    [
        (
            "/api/movies/now-playing",
            "apps.core.services.tmdb_api_client.TMDBApiClient.get",  # Now uses discover endpoint
        ),
        ("/api/movies/browse?genres=28", "apps.core.services.tmdb_api_client.TMDBApiClient.get"),
    ],
    ids=["now_playing", "browse_with_filters"],
)
def test_enrichment_handles_multiple_movies_efficiently(
    api_client: Client,
    user: User,  # type: ignore[valid-type]
    endpoint: str,
    mock_path: str,
) -> None:
    """Test that enrichment handles multiple movies with mixed user data efficiently.

    Verifies that:
    - Movies with user data are enriched
    - Movies without user data have None
    - Bulk query optimization works (tested in service unit tests)
    """
    # Arrange: Create multiple movie stubs - some with user data, some without
    movie1 = create_movie_stub(tmdb_id=101, title="Blade Runner")
    movie2 = create_movie_stub(tmdb_id=102, title="Chinatown")
    create_movie_stub(tmdb_id=103, title="The Matrix")  # No user data

    # Create user data for first two movies only
    UserMovieData.objects.create(user=user, movie=movie1, user_watched=True, user_rating=9)
    UserMovieData.objects.create(user=user, movie=movie2, user_on_watchlist=True)

    # Arrange: Mock TMDB API response with 3 movies using test helper
    movies = [
        create_tmdb_movie(101, "Blade Runner", "1982-06-25", 8.1, poster_path="/test1.jpg"),
        create_tmdb_movie(102, "Chinatown", "1974-06-20", 8.2, poster_path="/test2.jpg"),
        create_tmdb_movie(103, "The Matrix", "1999-03-31", 8.7, poster_path="/test3.jpg"),
    ]
    mock_api_response = create_mock_paginated_response(movies=movies, page=1, total_pages=1)

    # Act: Call endpoint as authenticated user
    with patch(mock_path, return_value=mock_api_response):
        api_client.force_login(cast(AbstractBaseUser, user))
        res = api_client.get(endpoint)

    # Assert: Response includes mixed enrichment
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert len(data["results"]) == 3

    # Movie 1: Has user data (watched)
    assert data["results"][0]["user_movie_data"] is not None
    assert data["results"][0]["user_movie_data"]["user_watched"] is True
    assert data["results"][0]["user_movie_data"]["user_rating"] == 9

    # Movie 2: Has user data (on watchlist)
    assert data["results"][1]["user_movie_data"] is not None
    assert data["results"][1]["user_movie_data"]["user_on_watchlist"] is True

    # Movie 3: No user data
    assert data["results"][2]["user_movie_data"] is None
