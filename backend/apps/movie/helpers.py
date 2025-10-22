"""Movie domain helper functions for common operations.

This module provides reusable helper functions for movie API endpoints,
reducing code duplication and centralizing common patterns.
"""

from authentication.auth_ninja import get_current_user_optional
from django.http import HttpRequest
from movie.schemas import MovieBaseSchema, PaginatedMovieResponseSchema
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

# Singleton enrichment service instance
_enrichment_service = MovieEnrichmentService()


def enrich_response_with_user_movie_data(
    request: HttpRequest,
    response: PaginatedMovieResponseSchema,
) -> PaginatedMovieResponseSchema:
    """Enrich paginated movie response with user movie data.

    HTTP helper that extracts the current user (if authenticated) and enriches
    the response's movie results with user movie data (watchlist status, ratings,
    reviews) from the UserMovieData model using the movie enrichment service.

    This is a convenience wrapper around the enrichment service for use in
    API endpoints. For direct movie list enrichment, use MovieEnrichmentService
    directly.

    For unauthenticated requests, returns the response unchanged.

    Args:
        request: HTTP request object (used to extract current user)
        response: Paginated movie response from TMDB service

    Returns:
        The same response object with enriched movie results

    Example:
        >>> @movies_router.get("/now-playing", response=PaginatedMovieResponseSchema, auth=None)
        >>> def get_now_playing(request: HttpRequest, params: PaginationParams):
        ...     # Fetch movies from TMDB
        ...     response = movie_service.get_now_playing_movies(page=params.page or 1)
        ...
        ...     # Enrich response with UserMovieData if authenticated (one-liner)
        ...     return enrich_response_with_user_movie_data(request, response)
    """
    user = get_current_user_optional(request)
    response.results = _enrichment_service.enrich_movies_with_user_movie_data(
        response.results,
        user
    )
    return response


def enrich_single_movie_with_user_movie_data(
    request: HttpRequest,
    movie: MovieBaseSchema,
) -> MovieBaseSchema:
    """Enrich single movie object with user movie data.

    HTTP helper that extracts the current user (if authenticated) and enriches
    a single movie object with user movie data from the UserMovieData model
    using the movie enrichment service.

    Similar to enrich_response_with_user_movie_data but operates on a single
    movie object rather than a paginated response wrapper.

    This is a convenience wrapper around the enrichment service for use in
    API endpoints that return single movies. For direct movie list enrichment,
    use MovieEnrichmentService directly.

    Args:
        request: HTTP request object (used to extract current user)
        movie: Single movie schema from TMDB service

    Returns:
        The same movie object with enriched user movie data

    Example:
        >>> @movies_router.get("/{movie_id}", response=MovieDetailSchema, auth=None)
        >>> def get_movie_detail(request: HttpRequest, movie_id: int):
        ...     # Fetch movie from TMDB
        ...     movie = movie_service.get_movie_by_id(movie_id)
        ...
        ...     # Enrich single movie with UserMovieData if authenticated (one-liner)
        ...     return enrich_single_movie_with_user_movie_data(request, movie)
    """
    user = get_current_user_optional(request)
    enriched_list = _enrichment_service.enrich_movies_with_user_movie_data(
        [movie],
        user
    )
    return enriched_list[0]
