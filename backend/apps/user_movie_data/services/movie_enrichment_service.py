"""Attach a user's stored movie state through one bulk query."""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser

from apps.movie.schemas import MovieListItemSchema, UserMovieDataSchema
from apps.user_movie_data.models import UserMovieData


class MovieEnrichmentService:
    """Return new movie schemas enriched from the requesting user's rows."""

    def enrich_movies_with_user_movie_data(
        self, movies: list[MovieListItemSchema], user: AbstractBaseUser | None
    ) -> list[MovieListItemSchema]:
        """Enrich movie schemas with user movie data.

        For authenticated users, this method bulk-queries UserMovieData records
        and creates new MovieListItemSchema instances with the user_movie_data field
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
            schemas (MovieListItemSchema, UserMovieDataSchema) provide runtime
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

        records = (
            UserMovieData.objects.get_queryset()
            .for_user(user)
            .for_movies(tmdb_ids)
            .with_log_summary()
        )
        user_data_map = {
            record.movie.tmdb_id: record for record in records.select_related("movie")
        }

        # Create new enriched movie instances (non-mutating approach)
        enriched_movies: list[MovieListItemSchema] = []
        for movie in movies:
            user_movie_data = user_data_map.get(movie.tmdb_id)

            if user_movie_data is not None:
                # Create new instance with user data populated
                # Use model_copy() to preserve all fields from original
                enriched_movie = movie.model_copy(
                    update={"user_movie_data": UserMovieDataSchema.from_record(user_movie_data)}
                )
                enriched_movies.append(enriched_movie)
            else:
                # No user data: create copy without enrichment
                # This ensures we return new instances even when no enrichment occurs
                enriched_movies.append(movie.model_copy())

        return enriched_movies


__all__ = ["MovieEnrichmentService"]
