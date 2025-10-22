"""
Movie enrichment service for populating user-specific movie data.

This service follows the class-based architecture with dependency injection
pattern, enabling testability and separation of concerns.

Architecture:
- Class-based service (not function-based)
- Dependency injection for testability
- Professional type annotations (no Any usage)
- Single responsibility: enrich movie data with user context
- Repository pattern for data access abstraction
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from movie.schemas import MovieBaseSchema, UserMovieDataSchema
from user_movie_data.models import UserMovieData

if TYPE_CHECKING:
    from user_movie_data.repositories import UserMovieDataRepository


class MovieEnrichmentService:
    """
    Service for enriching movie data with user-specific information.

    This service takes movie data (typically from TMDB) and enriches it with
    user-specific data like watchlist status, ratings, and reviews. It uses
    dependency injection with the repository pattern to abstract data access,
    enabling testability and maintaining separation of concerns.

    The service performs efficient bulk queries through the repository layer
    to avoid N+1 query problems, ensuring optimal performance regardless of
    the number of movies being enriched.

    Architecture Pattern:
        - Dependency injection with repository pattern
        - Functional programming principles (returns new instances, no mutation)
        - Type-safe with full annotations
        - Single responsibility (enrichment logic only)

    Usage:
        # Production usage (default repository)
        service = MovieEnrichmentService()
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)

        # Testing with mock repository
        mock_repo = MockUserMovieDataRepository()
        service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)
    """

    def __init__(
        self,
        user_movie_data_repository: UserMovieDataRepository | None = None
    ) -> None:
        """
        Initialize the movie enrichment service.

        Args:
            user_movie_data_repository: Optional repository for UserMovieData
                access. If None, creates default repository using Django ORM.
                Inject mock repositories for testing.

        Example:
            # Production usage (default repository)
            service = MovieEnrichmentService()

            # Testing with mock repository
            mock_repo = MockUserMovieDataRepository()
            service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
        """
        # Use injected repository or create default
        if user_movie_data_repository is not None:
            self._repository = user_movie_data_repository
        else:
            # Import here to avoid circular dependency
            from user_movie_data.repositories import UserMovieDataRepository
            self._repository = UserMovieDataRepository()

    def enrich_movies_with_user_movie_data(
        self,
        movies: list[MovieBaseSchema],
        user: AbstractBaseUser | None
    ) -> list[MovieBaseSchema]:
        """
        Enrich movie schemas with user movie data.

        For authenticated users, this method bulk-queries UserMovieData records
        and creates new MovieBaseSchema instances with the user_movie_data field
        populated. For unauthenticated users, returns movies unchanged
        (user_movie_data field remains None).

        This method follows functional programming principles by NOT mutating
        input data. It returns new instances, leaving the original list and
        movie objects unchanged.

        The method uses efficient bulk querying to avoid N+1 query problems:
        - Single database query fetches all UserMovieData for the user and movie set
        - O(n) mapping builds lookup dictionary by tmdb_id
        - O(n) copy operation creates new enriched instances

        Args:
            movies: List of movie schemas to enrich (typically from TMDB API)
            user: Authenticated user or None for unauthenticated requests

        Returns:
            List of movie schemas with user_movie_data field populated.
            For unauthenticated users, returns input list unchanged.
            For authenticated users, returns NEW list with NEW enriched instances.

        Type Safety:
            Uses AbstractBaseUser (not Any) for maximum type safety. Django ORM
            field access benefits from django-types stub inference. Pydantic
            schemas (MovieBaseSchema, UserMovieDataSchema) provide runtime
            validation at API boundaries via Django Ninja.

        Performance:
            - Unauthenticated: O(1) - immediate return
            - Authenticated with N movies: O(N) - single query + linear copy
            - No N+1 queries regardless of movie count
        """
        # Early return for unauthenticated users - no enrichment needed
        if user is None:
            return movies

        # Early return for empty movie list - nothing to enrich
        if not movies:
            return movies

        # Extract all tmdb_ids from the movie list
        tmdb_ids = [movie.tmdb_id for movie in movies]

        # Use repository to fetch UserMovieData (dependency injection)
        user_data_map: dict[int, UserMovieData] = (
            self._repository.get_for_user_and_movies(user, tmdb_ids)
        )

        # Create new enriched movie instances (non-mutating approach)
        enriched_movies: list[MovieBaseSchema] = []
        for movie in movies:
            user_movie_data = user_data_map.get(movie.tmdb_id)

            if user_movie_data is not None:
                # Create new instance with user data populated
                # Use model_copy() to preserve all fields from original
                enriched_movie = movie.model_copy(
                    update={
                        'user_movie_data': UserMovieDataSchema(
                            id=user_movie_data.id,
                            tmdb_id=movie.tmdb_id,  # From MovieBaseSchema parameter
                            title=movie.title,  # From MovieBaseSchema parameter
                            user_watched=user_movie_data.user_watched,
                            user_on_watchlist=user_movie_data.user_on_watchlist,
                            user_liked=user_movie_data.user_liked,
                            user_rating=user_movie_data.user_rating,
                            user_review=user_movie_data.user_review,
                        )
                    }
                )
                enriched_movies.append(enriched_movie)
            else:
                # No user data: create copy without enrichment
                # This ensures we return new instances even when no enrichment occurs
                enriched_movies.append(movie.model_copy())

        return enriched_movies


__all__ = ["MovieEnrichmentService"]
