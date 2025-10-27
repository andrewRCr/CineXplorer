"""TypedDict fixtures for TMDB API response mocking.

These TypedDicts represent the structure of raw TMDB API responses,
used across service layer tests for consistent mock data.

Following type safety strategy: No typing.Any in test code - use precise
TypedDicts for external API response structures.

Uses NotRequired (Python 3.11+) to explicitly mark optional fields, making
TMDB API behavior clearer than total=False approach.

Related: .arc/reference/strategies/strategy-type-safety.md
"""
from __future__ import annotations

from typing import NotRequired, TypedDict

# ============================================================================
# Base Paginated Response Structure
# ============================================================================


class TMDBPaginatedResponse(TypedDict):
    """Base paginated response structure from TMDB API."""

    page: int
    total_pages: int
    total_results: int


# ============================================================================
# Keyword Response Structures
# ============================================================================


class TMDBKeywordResult(TypedDict):
    """Keyword result item from TMDB keyword endpoints."""

    id: int
    name: str


class TMDBKeywordResponse(TMDBPaginatedResponse):
    """TMDB keyword list response (keyword/popular, search/keyword)."""

    results: list[TMDBKeywordResult]


# ============================================================================
# Person Response Structures
# ============================================================================


class TMDBPersonResult(TypedDict):
    """Person result item from TMDB person endpoints."""

    id: int
    name: str
    known_for_department: str
    profile_path: str | None


class TMDBPersonResponse(TMDBPaginatedResponse):
    """TMDB person list response (person/popular, search/person)."""

    results: list[TMDBPersonResult]


# ============================================================================
# Movie Response Structures
# ============================================================================


class TMDBGenre(TypedDict):
    """Genre item from TMDB movie responses."""

    id: int
    name: str


class TMDBProductionCompany(TypedDict):
    """Production company item from TMDB movie details."""

    id: int
    name: str
    logo_path: str | None
    origin_country: str


class TMDBMovieBase(TypedDict):
    """Base movie result structure from TMDB list endpoints.

    Used in search results, discover, now_playing, upcoming, etc.

    IMPORTANT: TMDB API data quality issues mean fields can be missing, null, or invalid:
    - release_date: Can be None, empty string, or missing entirely (data hygiene issues)
    - vote_average: Can be None or missing (placeholder ratings, unreleased movies)
    - vote_count: Can be None or missing (unreleased or limited release movies)
    - poster_path: Can be None or missing (no poster uploaded)
    - runtime: Can be None or missing (not available for all movies)

    Fields marked NotRequired to explicitly show TMDB's actual response variability.
    Application code must handle these edge cases defensively.

    Related: test_result_filtering.py documents these TMDB quirks with real-world test cases.
    """

    id: int  # Always present
    title: str  # Always present
    poster_path: NotRequired[str | None]  # May be missing or null
    release_date: NotRequired[str | None]  # May be missing, null, or empty - data quality issue
    vote_average: NotRequired[float | None]  # May be missing or null - placeholder/unreleased
    vote_count: NotRequired[int | None]  # May be missing or null - unreleased/limited release
    runtime: NotRequired[int | None]  # May be missing or null


class TMDBMovieDetail(TypedDict):
    """Movie details response from TMDB movie/{id} endpoint.

    Complete movie details including genres, runtime, production info.
    """

    id: int
    title: str
    poster_path: str | None
    release_date: str
    vote_average: float
    runtime: int | None
    overview: str
    genres: list[TMDBGenre]
    production_companies: list[TMDBProductionCompany]


class TMDBMovieResponse(TMDBPaginatedResponse):
    """TMDB movie list response (search/movie, discover/movie, movie/now_playing, etc)."""

    results: list[TMDBMovieBase]


class TMDBCreditsResponse(TypedDict):
    """TMDB credits response from movie/{id}/credits endpoint."""

    cast: list[object]  # Cast member structure varies, use object for tests
    crew: list[object]  # Crew member structure varies, use object for tests


class TMDBGenreListResponse(TypedDict):
    """TMDB genre list response from genre/movie/list endpoint."""

    genres: list[TMDBGenre]


# ============================================================================
# Test Helper Functions
# ============================================================================


def create_movie_dict(
    tmdb_id: int,
    title: str,
    release_date: str,
    vote_average: float,
    runtime: int | None = None,
    vote_count: int | None = None,
    poster_path: str | None = None,
) -> TMDBMovieBase:
    """Create a mock TMDB movie dictionary for testing.

    This helper provides consistent TMDB API response structure across all tests,
    ensuring test data stays synchronized when TMDB API fields change.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        release_date: Release date in YYYY-MM-DD format
        vote_average: Rating (0.0-10.0 scale)
        runtime: Optional runtime in minutes
        vote_count: Number of votes (defaults to 100 for reliable rating)
        poster_path: Poster path (defaults to '/poster_{tmdb_id}.jpg',
            pass empty string for missing)

    Returns:
        Dictionary matching TMDB API movie response structure

    Example:
        >>> # Standard valid movie
        >>> movie = create_movie_dict(1, "Test Movie", "2022-01-01", 8.0)

        >>> # Movie without poster (for completeness filter tests)
        >>> no_poster = create_movie_dict(2, "No Poster", "2022-01-01", 7.5, poster_path='')
    """
    # Default vote_count to 100 (well above 50 threshold) for reliable ratings
    # Tests specifically testing vote count behavior can override this
    if vote_count is None:
        vote_count = 100

    # Default poster_path to valid path unless explicitly set
    # Tests for completeness filter can explicitly pass empty string for missing poster
    if poster_path is None:
        poster_path = f'/poster_{tmdb_id}.jpg'

    return {
        'id': tmdb_id,
        'title': title,
        'poster_path': poster_path,
        'release_date': release_date,
        'vote_average': vote_average,
        'vote_count': vote_count,
        'runtime': runtime,
    }


def create_paginated_tmdb_response(
    movies: list[TMDBMovieBase],
    page: int = 1,
    total_pages: int = 1,
    total_results: int | None = None,
) -> TMDBMovieResponse:
    """Create a mock TMDB paginated response for testing.

    This helper ensures consistent pagination structure across all tests,
    matching TMDB API's actual response format.

    Args:
        movies: List of movie dictionaries (use create_movie_dict() to create)
        page: Current page number
        total_pages: Total number of pages
        total_results: Total number of results (defaults to len(movies))

    Returns:
        Dictionary matching TMDB API paginated response structure

    Example:
        >>> movies = [
        ...     create_movie_dict(1, "Movie 1", "2022-01-01", 8.0),
        ...     create_movie_dict(2, "Movie 2", "2022-02-01", 7.5),
        ... ]
        >>> response = create_paginated_tmdb_response(movies, page=1, total_pages=5)
    """
    if total_results is None:
        total_results = len(movies)

    return {
        'page': page,
        'total_pages': total_pages,
        'total_results': total_results,
        'results': movies,
    }
