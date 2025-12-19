"""
Unit tests for UserMovieDataService.

This module tests the user movie data service which handles CRUD operations
for user-specific movie interactions (watchlist, ratings, reviews).

Tests verify:
    - CREATE: TMDB fetch → Movie stub creation → UserMovieData creation
    - READ: Get by ID, get by TMDB ID
    - UPDATE: Partial field updates with validation
    - DELETE: Authorization and deletion logic
    - QUERY: Filtering (watchlist, ratings) with pagination
    - Dependency injection with mock repository and MovieService

Note: Integration tests for actual database behavior are in integration/.

See Also:
    - user_movie_data/tests/test_helpers.py for shared mock builders
    - core/tests/test_helpers.py for create_mock_user()
    - movie/tests/test_helpers.py for TMDB response mocks
"""
from __future__ import annotations

from unittest.mock import Mock, patch

import pytest
from ninja.errors import HttpError

from apps.core.tests.test_helpers import create_mock_user
from apps.user_movie_data.tests.mock_paths import FETCH_MOVIES_BATCH
from apps.user_movie_data.tests.test_helpers import (
    create_mock_movie,
    create_mock_user_movie_data,
    create_movie_detail_schema,
    create_movie_schema,
    create_pagination_metadata,
)

# =========================
# Service Initialization Tests
# =========================


class TestServiceInitialization:
    """Tests for UserMovieDataService initialization and dependency injection."""

    def test_service_initialization_with_defaults(self) -> None:
        """Test that service can be initialized with default dependencies."""
        # Import here to test initialization
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        service = UserMovieDataService()
        assert service is not None

    def test_service_initialization_with_injected_dependencies(self) -> None:
        """Test that service accepts injected repository and movie service."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        mock_repository = Mock()
        mock_movie_service = Mock()

        service = UserMovieDataService(
            repository=mock_repository,
            movie_service=mock_movie_service,
        )

        # Verify dependencies are stored (accessing private attrs for test)
        assert service._repository is mock_repository  # pyright: ignore[reportPrivateUsage]
        assert service._movie_service is mock_movie_service  # pyright: ignore[reportPrivateUsage]


# =========================
# CREATE Operation Tests
# =========================


class TestCreateOperation:
    """Tests for UserMovieDataService.create() method."""

    def test_create_with_existing_movie_succeeds(self) -> None:
        """Test creating UserMovieData when movie already exists locally."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_movie = create_mock_movie(tmdb_id=12345, title="Blade Runner")

        # Repository returns existing movie
        mock_repo.get_movie_by_tmdb_id.return_value = mock_movie
        # Repository creates UserMovieData successfully
        mock_created_umd = create_mock_user_movie_data(
            record_id=1,
            tmdb_id=12345,
            title="Blade Runner",
            user_on_watchlist=True,
        )
        mock_repo.create.return_value = mock_created_umd

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.create(
            user=mock_user,
            tmdb_id=12345,
            user_on_watchlist=True,
        )

        # Assert
        assert result.id == 1
        assert result.user_on_watchlist is True
        mock_repo.get_movie_by_tmdb_id.assert_called_once_with(12345)
        mock_repo.create.assert_called_once()
        # Movie service should NOT be called if movie exists locally
        mock_movie_service.get_movie_by_id.assert_not_called()

    def test_create_fetches_from_tmdb_when_movie_not_local(self) -> None:
        """Test creating UserMovieData fetches movie from TMDB if not in local DB."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        # Repository returns None (movie doesn't exist locally)
        mock_repo.get_movie_by_tmdb_id.return_value = None
        # Movie service returns TMDB data
        mock_movie_service.get_movie_by_id.return_value = create_movie_detail_schema(
            tmdb_id=12345, title="Blade Runner"
        )
        # Repository creates movie stub
        mock_created_movie = create_mock_movie(tmdb_id=12345, title="Blade Runner")
        mock_repo.create_movie_stub.return_value = mock_created_movie
        # Repository creates UserMovieData
        mock_created_umd = create_mock_user_movie_data(
            record_id=1,
            tmdb_id=12345,
            title="Blade Runner",
            user_on_watchlist=True,
        )
        mock_repo.create.return_value = mock_created_umd

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.create(
            user=mock_user,
            tmdb_id=12345,
            user_on_watchlist=True,
        )

        # Assert
        assert result.id == 1
        mock_repo.get_movie_by_tmdb_id.assert_called_once_with(12345)
        mock_movie_service.get_movie_by_id.assert_called_once_with(12345)
        mock_repo.create_movie_stub.assert_called_once()
        mock_repo.create.assert_called_once()

    def test_create_raises_when_tmdb_movie_not_found(self) -> None:
        """Test that create raises HttpError when movie not found in TMDB."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        # Movie doesn't exist locally
        mock_repo.get_movie_by_tmdb_id.return_value = None
        # TMDB returns 404
        mock_movie_service.get_movie_by_id.side_effect = HttpError(
            404, "Movie not found"
        )

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.create(user=mock_user, tmdb_id=99999)

        assert exc_info.value.status_code == 404

    def test_create_raises_when_already_exists(self) -> None:
        """Test that create raises HttpError when UserMovieData already exists."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_movie = create_mock_movie(tmdb_id=12345)

        mock_repo.get_movie_by_tmdb_id.return_value = mock_movie
        # Repository raises because entry already exists
        mock_repo.create.side_effect = ValueError("Already exists")

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.create(user=mock_user, tmdb_id=12345)

        assert exc_info.value.status_code == 400


# =========================
# READ Operation Tests
# =========================


class TestReadOperations:
    """Tests for UserMovieDataService read methods."""

    def test_get_by_id_returns_user_movie_data(self) -> None:
        """Test getting UserMovieData by its primary key."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_umd = create_mock_user_movie_data(
            record_id=1,
            tmdb_id=12345,
            user_watched=True,
            user_rating=9,
        )
        mock_repo.get_by_id.return_value = mock_umd

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_by_id(user=mock_user, record_id=1)

        # Assert
        assert result.id == 1
        assert result.user_watched is True
        assert result.user_rating == 9
        mock_repo.get_by_id.assert_called_once_with(mock_user, 1)

    def test_get_by_id_raises_when_not_found(self) -> None:
        """Test that get_by_id raises HttpError when record not found."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_repo.get_by_id.return_value = None

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.get_by_id(user=mock_user, record_id=999)

        assert exc_info.value.status_code == 404

    def test_get_by_tmdb_id_returns_user_movie_data(self) -> None:
        """Test getting UserMovieData by TMDB ID."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_umd = create_mock_user_movie_data(
            record_id=1,
            tmdb_id=12345,
            title="Blade Runner",
        )
        mock_repo.get_by_tmdb_id.return_value = mock_umd

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_by_tmdb_id(user=mock_user, tmdb_id=12345)

        # Assert
        assert result.id == 1
        assert result.movie.tmdb_id == 12345
        mock_repo.get_by_tmdb_id.assert_called_once_with(mock_user, 12345)

    def test_get_by_tmdb_id_raises_when_not_found(self) -> None:
        """Test that get_by_tmdb_id raises HttpError when not found."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_repo.get_by_tmdb_id.return_value = None

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.get_by_tmdb_id(user=mock_user, tmdb_id=99999)

        assert exc_info.value.status_code == 404


# =========================
# UPDATE Operation Tests
# =========================


class TestUpdateOperation:
    """Tests for UserMovieDataService.update() method."""

    def test_update_partial_fields_succeeds(self) -> None:
        """Test updating a subset of fields (partial update)."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_umd = create_mock_user_movie_data(
            record_id=1,
            user_watched=False,
            user_rating=None,
        )
        mock_repo.get_by_id.return_value = mock_umd
        mock_repo.update.return_value = create_mock_user_movie_data(
            record_id=1,
            user_watched=True,
            user_rating=9,
        )

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.update(
            user=mock_user,
            record_id=1,
            user_watched=True,
            user_rating=9,
        )

        # Assert
        assert result.user_watched is True
        assert result.user_rating == 9
        mock_repo.update.assert_called_once()

    def test_update_raises_when_not_found(self) -> None:
        """Test that update raises HttpError when record not found."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_repo.get_by_id.return_value = None

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.update(user=mock_user, record_id=999, user_watched=True)

        assert exc_info.value.status_code == 404

    def test_update_with_no_changes_succeeds(self) -> None:
        """Test that update with no fields still works (no-op)."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_umd = create_mock_user_movie_data(record_id=1)
        mock_repo.get_by_id.return_value = mock_umd
        mock_repo.update.return_value = mock_umd

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.update(user=mock_user, record_id=1)

        # Assert
        assert result.id == 1
        mock_repo.update.assert_called_once()


# =========================
# DELETE Operation Tests
# =========================


class TestDeleteOperation:
    """Tests for UserMovieDataService.delete() method."""

    def test_delete_succeeds(self) -> None:
        """Test deleting UserMovieData record."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_umd = create_mock_user_movie_data(record_id=1)
        mock_repo.get_by_id.return_value = mock_umd
        mock_repo.delete.return_value = True

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        service.delete(user=mock_user, record_id=1)

        # Assert
        mock_repo.delete.assert_called_once_with(1)

    def test_delete_raises_when_not_found(self) -> None:
        """Test that delete raises HttpError when record not found."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()
        mock_repo.get_by_id.return_value = None

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.delete(user=mock_user, record_id=999)

        assert exc_info.value.status_code == 404


# =========================
# QUERY Operation Tests
# =========================


class TestQueryOperations:
    """Tests for UserMovieDataService query/filter methods."""

    @patch(FETCH_MOVIES_BATCH)
    def test_get_user_movies_returns_paginated_list(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test getting user's movies with pagination."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_umd_list = [
            create_mock_user_movie_data(record_id=1, tmdb_id=111),
            create_mock_user_movie_data(record_id=2, tmdb_id=222),
        ]
        mock_repo.get_filtered.return_value = (
            mock_umd_list,
            create_pagination_metadata(page=1, total_pages=1, total_results=2),
        )
        mock_repo.get_for_user_and_movies.return_value = {}

        mock_fetch_movies_batch.return_value = [
            create_movie_schema(tmdb_id=111, title="Movie 1"),
            create_movie_schema(tmdb_id=222, title="Movie 2"),
        ]

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_user_movies(user=mock_user, page=1, page_size=20)

        # Assert
        assert result.page == 1
        assert result.total_results == 2
        assert len(result.results) == 2
        mock_fetch_movies_batch.assert_called_once_with([111, 222])

    @patch(FETCH_MOVIES_BATCH)
    def test_get_user_movies_with_watchlist_filter(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test filtering user's movies to watchlist only."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_umd_list = [
            create_mock_user_movie_data(record_id=1, tmdb_id=111, user_on_watchlist=True),
        ]
        mock_repo.get_filtered.return_value = (
            mock_umd_list,
            create_pagination_metadata(page=1, total_pages=1, total_results=1),
        )
        mock_repo.get_for_user_and_movies.return_value = {}

        mock_fetch_movies_batch.return_value = [
            create_movie_schema(tmdb_id=111, title="Watchlist Movie"),
        ]

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_user_movies(
            user=mock_user,
            page=1,
            page_size=20,
            watchlist_only=True,
        )

        # Assert
        assert result.total_results == 1
        mock_repo.get_filtered.assert_called_once()
        # Verify watchlist filter was passed
        call_kwargs = mock_repo.get_filtered.call_args[1]
        assert call_kwargs.get("watchlist_only") is True

    @patch(FETCH_MOVIES_BATCH)
    def test_get_user_movies_returns_empty_for_no_data(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test that empty list returns proper empty response."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_repo.get_filtered.return_value = (
            [],
            create_pagination_metadata(page=1, total_pages=0, total_results=0),
        )

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_user_movies(user=mock_user, page=1, page_size=20)

        # Assert
        assert result.page == 1
        assert result.total_pages == 0
        assert result.total_results == 0
        assert result.results == []
        # Movie service should NOT be called for empty list
        mock_fetch_movies_batch.assert_not_called()

    @patch(FETCH_MOVIES_BATCH)
    def test_get_user_movies_skips_unavailable_tmdb_movies(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test that movies no longer in TMDB are skipped gracefully."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_umd_list = [
            create_mock_user_movie_data(record_id=1, tmdb_id=111),
            create_mock_user_movie_data(record_id=2, tmdb_id=222),  # This one will fail
            create_mock_user_movie_data(record_id=3, tmdb_id=333),
        ]
        mock_repo.get_filtered.return_value = (
            mock_umd_list,
            create_pagination_metadata(page=1, total_pages=1, total_results=3),
        )
        mock_repo.get_for_user_and_movies.return_value = {}

        # Batch fetch returns partial results
        mock_fetch_movies_batch.return_value = [
            create_movie_schema(tmdb_id=111, title="Movie 1"),
            create_movie_schema(tmdb_id=333, title="Movie 3"),
        ]

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_user_movies(user=mock_user, page=1, page_size=20)

        # Assert: Only 2 movies returned (222 was skipped)
        assert len(result.results) == 2
        assert result.total_results == 3
        assert result.results[0].tmdb_id == 111
        assert result.results[1].tmdb_id == 333

    @patch(FETCH_MOVIES_BATCH)
    def test_get_all_user_movies_returns_full_list(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test getting all user's movies without pagination."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_umd_list = [
            create_mock_user_movie_data(record_id=1, tmdb_id=111),
            create_mock_user_movie_data(record_id=2, tmdb_id=222),
        ]
        mock_repo.get_all_filtered.return_value = mock_umd_list
        mock_repo.get_for_user_and_movies.return_value = {}

        mock_fetch_movies_batch.return_value = [
            create_movie_schema(tmdb_id=111, title="Movie 1"),
            create_movie_schema(tmdb_id=222, title="Movie 2"),
        ]

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_all_user_movies(user=mock_user)

        # Assert
        assert result.page == 1
        assert result.total_pages == 1
        assert result.total_results == 2
        assert len(result.results) == 2

    @patch(FETCH_MOVIES_BATCH)
    def test_get_all_user_movies_returns_empty_for_no_data(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test that empty list returns proper empty response."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_repo.get_all_filtered.return_value = []

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_all_user_movies(user=mock_user)

        # Assert
        assert result.page == 1
        assert result.total_pages == 0
        assert result.total_results == 0
        assert result.results == []
        mock_fetch_movies_batch.assert_not_called()

    @patch(FETCH_MOVIES_BATCH)
    def test_get_all_user_movies_skips_unavailable_tmdb_movies(
        self,
        mock_fetch_movies_batch: Mock,
    ) -> None:
        """Test that unavailable TMDB movies are skipped gracefully."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user()

        mock_umd_list = [
            create_mock_user_movie_data(record_id=1, tmdb_id=111),
            create_mock_user_movie_data(record_id=2, tmdb_id=222),
            create_mock_user_movie_data(record_id=3, tmdb_id=333),
        ]
        mock_repo.get_all_filtered.return_value = mock_umd_list
        mock_repo.get_for_user_and_movies.return_value = {}

        mock_fetch_movies_batch.return_value = [
            create_movie_schema(tmdb_id=111, title="Movie 1"),
            create_movie_schema(tmdb_id=333, title="Movie 3"),
        ]

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act
        result = service.get_all_user_movies(user=mock_user)

        # Assert
        assert len(result.results) == 2
        assert result.total_results == 2
        assert result.results[0].tmdb_id == 111
        assert result.results[1].tmdb_id == 333


# =========================
# Authorization Tests
# =========================


class TestAuthorizationChecks:
    """Tests for user authorization/isolation in service methods."""

    def test_user_cannot_access_other_users_data(self) -> None:
        """Test that service enforces user isolation via repository."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user(user_id=1)

        # Repository returns None because record belongs to different user
        mock_repo.get_by_id.return_value = None

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act & Assert
        with pytest.raises(HttpError) as exc_info:
            service.get_by_id(user=mock_user, record_id=999)

        assert exc_info.value.status_code == 404

    def test_all_operations_pass_user_to_repository(self) -> None:
        """Test that all CRUD operations pass user to repository for filtering."""
        from apps.user_movie_data.services.user_movie_data_service import (
            UserMovieDataService,
        )

        # Arrange
        mock_repo = Mock()
        mock_movie_service = Mock()
        mock_user = create_mock_user(user_id=42)
        mock_movie = create_mock_movie(tmdb_id=12345)
        mock_umd = create_mock_user_movie_data(record_id=1)

        # Setup returns
        mock_repo.get_movie_by_tmdb_id.return_value = mock_movie
        mock_repo.create.return_value = mock_umd
        mock_repo.get_by_id.return_value = mock_umd
        mock_repo.update.return_value = mock_umd
        mock_repo.delete.return_value = True
        mock_repo.get_filtered.return_value = (
            [],
            create_pagination_metadata(page=1, total_pages=0, total_results=0),
        )
        mock_repo.get_all_filtered.return_value = []
        mock_repo.get_for_user_and_movies.return_value = {}

        service = UserMovieDataService(
            repository=mock_repo,
            movie_service=mock_movie_service,
        )

        # Act: Call all operations
        service.create(user=mock_user, tmdb_id=12345)
        service.get_by_id(user=mock_user, record_id=1)
        service.update(user=mock_user, record_id=1, user_watched=True)
        service.delete(user=mock_user, record_id=1)
        service.get_user_movies(user=mock_user, page=1, page_size=20)
        service.get_all_user_movies(user=mock_user)

        # Assert: All calls included the user
        assert mock_repo.create.call_args[0][0] is mock_user
        assert mock_repo.get_by_id.call_args[0][0] is mock_user
        # update and delete use get_by_id for auth check, which passes user
        assert mock_repo.get_filtered.call_args[0][0] is mock_user
        assert mock_repo.get_all_filtered.call_args[0][0] is mock_user
