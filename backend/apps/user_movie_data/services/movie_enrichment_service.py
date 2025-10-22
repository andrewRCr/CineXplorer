"""
Movie enrichment service for populating user-specific movie data.

This service follows the class-based architecture with dependency injection
pattern from Backend Modernization Task 2.0, providing forward-compatible
code that won't require immediate refactoring.

Architecture:
- Class-based service (not function-based)
- Dependency injection for testability
- Professional type annotations (no Any usage)
- Single responsibility: enrich movie data with user context
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import QuerySet
from movie.schemas import MovieBaseSchema, UserMovieDataSchema
from user_movie_data.models import UserMovieData


class MovieEnrichmentService:
    """
    Service for enriching movie data with user-specific information.

    This service takes movie data (typically from TMDB) and enriches it with
    user-specific data like watchlist status, ratings, and reviews. It uses
    efficient bulk queries to avoid N+1 query problems.

    Architecture Pattern:
        Class-based with dependency injection following Backend Modernization
        Task 2.0 patterns. While the current implementation doesn't inject
        dependencies, the constructor signature is designed to support future
        repository injection for enhanced testability.

    Usage:
        # Basic usage (no DI)
        service = MovieEnrichmentService()
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)

        # Future usage with DI (when repository pattern is implemented)
        service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)
    """

    def __init__(
        self,
        user_movie_data_repository: object | None = None
    ) -> None:
        """
        Initialize the movie enrichment service.

        Args:
            user_movie_data_repository: Optional repository for UserMovieData
                access. Reserved for future dependency injection when repository
                pattern is implemented in Backend Modernization Task 2.0.
                Currently unused but included for forward compatibility.
        """
        # Reserved for future DI when repository pattern is implemented
        # Currently we use Django ORM directly, but this enables future
        # refactoring without breaking the public API
        self._repository = user_movie_data_repository

    def enrich_movies_with_user_movie_data(
        self,
        movies: list[MovieBaseSchema],
        user: AbstractBaseUser | None
    ) -> list[MovieBaseSchema]:
        """
        Enrich movie schemas with user movie data.

        For authenticated users, this method bulk-queries UserMovieData records
        and populates the user_movie_data field on each MovieBaseSchema from the
        UserMovieData model. For unauthenticated users, returns movies unchanged
        (user_movie_data field remains None).

        The method uses efficient bulk querying to avoid N+1 query problems:
        - Single database query fetches all UserMovieData for the user and movie set
        - O(n) mapping builds lookup dictionary by tmdb_id
        - O(n) population updates each movie schema

        Args:
            movies: List of movie schemas to enrich (typically from TMDB API)
            user: Authenticated user or None for unauthenticated requests

        Returns:
            List of movie schemas with user_movie_data field populated.
            For unauthenticated users, returns input list unchanged.
            For authenticated users, returns new list with populated user data.

        Type Safety:
            Uses AbstractBaseUser (not Any) for maximum type safety. Django ORM
            field access benefits from django-types stub inference. Pydantic
            schemas (MovieBaseSchema, UserMovieDataSchema) provide runtime
            validation at API boundaries via Django Ninja.

        Performance:
            - Unauthenticated: O(1) - immediate return
            - Authenticated with N movies: O(N) - single query + linear mapping
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

        # Bulk query: fetch all UserMovieData for this user and these movies
        # Using select_related('movie') to avoid additional queries when accessing movie fields
        user_data_qs: QuerySet[UserMovieData] = UserMovieData.objects.filter(
            user=user,
            movie__tmdb_id__in=tmdb_ids
        ).select_related('movie')

        # Build lookup dictionary: {tmdb_id: UserMovieData}
        # Use select_related to avoid N+1, then build dict from QuerySet
        user_data_list = list(user_data_qs)
        user_data_map: dict[int, UserMovieData] = {}
        for umd in user_data_list:
            # Access movie.tmdb_id via select_related - type-safe through .pyi stub
            movie_obj = umd.movie
            user_data_map[movie_obj.tmdb_id] = umd

        # Enrich each movie with user data if available
        for movie in movies:
            user_movie_data = user_data_map.get(movie.tmdb_id)

            if user_movie_data is not None:
                # Use movie.tmdb_id and movie.title from the MovieBaseSchema
                # (already validated by Pydantic), not from the ORM object
                movie.user_movie_data = UserMovieDataSchema(
                    id=user_movie_data.id,
                    tmdb_id=movie.tmdb_id,  # From MovieBaseSchema parameter
                    title=movie.title,  # From MovieBaseSchema parameter
                    user_watched=user_movie_data.user_watched,
                    user_on_watchlist=user_movie_data.user_on_watchlist,
                    user_liked=user_movie_data.user_liked,
                    user_rating=user_movie_data.user_rating,
                    user_review=user_movie_data.user_review,
                )
            # If no user data exists, user_movie_data remains None (default)

        return movies


__all__ = ["MovieEnrichmentService"]
