"""Django Ninja routers for movie-related endpoints.

This module defines multiple routers for different types of TMDB data:
- movies_router: Movie discovery, search, and details
- genres_router: Movie genres
- keywords_router: Movie keywords
- people_router: Movie people (cast/crew)

All routers integrate with the typed movie service layer.
"""

from __future__ import annotations

from typing import cast

from django.http import HttpRequest
from ninja import Router

from .schemas import (
    GenreSchema,
    MovieDetailSchema,
    PaginatedKeywordResponseSchema,
    PaginatedMovieResponseSchema,
    PaginatedPersonResponseSchema,
)

# Import service functions
from .services import movie_service

# Create separate router instances for logical grouping
movies_router = Router(tags=["movies"])
genres_router = Router(tags=["genres"])
keywords_router = Router(tags=["keywords"])
people_router = Router(tags=["people"])


# =========================
# Genres Endpoints
# =========================


@genres_router.get("", response=list[GenreSchema], auth=None)
def get_movie_genres(request: HttpRequest):
    """Retrieve the list of available movie genres from TMDB."""
    return movie_service.get_movie_genres()


# =========================
# Keywords Endpoints
# =========================


@keywords_router.get("", response=PaginatedKeywordResponseSchema, auth=None)
def get_popular_keywords(request: HttpRequest, page: int = 1):
    """Retrieve popular keywords with pagination."""
    return movie_service.get_popular_keywords(page=page)


@keywords_router.get("/search", response=PaginatedKeywordResponseSchema, auth=None)
def search_keywords(request: HttpRequest, query: str):
    """Search for keywords by query string."""
    return movie_service.search_keywords(query)


# =========================
# People Endpoints
# =========================


@people_router.get("", response=PaginatedPersonResponseSchema, auth=None)
def get_popular_people(request: HttpRequest, page: int = 1):
    """Retrieve popular people (actors, directors, etc.) with pagination."""
    return movie_service.get_popular_people(page=page)


@people_router.get("/search", response=PaginatedPersonResponseSchema, auth=None)
def search_people(request: HttpRequest, query: str):
    """Search for people by query string."""
    return movie_service.search_people(query)


# =========================
# Movie Endpoints
# =========================


def _build_discover_params(**kwargs: object) -> dict[str, str | int | float | bool | None]:
    """Build parameters dictionary for movie discovery filtering."""
    params: dict[str, str | int | float | bool | None] = {}

    # Standard TMDB parameters
    param_mappings = {
        'with_genres': 'with_genres',
        'with_keywords': 'with_keywords',
        'with_cast': 'with_cast',
        'with_crew': 'with_crew',
        'with_people': 'with_people',
        'with_companies': 'with_companies',
        'with_networks': 'with_networks',
        'with_watch_providers': 'with_watch_providers',
        'with_watch_monetization_types': 'with_watch_monetization_types',
        'without_genres': 'without_genres',
        'without_keywords': 'without_keywords',
        'without_companies': 'without_companies',
        'without_networks': 'without_networks',
        'without_watch_providers': 'without_watch_providers',
        'include_adult': 'include_adult',
        'include_video': 'include_video',
        'language': 'language',
        'primary_release_year': 'primary_release_year',
        'with_release_type': 'with_release_type',
        'year': 'year',
        'vote_count_gte': 'vote_count.gte',
        'vote_count_lte': 'vote_count.lte',
        'vote_average_gte': 'vote_average.gte',
        'vote_average_lte': 'vote_average.lte',
        'with_runtime_gte': 'with_runtime.gte',
        'with_runtime_lte': 'with_runtime.lte',
        'region': 'region',
        'sort_by': 'sort_by',
        'certification_country': 'certification_country',
        'certification': 'certification',
        'certification_lte': 'certification.lte',
        'certification_gte': 'certification.gte',
        'with_original_language': 'with_original_language',
        'without_original_language': 'without_original_language',
        'primary_release_date_gte': 'primary_release_date.gte',
        'primary_release_date_lte': 'primary_release_date.lte',
        'release_date_gte': 'release_date.gte',
        'release_date_lte': 'release_date.lte',
    }

    # Map standard parameters
    for param_name, tmdb_param in param_mappings.items():
        value = kwargs.get(param_name)
        if value is not None:
            # Cast from object to expected parameter type
            params[tmdb_param] = cast(str | int | float | bool | None, value)

    # Frontend convenience aliases
    if (decade := kwargs.get('decade')) is not None:
        # Accept formats like "1990s" or "1990" and convert to date range
        # Note: This logic will be moved to service layer in future backend-modernization
        try:
            decade_str = str(decade)
            year = int(decade_str[:4])
            start_year = year if decade_str.endswith('s') else (year // 10) * 10
            end_year = start_year + 9
            params['primary_release_date.gte'] = f"{start_year}-01-01"
            params['primary_release_date.lte'] = f"{end_year}-12-31"
        except (ValueError, TypeError):
            # Ignore invalid decade input
            pass
    if kwargs.get('genres') is not None:
        params['genres'] = cast(str | int | float | bool | None, kwargs['genres'])

    return params


@movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(request: HttpRequest, page: int = 1):
    """Retrieve currently playing movies with pagination."""
    return movie_service.get_now_playing_movies(page=page)


@movies_router.get("/upcoming", response=PaginatedMovieResponseSchema, auth=None)
def get_upcoming_movies(request: HttpRequest, page: int = 1):
    """Retrieve upcoming movies with pagination."""
    return movie_service.get_upcoming_movies(page=page)


@movies_router.get("/search", response=PaginatedMovieResponseSchema, auth=None)
def search_movies(request: HttpRequest, query: str, page: int = 1):
    """Search for movies by query string with pagination."""
    return movie_service.search_movies(query=query, page=page)


@movies_router.get("/discover", response=PaginatedMovieResponseSchema, auth=None)
def discover_movies(
    request: HttpRequest,
    page: int = 1,
    with_genres: str | None = None,
    with_keywords: str | None = None,
    with_cast: str | None = None,
    with_crew: str | None = None,
    with_people: str | None = None,
    with_companies: str | None = None,
    with_networks: str | None = None,
    with_watch_providers: str | None = None,
    with_watch_monetization_types: str | None = None,
    without_genres: str | None = None,
    without_keywords: str | None = None,
    without_companies: str | None = None,
    without_networks: str | None = None,
    without_watch_providers: str | None = None,
    include_adult: bool | None = None,
    include_video: bool | None = None,
    language: str | None = None,
    primary_release_year: int | None = None,
    primary_release_date_gte: str | None = None,
    primary_release_date_lte: str | None = None,
    release_date_gte: str | None = None,
    release_date_lte: str | None = None,
    with_release_type: str | None = None,
    year: int | None = None,
    vote_count_gte: int | None = None,
    vote_count_lte: int | None = None,
    vote_average_gte: float | None = None,
    vote_average_lte: float | None = None,
    with_runtime_gte: int | None = None,
    with_runtime_lte: int | None = None,
    region: str | None = None,
    sort_by: str | None = None,
    certification_country: str | None = None,
    certification: str | None = None,
    certification_lte: str | None = None,
    certification_gte: str | None = None,
    with_original_language: str | None = None,
    without_original_language: str | None = None,
    decade: str | None = None,
    genres: str | None = None,
):
    """
    Discover movies with advanced filtering options.

    This endpoint provides comprehensive movie discovery with extensive filtering
    capabilities including genres, keywords, cast, crew, release dates, ratings,
    and more. It supports both TMDB standard parameters and custom aliases for
    frontend convenience.

    Query Parameters:
        page: Page number for pagination (default: 1)
        with_genres: Comma-separated genre IDs to include
        genres: Alias for with_genres (frontend convenience)
        decade: Decade filter (e.g., "1990s" → converts to date range)
        sort_by: Sort criteria (popularity.desc, vote_average.desc, etc.)
        vote_average_gte/lte: Rating range filtering
        with_runtime_gte/lte: Runtime range filtering
        primary_release_year: Filter by release year
        [... many other TMDB discover parameters]

    Returns:
        PaginatedMovieResponseSchema: Paginated list of movies matching criteria

    Raises:
        HttpError: 400 for invalid parameters, 500 for TMDB API errors
    """
    # Build parameters using helper function
    params = _build_discover_params(
        with_genres=with_genres,
        with_keywords=with_keywords,
        with_cast=with_cast,
        with_crew=with_crew,
        with_people=with_people,
        with_companies=with_companies,
        with_networks=with_networks,
        with_watch_providers=with_watch_providers,
        with_watch_monetization_types=with_watch_monetization_types,
        without_genres=without_genres,
        without_keywords=without_keywords,
        without_companies=without_companies,
        without_networks=without_networks,
        without_watch_providers=without_watch_providers,
        include_adult=include_adult,
        include_video=include_video,
        language=language,
        primary_release_year=primary_release_year,
        primary_release_date_gte=primary_release_date_gte,
        primary_release_date_lte=primary_release_date_lte,
        release_date_gte=release_date_gte,
        release_date_lte=release_date_lte,
        with_release_type=with_release_type,
        year=year,
        vote_count_gte=vote_count_gte,
        vote_count_lte=vote_count_lte,
        vote_average_gte=vote_average_gte,
        vote_average_lte=vote_average_lte,
        with_runtime_gte=with_runtime_gte,
        with_runtime_lte=with_runtime_lte,
        region=region,
        sort_by=sort_by,
        certification_country=certification_country,
        certification=certification,
        certification_lte=certification_lte,
        certification_gte=certification_gte,
        with_original_language=with_original_language,
        without_original_language=without_original_language,
        decade=decade,
        genres=genres,
    )

    return movie_service.discover_movies(page=page, **params)


@movies_router.get("/{tmdb_id}", response=MovieDetailSchema, auth=None)
def get_movie_detail(request: HttpRequest, tmdb_id: int) -> MovieDetailSchema:
    """
    Retrieve detailed information for a specific movie by TMDB ID.

    This endpoint fetches comprehensive movie details including cast, crew,
    genres, production companies, and user-specific data if authenticated.

    Args:
        request: HTTP request object for user context
        tmdb_id: The TMDB ID of the movie to retrieve

    Returns:
        MovieDetailSchema: Complete movie details with user data if authenticated

    Raises:
        HttpError: 404 if movie not found, 500 for TMDB API errors
    """
    # Fetch movie details (user authentication will be integrated in future phases)
    movie_data = movie_service.get_movie_by_id(tmdb_id)

    return movie_data
