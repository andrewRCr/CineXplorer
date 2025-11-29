"""
Unit tests for year filtering in TMDB result processing.

Tests the year filtering logic that handles TMDB API quirks where movies
with incorrect release years are sometimes returned (e.g., re-releases,
international releases).
"""
from __future__ import annotations

from unittest.mock import Mock

from core.services.api_response import ApiResponse
from movie.schemas import PaginatedMovieResponseSchema
from movie.services.movie_service import MovieService
from movie.services.tmdb_query_params import ServiceParams
from movie.tests.test_helpers import create_mock_paginated_response
from movie.tests.tmdb_test_builders import (
    TMDBMovieBaseRawDict,
    create_paginated_tmdb_response,
    create_tmdb_movie,
)


def test_discover_movies_filters_incorrect_release_years() -> None:
    """Test that discover_movies filters out movies with incorrect release years.

    TMDB API quirk: When requesting 2020s movies, TMDB sometimes returns movies
    from 2010s (likely due to re-releases, international releases, etc.).

    This test verifies our service layer filters out these incorrect years.
    """
    # Arrange: Mock TMDB client returns mix of correct and incorrect years
    mock_client = Mock(spec=['get'])

    # User requests 2020-2029 movies
    # TMDB returns 20 movies, but 5 are from 2010s (incorrect data hygiene)
    tmdb_movies = [
        # Correct years (2020s) - should be kept
        create_tmdb_movie(1, "Correct 2020", "2020-01-01", 8.0),
        create_tmdb_movie(2, "Correct 2021", "2021-01-01", 7.5),
        create_tmdb_movie(3, "Correct 2022", "2022-01-01", 8.2),
        create_tmdb_movie(4, "Correct 2023", "2023-01-01", 7.8),
        create_tmdb_movie(5, "Correct 2024", "2024-01-01", 8.5),
        create_tmdb_movie(6, "Correct 2025", "2025-01-01", 7.9),
        create_tmdb_movie(7, "Correct 2026", "2026-01-01", 8.1),
        create_tmdb_movie(8, "Correct 2027", "2027-01-01", 7.6),
        create_tmdb_movie(9, "Correct 2028", "2028-01-01", 8.3),
        create_tmdb_movie(10, "Correct 2029", "2029-01-01", 7.7),
        create_tmdb_movie(11, "Correct 2020 B", "2020-06-15", 8.0),
        create_tmdb_movie(12, "Correct 2021 B", "2021-12-25", 7.4),
        create_tmdb_movie(13, "Correct 2022 B", "2022-03-10", 8.6),
        create_tmdb_movie(14, "Correct 2023 B", "2023-11-20", 7.9),
        create_tmdb_movie(15, "Correct 2024 B", "2024-07-04", 8.2),
        # Incorrect years (2010s) - should be filtered out (TMDB data hygiene issue)
        create_tmdb_movie(101, "Wrong 2015", "2015-01-01", 8.0),
        create_tmdb_movie(102, "Wrong 2016", "2016-01-01", 7.5),
        create_tmdb_movie(103, "Wrong 2017", "2017-01-01", 8.2),
        create_tmdb_movie(104, "Wrong 2018", "2018-01-01", 7.8),
        create_tmdb_movie(105, "Wrong 2019", "2019-01-01", 8.5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2020s movies with discover endpoint
    result = service.discover_movies(
        page=1,
        params=ServiceParams(year_min=2020, year_max=2029)
    )

    # Assert: Only 2020s movies returned (15 correct movies)
    assert isinstance(result, PaginatedMovieResponseSchema)
    assert len(result.results) == 15

    # Verify all returned movies are from 2020s
    for movie in result.results:
        assert movie.release_date is not None
        year = movie.release_date.year
        assert 2020 <= year <= 2029, f"Movie {movie.title} has incorrect year {year}"

    # Verify incorrect movies were filtered out
    incorrect_ids = {101, 102, 103, 104, 105}
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert incorrect_ids.isdisjoint(returned_ids), "Incorrect year movies should be filtered out"


def test_search_movies_filters_incorrect_release_years() -> None:
    """Test that search_movies filters out movies with incorrect release years.

    Same TMDB quirk applies to search endpoint - when user searches "Batman"
    and filters to 2020s, TMDB may return older Batman movies.
    """
    # Arrange: Mock TMDB client returns search results with mixed years
    mock_client = Mock(spec=['search_movies'])

    # User searches "Batman" filtered to 2020s
    # TMDB returns 10 results, but 3 are from earlier decades
    tmdb_movies = [
        # Correct years (2020s)
        create_tmdb_movie(1, "The Batman (2022)", "2022-03-04", 8.0),
        create_tmdb_movie(2, "Batman: The Long Halloween (2021)", "2021-06-22", 7.5),
        create_tmdb_movie(3, "Batman: Soul of the Dragon (2021)", "2021-01-12", 7.0),
        create_tmdb_movie(4, "Batman: The Audio Adventures (2023)", "2023-09-01", 7.8),
        create_tmdb_movie(5, "Batman: Caped Crusader (2024)", "2024-08-01", 8.2),
        create_tmdb_movie(6, "Batman: Future State (2025)", "2025-01-15", 7.6),
        create_tmdb_movie(7, "Batman: New 52 (2026)", "2026-05-20", 7.9),
        # Incorrect years (older Batman movies leaking through)
        create_tmdb_movie(101, "The Dark Knight (2008)", "2008-07-18", 9.0),
        create_tmdb_movie(102, "Batman Begins (2005)", "2005-06-15", 8.2),
        create_tmdb_movie(103, "Batman (1989)", "1989-06-23", 7.5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.search_movies.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Search "Batman" filtered to 2020s
    result = service.search_movies(
        query="Batman",
        page=1,
        year_min=2020,
        year_max=2029
    )

    # Assert: Only 2020s Batman movies returned (7 correct movies)
    # Note: total_pages=1 means we're on last page, so buffer doesn't activate
    assert isinstance(result, PaginatedMovieResponseSchema)
    assert len(result.results) == 7

    # Verify all returned movies are from 2020s
    for movie in result.results:
        assert movie.release_date is not None
        year = movie.release_date.year
        assert 2020 <= year <= 2029, f"Movie {movie.title} has incorrect year {year}"


def test_year_filtering_handles_single_year() -> None:
    """Test year filtering works correctly for single year (not just ranges)."""
    # Arrange: Mock client returns movies from 2022, 2021, 2023
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_tmdb_movie(1, "2022 Movie A", "2022-01-01", 8.0),
        create_tmdb_movie(2, "2022 Movie B", "2022-06-15", 7.5),
        create_tmdb_movie(3, "2022 Movie C", "2022-12-31", 8.2),
        # Wrong years
        create_tmdb_movie(101, "2021 Movie", "2021-01-01", 7.8),
        create_tmdb_movie(102, "2023 Movie", "2023-01-01", 8.5),
    ]

    mock_response = create_mock_paginated_response(tmdb_movies, page=1, total_pages=1)
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request only 2022 movies
    result = service.discover_movies(page=1, params=ServiceParams(year_min=2022, year_max=2022))

    # Assert: Only 2022 movies returned
    assert len(result.results) == 3
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022


def test_year_filtering_handles_missing_release_dates() -> None:
    """Test that movies with missing release_date are filtered out."""
    # Arrange: Mock client returns some movies without release dates
    mock_client = Mock(spec=['get'])

    # Mix of valid and invalid release dates to test TMDB data quality handling
    movie_without_date: TMDBMovieBaseRawDict = {
        'id': 2, 'title': "Movie without date", 'poster_path': '/test.jpg',
        'vote_average': 7.5, 'release_date': None  # TMDB data quality issue
    }
    movie_empty_date: TMDBMovieBaseRawDict = {
        'id': 3, 'title': "Movie with empty date", 'poster_path': '/test.jpg',
        'vote_average': 8.0, 'release_date': ""  # TMDB data quality issue
    }

    tmdb_movies: list[TMDBMovieBaseRawDict] = [  # type: ignore[assignment]
        create_tmdb_movie(1, "Movie with date", "2022-01-01", 8.0).model_dump(),
        movie_without_date,
        movie_empty_date,
        create_tmdb_movie(4, "Another with date", "2022-06-15", 7.8).model_dump(),
    ]

    # Pattern 2: Testing intentionally invalid data (see module docstring in original file)
    tmdb_response = create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)  # type: ignore[arg-type]
    mock_response = ApiResponse(200, data=tmdb_response.model_dump())  # type: ignore[arg-type]
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2022 movies
    result = service.discover_movies(page=1, params=ServiceParams(year_min=2022, year_max=2022))

    # Assert: Only movies with valid release dates returned
    assert len(result.results) == 2
    assert all(m.release_date is not None for m in result.results)
