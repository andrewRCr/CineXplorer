"""
Unit tests for rating filtering in TMDB result processing.

Tests the rating filtering logic that handles TMDB API quirks where movies
with placeholder ratings (0.0) or incorrect ratings are sometimes returned.
"""

from __future__ import annotations

from unittest.mock import Mock

from apps.core.services.api_response import ApiResponse
from apps.movie.schemas import MovieListResponseSchema
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import (
    TMDBMovieBaseRawDict,
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


def test_discover_movies_filters_incorrect_ratings() -> None:
    """Test that discover_movies filters out movies with incorrect ratings.

    TMDB API quirk: When requesting movies rated 7.5+, TMDB sometimes returns
    movies with 0.0 ratings (placeholder ratings for certain releases).
    """
    # Arrange: Mock client returns mix of correct and incorrect ratings
    mock_client = Mock(spec=["get"])

    # User requests movies rated 7.5+
    # TMDB returns 20 movies, but 5 have placeholder 0.0 ratings
    tmdb_movies = [
        # Correct ratings (7.5+) - should be kept
        create_tmdb_movie(1, "Good Movie A", "2022-01-01", 8.0),
        create_tmdb_movie(2, "Good Movie B", "2022-01-01", 7.5),
        create_tmdb_movie(3, "Good Movie C", "2022-01-01", 8.2),
        create_tmdb_movie(4, "Good Movie D", "2022-01-01", 7.8),
        create_tmdb_movie(5, "Good Movie E", "2022-01-01", 8.5),
        create_tmdb_movie(6, "Good Movie F", "2022-01-01", 7.9),
        create_tmdb_movie(7, "Good Movie G", "2022-01-01", 8.1),
        create_tmdb_movie(8, "Good Movie H", "2022-01-01", 7.6),
        create_tmdb_movie(9, "Good Movie I", "2022-01-01", 8.3),
        create_tmdb_movie(10, "Good Movie J", "2022-01-01", 7.7),
        create_tmdb_movie(11, "Good Movie K", "2022-01-01", 9.0),
        create_tmdb_movie(12, "Good Movie L", "2022-01-01", 7.5),
        create_tmdb_movie(13, "Good Movie M", "2022-01-01", 8.6),
        create_tmdb_movie(14, "Good Movie N", "2022-01-01", 7.9),
        create_tmdb_movie(15, "Good Movie O", "2022-01-01", 8.2),
        # Incorrect ratings (placeholder 0.0) - should be filtered out
        create_tmdb_movie(101, "Placeholder Rating A", "2022-01-01", 0.0),
        create_tmdb_movie(102, "Placeholder Rating B", "2022-01-01", 0.0),
        create_tmdb_movie(103, "Low Rating A", "2022-01-01", 6.0),
        create_tmdb_movie(104, "Low Rating B", "2022-01-01", 5.5),
        create_tmdb_movie(105, "Low Rating C", "2022-01-01", 7.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, params=BrowseServiceParams(rating_min=7.5))

    # Assert: Only movies with rating >= 7.5 returned (15 correct movies)
    assert isinstance(result, MovieListResponseSchema)
    assert len(result.results) == 15

    # Verify all returned movies have rating >= 7.5
    for movie in result.results:
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5, (
            f"Movie {movie.title} has rating {movie.vote_average} < 7.5"
        )

    # Verify low-rated movies were filtered out
    incorrect_ids = {101, 102, 103, 104, 105}
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert incorrect_ids.isdisjoint(returned_ids), "Low-rated movies should be filtered out"


def test_rating_filtering_handles_range() -> None:
    """Test rating filtering works with both min and max rating (range filtering)."""
    # Arrange: Mock client returns movies with various ratings
    mock_client = Mock(spec=["get"])

    tmdb_movies = [
        # In range (7.0-8.0) - should be kept
        create_tmdb_movie(1, "In Range A", "2022-01-01", 7.0),
        create_tmdb_movie(2, "In Range B", "2022-01-01", 7.5),
        create_tmdb_movie(3, "In Range C", "2022-01-01", 8.0),
        create_tmdb_movie(4, "In Range D", "2022-01-01", 7.2),
        create_tmdb_movie(5, "In Range E", "2022-01-01", 7.8),
        # Out of range - should be filtered out
        create_tmdb_movie(101, "Too Low A", "2022-01-01", 6.9),
        create_tmdb_movie(102, "Too Low B", "2022-01-01", 5.0),
        create_tmdb_movie(103, "Too High A", "2022-01-01", 8.1),
        create_tmdb_movie(104, "Too High B", "2022-01-01", 9.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.0-8.0
    params = BrowseServiceParams(rating_min=7.0, rating_max=8.0)
    result = service.discover_movies(page=1, params=params)

    # Assert: Only movies in range returned
    assert len(result.results) == 5
    for movie in result.results:
        assert movie.vote_average is not None
        assert 7.0 <= movie.vote_average <= 8.0


def test_rating_filtering_handles_missing_ratings() -> None:
    """Test that movies with missing vote_average are filtered out."""
    # Arrange: Mock client returns some movies without ratings
    mock_client = Mock(spec=["get"])

    # Movie with missing rating to test TMDB data quality handling
    movie_without_rating: TMDBMovieBaseRawDict = {
        "id": 2,
        "title": "Movie without rating",
        "poster_path": "/test.jpg",
        "release_date": "2022-01-01",
        "vote_average": None,  # TMDB data quality issue
    }

    tmdb_movies: list[TMDBMovieBaseRawDict] = [  # type: ignore[assignment]
        create_tmdb_movie(1, "Movie with rating", "2022-01-01", 8.0).model_dump(),
        movie_without_rating,
        create_tmdb_movie(3, "Another with rating", "2022-01-01", 7.5).model_dump(),
    ]

    # Pattern 2: Testing intentionally invalid data
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, params=BrowseServiceParams(rating_min=7.5))

    # Assert: Only movies with valid ratings returned
    assert len(result.results) == 2
    assert all(m.vote_average is not None for m in result.results)
