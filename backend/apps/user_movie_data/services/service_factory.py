"""
Service factory functions for user_movie_data domain.

This module provides factory functions that create service instances with
appropriate dependencies injected, following the dependency injection pattern.

Factory functions simplify service instantiation in production code while
maintaining testability through constructor injection.
"""
from __future__ import annotations

from user_movie_data.repositories import UserMovieDataRepository
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService


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


__all__ = ["get_movie_enrichment_service"]
