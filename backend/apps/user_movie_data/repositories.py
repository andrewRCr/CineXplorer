"""
Repository layer for UserMovieData domain.

This module provides data access abstractions following the repository pattern,
decoupling business logic from Django ORM implementation details.

Architecture:
- Repository pattern for data access abstraction
- Dependency injection for testability
- Type-safe interfaces with full annotations
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from user_movie_data.models import UserMovieData


class UserMovieDataRepository:
    """
    Repository for UserMovieData model access.

    This repository encapsulates data access logic for UserMovieData, providing
    a clean interface for services while isolating ORM implementation details.
    This enables easier testing through dependency injection and maintains
    separation of concerns.

    Usage:
        # Production usage (default)
        repository = UserMovieDataRepository()
        user_data_map = repository.get_for_user_and_movies(user, [12345, 67890])

        # Testing with mock
        mock_repository = MockUserMovieDataRepository()
        service = MovieEnrichmentService(user_movie_data_repository=mock_repository)
    """

    def get_for_user_and_movies(
        self,
        user: AbstractBaseUser,
        tmdb_ids: list[int]
    ) -> dict[int, UserMovieData]:
        """
        Fetch UserMovieData records for a user and list of TMDB IDs.

        This method performs a single bulk query with select_related to avoid
        N+1 query problems. Returns a dictionary mapping tmdb_id to UserMovieData
        for efficient lookup by services.

        Args:
            user: The authenticated user whose data to fetch
            tmdb_ids: List of TMDB movie IDs to query

        Returns:
            Dictionary mapping tmdb_id (int) to UserMovieData objects.
            Only includes movies that have UserMovieData entries for this user.
            Movies without entries are not included in the dictionary.

        Performance:
            - Single database query regardless of tmdb_ids length
            - Uses select_related('movie') to fetch movie data in same query
            - O(n) dictionary building where n = number of results

        Example:
            >>> repository = UserMovieDataRepository()
            >>> user_data_map = repository.get_for_user_and_movies(user, [12345, 67890])
            >>> if 12345 in user_data_map:
            ...     umd = user_data_map[12345]
            ...     print(f"User watched: {umd.user_watched}")
        """
        # Bulk query with select_related to avoid N+1
        user_data_qs = UserMovieData.objects.filter(
            user=user,
            movie__tmdb_id__in=tmdb_ids
        ).select_related('movie')

        # Build lookup dictionary: {tmdb_id: UserMovieData}
        user_data_map: dict[int, UserMovieData] = {}
        for umd in user_data_qs:
            # Access movie.tmdb_id via select_related - type-safe through django-types
            movie_obj = umd.movie
            user_data_map[movie_obj.tmdb_id] = umd

        return user_data_map


__all__ = ["UserMovieDataRepository"]
