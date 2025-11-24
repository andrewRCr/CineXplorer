"""Pydantic model builders for TMDB API response mocking.

These builders create validated Pydantic model instances representing TMDB API responses,
used across service layer tests for consistent and type-safe mock data.

Following type safety strategy validation boundary pattern: Test data is validated
at construction using the same Pydantic models as production code, eliminating
the need for cast() and ensuring tests use realistic, validated data.

"""
from __future__ import annotations

from typing import NotRequired, TypedDict

from core.tmdb_models.tmdb_responses import (
    TMDBMovieBase,
    TMDBMovieDetail,
    TMDBPaginatedMovieResponse,
)

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


class TMDBMovieBaseRawDict(TypedDict):
    """Base movie result structure from TMDB list endpoints.

    Used in search results, discover, now_playing, upcoming, etc.

    IMPORTANT: TMDB API data quality issues mean fields can be missing, null, or invalid:
    - release_date: Can be None, empty string, or missing entirely (data hygiene issues)
    - vote_average: Can be None or missing (placeholder ratings, unreleased movies)
    - vote_count: Can be None or missing (unreleased or limited release movies)
    - poster_path: Can be None or missing (no poster uploaded)
    - runtime: Can be None or missing (not available for all movies)
    - genre_ids: Can be empty list (data quality signal - misclassified/garbage content)
    - overview: Can be None, empty string, or placeholder text "Details Here"

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
    genre_ids: NotRequired[list[int]]  # May be empty list - data quality signal
    overview: NotRequired[str | None]  # May be missing, null, empty, or placeholder text


class TMDBMovieResponse(TMDBPaginatedResponse):
    """TMDB movie list response (search/movie, discover/movie, movie/now_playing, etc)."""

    results: list[TMDBMovieBaseRawDict]


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


def create_tmdb_movie(
    tmdb_id: int,
    title: str,
    release_date: str,
    vote_average: float,
    runtime: int | None = None,
    vote_count: int | None = None,
    poster_path: str | None = None,
    genre_ids: list[int] | None = None,
    overview: str | None = None,
) -> TMDBMovieBase:
    """Create a validated TMDB movie model for testing.

    Returns a Pydantic model instance with validated TMDB API response structure.
    This ensures test data undergoes the same validation as production data,
    catching invalid test data at construction time.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        release_date: Release date in YYYY-MM-DD format
        vote_average: Rating (0.0-10.0 scale)
        runtime: Optional runtime in minutes
        vote_count: Number of votes (defaults to 100 for reliable rating)
        poster_path: Poster path (defaults to '/poster_{tmdb_id}.jpg',
            pass empty string for missing)
        genre_ids: Genre IDs (defaults to [18, 28] - Drama, Action).
            Pass empty list [] for testing data quality filtering.
        overview: Movie overview/description (defaults to valid overview text,
            pass empty string '' for missing overview)

    Returns:
        Validated TMDBMovieBase Pydantic model

    Example:
        >>> # Standard valid movie
        >>> movie = create_tmdb_movie(1, "Test Movie", "2022-01-01", 8.0)

        >>> # Movie without poster (for completeness filter tests)
        >>> no_poster = create_tmdb_movie(2, "No Poster", "2022-01-01", 7.5, poster_path='')

        >>> # Movie without genres (for data quality filter tests)
        >>> no_genres = create_tmdb_movie(3, "Garbage", "2022-01-01", 2.0, genre_ids=[])

        >>> # Movie without overview (for completeness filter tests)
        >>> no_overview = create_tmdb_movie(4, "No Overview", "2022-01-01", 7.0, overview='')
    """
    # Default vote_count to 100 (well above 50 threshold) for reliable ratings
    # Tests specifically testing vote count behavior can override this
    if vote_count is None:
        vote_count = 100

    # Default poster_path to valid path unless explicitly set
    # Tests for completeness filter can explicitly pass empty string for missing poster
    if poster_path is None:
        poster_path = f'/poster_{tmdb_id}.jpg'

    # Default genre_ids to [18, 28] (Drama, Action) for legitimate movies
    # Tests for data quality filtering can explicitly pass empty list []
    if genre_ids is None:
        genre_ids = [18, 28]  # Drama, Action - common genres

    # Default overview to valid description unless explicitly set
    # Tests for completeness filter can explicitly pass empty string for missing overview
    if overview is None:
        overview = (
            f'A compelling story about {title}. '
            f'This film explores themes of drama and action.'
        )

    return TMDBMovieBase(
        id=tmdb_id,
        title=title,
        poster_path=poster_path,
        release_date=release_date,
        vote_average=vote_average,
        vote_count=vote_count,
        genre_ids=genre_ids,
        overview=overview,
    )


def create_paginated_tmdb_response(
    movies: list[TMDBMovieBase],
    page: int = 1,
    total_pages: int = 1,
    total_results: int | None = None,
) -> TMDBPaginatedMovieResponse:
    """Create a validated TMDB paginated response for testing.

    Returns a Pydantic model instance with validated pagination structure.
    This ensures test data undergoes the same validation as production data.

    Args:
        movies: List of TMDBMovieBase models (use create_tmdb_movie() to create)
        page: Current page number
        total_pages: Total number of pages
        total_results: Total number of results (defaults to len(movies))

    Returns:
        Validated TMDBPaginatedMovieResponse Pydantic model

    Example:
        >>> movies = [
        ...     create_tmdb_movie(1, "Movie 1", "2022-01-01", 8.0),
        ...     create_tmdb_movie(2, "Movie 2", "2022-02-01", 7.5),
        ... ]
        >>> response = create_paginated_tmdb_response(movies, page=1, total_pages=5)
    """
    if total_results is None:
        total_results = len(movies)

    return TMDBPaginatedMovieResponse(
        page=page,
        total_pages=total_pages,
        total_results=total_results,
        results=movies,
    )


def create_tmdb_movie_detail(
    tmdb_id: int,
    title: str,
    release_date: str,
    vote_average: float,
    runtime: int = 120,
    overview: str = 'Test movie overview',
    genres: list[TMDBGenre] | None = None,
    production_companies: list[TMDBProductionCompany] | None = None,
    poster_path: str | None = None,
    vote_count: int | None = None,
    genre_ids: list[int] | None = None
) -> TMDBMovieDetail:
    """Create a validated TMDB movie detail model for testing.

    Returns a Pydantic model instance with validated movie detail structure.
    This ensures test data undergoes the same validation as production data.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        release_date: Release date in YYYY-MM-DD format
        vote_average: Rating (0.0-10.0 scale)
        runtime: Runtime in minutes (defaults to 120)
        overview: Movie overview/synopsis (defaults to "Test movie overview")
        genres: List of genre objects (defaults to [])
        production_companies: List of production company objects (defaults to [])
        poster_path: Poster path (defaults to generated path)
        vote_count: Number of votes (defaults to 100)
        genre_ids: Genre IDs (defaults to [18, 28])

    Returns:
        Validated TMDBMovieDetail Pydantic model

    Example:
        >>> # Standard movie detail
        >>> detail = create_tmdb_movie_detail(
        ...     1, "Test Movie", "2022-01-01", 8.0,
        ...     runtime=150,
        ...     genres=[{'id': 28, 'name': 'Action'}]
        ... )

        >>> # With custom poster and overview
        >>> detail = create_tmdb_movie_detail(
        ...     2, "Drama", "2023-01-01", 7.5,
        ...     overview="A compelling drama",
        ...     poster_path="/custom.jpg"
        ... )
    """
    # Get base movie model for common fields
    base_movie = create_tmdb_movie(
        tmdb_id,
        title,
        release_date,
        vote_average,
        runtime=None,  # Not used in base model
        vote_count=vote_count,
        poster_path=poster_path,
        genre_ids=genre_ids,
        overview=overview
    )

    # Create detail model with base fields + detail-specific fields
    return TMDBMovieDetail(
        **base_movie.model_dump(),
        runtime=runtime,
        genres=genres or [],
        production_companies=production_companies or []
    )
