"""
Tests for user movies response builder.

This module tests the build_user_movies_response function which composes
pagination, batch fetching, and enrichment to build paginated movie responses
for user-specific movie collections (watchlist, watched movies, etc.).

Test Coverage:
- Full flow validation (pagination → fetch → enrich → response)
- Pagination metadata correctness
- User-specific enrichment data inclusion
- Edge cases (empty watchlist, unavailable movies)
- Target coverage: 80%+ (general)
"""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from core.models import Movie
from core.tests.test_helpers import create_user
from movie.schemas import MovieListItemSchema, MovieListResponseSchema
from user_movie_data.models import UserMovieData
from user_movie_data.services.response_builder import build_user_movies_response

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser


@pytest.fixture
def test_user(db: object) -> AbstractBaseUser:
    """Create a test user."""
    return create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def test_movies(db: object) -> list[Movie]:
    """Create test movies in the database."""
    movies = [
        Movie.objects.create(
            tmdb_id=550,
            title='Fight Club',
            poster_path='/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
            release_date=date(1999, 10, 15)
        ),
        Movie.objects.create(
            tmdb_id=551,
            title='The Matrix',
            poster_path='/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
            release_date=date(1999, 3, 31)
        ),
        Movie.objects.create(
            tmdb_id=552,
            title='Inception',
            poster_path='/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
            release_date=date(2010, 7, 16)
        ),
        Movie.objects.create(
            tmdb_id=553,
            title='The Dark Knight',
            poster_path='/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
            release_date=date(2008, 7, 18)
        ),
        Movie.objects.create(
            tmdb_id=554,
            title='Pulp Fiction',
            poster_path='/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
            release_date=date(1994, 10, 14)
        ),
    ]
    return movies


@pytest.fixture
def user_movie_data_entries(
    db: object,
    test_user: AbstractBaseUser,
    test_movies: list[Movie]
) -> list[UserMovieData]:
    """
    Create user movie data entries for the test user.
    Note: these do not represent developer opinion, just test data.
    """
    entries = [
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[0],  # Fight Club
            user_on_watchlist=True,
            user_watched=False,
            user_liked=False,
            user_rating=None,
            user_review=None
        ),
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[1],  # The Matrix
            user_on_watchlist=True,
            user_watched=True,
            user_liked=True,
            user_rating=9,
            user_review='Amazing movie!'
        ),
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[2],  # Inception
            user_on_watchlist=True,
            user_watched=True,
            user_liked=True,
            user_rating=10,
            user_review='Mind-bending!'
        ),
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[3],  # The Dark Knight
            user_on_watchlist=True,
            user_watched=False,
            user_liked=False,
            user_rating=None,
            user_review=None
        ),
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[4],  # Pulp Fiction
            user_on_watchlist=True,
            user_watched=True,
            user_liked=False,
            user_rating=7,
            user_review='Good but overrated'
        ),
    ]
    return entries


class TestBuildUserMoviesResponse:
    """Tests for build_user_movies_response function."""

    def test_full_flow_with_valid_data(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test complete flow: pagination → fetch → enrich → response."""
        # Get watchlist QuerySet
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        # Build response for page 1 with page_size=2
        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            # Mock TMDB batch fetch to return movie schemas
            mock_fetch.return_value = [
                MovieListItemSchema(
                    tmdb_id=550,
                    title='Fight Club',
                    poster_path='/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
                    release_date=date(1999, 10, 15),
                    vote_average=8.4,
                    runtime=139
                ),
                MovieListItemSchema(
                    tmdb_id=551,
                    title='The Matrix',
                    poster_path='/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
                    release_date=date(1999, 3, 31),
                    vote_average=8.7,
                    runtime=136
                ),
            ]

            response = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1,
                page_size=2
            )

            # Verify response structure
            assert isinstance(response, MovieListResponseSchema)

            # Verify pagination metadata
            assert response.page == 1
            assert response.total_pages == 3  # 5 items / 2 per page = 3 pages
            assert response.total_results == 5

            # Verify results list
            assert len(response.results) == 2

            # Verify TMDB batch fetch was called with correct IDs
            mock_fetch.assert_called_once()
            called_ids = mock_fetch.call_args[0][0]
            assert set(called_ids) == {550, 551}  # First 2 movies on page 1

            # Verify enrichment data is present
            assert response.results[0].user_movie_data is not None
            assert response.results[1].user_movie_data is not None

            # Verify specific enrichment data for Fight Club (tmdb_id=550)
            fight_club = next(m for m in response.results if m.tmdb_id == 550)
            assert fight_club.user_movie_data is not None  # Explicit narrowing for Pyright
            assert fight_club.user_movie_data.user_on_watchlist is True
            assert fight_club.user_movie_data.user_watched is False

            # Verify specific enrichment data for The Matrix (tmdb_id=551)
            matrix = next(m for m in response.results if m.tmdb_id == 551)
            assert matrix.user_movie_data is not None  # Explicit narrowing for Pyright
            assert matrix.user_movie_data.user_on_watchlist is True
            assert matrix.user_movie_data.user_watched is True
            assert matrix.user_movie_data.user_rating == 9
            assert matrix.user_movie_data.user_review == 'Amazing movie!'

    def test_pagination_metadata_correctness(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test pagination metadata is calculated correctly for different pages."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            # Mock empty results since we're only testing metadata
            mock_fetch.return_value = []

            # Test page 1
            response_page_1 = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1,
                page_size=2
            )
            assert response_page_1.page == 1
            assert response_page_1.total_pages == 3
            assert response_page_1.total_results == 5

            # Test page 2
            response_page_2 = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=2,
                page_size=2
            )
            assert response_page_2.page == 2
            assert response_page_2.total_pages == 3
            assert response_page_2.total_results == 5

            # Test page 3 (last page with only 1 item)
            response_page_3 = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=3,
                page_size=2
            )
            assert response_page_3.page == 3
            assert response_page_3.total_pages == 3
            assert response_page_3.total_results == 5

    def test_empty_queryset_returns_empty_response(
        self,
        test_user: AbstractBaseUser
    ) -> None:
        """Test empty watchlist returns valid empty response."""
        # Create empty QuerySet (no watchlist items)
        empty_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        response = build_user_movies_response(
            queryset=empty_qs,
            user=test_user,
            page=1
        )

        # Verify response structure
        assert isinstance(response, MovieListResponseSchema)
        assert response.page == 1
        assert response.total_pages == 0
        assert response.total_results == 0
        assert len(response.results) == 0

    def test_unavailable_movies_graceful_degradation(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test graceful handling when some movies fail to fetch from TMDB."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            # Mock batch fetch returning only 1 movie (550) out of 2 requested (550, 551)
            # This simulates TMDB API failure for movie 551
            mock_fetch.return_value = [
                MovieListItemSchema(
                    tmdb_id=550,
                    title='Fight Club',
                    poster_path='/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
                    release_date=date(1999, 10, 15),
                    vote_average=8.4,
                    runtime=139
                ),
            ]

            response = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1,
                page_size=2
            )

            # Verify response contains only the successfully fetched movie
            assert len(response.results) == 1
            assert response.results[0].tmdb_id == 550

            # Verify pagination metadata still reflects total database count
            # (not affected by TMDB fetch failures)
            assert response.total_results == 5
            assert response.total_pages == 3

    def test_page_beyond_total_pages(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test requesting a page beyond total_pages returns empty results."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        response = build_user_movies_response(
            queryset=watchlist_qs,
            user=test_user,
            page=999,  # Way beyond available pages
            page_size=2
        )

        # Verify empty results but valid metadata
        assert len(response.results) == 0
        assert response.page == 999
        assert response.total_pages == 3
        assert response.total_results == 5

    def test_default_page_size(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test default page_size is applied when not specified."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            mock_fetch.return_value = []

            # Call without page_size parameter
            response = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1
            )

            # Default page_size is 20 (from core.pagination.DEFAULT_PAGE_SIZE)
            # With 5 items total, should be 1 page
            assert response.total_pages == 1

    def test_enrichment_with_no_user_data(
        self,
        test_user: AbstractBaseUser,
        test_movies: list[Movie]
    ) -> None:
        """Test enrichment when UserMovieData exists but has no user-specific data."""
        # Create UserMovieData entry with minimal data (just watchlist flag)
        UserMovieData.objects.create(
            user=test_user,
            movie=test_movies[0],
            user_on_watchlist=True,
            user_watched=False,
            user_liked=False,
            user_rating=None,
            user_review=None
        )

        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            mock_fetch.return_value = [
                MovieListItemSchema(
                    tmdb_id=550,
                    title='Fight Club',
                    poster_path='/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg',
                    release_date=date(1999, 10, 15),
                    vote_average=8.4,
                    runtime=139
                ),
            ]

            response = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1
            )

            # Verify enrichment data is present
            assert response.results[0].user_movie_data is not None

            # Verify default/empty values
            assert response.results[0].user_movie_data.user_on_watchlist is True
            assert response.results[0].user_movie_data.user_watched is False
            assert response.results[0].user_movie_data.user_liked is False
            assert response.results[0].user_movie_data.user_rating is None
            assert response.results[0].user_movie_data.user_review is None

    def test_batch_fetch_deduplication(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test that batch fetch receives deduplicated movie IDs."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            mock_fetch.return_value = []

            build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1,
                page_size=2
            )

            # Verify batch fetch was called once
            assert mock_fetch.call_count == 1

            # Verify IDs are unique (no duplicates)
            called_ids = mock_fetch.call_args[0][0]
            assert len(called_ids) == len(set(called_ids))

    def test_large_page_size_clamping(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test that excessively large page_size is clamped to MAX_PAGE_SIZE."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            mock_fetch.return_value = []

            response = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=1,
                page_size=500  # Exceeds MAX_PAGE_SIZE (100)
            )

            # With MAX_PAGE_SIZE=100 and 5 items, should be 1 page
            assert response.total_pages == 1

    def test_invalid_page_number_defaults_to_one(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test that invalid page numbers (< 1) default to page 1."""
        watchlist_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            mock_fetch.return_value = []

            # Test page 0
            response_zero = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=0,
                page_size=2
            )
            assert response_zero.page == 1

            # Test negative page
            response_negative = build_user_movies_response(
                queryset=watchlist_qs,
                user=test_user,
                page=-5,
                page_size=2
            )
            assert response_negative.page == 1

    def test_queryset_ordering_preserved(
        self,
        test_user: AbstractBaseUser,
        user_movie_data_entries: list[UserMovieData]
    ) -> None:
        """Test that QuerySet ordering is preserved in pagination."""
        # Order by movie title descending
        ordered_qs = UserMovieData.objects.filter(
            user=test_user,
            user_on_watchlist=True
        ).select_related('movie').order_by('-movie__title')

        with patch('user_movie_data.services.response_builder.fetch_movies_batch') as mock_fetch:
            # Return movies in order they were requested
            def mock_fetch_in_order(ids: list[int]) -> list[MovieListItemSchema]:
                """Mock that returns movies in the order requested."""
                movie_map = {
                    550: MovieListItemSchema(
                        tmdb_id=550, title='Fight Club', vote_average=8.4, runtime=139
                    ),
                    551: MovieListItemSchema(
                        tmdb_id=551, title='The Matrix', vote_average=8.7, runtime=136
                    ),
                    552: MovieListItemSchema(
                        tmdb_id=552, title='Inception', vote_average=8.8, runtime=148
                    ),
                    553: MovieListItemSchema(
                        tmdb_id=553, title='The Dark Knight', vote_average=9.0, runtime=152
                    ),
                    554: MovieListItemSchema(
                        tmdb_id=554, title='Pulp Fiction', vote_average=8.9, runtime=154
                    ),
                }
                return [movie_map[movie_id] for movie_id in ids if movie_id in movie_map]

            mock_fetch.side_effect = mock_fetch_in_order

            response = build_user_movies_response(
                queryset=ordered_qs,
                user=test_user,
                page=1,
                page_size=2
            )

            # Verify movies are in descending title order
            # Expected order: The Matrix, The Dark Knight, Pulp Fiction, Inception, Fight Club
            # Page 1 should have: The Matrix, The Dark Knight
            assert len(response.results) == 2
            titles = [movie.title for movie in response.results]
            assert titles == ['The Matrix', 'The Dark Knight']
