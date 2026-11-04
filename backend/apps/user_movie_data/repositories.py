"""Repository layer for UserMovieData domain.

This module provides data access abstractions following the repository pattern,
decoupling business logic from Django ORM implementation details.

Architecture:
- Repository pattern for data access abstraction
- Dependency injection for testability
- Type-safe interfaces with full annotations

Usage:
    # Production usage (default)
    repository = UserMovieDataRepository()

    # CRUD operations
    movie = repository.get_movie_by_tmdb_id(12345)
    umd = repository.create(user, movie, user_on_watchlist=True)
    umd = repository.get_by_id(user, record_id=1)
    umd = repository.update(record_id=1, user_watched=True)
    deleted = repository.delete(record_id=1)

    # Paginated queries
    results, metadata = repository.get_filtered(user, page=1, page_size=20)

    # Testing with mock
    mock_repository = MockUserMovieDataRepository()
    service = UserMovieDataService(repository=mock_repository)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from django.db import IntegrityError

from apps.core.models import Movie
from apps.core.pagination import PaginationMetadata, paginate_queryset
from apps.user_movie_data.models import UserMovieData

if TYPE_CHECKING:
    from apps.movie.schemas import MovieDetailSchema


class UserMovieDataRepository:
    """Repository for UserMovieData model access.

    This repository encapsulates data access logic for UserMovieData, providing
    a clean interface for services while isolating ORM implementation details.
    This enables easier testing through dependency injection and maintains
    separation of concerns.

    Methods:
        CRUD Operations:
        - create(user, movie, **fields) - Create new UserMovieData record
        - get_by_id(user, record_id) - Get record by ID (scoped to user)
        - get_by_tmdb_id(user, tmdb_id) - Get record by TMDB ID (scoped to user)
        - update(record_id, **fields) - Update existing record
        - delete(record_id) - Delete record

        Movie Operations:
        - get_movie_by_tmdb_id(tmdb_id) - Get Movie by TMDB ID
        - create_movie_stub(movie_detail) - Create Movie stub from TMDB data

        Query Operations:
        - get_for_user_and_movies(user, tmdb_ids) - Bulk fetch for enrichment
        - get_filtered(user, **filters) - Paginated filtered query
    """

    def get_for_user_and_movies(
        self, user: AbstractBaseUser, tmdb_ids: list[int]
    ) -> dict[int, UserMovieData]:
        """Fetch UserMovieData records for a user and list of TMDB IDs.

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
            user=user, movie__tmdb_id__in=tmdb_ids
        ).select_related("movie")

        # Build lookup dictionary: {tmdb_id: UserMovieData}
        user_data_map: dict[int, UserMovieData] = {}
        for umd in user_data_qs:
            # Access movie.tmdb_id via select_related - type-safe through django-types
            movie_obj = umd.movie
            user_data_map[movie_obj.tmdb_id] = umd

        return user_data_map

    # =========================================================================
    # Movie Operations (for create flow)
    # =========================================================================

    def get_movie_by_tmdb_id(self, tmdb_id: int) -> Movie | None:
        """Get a Movie by its TMDB ID.

        This method is used during UserMovieData creation to check if a movie
        already exists in the local database before fetching from TMDB.

        Args:
            tmdb_id: TMDB ID of the movie to find

        Returns:
            Movie instance if found, None otherwise

        Example:
            >>> movie = repository.get_movie_by_tmdb_id(550)
            >>> if movie is None:
            ...     # Fetch from TMDB and create stub
            ...     movie = repository.create_movie_stub(tmdb_data)
        """
        try:
            return Movie.objects.get(tmdb_id=tmdb_id)
        except Movie.DoesNotExist:
            return None

    def create_movie_stub(self, movie_detail: MovieDetailSchema) -> Movie:
        """Create a minimal Movie stub from TMDB data.

        This creates a local Movie record to serve as a foreign key anchor
        for UserMovieData. The Movie record contains only essential fields
        needed for display; full movie data is always fetched from TMDB.

        Args:
            movie_detail: MovieDetailSchema from TMDB API response

        Returns:
            Created Movie instance

        Note:
            This method assumes the caller has already verified the movie
            doesn't exist locally (via get_movie_by_tmdb_id).
        """
        return Movie.objects.create(
            tmdb_id=movie_detail.tmdb_id,
            title=movie_detail.title,
            poster_path=movie_detail.poster_path,
            release_date=movie_detail.release_date,
        )

    # =========================================================================
    # CRUD Operations
    # =========================================================================

    def create(
        self,
        user: AbstractBaseUser,
        movie: Movie,
        *,
        user_watched: bool = False,
        user_on_watchlist: bool = False,
        user_liked: bool = False,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        """Create a new UserMovieData record.

        Creates a new user-movie association with the provided fields.
        The user and movie combination must be unique.

        Args:
            user: The authenticated user
            movie: Movie instance (must exist in database)
            user_watched: Whether user has watched the movie
            user_on_watchlist: Whether movie is on user's watchlist
            user_liked: Whether user liked the movie
            user_rating: User's rating (1-10, or None)
            user_review: User's review text (or None)

        Returns:
            Created UserMovieData instance

        Raises:
            ValueError: If UserMovieData already exists for this user/movie

        Example:
            >>> movie = repository.get_movie_by_tmdb_id(550)
            >>> umd = repository.create(user, movie, user_on_watchlist=True)
        """
        try:
            return UserMovieData.objects.create(
                user=user,
                movie=movie,
                user_watched=user_watched,
                user_on_watchlist=user_on_watchlist,
                user_liked=user_liked,
                user_rating=user_rating,
                user_review=user_review,
            )
        except IntegrityError as e:
            raise ValueError("Already exists") from e

    def get_by_id(
        self,
        user: AbstractBaseUser,
        record_id: int,
    ) -> UserMovieData | None:
        """Get a UserMovieData record by its primary key.

        This method scopes the query to the provided user, ensuring
        users can only access their own data (authorization check).

        Args:
            user: The authenticated user (for authorization)
            record_id: Primary key of the UserMovieData record

        Returns:
            UserMovieData instance if found and owned by user, None otherwise

        Example:
            >>> umd = repository.get_by_id(user, record_id=1)
            >>> if umd is None:
            ...     raise HttpError(404, "Not found")
        """
        try:
            return UserMovieData.objects.select_related("movie").get(
                id=record_id,
                user=user,
            )
        except UserMovieData.DoesNotExist:
            return None

    def get_by_tmdb_id(
        self,
        user: AbstractBaseUser,
        tmdb_id: int,
    ) -> UserMovieData | None:
        """Get a UserMovieData record by TMDB movie ID.

        This method scopes the query to the provided user, ensuring
        users can only access their own data (authorization check).

        Args:
            user: The authenticated user (for authorization)
            tmdb_id: TMDB ID of the movie

        Returns:
            UserMovieData instance if found and owned by user, None otherwise

        Example:
            >>> umd = repository.get_by_tmdb_id(user, tmdb_id=550)
            >>> if umd is not None:
            ...     print(f"User rating: {umd.user_rating}")
        """
        try:
            return UserMovieData.objects.select_related("movie").get(
                user=user,
                movie__tmdb_id=tmdb_id,
            )
        except UserMovieData.DoesNotExist:
            return None

    def update(
        self,
        record_id: int,
        *,
        user_watched: bool | None = None,
        user_on_watchlist: bool | None = None,
        user_liked: bool | None = None,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        """Update an existing UserMovieData record.

        Performs a partial update, only modifying fields that are explicitly
        provided (non-None). The caller is responsible for authorization
        (verifying ownership via get_by_id first).

        Args:
            record_id: Primary key of the UserMovieData record
            user_watched: New watched status (optional)
            user_on_watchlist: New watchlist status (optional)
            user_liked: New liked status (optional)
            user_rating: New rating 1-10 or None (optional)
            user_review: New review text or None (optional)

        Returns:
            Updated UserMovieData instance

        Note:
            Authorization must be checked by the service layer via get_by_id
            before calling this method. This method assumes the caller has
            already verified the user owns this record.

        Example:
            >>> # Service layer pattern
            >>> umd = repository.get_by_id(user, record_id)  # Auth check
            >>> if umd is None:
            ...     raise HttpError(404, "Not found")
            >>> updated = repository.update(record_id, user_watched=True)
        """
        # Fetch the record (caller should have already verified access)
        obj = UserMovieData.objects.select_related("movie").get(id=record_id)

        # Update only provided fields
        if user_watched is not None:
            obj.user_watched = user_watched
        if user_on_watchlist is not None:
            obj.user_on_watchlist = user_on_watchlist
        if user_liked is not None:
            obj.user_liked = user_liked
        if user_rating is not None:
            obj.user_rating = user_rating
        if user_review is not None:
            obj.user_review = user_review

        obj.save()
        return obj

    def delete(self, record_id: int) -> bool:
        """Delete a UserMovieData record.

        The caller is responsible for authorization (verifying ownership
        via get_by_id first).

        Args:
            record_id: Primary key of the UserMovieData record

        Returns:
            True if deleted successfully

        Note:
            Authorization must be checked by the service layer via get_by_id
            before calling this method. This method assumes the caller has
            already verified the user owns this record.

        Example:
            >>> # Service layer pattern
            >>> umd = repository.get_by_id(user, record_id)  # Auth check
            >>> if umd is None:
            ...     raise HttpError(404, "Not found")
            >>> repository.delete(record_id)
        """
        UserMovieData.objects.filter(id=record_id).delete()
        return True

    # =========================================================================
    # Query Operations
    # =========================================================================

    def get_all_filtered(
        self,
        user: AbstractBaseUser,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> list[UserMovieData]:
        """Get all UserMovieData records for a user with optional filters.

        This method returns the full filtered dataset without pagination,
        ordered by most recently created (newest first).

        Args:
            user: The authenticated user
            watchlist_only: If True, only return watchlist items
            watched_only: If True, only return watched items
            rated_only: If True, only return rated items

        Returns:
            List of UserMovieData records matching filters
        """
        queryset = UserMovieData.objects.filter(user=user).select_related("movie")

        if watchlist_only:
            queryset = queryset.filter(user_on_watchlist=True)
        if watched_only:
            queryset = queryset.filter(user_watched=True)
        if rated_only:
            queryset = queryset.filter(user_rating__isnull=False)

        return list(queryset.order_by("-id"))

    def get_filtered(
        self,
        user: AbstractBaseUser,
        page: int = 1,
        page_size: int = 20,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> tuple[list[UserMovieData], PaginationMetadata]:
        """Get filtered and paginated UserMovieData records for a user.

        This method returns a paginated list of user movie data with optional
        filters for common query patterns (watchlist, watched, rated).

        Args:
            user: The authenticated user
            page: Page number (1-indexed, default: 1)
            page_size: Number of results per page (default: 20, max: 100)
            watchlist_only: If True, only return watchlist items
            watched_only: If True, only return watched items
            rated_only: If True, only return rated items

        Returns:
            Tuple of:
            - List of UserMovieData records for the current page
            - PaginationMetadata dict with page info

        Example:
            >>> # Get user's watchlist
            >>> results, meta = repository.get_filtered(user, page=1, watchlist_only=True)
            >>> print(f"Page {meta['page']} of {meta['total_pages']}")

        Note:
            The returned list is evaluated (not a lazy QuerySet) for
            consistent behavior in service layer.
        """
        # Base queryset scoped to user
        queryset = UserMovieData.objects.filter(user=user).select_related("movie")

        # Apply optional filters
        if watchlist_only:
            queryset = queryset.filter(user_on_watchlist=True)
        if watched_only:
            queryset = queryset.filter(user_watched=True)
        if rated_only:
            queryset = queryset.filter(user_rating__isnull=False)

        # Order by most recently created (newest first)
        queryset = queryset.order_by("-id")

        # Apply pagination
        paginated_qs, metadata = paginate_queryset(queryset, page, page_size)

        # Evaluate to list for consistent return type
        return list(paginated_qs), metadata


__all__ = ["UserMovieDataRepository"]
