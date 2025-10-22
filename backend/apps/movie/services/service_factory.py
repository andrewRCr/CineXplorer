"""
Service factory functions for movie domain.

This module provides factory functions that create service instances with
appropriate dependencies injected, following the dependency injection pattern.

Factory functions simplify service instantiation in production code while
maintaining testability through constructor injection.
"""
from __future__ import annotations

from core.services.tmdb_api_client import TMDBApiClient
from movie.services.movie_service import MovieService


def get_movie_service() -> MovieService:
    """
    Create a MovieService with default dependencies.

    This factory function instantiates the service with a default
    TMDBApiClient, providing a convenient way to obtain a fully-configured
    service instance for production use.

    For testing, bypass this factory and inject mock dependencies directly
    into the service constructor.

    Returns:
        MovieService instance with default TMDBApiClient injected

    Example:
        # Production usage
        service = get_movie_service()
        movies = service.search_movies("inception")

        # Testing (bypass factory, inject mock)
        mock_client = MockTMDBApiClient()
        service = MovieService(tmdb_client=mock_client)
    """
    tmdb_client = TMDBApiClient()
    return MovieService(tmdb_client=tmdb_client)


__all__ = ["get_movie_service"]
