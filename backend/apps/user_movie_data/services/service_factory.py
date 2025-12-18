"""
Service factory functions for user_movie_data domain.

This module provides factory functions that create service instances with
appropriate dependencies injected, following the dependency injection pattern.

Factory functions simplify service instantiation in production code while
maintaining testability through constructor injection.

Available factories:
- get_movie_enrichment_service() - For enriching movie data with user context
- get_user_movie_data_service() - For CRUD operations on user movie data
"""
from __future__ import annotations

from movie.services.service_factory import get_movie_service
from user_movie_data.repositories import UserMovieDataRepository
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService
from user_movie_data.services.user_movie_data_service import UserMovieDataService


def get_movie_enrichment_service() -> MovieEnrichmentService:
    """
    Create a MovieEnrichmentService with default dependencies.

    This factory function instantiates the service with a default
    UserMovieDataRepository, providing a convenient way to obtain
    a fully-configured service instance.

    For testing, bypass this factory and inject mock dependencies directly
    into the service constructor.

    Returns:
        MovieEnrichmentService instance with default repository injected

    Example:
        # Production usage
        service = get_movie_enrichment_service()
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)

        # Testing (bypass factory, inject mock)
        mock_repo = MockUserMovieDataRepository()
        service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    """
    repository = UserMovieDataRepository()
    return MovieEnrichmentService(user_movie_data_repository=repository)


def get_user_movie_data_service() -> UserMovieDataService:
    """
    Create a UserMovieDataService with default dependencies.

    This factory function instantiates the service with default
    UserMovieDataRepository and MovieService dependencies, providing
    a convenient way to obtain a fully-configured service instance.

    For testing, bypass this factory and inject mock dependencies directly
    into the service constructor.

    Returns:
        UserMovieDataService instance with default dependencies injected

    Example:
        # Production usage
        service = get_user_movie_data_service()
        umd = service.create(user, tmdb_id=12345, user_on_watchlist=True)

        # Testing (bypass factory, inject mocks)
        mock_repo = Mock()
        mock_movie_service = Mock()
        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )
    """
    repository = UserMovieDataRepository()
    movie_service = get_movie_service()
    return UserMovieDataService(
        repository=repository,
        movie_service=movie_service,
    )


__all__ = ["get_movie_enrichment_service", "get_user_movie_data_service"]
