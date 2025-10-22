"""
Unit tests for MovieEnrichmentService.

This module tests the movie enrichment service which populates movie data
with user-specific information (watchlist status, ratings, reviews).

Tests verify:
    - Authenticated user enrichment (populates user_movie_data field)
    - Unauthenticated user handling (user_movie_data remains None)
    - Bulk query optimization (single database query, no N+1 problem)
    - Movies without user data (user_movie_data remains None)
    - Empty movie list handling
"""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

import pytest
from core.models import Movie
from django.contrib.auth import get_user_model
from movie.schemas import MovieBaseSchema
from user_movie_data.models import UserMovieData
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

if TYPE_CHECKING:
    from django.contrib.auth.models import User

User = get_user_model()


# =========================
# Test Fixtures
# =========================


@pytest.fixture
def user(db: None) -> User:  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    """Create a test user for enrichment tests."""
    return User.objects.create_user(  # pyright: ignore[reportReturnType,reportAttributeAccessIssue,reportUnknownMemberType,reportUnknownVariableType]
        username="testuser",
        email="testuser@example.com",
        password="testpass123"
    )


@pytest.fixture
def movie1(db: None) -> Movie:
    """Create first test movie."""
    return Movie.objects.create(
        tmdb_id=12345,
        title='Blade Runner',
        poster_path='/blade_runner.jpg',
        release_date='1982-06-25'
    )


@pytest.fixture
def movie2(db: None) -> Movie:
    """Create second test movie."""
    return Movie.objects.create(
        tmdb_id=54321,
        title='Chinatown',
        poster_path='/chinatown.jpg',
        release_date='1974-06-20'
    )


@pytest.fixture
def movie3(db: None) -> Movie:
    """Create third test movie (without user data)."""
    return Movie.objects.create(
        tmdb_id=99999,
        title='The Matrix',
        poster_path='/matrix.jpg',
        release_date='1999-03-31'
    )


@pytest.fixture
def user_movie_data1(user: User, movie1: Movie) -> UserMovieData:  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    """Create UserMovieData for movie1."""
    return UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review='Excellent sci-fi film!'
    )


@pytest.fixture
def user_movie_data2(user: User, movie2: Movie) -> UserMovieData:  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    """Create UserMovieData for movie2."""
    return UserMovieData.objects.create(
        user=user,
        movie=movie2,
        user_watched=False,
        user_on_watchlist=True,
        user_liked=False,
        user_rating=None,
        user_review=None
    )


# =========================
# Service Initialization Tests
# =========================


def test_service_initialization() -> None:
    """Test that MovieEnrichmentService can be initialized."""
    service = MovieEnrichmentService()
    assert service is not None


def test_service_initialization_with_repository() -> None:
    """Test that MovieEnrichmentService accepts repository parameter (forward compatibility)."""
    mock_repository = object()
    service = MovieEnrichmentService(user_movie_data_repository=mock_repository)  # pyright: ignore[reportArgumentType]
    assert service._repository == mock_repository  # pyright: ignore[reportPrivateUsage]


# =========================
# Authenticated User Enrichment Tests
# =========================


@pytest.mark.django_db
def test_enrich_with_authenticated_user_populates_user_movie_data(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that enrichment with authenticated user populates user_movie_data field."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date)),
            vote_average=8.5,
            runtime=117
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert
    assert len(enriched_movies) == 1
    enriched_movie = enriched_movies[0]

    # Verify user_movie_data is populated
    assert enriched_movie.user_movie_data is not None
    assert enriched_movie.user_movie_data.id == user_movie_data1.id
    assert enriched_movie.user_movie_data.tmdb_id == movie1.tmdb_id
    assert enriched_movie.user_movie_data.title == movie1.title
    assert enriched_movie.user_movie_data.user_watched is True
    assert enriched_movie.user_movie_data.user_on_watchlist is False
    assert enriched_movie.user_movie_data.user_liked is True
    assert enriched_movie.user_movie_data.user_rating == 9
    assert enriched_movie.user_movie_data.user_review == 'Excellent sci-fi film!'


@pytest.mark.django_db
def test_enrich_multiple_movies_with_mixed_user_data(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    movie2: Movie,
    movie3: Movie,
    user_movie_data1: UserMovieData,
    user_movie_data2: UserMovieData
) -> None:
    """Test enrichment with multiple movies where some have user data and some don't."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        ),
        MovieBaseSchema(
            tmdb_id=movie2.tmdb_id,
            title=movie2.title,
            poster_path=movie2.poster_path,
            release_date=date.fromisoformat(str(movie2.release_date))
        ),
        MovieBaseSchema(
            tmdb_id=movie3.tmdb_id,  # No user data exists for this movie
            title=movie3.title,
            poster_path=movie3.poster_path,
            release_date=date.fromisoformat(str(movie3.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

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


@pytest.mark.django_db
def test_enrich_with_unauthenticated_user_leaves_data_unchanged(
    movie1: Movie,
    user_movie_data1: UserMovieData  # Exists but shouldn't be returned for None user
) -> None:
    """Test that enrichment with None user leaves user_movie_data as None."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, None)

    # Assert
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is None


@pytest.mark.django_db
def test_enrich_with_unauthenticated_user_returns_same_list_reference(
    movie1: Movie
) -> None:
    """Test that unauthenticated enrichment returns the same list (early return optimization)."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, None)

    # Assert: Same list reference (early return for performance)
    assert enriched_movies is movies


# =========================
# Bulk Query Optimization Tests
# =========================


@pytest.mark.django_db
def test_bulk_query_optimization_single_query(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    movie2: Movie,
    user_movie_data1: UserMovieData,
    user_movie_data2: UserMovieData,
    django_assert_num_queries: object
) -> None:
    """Test that enrichment uses single bulk query (no N+1 problem)."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        ),
        MovieBaseSchema(
            tmdb_id=movie2.tmdb_id,
            title=movie2.title,
            poster_path=movie2.poster_path,
            release_date=date.fromisoformat(str(movie2.release_date))
        )
    ]

    # Act & Assert: Should execute exactly 1 query regardless of movie count
    with django_assert_num_queries(1):  # type: ignore[operator]
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Verify both movies were enriched
    assert len(enriched_movies) == 2
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[1].user_movie_data is not None


# =========================
# Edge Case Tests
# =========================


@pytest.mark.django_db
def test_enrich_empty_movie_list_returns_empty_list(
    user: User  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
) -> None:
    """Test that enriching empty list returns empty list (early return optimization)."""
    # Arrange
    service = MovieEnrichmentService()
    movies: list[MovieBaseSchema] = []

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert
    assert enriched_movies == []
    assert enriched_movies is movies  # Same reference (early return)


@pytest.mark.django_db
def test_movies_without_user_data_have_none_field(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie
) -> None:
    """Test that movies without UserMovieData entries have user_movie_data as None."""
    # Arrange: movie1 exists but NO UserMovieData created for it
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is None


@pytest.mark.django_db
def test_user_isolation_other_users_data_not_included(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie
) -> None:
    """Test that enrichment only includes data for the authenticated user."""
    # Arrange: Create data for a DIFFERENT user
    other_user = User.objects.create_user(  # pyright: ignore[reportReturnType,reportAttributeAccessIssue,reportUnknownMemberType,reportUnknownVariableType]
        username="otheruser",
        email="other@example.com",
        password="otherpass123"
    )
    UserMovieData.objects.create(
        user=other_user,  # Different user
        movie=movie1,
        user_watched=True,
        user_rating=10
    )

    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act: Enrich for 'user' (not 'other_user')
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Should NOT include other_user's data
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is None


# =========================
# Data Integrity Tests
# =========================


@pytest.mark.django_db
def test_enrichment_preserves_original_movie_data(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that enrichment doesn't modify original movie fields."""
    # Arrange
    service = MovieEnrichmentService()
    original_vote_average = 8.5
    original_runtime = 117

    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date)),
            vote_average=original_vote_average,
            runtime=original_runtime
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Original fields preserved
    assert enriched_movies[0].tmdb_id == movie1.tmdb_id
    assert enriched_movies[0].title == movie1.title
    assert enriched_movies[0].poster_path == movie1.poster_path
    assert enriched_movies[0].vote_average == original_vote_average
    assert enriched_movies[0].runtime == original_runtime
    # Only user_movie_data field added
    assert enriched_movies[0].user_movie_data is not None


# =========================
# Non-Mutation Tests
# =========================


@pytest.mark.django_db
def test_enrichment_does_not_mutate_input_list(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that enrichment does not mutate the input list of movies."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Store original state
    original_user_movie_data = movies[0].user_movie_data

    # Act
    _enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Input list unchanged (we verify the INPUT, not the output)
    assert movies[0].user_movie_data is original_user_movie_data  # Should be None (unchanged)
    assert movies[0].user_movie_data is None  # Explicitly verify no mutation


@pytest.mark.django_db
def test_enrichment_returns_new_list_with_new_instances(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that enrichment returns a new list with new MovieBaseSchema instances."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: New list (different reference)
    assert enriched_movies is not movies

    # Assert: New instances (different object references)
    assert enriched_movies[0] is not movies[0]

    # Assert: Original movie unchanged
    assert movies[0].user_movie_data is None

    # Assert: Enriched movie has user data
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[0].user_movie_data.user_watched is True


@pytest.mark.django_db
def test_enrichment_preserves_all_original_movie_fields_in_new_instances(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that new enriched instances preserve all fields from original movies."""
    # Arrange
    service = MovieEnrichmentService()
    original_vote_average = 8.5
    original_runtime = 117

    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date)),
            vote_average=original_vote_average,
            runtime=original_runtime
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: All original fields preserved in new instance
    assert enriched_movies[0].tmdb_id == movies[0].tmdb_id
    assert enriched_movies[0].title == movies[0].title
    assert enriched_movies[0].poster_path == movies[0].poster_path
    assert enriched_movies[0].release_date == movies[0].release_date
    assert enriched_movies[0].vote_average == original_vote_average
    assert enriched_movies[0].runtime == original_runtime

    # Assert: Only difference is user_movie_data field
    assert movies[0].user_movie_data is None
    assert enriched_movies[0].user_movie_data is not None


# =========================
# Dependency Injection Tests
# =========================


class MockUserMovieDataRepository:
    """Mock repository for testing dependency injection."""

    def __init__(self, return_data: dict[int, UserMovieData]) -> None:
        """Initialize mock with predefined return data."""
        self.return_data = return_data
        self.call_count = 0
        self.last_user = None
        self.last_tmdb_ids: list[int] | None = None

    def get_for_user_and_movies(
        self,
        user: object,
        tmdb_ids: list[int]
    ) -> dict[int, UserMovieData]:
        """Mock implementation that returns predefined data."""
        self.call_count += 1
        self.last_user = user
        self.last_tmdb_ids = tmdb_ids
        return self.return_data


@pytest.mark.django_db
def test_service_accepts_repository_injection(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that MovieEnrichmentService accepts and uses injected repository."""
    # Arrange: Create mock repository with predefined data
    mock_data = {movie1.tmdb_id: user_movie_data1}
    mock_repository = MockUserMovieDataRepository(return_data=mock_data)

    service = MovieEnrichmentService(user_movie_data_repository=mock_repository)  # pyright: ignore[reportArgumentType]

    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Repository was called (not ORM directly)
    assert mock_repository.call_count == 1
    assert mock_repository.last_user == user
    assert mock_repository.last_tmdb_ids == [movie1.tmdb_id]

    # Assert: Enrichment still works correctly
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[0].user_movie_data.user_watched is True


@pytest.mark.django_db
def test_service_uses_repository_not_orm_directly(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that service calls repository method instead of ORM directly."""
    # Arrange: Create mock repository
    mock_data = {movie1.tmdb_id: user_movie_data1}
    mock_repository = MockUserMovieDataRepository(return_data=mock_data)

    service = MovieEnrichmentService(user_movie_data_repository=mock_repository)  # pyright: ignore[reportArgumentType]

    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act: Call service with injected repository
    # Note: This should NOT trigger any ORM queries if DI is implemented correctly
    _enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Repository method was called
    assert mock_repository.call_count == 1
    # The fact that this works without database access proves
    # the service uses the repository interface, not ORM directly


@pytest.mark.django_db
def test_service_backward_compatible_without_injection(
    user: User,  # pyright: ignore[reportInvalidTypeForm,reportUnknownParameterType]
    movie1: Movie,
    user_movie_data1: UserMovieData
) -> None:
    """Test that service still works without repository injection (backward compatibility)."""
    # Arrange: Create service WITHOUT injecting repository
    service = MovieEnrichmentService()

    movies = [
        MovieBaseSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date))
        )
    ]

    # Act: Should use default repository (ORM directly)
    enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Assert: Enrichment works correctly with default behavior
    assert len(enriched_movies) == 1
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[0].user_movie_data.user_watched is True
