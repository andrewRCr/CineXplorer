"""Django Ninja routers for movie-related endpoints.

This module defines multiple routers for different types of TMDB data:
- movies_router: Movie discovery, search, and details
- genres_router: Movie genres
- keywords_router: Movie keywords
- people_router: Movie people (cast/crew)

All routers integrate with the typed movie service layer and enrichment service
for user-specific data population.
"""

from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

from .helpers import (
    enrich_response_with_user_movie_data,
    enrich_single_movie_with_user_movie_data,
)
from .schemas import (
    GenreSchema,
    MovieDetailSchema,
    MovieDiscoverFilterSchema,
    MovieSearchParamsSchema,
    PaginatedKeywordResponseSchema,
    PaginatedMovieResponseSchema,
    PaginatedPersonResponseSchema,
    PaginationParamsSchema,
)

# Import API boundary transformer (handles vote count policy internally)
from .services.api_boundary import transform_to_service_params

# Import service factories
from .services.service_factory import (
    get_keyword_service,
    get_movie_service,
    get_people_service,
)

# Module-level service instances (singleton pattern for request handling)
_movie_service = get_movie_service()
_keyword_service = get_keyword_service()
_people_service = get_people_service()

# Create separate router instances for logical grouping
movies_router = Router(tags=["movies"])
genres_router = Router(tags=["genres"])
keywords_router = Router(tags=["keywords"])
people_router = Router(tags=["people"])

# Reusable type aliases for query parameters (Django Ninja + FastAPI pattern)
# Note: We use the bracket syntax Query[Schema] rather than Annotated[Schema, Query()]
# because Django Ninja's Query is already typed as Annotated, leading to typing conflicts
# This is a known Django Ninja typing limitation - the bracket syntax works at runtime
# Reference: https://github.com/vitalik/django-ninja/issues/1335
PaginationParams = Query[PaginationParamsSchema]  # type: ignore[valid-type]
SearchParams = Query[MovieSearchParamsSchema]  # type: ignore[valid-type]
FilterParams = Query[MovieDiscoverFilterSchema]  # type: ignore[valid-type]


# =========================
# Genres Endpoints
# =========================


@genres_router.get("", response=list[GenreSchema], auth=None)
def get_movie_genres(request: HttpRequest):
    """Retrieve the list of available movie genres from TMDB."""
    return _movie_service.get_movie_genres()


# =========================
# Keywords Endpoints
# =========================


@keywords_router.get("", response=PaginatedKeywordResponseSchema, auth=None)
def get_popular_keywords(
    request: HttpRequest,
    params: PaginationParams,
):
    """Retrieve popular keywords with pagination."""
    return _keyword_service.get_popular_keywords(page=params.page or 1)


@keywords_router.get("/search", response=PaginatedKeywordResponseSchema, auth=None)
def search_keywords(request: HttpRequest, query: str):
    """Search for keywords by query string."""
    return _keyword_service.search_keywords(query)


# =========================
# People Endpoints
# =========================


@people_router.get("", response=PaginatedPersonResponseSchema, auth=None)
def get_popular_people(
    request: HttpRequest,
    params: PaginationParams,
):
    """Retrieve popular people (actors, directors, etc.) with pagination."""
    return _people_service.get_popular_people(page=params.page or 1)


@people_router.get("/search", response=PaginatedPersonResponseSchema, auth=None)
def search_people(request: HttpRequest, query: str):
    """Search for people by query string."""
    return _people_service.search_people(query)


# =========================
# Movie Endpoints
# =========================


@movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(
    request: HttpRequest,
    filters: FilterParams,
):
    """
    Retrieve movies currently playing in theaters with filtering and user-specific data.

    Thin HTTP wrapper that delegates to service layer for business logic.
    See MovieService.get_now_playing_movies() for implementation details including
    date range presets, protected parameters, and user filter capabilities.

    Query Parameters:
        filters: MovieDiscoverFilterSchema with all optional filter parameters

    Returns:
        PaginatedMovieResponseSchema: Paginated movies with user data if authenticated

    Raises:
        HttpError: 400 for invalid parameters, 500 for TMDB API errors
    """
    # Transform HTTP params to service params and delegate to service layer
    response = _movie_service.get_now_playing_movies(
        page=filters.page or 1,
        params=transform_to_service_params(filters)
    )

    # Enrich with user data if authenticated
    return enrich_response_with_user_movie_data(request, response)


@movies_router.get("/upcoming", response=PaginatedMovieResponseSchema, auth=None)
def get_upcoming_movies(
    request: HttpRequest,
    filters: FilterParams,
):
    """
    Retrieve upcoming movies with filtering and user-specific data.

    Thin HTTP wrapper that delegates to service layer for business logic.
    See MovieService.get_upcoming_movies() for implementation details including
    date range presets, protected parameters, and user filter capabilities.

    Query Parameters:
        filters: MovieDiscoverFilterSchema with all optional filter parameters

    Returns:
        PaginatedMovieResponseSchema: Paginated movies with user data if authenticated

    Raises:
        HttpError: 400 for invalid parameters, 500 for TMDB API errors
    """
    # Transform HTTP params to service params and delegate to service layer
    response = _movie_service.get_upcoming_movies(
        page=filters.page or 1,
        params=transform_to_service_params(filters)
    )

    # Enrich with user data if authenticated
    return enrich_response_with_user_movie_data(request, response)


@movies_router.get("/search", response=PaginatedMovieResponseSchema, auth=None)
def search_movies(
    request: HttpRequest,
    params: SearchParams,
):
    """
    Search for movies by query string with pagination and user-specific data.

    Uses MovieSearchParamsSchema to handle Django Ninja 1.4.3 +
    Pydantic 2.12.0 empty string validation issue with optional parameters.
    """
    # Fetch movies from TMDB
    response = _movie_service.search_movies(query=params.query, page=params.page or 1)

    # Enrich with user data if authenticated
    return enrich_response_with_user_movie_data(request, response)


@movies_router.get("/browse", response=PaginatedMovieResponseSchema, auth=None)
def browse_movies(
    request: HttpRequest,
    filters: FilterParams,
):
    """
    Browse movies with advanced filtering options and user-specific data.

    This is a thin wrapper around the TMDB discover endpoint with zero presets,
    giving users full control over all filter parameters. Unlike now-playing and
    upcoming endpoints which protect date ranges, this endpoint allows unrestricted
    filtering for general movie browsing.

    This endpoint implements a two-pass filtering architecture:
    1. TMDB API filtering (primary) - Reduces millions of movies to thousands
    2. Backend filtering (second-pass) - Catches TMDB data quality issues

    The schema layer extracts parameters for both passes from incoming filter
    parameters. For example, release_date_gte="2020-01-01" generates both:
    - release_date.gte for TMDB API (primary filter)
    - year_min=2020 for backend filtering (data hygiene)

    This ensures users see only movies matching their filters, even when TMDB
    API returns movies with incorrect release dates or ratings.

    Uses FilterSchema to handle 40+ optional parameters cleanly, with automatic
    empty string to None conversion to handle Django Ninja 1.4.3 + Pydantic 2.12.0
    validation behavior.

    Query Parameters (all in filters schema):
        filters: MovieDiscoverFilterSchema with all TMDB discover parameters
            - page: Page number for pagination (default: 1)
            - with_genres: Comma-separated genre IDs to include
            - genres: Alias for with_genres (frontend convenience)
            - decade: Decade filter (e.g., "1990s" → converts to date range)
            - sort_by: Sort criteria (popularity.desc, vote_average.desc, etc.)
            - vote_average_gte/lte: Rating range filtering (both TMDB + backend)
            - release_date_gte/lte: Date range filtering (both TMDB + backend)
            - primary_release_year: Filter by release year
            - [... many other TMDB discover parameters]

    Returns:
        PaginatedMovieResponseSchema: Paginated list of movies with user data if authenticated

    Raises:
        HttpError: 400 for invalid parameters, 500 for TMDB API errors
    """
    # Transform HTTP params to service layer parameters
    # Note: min_vote_count is computed by transform_to_service_params via VoteCountPolicy
    # with full context (sort_by, year_max, rating_min, rating_max)
    params = transform_to_service_params(filters)

    # Fetch movies from TMDB with two-pass filtering
    response = _movie_service.discover_movies(page=filters.page or 1, params=params)

    # Enrich with user data if authenticated
    return enrich_response_with_user_movie_data(request, response)


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
    # Fetch movie details from TMDB
    movie_data = _movie_service.get_movie_by_id(tmdb_id)

    # Enrich with user data if authenticated
    return enrich_single_movie_with_user_movie_data(request, movie_data)  # type: ignore[return-value]
