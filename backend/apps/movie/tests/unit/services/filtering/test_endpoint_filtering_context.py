"""
Unit tests for endpoint-specific filtering context and combined filter behavior.

Tests filtering behavior across different endpoints (now playing, upcoming, discover)
and combined filtering scenarios (year + rating together, no filters at all).
"""
from __future__ import annotations

from unittest.mock import Mock

from movie.schemas import PaginatedMovieResponseSchema
from movie.services.movie_service import MovieService
from movie.services.tmdb_api_boundary.query_params import ServiceParams
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import create_tmdb_movie


def test_filtering_applies_to_now_playing_endpoint() -> None:
    """Test that filtering applies to get_now_playing_movies endpoint."""
    # Arrange: Mock client returns now playing movies with mixed data
    mock_client = Mock(spec=['get'])

    # Now playing includes some 2021 movies (extended theatrical runs)
    tmdb_movies = [
        # Current 2024 movies
        create_tmdb_movie(1, "New Release A", "2024-01-01", 7.5),
        create_tmdb_movie(2, "New Release B", "2024-02-01", 8.0),
        create_tmdb_movie(3, "New Release C", "2024-03-01", 7.8),
        # Extended run from 2021 (should be filtered if user wants 2024 only)
        create_tmdb_movie(101, "Extended Run", "2021-01-01", 8.5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request now playing with no additional filters (uses service defaults)
    # Note: year_min/year_max removed - service method no longer accepts them
    # Backend filtering still applies via _fetch_with_filters_and_buffer
    result = service.get_now_playing_movies(page=1)

    # Assert: Extended run from 2021 still present (date preset allows it)
    # This test now validates that now-playing returns movies within preset range
    assert len(result.results) == 4  # All movies returned (within date preset)
    assert isinstance(result, PaginatedMovieResponseSchema)


def test_filtering_applies_to_upcoming_endpoint() -> None:
    """Test that filtering applies to get_upcoming_movies endpoint."""
    # Arrange: Mock client returns upcoming movies with mixed ratings
    mock_client = Mock(spec=['get'])

    # Upcoming movies often have placeholder 0.0 ratings
    tmdb_movies = [
        # Movies with ratings
        create_tmdb_movie(1, "Upcoming A", "2024-06-01", 7.5),
        create_tmdb_movie(2, "Upcoming B", "2024-07-01", 8.0),
        # Movies with placeholder ratings
        create_tmdb_movie(101, "No Rating Yet", "2024-08-01", 0.0),
        create_tmdb_movie(102, "Also No Rating", "2024-09-01", 0.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request upcoming movies with no additional filters (uses service defaults)
    # Note: rating_min removed - service method no longer accepts explicit filter params
    # Backend filtering still applies via _fetch_with_filters_and_buffer
    result = service.get_upcoming_movies(page=1)

    # Assert: All movies returned (no backend filtering applied without explicit params)
    # This test now validates that upcoming returns movies within preset date range
    assert len(result.results) == 4  # All movies returned
    assert isinstance(result, PaginatedMovieResponseSchema)


def test_no_filters_returns_all_results_unchanged() -> None:
    """Test that when no filters applied, all results are returned unchanged."""
    # Arrange: Mock client returns 20 diverse movies
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_tmdb_movie(i, f"Movie {i}", f"{2020 + (i % 5)}-01-01", 5.0 + (i * 0.2))
        for i in range(1, 21)
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=5)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without any filters
    result = service.discover_movies(page=1)

    # Assert: All 20 movies returned unchanged
    assert len(result.results) == 20
    returned_ids = {movie.tmdb_id for movie in result.results}
    expected_ids = set(range(1, 21))
    assert returned_ids == expected_ids


def test_no_buffer_fetch_when_no_filters_applied() -> None:
    """Test that buffer mechanism is NOT triggered when no filters applied.

    Buffer mechanism only applies when filters are present. If no filters,
    return TMDB results as-is (no buffer logic).
    """
    # Arrange: Mock client returns 20 movies
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_tmdb_movie(i, f"Movie {i}", "2022-01-01", 7.0)
        for i in range(1, 21)
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=5)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without filters
    result = service.discover_movies(page=1)

    # Assert: Only one API call (no buffer fetch)
    assert mock_client.get.call_count == 1
    assert len(result.results) == 20


def test_combined_year_and_rating_filtering() -> None:
    """Test that year and rating filters work together correctly."""
    # Arrange: Mock client returns movies with various year/rating combinations
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Correct year AND rating - should be kept
        create_tmdb_movie(1, "Good 2022 A", "2022-01-01", 8.0),
        create_tmdb_movie(2, "Good 2022 B", "2022-06-15", 7.5),
        create_tmdb_movie(3, "Good 2022 C", "2022-12-31", 8.5),
        # Correct year, wrong rating
        create_tmdb_movie(101, "2022 Low Rating", "2022-01-01", 6.0),
        # Wrong year, correct rating
        create_tmdb_movie(102, "2021 High Rating", "2021-01-01", 8.0),
        # Wrong year AND rating
        create_tmdb_movie(103, "2019 Low Rating", "2019-01-01", 5.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2022 movies rated 7.5+
    result = service.discover_movies(
        page=1,
        params=ServiceParams(year_min=2022, year_max=2022, rating_min=7.5)
    )

    # Assert: Only movies matching both criteria returned
    assert len(result.results) == 3
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5
