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
