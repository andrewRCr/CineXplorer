"""User movie data service for managing user-movie interactions.

This service encapsulates all business logic for user movie data operations,
including CRUD operations, filtering, and pagination. It follows the class-based
architecture with dependency injection pattern for testability.

Architecture:
- Class-based service with dependency injection
- Repository pattern for ORM abstraction
- MovieService integration for TMDB data fetching
- Type-safe interfaces with full annotations

Usage:
    # Production usage (default dependencies)
    service = UserMovieDataService()
    umd = service.create(user, tmdb_id=12345, user_on_watchlist=True)

    # Testing with mocks
    mock_repo = Mock()
    mock_movie_service = Mock()
    service = UserMovieDataService(
        repository=mock_repo,
        movie_service=mock_movie_service,
    )
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from ninja.errors import HttpError

from apps.movie.schemas import MovieListItemSchema, MovieListResponseSchema
from apps.movie.services.pipelines.batch import fetch_movies_batch
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

if TYPE_CHECKING:
    from apps.movie.services.movie_service import MovieService
    from apps.user_movie_data.repositories import UserMovieDataRepository

logger = logging.getLogger(__name__)


class UserMovieDataService:
    """Service for managing user movie data (watchlist, ratings, reviews).

    This service handles all business logic for user-movie interactions,
    including creating new entries (with TMDB fetching), updates, deletions,
    and paginated queries. It uses dependency injection for testability.

    Architecture:
        - Injects UserMovieDataRepository for ORM abstraction
        - Injects MovieService for TMDB API integration
        - Raises HttpError for API-level error handling
        - Returns UserMovieData model instances for CRUD operations
        - Returns MovieListResponseSchema for query operations

    Usage:
        # Production
        service = UserMovieDataService()
        umd = service.create(user, tmdb_id=12345, user_on_watchlist=True)

        # Testing
        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )
    """

    def __init__(
        self,
        repository: UserMovieDataRepository | None = None,
        movie_service: MovieService | None = None,
    ) -> None:
        """Initialize UserMovieDataService with optional dependency injection.

        Args:
            repository: UserMovieDataRepository instance for data access.
                If None, creates default repository.
            movie_service: MovieService instance for TMDB integration.
                If None, creates default service via factory.
        """
        # Inject repository or create default
        if repository is not None:
            self._repository = repository
        else:
            from apps.user_movie_data.repositories import UserMovieDataRepository

            self._repository = UserMovieDataRepository()

        # Inject movie service or create default
        if movie_service is not None:
            self._movie_service = movie_service
        else:
            from apps.movie.services.service_factory import get_movie_service

            self._movie_service = get_movie_service()

    # =========================================================================
    # CREATE Operations
    # =========================================================================

    def create(
        self,
        user: AbstractBaseUser,
        tmdb_id: int,
        *,
        user_watched: bool = False,
        user_on_watchlist: bool = False,
        user_liked: bool = False,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        """Create a new UserMovieData entry for a movie.

        This method handles the full creation flow:
        1. Check if movie exists locally
        2. If not, fetch from TMDB and create local stub
        3. Create UserMovieData record

        Args:
            user: Authenticated user creating the entry
            tmdb_id: TMDB movie ID
            user_watched: Whether user has watched the movie
            user_on_watchlist: Whether to add to watchlist
            user_liked: Whether user liked the movie
            user_rating: User's rating (1-10) or None
            user_review: User's review text or None

        Returns:
            Created UserMovieData instance

        Raises:
            HttpError(404): If movie not found in TMDB
            HttpError(400): If entry already exists for this user/movie
        """
        # Check if movie exists locally
        movie = self._repository.get_movie_by_tmdb_id(tmdb_id)

        if movie is None:
            # Fetch from TMDB (raises HttpError(404) if not found)
            movie_detail = self._movie_service.get_movie_by_id(tmdb_id)

            # Create local movie stub
            movie = self._repository.create_movie_stub(movie_detail)
            logger.info(
                "Created movie stub for TMDB ID %d: %s",
                tmdb_id,
                movie_detail.title,
            )

        # Create UserMovieData record
        try:
            return self._repository.create(
                user,
                movie,
                user_watched=user_watched,
                user_on_watchlist=user_on_watchlist,
                user_liked=user_liked,
                user_rating=user_rating,
                user_review=user_review,
            )
        except ValueError as e:
            # Repository raises ValueError for duplicate entries
            raise HttpError(400, str(e)) from e

    # =========================================================================
    # READ Operations
    # =========================================================================

    def get_by_id(
        self,
        user: AbstractBaseUser,
        record_id: int,
    ) -> UserMovieData:
        """Get UserMovieData by its primary key.

        The query is scoped to the user for authorization - users can only
        access their own data.

        Args:
            user: Authenticated user (for authorization)
            record_id: Primary key of the UserMovieData record

        Returns:
            UserMovieData instance

        Raises:
            HttpError(404): If record not found or doesn't belong to user
        """
        umd = self._repository.get_by_id(user, record_id)
        if umd is None:
            raise HttpError(404, "User movie data not found")
        return umd

    def get_by_tmdb_id(
        self,
        user: AbstractBaseUser,
        tmdb_id: int,
    ) -> UserMovieData:
        """Get UserMovieData by TMDB movie ID.

        The query is scoped to the user for authorization.

        Args:
            user: Authenticated user (for authorization)
            tmdb_id: TMDB movie ID

        Returns:
            UserMovieData instance

        Raises:
            HttpError(404): If no entry exists for this user/movie
        """
        umd = self._repository.get_by_tmdb_id(user, tmdb_id)
        if umd is None:
            raise HttpError(404, "User movie data not found for this TMDB ID")
        return umd

    # =========================================================================
    # UPDATE Operations
    # =========================================================================

    def update(
        self,
        user: AbstractBaseUser,
        record_id: int,
        *,
        user_watched: bool | None = None,
        user_on_watchlist: bool | None = None,
        user_liked: bool | None = None,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        """Update an existing UserMovieData record.

        Performs a partial update - only fields that are explicitly provided
        will be updated. Authorization is enforced by checking ownership first.

        Args:
            user: Authenticated user (for authorization)
            record_id: Primary key of the record to update
            user_watched: New watched status (optional)
            user_on_watchlist: New watchlist status (optional)
            user_liked: New liked status (optional)
            user_rating: New rating (optional)
            user_review: New review text (optional)

        Returns:
            Updated UserMovieData instance

        Raises:
            HttpError(404): If record not found or doesn't belong to user
        """
        # Authorization check - get_by_id raises 404 if not found/unauthorized
        self.get_by_id(user, record_id)

        # Perform update
        return self._repository.update(
            record_id,
            user_watched=user_watched,
            user_on_watchlist=user_on_watchlist,
            user_liked=user_liked,
            user_rating=user_rating,
            user_review=user_review,
        )

    # =========================================================================
    # DELETE Operations
    # =========================================================================

    def delete(
        self,
        user: AbstractBaseUser,
        record_id: int,
    ) -> None:
        """Delete a UserMovieData record.

        Authorization is enforced by checking ownership first.

        Args:
            user: Authenticated user (for authorization)
            record_id: Primary key of the record to delete

        Raises:
            HttpError(404): If record not found or doesn't belong to user
        """
        # Authorization check - get_by_id raises 404 if not found/unauthorized
        self.get_by_id(user, record_id)

        # Perform deletion
        self._repository.delete(record_id)

    # =========================================================================
    # QUERY Operations
    # =========================================================================

    def _build_enriched_movies(
        self,
        umd_list: list[UserMovieData],
        user: AbstractBaseUser,
    ) -> list[MovieListItemSchema]:
        tmdb_ids = [umd.movie.tmdb_id for umd in umd_list]

        if not tmdb_ids:
            return []

        movies = fetch_movies_batch(tmdb_ids)
        if not movies:
            return []

        movie_lookup = {movie.tmdb_id: movie for movie in movies}
        ordered_movies = [movie_lookup[tmdb_id] for tmdb_id in tmdb_ids if tmdb_id in movie_lookup]

        enrichment_service = MovieEnrichmentService(
            user_movie_data_repository=self._repository,
        )
        return enrichment_service.enrich_movies_with_user_movie_data(
            movies=ordered_movies,
            user=user,
        )

    def get_user_movies(
        self,
        user: AbstractBaseUser,
        page: int = 1,
        page_size: int = 20,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> MovieListResponseSchema:
        """Get paginated list of user's movies with full TMDB data.

        This method:
        1. Queries UserMovieData with filters
        2. Fetches full movie data from TMDB for each entry
        3. Returns enriched paginated response
           (results may be fewer if TMDB fetches fail)

        Args:
            user: Authenticated user
            page: Page number (1-indexed)
            page_size: Results per page (max 100)
            watchlist_only: If True, only return watchlist items
            watched_only: If True, only return watched items
            rated_only: If True, only return rated items

        Returns:
            MovieListResponseSchema with enriched movie data
        """
        # Get filtered and paginated UserMovieData
        umd_list, metadata = self._repository.get_filtered(
            user,
            page=page,
            page_size=page_size,
            watchlist_only=watchlist_only,
            watched_only=watched_only,
            rated_only=rated_only,
        )

        # Early return for empty results
        if not umd_list:
            return MovieListResponseSchema(
                page=metadata["page"],
                total_pages=metadata["total_pages"],
                total_results=metadata["total_results"],
                results=[],
            )

        movies = self._build_enriched_movies(umd_list, user)

        return MovieListResponseSchema(
            page=metadata["page"],
            total_pages=metadata["total_pages"],
            total_results=metadata["total_results"],
            results=movies,
        )

    def get_all_user_movies(
        self,
        user: AbstractBaseUser,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> MovieListResponseSchema:
        """Get full list of user's movies with TMDB data and user enrichment.

        This method returns all matching user movies without pagination.

        Args:
            user: Authenticated user
            watchlist_only: If True, only return watchlist items
            watched_only: If True, only return watched items
            rated_only: If True, only return rated items

        Returns:
            MovieListResponseSchema with enriched movie data
        """
        umd_list = self._repository.get_all_filtered(
            user,
            watchlist_only=watchlist_only,
            watched_only=watched_only,
            rated_only=rated_only,
        )

        if not umd_list:
            return MovieListResponseSchema(
                page=1,
                total_pages=0,
                total_results=0,
                results=[],
            )

        enriched_movies = self._build_enriched_movies(umd_list, user)
        total_results = len(enriched_movies)

        return MovieListResponseSchema(
            page=1,
            total_pages=1 if total_results else 0,
            total_results=total_results,
            results=enriched_movies,
        )


__all__ = ["UserMovieDataService"]
