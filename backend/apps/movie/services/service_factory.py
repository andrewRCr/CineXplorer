"""Service factory functions for movie domain.

This module provides factory functions that create service instances with
appropriate dependencies injected, following the dependency injection pattern.

Factory functions simplify service instantiation in production code while
maintaining testability through constructor injection.
"""

from __future__ import annotations

from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.services.keyword_service import KeywordService
from apps.movie.services.movie_service import MovieService
from apps.movie.services.people_service import PeopleService


def get_movie_service() -> MovieService:
    """Create a MovieService with default dependencies.

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


def get_keyword_service() -> KeywordService:
    """Create a KeywordService with default dependencies.

    This factory function instantiates the service with a default
    TMDBApiClient, providing a convenient way to obtain a fully-configured
    service instance for production use.

    For testing, bypass this factory and inject mock dependencies directly
    into the service constructor.

    Returns:
        KeywordService instance with default TMDBApiClient injected

    Example:
        # Production usage
        service = get_keyword_service()
        keywords = service.search_keywords("action")

        # Testing (bypass factory, inject mock)
        mock_client = MockTMDBApiClient()
        service = KeywordService(tmdb_client=mock_client)
    """
    tmdb_client = TMDBApiClient()
    return KeywordService(tmdb_client=tmdb_client)


def get_people_service() -> PeopleService:
    """Create a PeopleService with default dependencies.

    This factory function instantiates the service with a default
    TMDBApiClient, providing a convenient way to obtain a fully-configured
    service instance for production use.

    For testing, bypass this factory and inject mock dependencies directly
    into the service constructor.

    Returns:
        PeopleService instance with default TMDBApiClient injected

    Example:
        # Production usage
        service = get_people_service()
        people = service.search_people("Tom Hanks")

        # Testing (bypass factory, inject mock)
        mock_client = MockTMDBApiClient()
        service = PeopleService(tmdb_client=mock_client)
    """
    tmdb_client = TMDBApiClient()
    return PeopleService(tmdb_client=tmdb_client)


__all__ = ["get_keyword_service", "get_movie_service", "get_people_service"]
