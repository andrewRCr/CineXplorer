"""
Integration tests for the watchlist endpoint.

This module tests the GET /api/user-movie-data/movies endpoint which returns
a paginated list of movies the user has interacted with, optionally filtered
to watchlist-only movies.

This is retroactive test coverage for Task 7 (OAuth headless migration) where
the watchlist endpoint was implemented before tests were written.

Tests verify:
    - Returns user's movies with enrichment
    - Filters to watchlist-only when `?watchlist=true`
    - Returns empty list when user has no movies
    - Requires authentication (401 for unauthenticated)
    - Pagination structure (minimal implementation)
    - User isolation (only sees own movies)
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock, patch

import pytest

from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.tests.mock_paths import (
    TMDB_CLIENT_GET,
    TMDB_CLIENT_GET_MOVIE_DETAILS,
)

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client

# HTTP status codes
HTTP_200_OK = HTTPStatus.OK
HTTP_401_UNAUTHORIZED = HTTPStatus.UNAUTHORIZED

# =========================
# API URL
# =========================
USER_MOVIES_URL = "/api/user-movie-data/movies"


# =========================
# Test Fixtures
# =========================


@pytest.fixture
def movie1(db: None) -> Movie:
    """Create first test movie."""
    return Movie.objects.create(
        tmdb_id=12345,
        title="Blade Runner",
        poster_path="/blade_runner.jpg",
        release_date="1982-06-25",
    )


@pytest.fixture
def movie2(db: None) -> Movie:
    """Create second test movie."""
    return Movie.objects.create(
        tmdb_id=54321, title="Chinatown", poster_path="/chinatown.jpg", release_date="1974-06-20"
    )


@pytest.fixture
def movie3(db: None) -> Movie:
    """Create third test movie."""
    return Movie.objects.create(
        tmdb_id=99999, title="The Matrix", poster_path="/matrix.jpg", release_date="1999-03-31"
    )


@pytest.fixture
def authenticated_user(api_client: Client, db: None) -> tuple[Client, User]:
    """
    Create an authenticated user and return (client, user) tuple.

    Creates a verified user (can login) and authenticates via the JWT token
    endpoint which sets the necessary cookies for Django Ninja JWTCookieAuth.
    """
    from apps.core.tests.test_helpers import authenticate_client, create_user

    # Create verified user (create_user() verifies email by default)
    user = create_user(username="testuser", email="testuser@example.com", password="testpass123")

    # Authenticate client (handles hybrid auth pattern automatically)
    authenticate_client(api_client, user.username, "testpass123")

    return api_client, user


# =========================
# Authentication Tests
# =========================


@pytest.mark.django_db
def test_watchlist_endpoint_requires_authentication(api_client: Client) -> None:
    """Test that unauthenticated requests to watchlist endpoint are denied."""
    # Act: Try to access endpoint without authentication
    res = api_client.get(USER_MOVIES_URL)

    # Assert: Should return 401
    assert res.status_code == HTTP_401_UNAUTHORIZED


# =========================
# Basic Watchlist Endpoint Tests
# =========================


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_returns_all_user_movies(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
    movie2: Movie,
) -> None:
    """
    Test that GET /api/user-movie-data/movies returns all movies user has interacted with.

    This includes movies on watchlist, watched movies, rated movies, etc.
    """
    client, user = authenticated_user

    # Arrange: Create user movie data for two movies
    UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=False,  # Not on watchlist
        user_rating=9,
    )
    UserMovieData.objects.create(
        user=user,
        movie=movie2,
        user_watched=False,
        user_on_watchlist=True,  # On watchlist
        user_rating=None,
    )

    # Arrange: Mock TMDB API responses for both movies
    def get_movie_details_side_effect(tmdb_id: int, **kwargs: object) -> ApiResponse:
        """Return different movie data based on tmdb_id."""
        if tmdb_id == 12345:
            return ApiResponse(
                status_code=200,
                data={
                    "id": 12345,
                    "title": "Blade Runner",
                    "overview": "A blade runner must pursue replicants.",
                    "poster_path": "/blade_runner.jpg",
                    "release_date": "1982-06-25",
                    "vote_average": 8.1,
                    "genres": [],
                    "production_companies": [],
                },
            )
        else:  # 54321
            return ApiResponse(
                status_code=200,
                data={
                    "id": 54321,
                    "title": "Chinatown",
                    "overview": "A private detective investigating adultery.",
                    "poster_path": "/chinatown.jpg",
                    "release_date": "1974-06-20",
                    "vote_average": 8.2,
                    "genres": [],
                    "production_companies": [],
                },
            )

    mock_get_movie_details.side_effect = get_movie_details_side_effect
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act: Get all user movies (no watchlist filter)
    # Note: Explicitly pass watchlist=false to avoid Django test client sending empty string
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "results" in data
    assert "page" in data
    assert "total_pages" in data
    assert "total_results" in data

    # Assert: Pagination metadata
    assert data["page"] == 1
    assert data["total_results"] == 2

    # Assert: Returns both movies (regardless of watchlist status)
    assert len(data["results"]) == 2
    tmdb_ids = {movie["tmdb_id"] for movie in data["results"]}
    assert tmdb_ids == {12345, 54321}

    # Assert: Movies are enriched with user_movie_data
    for movie_data in data["results"]:
        assert "user_movie_data" in movie_data
        assert movie_data["user_movie_data"] is not None


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_with_watchlist_filter(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
    movie2: Movie,
    movie3: Movie,
) -> None:
    """
    Test that GET /api/user-movie-data/movies?watchlist=true filters to watchlist only.

    Only movies where user_on_watchlist=True should be returned.
    """
    client, user = authenticated_user

    # Arrange: Create user movie data - only movie2 is on watchlist
    UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=False,  # NOT on watchlist
        user_rating=9,
    )
    UserMovieData.objects.create(
        user=user,
        movie=movie2,
        user_watched=False,
        user_on_watchlist=True,  # ON watchlist
        user_rating=None,
    )
    UserMovieData.objects.create(
        user=user,
        movie=movie3,
        user_watched=True,
        user_on_watchlist=False,  # NOT on watchlist
        user_rating=8,
    )

    # Arrange: Mock TMDB API response for movie2 only
    mock_get_movie_details.return_value = ApiResponse(
        status_code=200,
        data={
            "id": 54321,
            "title": "Chinatown",
            "overview": "A private detective investigating adultery.",
            "poster_path": "/chinatown.jpg",
            "release_date": "1974-06-20",
            "vote_average": 8.2,
            "genres": [],
            "production_companies": [],
        },
    )
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act: Get watchlist movies only
    res = client.get(USER_MOVIES_URL, {"watchlist": "true"})

    # Assert: Response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()

    # Assert: Only returns watchlist movie (movie2)
    assert data["total_results"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["tmdb_id"] == 54321

    # Assert: Enrichment includes user_movie_data
    user_data = data["results"][0]["user_movie_data"]
    assert user_data is not None
    assert user_data["user_on_watchlist"] is True


@pytest.mark.django_db
def test_get_user_movies_returns_empty_list_when_no_movies(
    authenticated_user: tuple[Client, User],
) -> None:
    """
    Test that GET /api/user-movie-data/movies returns empty list when user has no movies.

    This is the initial state for new users or after removing all movies.
    """
    client, _user = authenticated_user

    # Act: Get user movies (no data exists)
    # Note: Explicitly pass watchlist=false to avoid Django test client sending empty string
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Response structure
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "results" in data
    assert "page" in data
    assert "total_pages" in data
    assert "total_results" in data

    # Assert: Empty list
    assert data["total_results"] == 0
    assert data["total_pages"] == 0
    assert data["page"] == 1
    assert data["results"] == []


@pytest.mark.django_db
def test_get_user_movies_with_watchlist_filter_returns_empty_when_no_watchlist_movies(
    authenticated_user: tuple[Client, User], movie1: Movie
) -> None:
    """
    Test that GET /api/user-movie-data/movies?watchlist=true returns empty list.

    When user has movies but NONE are on watchlist, should return empty list.
    """
    client, user = authenticated_user

    # Arrange: Create user movie data - NOT on watchlist
    UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=False,  # Not on watchlist
        user_rating=9,
    )

    # Act: Get watchlist movies
    res = client.get(USER_MOVIES_URL, {"watchlist": "true"})

    # Assert: Empty list (no watchlist movies)
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["total_results"] == 0
    assert data["results"] == []


# =========================
# User Isolation Tests
# =========================


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_shows_only_current_users_movies(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
    movie2: Movie,
) -> None:
    """
    Test that GET /api/user-movie-data/movies only returns current user's movies.

    Users should not be able to see other users' movie data.
    """
    client, user = authenticated_user

    # Arrange: Create data for current user
    UserMovieData.objects.create(user=user, movie=movie1, user_on_watchlist=True, user_rating=9)

    # Arrange: Create data for DIFFERENT user
    from apps.core.tests.test_helpers import create_user

    other_user = create_user(
        username="otheruser", email="other@example.com", password="otherpass123"
    )
    UserMovieData.objects.create(
        user=other_user,
        movie=movie2,  # Different movie
        user_on_watchlist=True,
        user_rating=10,
    )

    # Arrange: Mock TMDB response (only for movie1)
    mock_get_movie_details.return_value = ApiResponse(
        status_code=200,
        data={
            "id": 12345,
            "title": "Blade Runner",
            "overview": "A blade runner must pursue replicants.",
            "poster_path": "/blade_runner.jpg",
            "release_date": "1982-06-25",
            "vote_average": 8.1,
            "genres": [],
            "production_companies": [],
        },
    )
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act: Get movies as current user
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Only sees own movie (movie1), not other_user's movie (movie2)
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["total_results"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["tmdb_id"] == 12345  # movie1
    assert data["results"][0]["user_movie_data"]["user_rating"] == 9


# =========================
# Edge Cases and Error Handling
# =========================


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_handles_tmdb_api_errors_gracefully(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
    movie2: Movie,
) -> None:
    """
    Test that watchlist endpoint handles TMDB API errors gracefully.

    If a movie is no longer available in TMDB (removed/deleted), it should be
    skipped rather than breaking the entire request.
    """
    client, user = authenticated_user

    # Arrange: Create user movie data for two movies
    UserMovieData.objects.create(user=user, movie=movie1, user_on_watchlist=True)
    UserMovieData.objects.create(user=user, movie=movie2, user_on_watchlist=True)

    # Arrange: Mock TMDB responses - movie1 succeeds, movie2 fails (404)
    def get_movie_details_side_effect(tmdb_id: int, **kwargs: object) -> ApiResponse:
        """Return success for movie1, raise error for movie2."""
        from ninja.errors import HttpError

        if tmdb_id == 12345:
            return ApiResponse(
                status_code=200,
                data={
                    "id": 12345,
                    "title": "Blade Runner",
                    "overview": "A blade runner must pursue replicants.",
                    "poster_path": "/blade_runner.jpg",
                    "release_date": "1982-06-25",
                    "vote_average": 8.1,
                    "genres": [],
                    "production_companies": [],
                },
            )
        else:  # movie2 - TMDB API error
            raise HttpError(404, "Movie not found in TMDB")

    mock_get_movie_details.side_effect = get_movie_details_side_effect
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act: Get user movies
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Request succeeds, returns only available movie (movie1)
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["total_results"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["tmdb_id"] == 12345


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_enrichment_populates_user_movie_data(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
) -> None:
    """
    Test that watchlist endpoint enriches movies with user_movie_data.

    This verifies the enrichment service is being called correctly.
    """
    client, user = authenticated_user

    # Arrange: Create user movie data with specific values
    UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=True,
        user_liked=True,
        user_rating=9,
        user_review="Masterpiece!",
    )

    # Arrange: Mock TMDB response
    mock_get_movie_details.return_value = ApiResponse(
        status_code=200,
        data={
            "id": 12345,
            "title": "Blade Runner",
            "overview": "A blade runner must pursue replicants.",
            "poster_path": "/blade_runner.jpg",
            "release_date": "1982-06-25",
            "vote_average": 8.1,
            "genres": [],
            "production_companies": [],
        },
    )
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: user_movie_data is populated with correct values
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert len(data["results"]) == 1

    movie_data = data["results"][0]
    assert "user_movie_data" in movie_data
    user_data = movie_data["user_movie_data"]
    assert user_data is not None
    assert user_data["user_watched"] is True
    assert user_data["user_on_watchlist"] is True
    assert user_data["user_liked"] is True
    assert user_data["user_rating"] == 9
    assert user_data["user_review"] == "Masterpiece!"


# =========================
# Pagination Tests (Minimal Implementation)
# =========================


@pytest.mark.django_db
@patch(TMDB_CLIENT_GET)
@patch(TMDB_CLIENT_GET_MOVIE_DETAILS)
def test_get_user_movies_returns_pagination_structure(
    mock_get_movie_details: Mock,
    mock_tmdb_get: Mock,
    authenticated_user: tuple[Client, User],
    movie1: Movie,
) -> None:
    """
    Test that watchlist endpoint returns proper pagination structure.

    Note: Minimal implementation returns all results on page 1. Full pagination
    to be implemented in API Layer P2.
    """
    client, user = authenticated_user

    # Arrange
    UserMovieData.objects.create(user=user, movie=movie1, user_on_watchlist=True)

    # Arrange: Mock TMDB response
    mock_get_movie_details.return_value = ApiResponse(
        status_code=200,
        data={
            "id": 12345,
            "title": "Blade Runner",
            "overview": "A blade runner must pursue replicants.",
            "poster_path": "/blade_runner.jpg",
            "release_date": "1982-06-25",
            "vote_average": 8.1,
            "genres": [],
            "production_companies": [],
        },
    )
    mock_tmdb_get.return_value = ApiResponse(status_code=200, data={"crew": [], "cast": []})

    # Act
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Pagination structure exists
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert "page" in data
    assert "total_pages" in data
    assert "total_results" in data
    assert "results" in data

    # Assert: Minimal implementation values
    assert data["page"] == 1
    assert data["total_pages"] == 1
    assert data["total_results"] == 1


@pytest.mark.django_db
def test_get_user_movies_empty_list_pagination_structure(
    authenticated_user: tuple[Client, User],
) -> None:
    """
    Test pagination structure when no movies exist.

    Empty list should have total_pages=0 but still return valid pagination structure.
    """
    client, _user = authenticated_user

    # Act
    res = client.get(USER_MOVIES_URL, {"watchlist": "false"})

    # Assert: Pagination structure with 0 results
    assert res.status_code == HTTP_200_OK
    data = res.json()
    assert data["page"] == 1
    assert data["total_pages"] == 0
    assert data["total_results"] == 0
    assert data["results"] == []
