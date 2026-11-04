"""Integration tests for MovieEnrichmentService query optimization.

This module tests the bulk query optimization of the enrichment service,
verifying that it uses a single database query regardless of movie count
(no N+1 problem).

These tests require real database access to verify query behavior using
Django's django_assert_num_queries fixture.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

import pytest
from django.contrib.auth import get_user_model

from apps.core.models import Movie
from apps.movie.schemas import MovieListItemSchema
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

if TYPE_CHECKING:
    from apps.users.models import User

User = get_user_model()


# =========================
# Test Fixtures
# =========================


@pytest.fixture
def user(db: None) -> User:  # pyright: ignore[reportInvalidTypeForm, reportUnknownParameterType]
    """Create a test user for enrichment tests."""
    return User.objects.create_user(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType, reportUnknownVariableType]
        username="testuser", email="testuser@example.com", password="testpass123"
    )


@pytest.fixture
def movie1(db: None) -> Movie:
    """Create first test movie."""
    return Movie.objects.create(
        tmdb_id=12345,
        title="Blade Runner",
        poster_path="/blade_runner.jpg",
        release_date="1982-06-25",
    )


@pytest.fixture
def movie2(db: None) -> Movie:
    """Create second test movie."""
    return Movie.objects.create(
        tmdb_id=54321, title="Chinatown", poster_path="/chinatown.jpg", release_date="1974-06-20"
    )


@pytest.fixture
def user_movie_data1(user: User, movie1: Movie) -> UserMovieData:  # pyright: ignore[reportInvalidTypeForm, reportUnknownParameterType]
    """Create UserMovieData for movie1."""
    return UserMovieData.objects.create(
        user=user,
        movie=movie1,
        user_watched=True,
        user_on_watchlist=False,
        user_liked=True,
        user_rating=9,
        user_review="Excellent sci-fi film!",
    )


@pytest.fixture
def user_movie_data2(user: User, movie2: Movie) -> UserMovieData:  # pyright: ignore[reportInvalidTypeForm, reportUnknownParameterType]
    """Create UserMovieData for movie2."""
    return UserMovieData.objects.create(
        user=user,
        movie=movie2,
        user_watched=False,
        user_on_watchlist=True,
        user_liked=False,
        user_rating=None,
        user_review=None,
    )


# =========================
# Query Optimization Tests
# =========================


@pytest.mark.django_db
def test_bulk_query_optimization_single_query(
    user: User,  # pyright: ignore[reportInvalidTypeForm, reportUnknownParameterType]
    movie1: Movie,
    movie2: Movie,
    user_movie_data1: UserMovieData,
    user_movie_data2: UserMovieData,
    django_assert_num_queries: object,
) -> None:
    """Test that enrichment uses single bulk query (no N+1 problem)."""
    # Arrange
    service = MovieEnrichmentService()
    movies = [
        MovieListItemSchema(
            tmdb_id=movie1.tmdb_id,
            title=movie1.title,
            poster_path=movie1.poster_path,
            release_date=date.fromisoformat(str(movie1.release_date)),
        ),
        MovieListItemSchema(
            tmdb_id=movie2.tmdb_id,
            title=movie2.title,
            poster_path=movie2.poster_path,
            release_date=date.fromisoformat(str(movie2.release_date)),
        ),
    ]

    # Act & Assert: Should execute exactly 1 query regardless of movie count
    with django_assert_num_queries(1):  # pyright: ignore[reportCallIssue]
        enriched_movies = service.enrich_movies_with_user_movie_data(movies, user)  # pyright: ignore[reportUnknownArgumentType]

    # Verify both movies were enriched
    assert len(enriched_movies) == 2
    assert enriched_movies[0].user_movie_data is not None
    assert enriched_movies[1].user_movie_data is not None


@pytest.mark.django_db
def test_bulk_query_with_many_movies(
    user: User,  # pyright: ignore[reportInvalidTypeForm, reportUnknownParameterType]
    django_assert_num_queries: object,
) -> None:
    """Test that query count stays at 1 even with many movies."""
    # Arrange: Create 10 movies with user data
    movies_data: list[MovieListItemSchema] = []
    for i in range(10):
        movie = Movie.objects.create(
            tmdb_id=1000 + i,
            title=f"Movie {i}",
            poster_path=f"/movie_{i}.jpg",
            release_date="2023-01-01",
        )
        UserMovieData.objects.create(user=user, movie=movie, user_watched=True, user_rating=i + 1)
        movies_data.append(
            MovieListItemSchema(
                tmdb_id=movie.tmdb_id,
                title=movie.title,
                poster_path=movie.poster_path,
                release_date=date.fromisoformat(str(movie.release_date)),
            )
        )

    service = MovieEnrichmentService()

    # Act & Assert: Still only 1 query for 10 movies
    with django_assert_num_queries(1):  # pyright: ignore[reportCallIssue]
        enriched_movies = service.enrich_movies_with_user_movie_data(movies_data, user)  # pyright: ignore[reportUnknownArgumentType]

    # Verify all movies were enriched
    assert len(enriched_movies) == 10
    assert all(m.user_movie_data is not None for m in enriched_movies)
