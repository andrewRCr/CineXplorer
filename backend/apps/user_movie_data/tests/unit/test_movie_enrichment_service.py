"""
Unit tests for MovieEnrichmentService.

This module tests the movie enrichment service which populates movie data
with user-specific information (watchlist status, ratings, reviews).

Tests verify:
    - Authenticated user enrichment (populates user_movie_data field)
    - Unauthenticated user handling (user_movie_data remains None)
    - Movies without user data (user_movie_data remains None)
    - Empty movie list handling
    - Non-mutation of input data
    - Dependency injection with mock repository

Note: Query count optimization tests are in integration/ since they require
real database access to verify query behavior.

See Also:
    - user_movie_data/tests/test_helpers.py for shared mock builders
    - core/tests/test_helpers.py for create_mock_user()
"""
from __future__ import annotations

from unittest.mock import Mock

from apps.movie.schemas import MovieListItemSchema
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService
from apps.user_movie_data.tests.test_helpers import (
    create_mock_user_movie_data,
    create_movie_schema,
)

# =========================
# Service Initialization Tests
# =========================


def test_service_initialization() -> None:
    """Test that MovieEnrichmentService can be initialized."""
    service = MovieEnrichmentService()
    assert service is not None


def test_service_initialization_with_repository() -> None:
    """Test that MovieEnrichmentService accepts repository parameter."""
    mock_repository = Mock()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repository)
    assert service._repository is mock_repository  # pyright: ignore[reportPrivateUsage]


# =========================
# Authenticated User Enrichment Tests
# =========================


def test_enrich_with_authenticated_user_populates_user_movie_data() -> None:
    """Test that enrichment with authenticated user populates user_movie_data field."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_user_movie_data = create_mock_user_movie_data(
        record_id=1,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review='Excellent sci-fi film!',
    )
    mock_repo.get_for_user_and_movies.return_value = {12345: mock_user_movie_data}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert
    assert len(enriched_movies) == 1
    enriched_movie = enriched_movies[0]

    assert enriched_movie.user_movie_data is not None
    assert enriched_movie.user_movie_data.id == 1
    assert enriched_movie.user_movie_data.tmdb_id == 12345
    assert enriched_movie.user_movie_data.title == 'Blade Runner'
    assert enriched_movie.user_movie_data.user_watched is True
    assert enriched_movie.user_movie_data.user_on_watchlist is False
    assert enriched_movie.user_movie_data.user_liked is True
    assert enriched_movie.user_movie_data.user_rating == 9
    assert enriched_movie.user_movie_data.user_review == 'Excellent sci-fi film!'

    # Verify repository was called correctly
    mock_repo.get_for_user_and_movies.assert_called_once_with(mock_user, [12345])


def test_enrich_multiple_movies_with_mixed_user_data() -> None:
    """Test enrichment with multiple movies where some have user data and some don't."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()

    mock_umd1 = create_mock_user_movie_data(
        record_id=1, user_watched=True, user_rating=9
    )
    mock_umd2 = create_mock_user_movie_data(
        record_id=2, user_on_watchlist=True, user_watched=False
    )
    # Movie3 (tmdb_id=99999) has no user data
    mock_repo.get_for_user_and_movies.return_value = {
        12345: mock_umd1,
        54321: mock_umd2,
        # 99999 not in dict - no user data
    }

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [
        create_movie_schema(tmdb_id=12345, title='Blade Runner'),
        create_movie_schema(tmdb_id=54321, title='Chinatown'),
        create_movie_schema(tmdb_id=99999, title='The Matrix'),
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert
    assert len(enriched_movies) == 3

    # Movie1: Has user data
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[0].user_movie_data.user_watched is True
    assert enriched_movies[0].user_movie_data.user_rating == 9

    # Movie2: Has user data (on watchlist, not watched)
    assert enriched_movies[1].user_movie_data is not None
    assert enriched_movies[1].user_movie_data.user_on_watchlist is True
    assert enriched_movies[1].user_movie_data.user_watched is False
    assert enriched_movies[1].user_movie_data.user_rating is None

    # Movie3: No user data exists - remains None
    assert enriched_movies[2].user_movie_data is None


# =========================
# Unauthenticated User Tests
# =========================


def test_enrich_with_unauthenticated_user_returns_same_list() -> None:
    """Test that enrichment with None user returns the same list (early return)."""
    # Arrange
    mock_repo = Mock()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, None)

    # Assert: Same list reference (early return for performance)
    assert enriched_movies is movies
    assert enriched_movies[0].user_movie_data is None

    # Repository should NOT be called for unauthenticated users
    mock_repo.get_for_user_and_movies.assert_not_called()


# =========================
# Edge Case Tests
# =========================


def test_enrich_empty_movie_list_returns_same_empty_list() -> None:
    """Test that enriching empty list returns the same empty list (early return)."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies: list[MovieListItemSchema] = []

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: Same reference (early return)
    assert enriched_movies is movies
    assert enriched_movies == []

    # Repository should NOT be called for empty list
    mock_repo.get_for_user_and_movies.assert_not_called()


def test_movies_without_user_data_have_none_field() -> None:
    """Test that movies without UserMovieData entries have user_movie_data as None."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_repo.get_for_user_and_movies.return_value = {}  # No user data for any movie

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is None


def test_user_isolation_uses_correct_user_in_repository_call() -> None:
    """Test that enrichment passes the correct user to repository."""
    # Arrange
    mock_user = Mock(id=42, username='testuser')
    mock_repo = Mock()
    mock_repo.get_for_user_and_movies.return_value = {}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: Repository called with correct user
    mock_repo.get_for_user_and_movies.assert_called_once()
    call_args = mock_repo.get_for_user_and_movies.call_args
    assert call_args[0][0] is mock_user  # First positional arg is user


# =========================
# Data Integrity Tests
# =========================


def test_enrichment_preserves_original_movie_data() -> None:
    """Test that enrichment doesn't modify original movie fields."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_umd = create_mock_user_movie_data(record_id=1, user_watched=True)
    mock_repo.get_for_user_and_movies.return_value = {12345: mock_umd}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    original_vote_average = 8.5
    original_runtime = 117

    movies = [
        create_movie_schema(
            tmdb_id=12345,
            title='Blade Runner',
            vote_average=original_vote_average,
            runtime=original_runtime,
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: Original fields preserved
    assert enriched_movies[0].tmdb_id == 12345
    assert enriched_movies[0].title == 'Blade Runner'
    assert enriched_movies[0].vote_average == original_vote_average
    assert enriched_movies[0].runtime == original_runtime
    # User data added
    assert enriched_movies[0].user_movie_data is not None


# =========================
# Non-Mutation Tests
# =========================


def test_enrichment_does_not_mutate_input_list() -> None:
    """Test that enrichment does not mutate the input list of movies."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_umd = create_mock_user_movie_data(record_id=1, user_watched=True)
    mock_repo.get_for_user_and_movies.return_value = {12345: mock_umd}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]
    original_user_movie_data = movies[0].user_movie_data

    # Act
    _enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: Input list unchanged
    assert movies[0].user_movie_data is original_user_movie_data
    assert movies[0].user_movie_data is None  # Explicitly verify no mutation


def test_enrichment_returns_new_list_with_new_instances() -> None:
    """Test that enrichment returns a new list with new MovieListItemSchema instances."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_umd = create_mock_user_movie_data(record_id=1, user_watched=True)
    mock_repo.get_for_user_and_movies.return_value = {12345: mock_umd}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: New list (different reference)
    assert enriched_movies is not movies

    # Assert: New instances (different object references)
    assert enriched_movies[0] is not movies[0]

    # Assert: Original movie unchanged, enriched movie has data
    assert movies[0].user_movie_data is None
    assert enriched_movies[0].user_movie_data is not None


def test_enrichment_preserves_all_fields_in_new_instances() -> None:
    """Test that new enriched instances preserve all fields from original movies."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_umd = create_mock_user_movie_data(record_id=1, user_watched=True)
    mock_repo.get_for_user_and_movies.return_value = {12345: mock_umd}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [
        create_movie_schema(
            tmdb_id=12345,
            title='Blade Runner',
            release_date='1982-06-25',
            poster_path='/blade_runner.jpg',
            vote_average=8.5,
            runtime=117,
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: All original fields preserved in new instance
    assert enriched_movies[0].tmdb_id == movies[0].tmdb_id
    assert enriched_movies[0].title == movies[0].title
    assert enriched_movies[0].poster_path == movies[0].poster_path
    assert enriched_movies[0].release_date == movies[0].release_date
    assert enriched_movies[0].vote_average == movies[0].vote_average
    assert enriched_movies[0].runtime == movies[0].runtime

    # Assert: Only difference is user_movie_data field
    assert movies[0].user_movie_data is None
    assert enriched_movies[0].user_movie_data is not None


# =========================
# Repository Interaction Tests
# =========================


def test_repository_called_with_all_tmdb_ids() -> None:
    """Test that repository is called with all movie tmdb_ids."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    mock_repo.get_for_user_and_movies.return_value = {}

    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [
        create_movie_schema(tmdb_id=111, title='Movie 1'),
        create_movie_schema(tmdb_id=222, title='Movie 2'),
        create_movie_schema(tmdb_id=333, title='Movie 3'),
    ]

    # Act
    service.enrich_movies_with_user_movie_data(movies, mock_user)

    # Assert: Repository called once with all tmdb_ids
    mock_repo.get_for_user_and_movies.assert_called_once_with(
        mock_user, [111, 222, 333]
    )


def test_repository_not_called_for_none_user() -> None:
    """Test that repository is NOT called when user is None."""
    # Arrange
    mock_repo = Mock()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)
    movies = [create_movie_schema(tmdb_id=12345, title='Blade Runner')]

    # Act
    service.enrich_movies_with_user_movie_data(movies, None)

    # Assert
    mock_repo.get_for_user_and_movies.assert_not_called()


def test_repository_not_called_for_empty_movies() -> None:
    """Test that repository is NOT called when movie list is empty."""
    # Arrange
    mock_user = Mock()
    mock_repo = Mock()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repo)

    # Act
    service.enrich_movies_with_user_movie_data([], mock_user)

    # Assert
    mock_repo.get_for_user_and_movies.assert_not_called()
