"""Test helpers for user_movie_data domain.

**Location in Test Hierarchy:** Tier 4 - Domain Helpers

This module provides mock builders and test utilities specific to the
user_movie_data domain (UserMovieData, MovieEnrichmentService, etc.).

**When to Use This File:**
- Unit tests for UserMovieDataService, MovieEnrichmentService
- Tests needing mock UserMovieData records
- Tests needing mock Movie objects (local DB stubs)
- Tests needing pagination metadata helpers

**Related Helper Files:**
- `core/tests/test_helpers.py` - HTTP helpers, create_user(), create_mock_user()
- `movie/tests/test_helpers.py` - TMDB ApiResponse mocks
- `movie/tests/tmdb_test_builders.py` - Pydantic TMDB model builders (MovieListItemSchema, etc.)

**Import Pattern:**
    # For unit tests
    from apps.core.tests.test_helpers import create_mock_user
    from apps.user_movie_data.tests.test_helpers import (
        create_mock_user_movie_data,
        create_mock_movie,
        create_pagination_metadata,
    )

    # For TMDB schema builders (used by movie service mocks)
    from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail

**Exported Helpers:**
- create_mock_user_movie_data() - Mock UserMovieData record
- create_mock_movie() - Mock Movie model instance
- create_movie_schema() - MovieListItemSchema for testing
- create_movie_detail_schema() - MovieDetailSchema for testing
- create_pagination_metadata() - Pagination dict helper
"""

from __future__ import annotations

from datetime import date
from unittest.mock import Mock

from apps.movie.schemas import MovieDetailSchema, MovieListItemSchema

__all__ = [
    "create_mock_movie",
    "create_mock_user_movie_data",
    "create_movie_detail_schema",
    "create_movie_schema",
    "create_pagination_metadata",
]


# =============================================================================
# Mock Model Builders (for unit tests - no database)
# =============================================================================


def create_mock_user_movie_data(
    record_id: int,
    tmdb_id: int = 12345,
    title: str = "Test Movie",
    user_watched: bool = False,
    user_on_watchlist: bool = False,
    user_liked: bool = False,
    user_rating: int | None = None,
    user_review: str | None = None,
) -> Mock:
    """
    Create a mock UserMovieData record for unit tests.

    Creates a Mock object that mimics a UserMovieData Django model instance,
    including the related Movie object.

    Args:
        record_id: Primary key of the UserMovieData record
        tmdb_id: TMDB ID of the associated movie (default: 12345)
        title: Title of the associated movie (default: "Test Movie")
        user_watched: Whether user has watched the movie
        user_on_watchlist: Whether movie is on user's watchlist
        user_liked: Whether user liked the movie
        user_rating: User's rating (1-10, or None)
        user_review: User's review text (or None)

    Returns:
        Mock object with UserMovieData attributes and nested movie Mock

    Example:
        mock_umd = create_mock_user_movie_data(
            record_id=1,
            tmdb_id=550,
            title="Fight Club",
            user_watched=True,
            user_rating=9,
        )
        assert mock_umd.id == 1
        assert mock_umd.movie.tmdb_id == 550
        assert mock_umd.user_rating == 9
    """
    mock = Mock()
    mock.id = record_id
    mock.user_watched = user_watched
    mock.user_on_watchlist = user_on_watchlist
    mock.user_liked = user_liked
    mock.user_rating = user_rating
    mock.user_review = user_review
    # Mock the related movie object
    mock.movie = Mock()
    mock.movie.tmdb_id = tmdb_id
    mock.movie.title = title
    return mock


def create_mock_movie(
    tmdb_id: int,
    title: str = "Test Movie",
    poster_path: str | None = "/poster.jpg",
    release_date: date | None = None,
) -> Mock:
    """
    Create a mock Movie model instance for unit tests.

    Creates a Mock object that mimics a Movie Django model instance.
    Use this when testing service methods that need a Movie object
    but you don't want database access.

    Args:
        tmdb_id: TMDB ID of the movie
        title: Movie title (default: "Test Movie")
        poster_path: Poster image path (default: "/poster.jpg")
        release_date: Release date (default: 2023-01-01)

    Returns:
        Mock object with Movie model attributes

    Example:
        mock_movie = create_mock_movie(tmdb_id=550, title="Fight Club")
        mock_repo.get_movie_by_tmdb_id.return_value = mock_movie
    """
    mock = Mock()
    mock.tmdb_id = tmdb_id
    mock.title = title
    mock.poster_path = poster_path
    mock.release_date = release_date or date(2023, 1, 1)
    return mock


# =============================================================================
# Pydantic Schema Builders (for service layer tests)
# =============================================================================


def create_movie_schema(
    tmdb_id: int,
    title: str,
    release_date: str = "2023-01-01",
    poster_path: str | None = "/poster.jpg",
    vote_average: float | None = 8.0,
    runtime: int | None = 120,
) -> MovieListItemSchema:
    """
    Create a MovieListItemSchema for testing without database.

    Use this for unit tests that need MovieListItemSchema objects
    (e.g., testing enrichment service).

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        release_date: Release date as ISO string (default: "2023-01-01")
        poster_path: Poster image path (default: "/poster.jpg")
        vote_average: Rating 0.0-10.0 (default: 8.0)
        runtime: Runtime in minutes (default: 120)

    Returns:
        MovieListItemSchema instance

    Example:
        movie = create_movie_schema(tmdb_id=550, title="Fight Club")
        enriched = service.enrich_movies_with_user_movie_data([movie], user)
    """
    return MovieListItemSchema(
        tmdb_id=tmdb_id,
        title=title,
        poster_path=poster_path,
        release_date=date.fromisoformat(release_date),
        vote_average=vote_average,
        runtime=runtime,
    )


def create_movie_detail_schema(
    tmdb_id: int,
    title: str,
    release_date: str = "2023-01-01",
    poster_path: str | None = "/poster.jpg",
    vote_average: float | None = 8.0,
    runtime: int | None = 120,
    overview: str = "Test movie overview",
) -> MovieDetailSchema:
    """
    Create a MovieDetailSchema for testing TMDB fetch results.

    Use this when mocking MovieService.get_movie_by_id() return values.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        release_date: Release date as ISO string (default: "2023-01-01")
        poster_path: Poster image path (default: "/poster.jpg")
        vote_average: Rating 0.0-10.0 (default: 8.0)
        runtime: Runtime in minutes (default: 120)
        overview: Movie synopsis (default: "Test movie overview")

    Returns:
        MovieDetailSchema instance

    Example:
        mock_movie_service.get_movie_by_id.return_value = create_movie_detail_schema(
            tmdb_id=550, title="Fight Club"
        )
    """
    return MovieDetailSchema(
        tmdb_id=tmdb_id,
        title=title,
        poster_path=poster_path,
        release_date=date.fromisoformat(release_date),
        vote_average=vote_average,
        runtime=runtime,
        overview=overview,
        genres=[],
    )


# =============================================================================
# Pagination Helpers
# =============================================================================


def create_pagination_metadata(
    page: int = 1,
    total_pages: int = 1,
    total_results: int = 0,
) -> dict[str, int]:
    """
    Create pagination metadata dictionary for repository mock returns.

    Provides a clean way to create pagination metadata without long inline dicts.

    Args:
        page: Current page number (default: 1)
        total_pages: Total number of pages (default: 1)
        total_results: Total number of results (default: 0)

    Returns:
        Dict with page, total_pages, total_results keys

    Example:
        mock_repo.get_filtered.return_value = (
            mock_umd_list,
            create_pagination_metadata(page=1, total_pages=5, total_results=100)
        )
    """
    return {
        "page": page,
        "total_pages": total_pages,
        "total_results": total_results,
    }
