"""Django Ninja routers for movie-related endpoints.

This module defines multiple routers for different types of TMDB data:
- movies_router: Movie discovery, search, and details
- genres_router: Movie genres
- keywords_router: Movie keywords
- people_router: Movie people (cast/crew)

All routers integrate with the typed movie service layer.
"""

from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

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

# Import service functions
from .services import movie_service

# Create separate router instances for logical grouping
movies_router = Router(tags=["movies"])
genres_router = Router(tags=["genres"])
keywords_router = Router(tags=["keywords"])
people_router = Router(tags=["people"])

# Module-level singleton instances for Query defaults (ruff B008)
_PAGINATION_PARAMS = Query(PaginationParamsSchema())
_SEARCH_PARAMS = Query(MovieSearchParamsSchema(query=""))
_FILTER_PARAMS = Query(MovieDiscoverFilterSchema())


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
def get_popular_keywords(
    request: HttpRequest,
    params: PaginationParamsSchema = _PAGINATION_PARAMS,
):
    """Retrieve popular keywords with pagination."""
    return movie_service.get_popular_keywords(page=params.page or 1)


@keywords_router.get("/search", response=PaginatedKeywordResponseSchema, auth=None)
def search_keywords(request: HttpRequest, query: str):
    """Search for keywords by query string."""
    return movie_service.search_keywords(query)


# =========================
# People Endpoints
# =========================


@people_router.get("", response=PaginatedPersonResponseSchema, auth=None)
def get_popular_people(
    request: HttpRequest,
    params: PaginationParamsSchema = _PAGINATION_PARAMS,
):
    """Retrieve popular people (actors, directors, etc.) with pagination."""
    return movie_service.get_popular_people(page=params.page or 1)


@people_router.get("/search", response=PaginatedPersonResponseSchema, auth=None)
def search_people(request: HttpRequest, query: str):
    """Search for people by query string."""
    return movie_service.search_people(query)


# =========================
# Movie Endpoints
# =========================


@movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(
    request: HttpRequest,
    params: PaginationParamsSchema = _PAGINATION_PARAMS,
):
    """Retrieve currently playing movies with pagination."""
    return movie_service.get_now_playing_movies(page=params.page or 1)


@movies_router.get("/upcoming", response=PaginatedMovieResponseSchema, auth=None)
def get_upcoming_movies(
    request: HttpRequest,
    params: PaginationParamsSchema = _PAGINATION_PARAMS,
):
    """Retrieve upcoming movies with pagination."""
    return movie_service.get_upcoming_movies(page=params.page or 1)


@movies_router.get("/search", response=PaginatedMovieResponseSchema, auth=None)
def search_movies(
    request: HttpRequest,
    params: MovieSearchParamsSchema = _SEARCH_PARAMS,
):
    """
    Search for movies by query string with pagination.

    Uses MovieSearchParamsSchema to handle Django Ninja 1.4.3 +
    Pydantic 2.12.0 empty string validation issue with optional parameters.
    """
    return movie_service.search_movies(query=params.query, page=params.page or 1)


@movies_router.get("/discover", response=PaginatedMovieResponseSchema, auth=None)
def discover_movies(
    request: HttpRequest,
    filters: MovieDiscoverFilterSchema = _FILTER_PARAMS,
):
    """
    Discover movies with advanced filtering options.

    This endpoint provides comprehensive movie discovery with extensive filtering
    capabilities including genres, keywords, cast, crew, release dates, ratings,
    and more. It supports both TMDB standard parameters and custom aliases for
    frontend convenience.

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
            - vote_average_gte/lte: Rating range filtering
            - with_runtime_gte/lte: Runtime range filtering
            - primary_release_year: Filter by release year
            - [... many other TMDB discover parameters]

    Returns:
        PaginatedMovieResponseSchema: Paginated list of movies matching criteria

    Raises:
        HttpError: 400 for invalid parameters, 500 for TMDB API errors
    """
    # Convert filter schema to service layer parameters
    params = filters.to_service_params()

    return movie_service.discover_movies(page=filters.page or 1, **params)


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
