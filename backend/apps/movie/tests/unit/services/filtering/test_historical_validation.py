"""
Unit tests for historical date validation in TMDB result processing.

Tests the historical validation logic that filters out movies with impossible
release dates (before 1888, the year of the first film ever made).
"""
from __future__ import annotations

from unittest.mock import Mock

from movie.services.movie_service import MovieService
from movie.services.tmdb_api_boundary.query_params import BrowseServiceParams
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import create_tmdb_movie


def test_filter_movies_excludes_pre_cinema_dates() -> None:
    """Test that movies with release dates before 1888 are excluded.

    The first film ever made was in 1888 (Roundhay Garden Scene).
    Any movies with earlier dates are data quality issues in TMDB.

    This prevents obviously invalid historical data from appearing in results.
    """
    # Arrange: Mix of valid and invalid historical dates
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Valid movies (1888 and later)
        create_tmdb_movie(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_tmdb_movie(2, "Early Silent Film", "1895-12-28", 6.5),
        create_tmdb_movie(3, "The Great Train Robbery", "1903-01-01", 7.5),
        create_tmdb_movie(4, "Modern Movie", "2022-01-01", 8.0),
        # Invalid movies (before 1888) - TMDB data quality issues
        create_tmdb_movie(101, "Invalid 1887", "1887-01-01", 7.0),
        create_tmdb_movie(102, "Invalid 1800", "1800-01-01", 7.0),
        create_tmdb_movie(103, "Invalid 1500", "1500-01-01", 7.0),
        create_tmdb_movie(104, "Invalid Year 1", "0001-01-01", 7.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies without year filter (to test historical validation)
    result = service.discover_movies(page=1)

    # Assert: Only valid movies (1888+) returned, pre-cinema dates excluded
    assert len(result.results) == 4
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2, 3, 4}

    # Verify all returned movies have valid historical dates
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year >= 1888


def test_filter_movies_includes_first_film_year() -> None:
    """Test that movies from 1888 (first film year) are included.

    Edge case: 1888 is the boundary year and should be included.
    """
    # Arrange: Movies from exactly 1888
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_tmdb_movie(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_tmdb_movie(2, "Another 1888 Film", "1888-12-31", 6.5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.discover_movies(page=1)

    # Assert: Both 1888 movies included (boundary year is valid)
    assert len(result.results) == 2
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 1888


def test_historical_validation_with_year_filters() -> None:
    """Test that historical validation works in combination with user year filters.

    When user requests a specific year range, historical validation should still
    apply to prevent invalid dates from slipping through.
    """
    # Arrange: Mix including invalid dates within user's requested range
    mock_client = Mock(spec=['get'])

    # User requests 1900-1920, but TMDB returns some pre-1888 movies (data bug)
    tmdb_movies = [
        # Valid movies in requested range
        create_tmdb_movie(1, "Valid 1900", "1900-01-01", 7.0),
        create_tmdb_movie(2, "Valid 1910", "1910-01-01", 7.5),
        create_tmdb_movie(3, "Valid 1920", "1920-01-01", 8.0),
        # Invalid pre-cinema dates (should be excluded by historical validation)
        create_tmdb_movie(101, "Invalid 1850", "1850-01-01", 7.0),
        create_tmdb_movie(102, "Invalid 1700", "1700-01-01", 7.0),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 1900-1920 range
    result = service.discover_movies(
        page=1,
        params=BrowseServiceParams(year_min=1900, year_max=1920)
    )

    # Assert: Only valid movies in range returned, invalid dates excluded
    assert len(result.results) == 3
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2, 3}

    # Verify all movies are both in requested range AND historically valid
    for movie in result.results:
        assert movie.release_date is not None
        assert 1900 <= movie.release_date.year <= 1920
        assert movie.release_date.year >= 1888
