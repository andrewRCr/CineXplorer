"""
Unit tests for TMDB result filtering and buffer mechanism.

Tests the filtering and buffer logic that handles TMDB API quirks:
- TMDB returns movies with incorrect release years (data hygiene issues)
- TMDB returns movies with incorrect ratings (placeholder ratings)
- Buffer mechanism maintains consistent page sizes (20 results per page)

These tests use mocked MovieService to verify filtering behavior without external API calls.

Test Coverage Target: 90% (critical UX path)

Related Frontend Code Being Replaced:
- frontend/src/hooks/useEnhancedFetcher.ts (lines 126-272)
- frontend/src/utilities/movieFilterUtils.ts (filterMoviesByYear, filterMoviesByRating)
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock

from core.services.api_response import ApiResponse
from movie.schemas import PaginatedMovieResponseSchema
from movie.services.movie_service import MovieService
from movie.tests.test_fixtures_tmdb import (
    TMDBMovieBaseRawDict,
    create_raw_tmdb_movie,
    create_paginated_tmdb_response,
)

if TYPE_CHECKING:
    pass


# ============================================================================
# Test Fixtures and Helpers
# ============================================================================
# Helpers imported from test_fixtures_tmdb.py:
# - create_raw_tmdb_movie(): Create mock TMDB movie dictionaries
# - create_paginated_tmdb_response(): Create mock paginated responses
# ============================================================================


# ============================================================================
# Year Filtering Tests
# ============================================================================


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
        create_raw_tmdb_movie(1, "Correct 2020", "2020-01-01", 8.0),
        create_raw_tmdb_movie(2, "Correct 2021", "2021-01-01", 7.5),
        create_raw_tmdb_movie(3, "Correct 2022", "2022-01-01", 8.2),
        create_raw_tmdb_movie(4, "Correct 2023", "2023-01-01", 7.8),
        create_raw_tmdb_movie(5, "Correct 2024", "2024-01-01", 8.5),
        create_raw_tmdb_movie(6, "Correct 2025", "2025-01-01", 7.9),
        create_raw_tmdb_movie(7, "Correct 2026", "2026-01-01", 8.1),
        create_raw_tmdb_movie(8, "Correct 2027", "2027-01-01", 7.6),
        create_raw_tmdb_movie(9, "Correct 2028", "2028-01-01", 8.3),
        create_raw_tmdb_movie(10, "Correct 2029", "2029-01-01", 7.7),
        create_raw_tmdb_movie(11, "Correct 2020 B", "2020-06-15", 8.0),
        create_raw_tmdb_movie(12, "Correct 2021 B", "2021-12-25", 7.4),
        create_raw_tmdb_movie(13, "Correct 2022 B", "2022-03-10", 8.6),
        create_raw_tmdb_movie(14, "Correct 2023 B", "2023-11-20", 7.9),
        create_raw_tmdb_movie(15, "Correct 2024 B", "2024-07-04", 8.2),
        # Incorrect years (2010s) - should be filtered out (TMDB data hygiene issue)
        create_raw_tmdb_movie(101, "Wrong 2015", "2015-01-01", 8.0),
        create_raw_tmdb_movie(102, "Wrong 2016", "2016-01-01", 7.5),
        create_raw_tmdb_movie(103, "Wrong 2017", "2017-01-01", 8.2),
        create_raw_tmdb_movie(104, "Wrong 2018", "2018-01-01", 7.8),
        create_raw_tmdb_movie(105, "Wrong 2019", "2019-01-01", 8.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2020s movies with discover endpoint
    result = service.discover_movies(
        page=1,
        year_min=2020,
        year_max=2029
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
        create_raw_tmdb_movie(1, "The Batman (2022)", "2022-03-04", 8.0),
        create_raw_tmdb_movie(2, "Batman: The Long Halloween (2021)", "2021-06-22", 7.5),
        create_raw_tmdb_movie(3, "Batman: Soul of the Dragon (2021)", "2021-01-12", 7.0),
        create_raw_tmdb_movie(4, "Batman: The Audio Adventures (2023)", "2023-09-01", 7.8),
        create_raw_tmdb_movie(5, "Batman: Caped Crusader (2024)", "2024-08-01", 8.2),
        create_raw_tmdb_movie(6, "Batman: Future State (2025)", "2025-01-15", 7.6),
        create_raw_tmdb_movie(7, "Batman: New 52 (2026)", "2026-05-20", 7.9),
        # Incorrect years (older Batman movies leaking through)
        create_raw_tmdb_movie(101, "The Dark Knight (2008)", "2008-07-18", 9.0),
        create_raw_tmdb_movie(102, "Batman Begins (2005)", "2005-06-15", 8.2),
        create_raw_tmdb_movie(103, "Batman (1989)", "1989-06-23", 7.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
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
        create_raw_tmdb_movie(1, "2022 Movie A", "2022-01-01", 8.0),
        create_raw_tmdb_movie(2, "2022 Movie B", "2022-06-15", 7.5),
        create_raw_tmdb_movie(3, "2022 Movie C", "2022-12-31", 8.2),
        # Wrong years
        create_raw_tmdb_movie(101, "2021 Movie", "2021-01-01", 7.8),
        create_raw_tmdb_movie(102, "2023 Movie", "2023-01-01", 8.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request only 2022 movies
    result = service.discover_movies(page=1, year_min=2022, year_max=2022)

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

    tmdb_movies: list[TMDBMovieBaseRawDict] = [
        create_raw_tmdb_movie(1, "Movie with date", "2022-01-01", 8.0),
        movie_without_date,
        movie_empty_date,
        create_raw_tmdb_movie(4, "Another with date", "2022-06-15", 7.8),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2022 movies
    result = service.discover_movies(page=1, year_min=2022, year_max=2022)

    # Assert: Only movies with valid release dates returned
    assert len(result.results) == 2
    assert all(m.release_date is not None for m in result.results)


# ============================================================================
# Rating Filtering Tests
# ============================================================================


def test_discover_movies_filters_incorrect_ratings() -> None:
    """Test that discover_movies filters out movies with incorrect ratings.

    TMDB API quirk: When requesting movies rated 7.5+, TMDB sometimes returns
    movies with 0.0 ratings (placeholder ratings for certain releases).
    """
    # Arrange: Mock client returns mix of correct and incorrect ratings
    mock_client = Mock(spec=['get'])

    # User requests movies rated 7.5+
    # TMDB returns 20 movies, but 5 have placeholder 0.0 ratings
    tmdb_movies = [
        # Correct ratings (7.5+) - should be kept
        create_raw_tmdb_movie(1, "Good Movie A", "2022-01-01", 8.0),
        create_raw_tmdb_movie(2, "Good Movie B", "2022-01-01", 7.5),
        create_raw_tmdb_movie(3, "Good Movie C", "2022-01-01", 8.2),
        create_raw_tmdb_movie(4, "Good Movie D", "2022-01-01", 7.8),
        create_raw_tmdb_movie(5, "Good Movie E", "2022-01-01", 8.5),
        create_raw_tmdb_movie(6, "Good Movie F", "2022-01-01", 7.9),
        create_raw_tmdb_movie(7, "Good Movie G", "2022-01-01", 8.1),
        create_raw_tmdb_movie(8, "Good Movie H", "2022-01-01", 7.6),
        create_raw_tmdb_movie(9, "Good Movie I", "2022-01-01", 8.3),
        create_raw_tmdb_movie(10, "Good Movie J", "2022-01-01", 7.7),
        create_raw_tmdb_movie(11, "Good Movie K", "2022-01-01", 9.0),
        create_raw_tmdb_movie(12, "Good Movie L", "2022-01-01", 7.5),
        create_raw_tmdb_movie(13, "Good Movie M", "2022-01-01", 8.6),
        create_raw_tmdb_movie(14, "Good Movie N", "2022-01-01", 7.9),
        create_raw_tmdb_movie(15, "Good Movie O", "2022-01-01", 8.2),
        # Incorrect ratings (placeholder 0.0) - should be filtered out
        create_raw_tmdb_movie(101, "Placeholder Rating A", "2022-01-01", 0.0),
        create_raw_tmdb_movie(102, "Placeholder Rating B", "2022-01-01", 0.0),
        create_raw_tmdb_movie(103, "Low Rating A", "2022-01-01", 6.0),
        create_raw_tmdb_movie(104, "Low Rating B", "2022-01-01", 5.5),
        create_raw_tmdb_movie(105, "Low Rating C", "2022-01-01", 7.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only movies with rating >= 7.5 returned (15 correct movies)
    assert isinstance(result, PaginatedMovieResponseSchema)
    assert len(result.results) == 15

    # Verify all returned movies have rating >= 7.5
    for movie in result.results:
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5, (
            f"Movie {movie.title} has rating {movie.vote_average} < 7.5"
        )

    # Verify low-rated movies were filtered out
    incorrect_ids = {101, 102, 103, 104, 105}
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert incorrect_ids.isdisjoint(returned_ids), "Low-rated movies should be filtered out"


def test_rating_filtering_handles_range() -> None:
    """Test rating filtering works with both min and max rating (range filtering)."""
    # Arrange: Mock client returns movies with various ratings
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # In range (7.0-8.0) - should be kept
        create_raw_tmdb_movie(1, "In Range A", "2022-01-01", 7.0),
        create_raw_tmdb_movie(2, "In Range B", "2022-01-01", 7.5),
        create_raw_tmdb_movie(3, "In Range C", "2022-01-01", 8.0),
        create_raw_tmdb_movie(4, "In Range D", "2022-01-01", 7.2),
        create_raw_tmdb_movie(5, "In Range E", "2022-01-01", 7.8),
        # Out of range - should be filtered out
        create_raw_tmdb_movie(101, "Too Low A", "2022-01-01", 6.9),
        create_raw_tmdb_movie(102, "Too Low B", "2022-01-01", 5.0),
        create_raw_tmdb_movie(103, "Too High A", "2022-01-01", 8.1),
        create_raw_tmdb_movie(104, "Too High B", "2022-01-01", 9.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.0-8.0
    result = service.discover_movies(page=1, rating_min=7.0, rating_max=8.0)

    # Assert: Only movies in range returned
    assert len(result.results) == 5
    for movie in result.results:
        assert movie.vote_average is not None
        assert 7.0 <= movie.vote_average <= 8.0


def test_rating_filtering_handles_missing_ratings() -> None:
    """Test that movies with missing vote_average are filtered out."""
    # Arrange: Mock client returns some movies without ratings
    mock_client = Mock(spec=['get'])

    # Movie with missing rating to test TMDB data quality handling
    movie_without_rating: TMDBMovieBaseRawDict = {
        'id': 2, 'title': "Movie without rating", 'poster_path': '/test.jpg',
        'release_date': "2022-01-01", 'vote_average': None  # TMDB data quality issue
    }

    tmdb_movies: list[TMDBMovieBaseRawDict] = [
        create_raw_tmdb_movie(1, "Movie with rating", "2022-01-01", 8.0),
        movie_without_rating,
        create_raw_tmdb_movie(3, "Another with rating", "2022-01-01", 7.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only movies with valid ratings returned
    assert len(result.results) == 2
    assert all(m.vote_average is not None for m in result.results)


# ============================================================================
# Vote Count Quality Filtering Tests
# ============================================================================


def test_rating_filter_excludes_low_vote_count_movies() -> None:
    """Test that movies with low vote counts are excluded when rating filter applied.

    Universal 10-vote threshold applies to all scenarios (general browsing and rating filters).
    This filters statistical noise and low-quality content while maintaining broad catalog access.

    When users filter by rating, movies with very few votes are unreliable
    (e.g., a single 10/10 vote makes average 10.0). We exclude movies with
    fewer than 10 votes to ensure rating quality.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Movies with 10+ votes (should pass)
        create_raw_tmdb_movie(1, "Reliable High Rating", "2022-01-01", 8.0, vote_count=100),
        create_raw_tmdb_movie(2, "Another Reliable", "2022-02-01", 8.5, vote_count=500),
        # Movies with < 10 votes (should be filtered)
        create_raw_tmdb_movie(101, "Noise Entry 1", "2022-04-01", 9.5, vote_count=9),
        create_raw_tmdb_movie(102, "Noise Entry 2", "2022-05-01", 8.0, vote_count=5),
        create_raw_tmdb_movie(103, "Noise Entry 3", "2022-06-01", 9.0, vote_count=1),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+ (universal 10-vote threshold applies)
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only movies with 10+ votes returned (noise entries excluded)
    assert len(result.results) == 2, "Expected 2 movies with 10+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies with < 10 votes should be filtered"
    assert all(m.vote_count is not None and m.vote_count >= 10 for m in result.results)


def test_general_browsing_applies_higher_vote_threshold() -> None:
    """Test that general browsing applies universal 10 vote threshold.

    When no rating filter is specified, general browsing uses the universal
    10 vote threshold to maintain catalog quality by filtering statistical noise
    and low-quality content.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Above general threshold (10 votes) - should pass
        create_raw_tmdb_movie(1, "Above General Threshold", "2022-01-01", 8.0, vote_count=15),
        create_raw_tmdb_movie(2, "Well Above", "2022-02-01", 7.0, vote_count=100),
        # Below general threshold (10 votes) - should be filtered
        create_raw_tmdb_movie(101, "Below General", "2022-03-01", 8.5, vote_count=9),
        create_raw_tmdb_movie(102, "Very Low", "2022-04-01", 7.5, vote_count=5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without rating filter (uses 10 vote general threshold)
    result = service.discover_movies(page=1)

    # Assert: Only movies with 10+ votes returned (general threshold applied)
    assert len(result.results) == 2, "Expected 2 movies with 10+ votes"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies with < 10 votes should be filtered"


def test_vote_count_filter_excludes_movies_without_vote_count() -> None:
    """Test that movies missing vote_count field are excluded when rating filter applied."""
    # Arrange: Mock client returns movies with missing vote_count
    mock_client = Mock(spec=['get'])

    movie_with_votes: TMDBMovieBaseRawDict = {
        'id': 1, 'title': "Has Vote Count", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 100,
        'genre_ids': [18, 28]  # Drama, Action
    }
    movie_without_votes: TMDBMovieBaseRawDict = {
        'id': 2, 'title': "No Vote Count", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 8.5,
        'genre_ids': [12, 35]  # Adventure, Comedy
        # vote_count field missing (TMDB data quality issue)
    }

    tmdb_movies: list[TMDBMovieBaseRawDict] = [movie_with_votes, movie_without_votes]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only movie with vote_count field returned
    assert len(result.results) == 1
    assert result.results[0].vote_count == 100


# ============================================================================
# Combined Filtering Tests (Year + Rating)
# ============================================================================


def test_combined_year_and_rating_filtering() -> None:
    """Test that year and rating filters work together correctly."""
    # Arrange: Mock client returns movies with various year/rating combinations
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Correct year AND rating - should be kept
        create_raw_tmdb_movie(1, "Good 2022 A", "2022-01-01", 8.0),
        create_raw_tmdb_movie(2, "Good 2022 B", "2022-06-15", 7.5),
        create_raw_tmdb_movie(3, "Good 2022 C", "2022-12-31", 8.5),
        # Correct year, wrong rating
        create_raw_tmdb_movie(101, "2022 Low Rating", "2022-01-01", 6.0),
        # Wrong year, correct rating
        create_raw_tmdb_movie(102, "2021 High Rating", "2021-01-01", 8.0),
        # Wrong year AND rating
        create_raw_tmdb_movie(103, "2019 Low Rating", "2019-01-01", 5.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 2022 movies rated 7.5+
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=7.5
    )

    # Assert: Only movies matching both criteria returned
    assert len(result.results) == 3
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


# ============================================================================
# Buffer Mechanism Tests
# ============================================================================


def test_buffer_mechanism_fetches_page_n_plus_1_when_under_threshold() -> None:
    """Test that service fetches page N+1 when filtered results fall below 20.

    Buffer threshold logic:
    - If filtered_count >= 20: Return first 20 (full page achieved)
    - If 10 <= filtered_count < 20: Fetch page N+1 to backfill
    - If filtered_count < 10: Return what we have (filter too restrictive)
    """
    # Arrange: Page 1 has 12 valid movies after filtering (needs buffer)
    mock_client = Mock(spec=['get'])

    # Page 1: 20 movies, but only 12 match filters
    page_1_movies = [
        # 12 movies matching 2022 + 7.5+ rating
        create_raw_tmdb_movie(1, "Good A", "2022-01-01", 8.0),
        create_raw_tmdb_movie(2, "Good B", "2022-01-01", 7.5),
        create_raw_tmdb_movie(3, "Good C", "2022-01-01", 8.2),
        create_raw_tmdb_movie(4, "Good D", "2022-01-01", 7.8),
        create_raw_tmdb_movie(5, "Good E", "2022-01-01", 8.5),
        create_raw_tmdb_movie(6, "Good F", "2022-01-01", 7.9),
        create_raw_tmdb_movie(7, "Good G", "2022-01-01", 8.1),
        create_raw_tmdb_movie(8, "Good H", "2022-01-01", 7.6),
        create_raw_tmdb_movie(9, "Good I", "2022-01-01", 8.3),
        create_raw_tmdb_movie(10, "Good J", "2022-01-01", 7.7),
        create_raw_tmdb_movie(11, "Good K", "2022-01-01", 8.0),
        create_raw_tmdb_movie(12, "Good L", "2022-01-01", 7.5),
        # 8 movies filtered out (wrong year or rating)
        create_raw_tmdb_movie(101, "Wrong Year", "2021-01-01", 8.0),
        create_raw_tmdb_movie(102, "Wrong Rating", "2022-01-01", 6.0),
        create_raw_tmdb_movie(103, "Wrong Year 2", "2019-01-01", 7.5),
        create_raw_tmdb_movie(104, "Wrong Rating 2", "2022-01-01", 5.5),
        create_raw_tmdb_movie(105, "Wrong Year 3", "2023-01-01", 8.0),
        create_raw_tmdb_movie(106, "Wrong Rating 3", "2022-01-01", 7.0),
        create_raw_tmdb_movie(107, "Wrong Year 4", "2020-01-01", 7.5),
        create_raw_tmdb_movie(108, "Wrong Rating 4", "2022-01-01", 6.5),
    ]

    # Page 2: 20 movies, 10 match filters (buffer page)
    page_2_movies = [
        # 10 movies matching filters (for buffer)
        create_raw_tmdb_movie(21, "Buffer A", "2022-01-01", 8.0),
        create_raw_tmdb_movie(22, "Buffer B", "2022-01-01", 7.5),
        create_raw_tmdb_movie(23, "Buffer C", "2022-01-01", 8.2),
        create_raw_tmdb_movie(24, "Buffer D", "2022-01-01", 7.8),
        create_raw_tmdb_movie(25, "Buffer E", "2022-01-01", 8.5),
        create_raw_tmdb_movie(26, "Buffer F", "2022-01-01", 7.9),
        create_raw_tmdb_movie(27, "Buffer G", "2022-01-01", 8.1),
        create_raw_tmdb_movie(28, "Buffer H", "2022-01-01", 7.6),
        # 10 movies filtered out
        *[create_raw_tmdb_movie(200 + i, f"Buffer Wrong {i}", "2021-01-01", 6.0)
          for i in range(10)],
    ]

    page_1_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_1_movies, page=1, total_pages=10)
    )
    page_2_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_2_movies, page=2, total_pages=10)
    )

    # Mock client returns page 1 on first call, page 2 on second call
    mock_client.get.side_effect = [page_1_response, page_2_response]

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=7.5
    )

    # Assert: Service fetched page 2 as buffer
    assert mock_client.get.call_count == 2

    # Assert: Result contains 20 movies (12 from page 1 + 8 from page 2)
    assert len(result.results) == 20

    # Verify all returned movies match filters
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


def test_buffer_mechanism_does_not_fetch_when_full_page_achieved() -> None:
    """Test that service does NOT fetch page N+1 when filtered results >= 20."""
    # Arrange: Page 1 has exactly 20 valid movies after filtering
    mock_client = Mock(spec=['get'])

    # Page 1: 20 movies, all 20 match filters (full page)
    page_1_movies = [
        create_raw_tmdb_movie(i, f"Good Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 21)
    ]

    page_1_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_1_movies, page=1, total_pages=10)
    )
    mock_client.get.return_value = page_1_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=7.5
    )

    # Assert: Service only fetched page 1 (no buffer needed)
    assert mock_client.get.call_count == 1

    # Assert: Result contains exactly 20 movies
    assert len(result.results) == 20


def test_buffer_mechanism_fills_page_even_with_few_initial_results() -> None:
    """Test that service keeps fetching pages to fill to 20 even with restrictive filters.

    With smart buffering, if page 1 only yields 8 movies after filtering but more
    pages are available, we should fetch additional pages to reach 20 results.
    This ensures consistent page sizes even with restrictive filters.
    """
    # Arrange: Page 1 has only 8 valid movies, page 2 has 12 more
    mock_client = Mock(spec=['get'])

    # Page 1: 20 movies, but only 8 match very restrictive filters
    page_1_movies = [
        # 8 movies matching filters
        create_raw_tmdb_movie(1, "Good A", "2022-01-01", 9.0),
        create_raw_tmdb_movie(2, "Good B", "2022-01-01", 8.9),
        create_raw_tmdb_movie(3, "Good C", "2022-01-01", 8.8),
        create_raw_tmdb_movie(4, "Good D", "2022-01-01", 8.7),
        create_raw_tmdb_movie(5, "Good E", "2022-01-01", 8.6),
        create_raw_tmdb_movie(6, "Good F", "2022-01-01", 8.5),
        create_raw_tmdb_movie(7, "Good G", "2022-01-01", 9.1),
        create_raw_tmdb_movie(8, "Good H", "2022-01-01", 9.2),
        # 12 movies filtered out
        *[create_raw_tmdb_movie(100 + i, f"Wrong {i}", "2022-01-01", 7.0)
          for i in range(12)],
    ]

    # Page 2: 12 more matching movies
    page_2_movies = [
        *[create_raw_tmdb_movie(20 + i, f"Good {chr(73 + i)}", "2022-01-01", 8.5 + i * 0.1)
          for i in range(12)],
        # 8 movies filtered out
        *[create_raw_tmdb_movie(200 + i, f"Wrong {i}", "2022-01-01", 7.0)
          for i in range(8)],
    ]

    def mock_get_side_effect(*args: object, **kwargs: object) -> ApiResponse:
        params: dict[str, object] = args[1] if len(args) > 1 else kwargs.get('params', {})  # type: ignore[assignment]
        page_num = params.get('page', 1)

        if page_num == 1:
            return ApiResponse(
                status_code=200,
                data=create_paginated_tmdb_response(page_1_movies, page=1, total_pages=10)
            )
        elif page_num == 2:
            return ApiResponse(
                status_code=200,
                data=create_paginated_tmdb_response(page_2_movies, page=2, total_pages=10)
            )
        else:
            # Fallback for unexpected page numbers
            return ApiResponse(
                status_code=200,
                data=create_paginated_tmdb_response([], page=page_num, total_pages=10)  # type: ignore[arg-type]
            )

    mock_client.get.side_effect = mock_get_side_effect
    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with restrictive filters (rating 8.5+)
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=8.5
    )

    # Assert: Service fetched pages 1 and 2 to fill to 20
    assert mock_client.get.call_count == 2

    # Assert: Result contains exactly 20 movies (full page achieved)
    assert len(result.results) == 20


def test_buffer_mechanism_does_not_fetch_on_last_page() -> None:
    """Test that service does NOT fetch page N+1 when on last page.

    If we're on page 10 of 10, there is no page 11 to fetch for buffer.
    """
    # Arrange: Page 10 (last page) has 15 movies after filtering
    mock_client = Mock(spec=['get'])

    page_10_movies = [
        create_raw_tmdb_movie(i, f"Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 16)
    ]

    page_10_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_10_movies, page=10, total_pages=10)
    )
    mock_client.get.return_value = page_10_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 10 (last page)
    result = service.discover_movies(page=10, year_min=2022, year_max=2022)

    # Assert: Service only fetched page 10 (no page 11 exists)
    assert mock_client.get.call_count == 1

    # Assert: Result contains 15 movies (partial page, no buffer available)
    assert len(result.results) == 15


def test_buffer_movies_also_pass_filters_no_leakage() -> None:
    """Test that buffer movies MUST also pass filters (prevent leakage).

    Critical: If we fetch page 2 for buffer, we must apply the SAME filters
    to page 2 movies. Otherwise, incorrect movies "leak" into results.
    """
    # Arrange: Page 1 has 15 valid movies, page 2 has mix of valid/invalid
    mock_client = Mock(spec=['get'])

    page_1_movies = [
        create_raw_tmdb_movie(i, f"Page1 Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 16)
    ]

    # Page 2 buffer: 10 valid + 10 invalid movies
    page_2_movies = [
        # 10 valid movies (should be used for buffer)
        *[create_raw_tmdb_movie(20 + i, f"Valid Buffer {i}", "2022-01-01", 7.5 + (i * 0.1))
          for i in range(1, 11)],
        # 10 invalid movies (should NOT leak into results)
        *[create_raw_tmdb_movie(100 + i, f"Invalid Buffer {i}", "2019-01-01", 6.0)
          for i in range(1, 11)],
    ]

    page_1_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_1_movies, page=1, total_pages=10)
    )
    page_2_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(page_2_movies, page=2, total_pages=10)
    )

    mock_client.get.side_effect = [page_1_response, page_2_response]

    service = MovieService(tmdb_client=mock_client)

    # Act: Request page 1 with filters
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=7.5
    )

    # Assert: Result contains 20 movies (15 from page 1 + 5 from page 2)
    assert len(result.results) == 20

    # Critical: ALL movies must match filters (no leakage from buffer)
    invalid_ids = {100 + i for i in range(1, 11)}
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert invalid_ids.isdisjoint(returned_ids), "Invalid buffer movies leaked into results!"

    # Verify all returned movies match filters
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


# ============================================================================
# Different Endpoint Context Tests
# ============================================================================


def test_filtering_applies_to_now_playing_endpoint() -> None:
    """Test that filtering applies to get_now_playing_movies endpoint."""
    # Arrange: Mock client returns now playing movies with mixed data
    mock_client = Mock(spec=['get'])

    # Now playing includes some 2021 movies (extended theatrical runs)
    tmdb_movies = [
        # Current 2024 movies
        create_raw_tmdb_movie(1, "New Release A", "2024-01-01", 7.5),
        create_raw_tmdb_movie(2, "New Release B", "2024-02-01", 8.0),
        create_raw_tmdb_movie(3, "New Release C", "2024-03-01", 7.8),
        # Extended run from 2021 (should be filtered if user wants 2024 only)
        create_raw_tmdb_movie(101, "Extended Run", "2021-01-01", 8.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
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
        create_raw_tmdb_movie(1, "Upcoming A", "2024-06-01", 7.5),
        create_raw_tmdb_movie(2, "Upcoming B", "2024-07-01", 8.0),
        # Movies with placeholder ratings
        create_raw_tmdb_movie(101, "No Rating Yet", "2024-08-01", 0.0),
        create_raw_tmdb_movie(102, "Also No Rating", "2024-09-01", 0.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
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


# ============================================================================
# No Filtering Tests (Ensure Normal Behavior)
# ============================================================================


def test_no_filters_returns_all_results_unchanged() -> None:
    """Test that when no filters applied, all results are returned unchanged."""
    # Arrange: Mock client returns 20 diverse movies
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_raw_tmdb_movie(i, f"Movie {i}", f"{2020 + (i % 5)}-01-01", 5.0 + (i * 0.2))
        for i in range(1, 21)
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=5)
    )
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
        create_raw_tmdb_movie(i, f"Movie {i}", "2022-01-01", 7.0)
        for i in range(1, 21)
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=5)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without filters
    result = service.discover_movies(page=1)

    # Assert: Only one API call (no buffer fetch)
    assert mock_client.get.call_count == 1
    assert len(result.results) == 20


# ============================================================================
# Completeness Filtering Tests
# ============================================================================


def test_filter_movies_excludes_missing_poster() -> None:
    """Test that movies without poster_path are excluded for display quality."""
    # Arrange: Mock movies with and without posters
    movies_with_data = [
        create_raw_tmdb_movie(1, "Has Poster", "2022-01-01", 7.5),
        create_raw_tmdb_movie(2, "Missing Poster", "2022-01-01", 8.0, poster_path=''),
        create_raw_tmdb_movie(3, "Has Poster 2", "2022-01-01", 7.8),
        create_raw_tmdb_movie(4, "Null Poster", "2022-01-01", 8.2, poster_path=''),
    ]

    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(movies_with_data, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with posters returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 3}

    # Verify all returned movies have posters
    for movie in result.results:
        assert movie.poster_path is not None
        assert movie.poster_path != ''


def test_filter_movies_excludes_empty_title() -> None:
    """Test that movies with empty or whitespace-only titles are excluded."""
    # Arrange: Mock movies with various title states
    # Note: We need to override TypedDict validation, so create dicts directly

    tmdb_movies: list[TMDBMovieBaseRawDict] = [
        create_raw_tmdb_movie(1, "Valid Title", "2022-01-01", 7.5),
        {  # Empty title
            'id': 2,
            'title': '',
            'poster_path': '/poster_2.jpg',
            'release_date': '2022-01-01',
            'vote_average': 8.0,
            'vote_count': 100,
            'runtime': None,
        },  # type: ignore
        create_raw_tmdb_movie(3, "Another Valid", "2022-01-01", 7.8),
        {  # Whitespace-only title
            'id': 4,
            'title': '   ',
            'poster_path': '/poster_4.jpg',
            'release_date': '2022-01-01',
            'vote_average': 8.2,
            'vote_count': 100,
            'runtime': None,
        },  # type: ignore
    ]

    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only movies with valid titles returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 3}

    # Verify all returned movies have valid titles
    for movie in result.results:
        assert movie.title is not None
        assert movie.title.strip() != ''


def test_filter_movies_completeness_with_all_valid() -> None:
    """Test that completeness filter doesn't exclude valid movies."""
    # Arrange: All movies have complete data
    movies_with_data = [
        create_raw_tmdb_movie(i, f"Complete Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 21)
    ]

    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(movies_with_data, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: All movies returned (none excluded)
    assert len(result.results) == 20


def test_completeness_filter_applies_with_other_filters() -> None:
    """Test that completeness filter works in combination with year/rating filters."""
    # Arrange: Mix of complete/incomplete movies with year/rating variations
    tmdb_movies: list[TMDBMovieBaseRawDict] = [
        # Complete, matching all filters
        create_raw_tmdb_movie(1, "Perfect Movie", "2022-01-01", 8.0),
        # Missing poster, matches year/rating (should be excluded)
        create_raw_tmdb_movie(2, "No Poster", "2022-01-01", 8.0, poster_path=''),
        # Complete, wrong year (should be excluded)
        create_raw_tmdb_movie(3, "Wrong Year", "2019-01-01", 8.0),
        # Complete, low rating (should be excluded)
        create_raw_tmdb_movie(4, "Low Rating", "2022-01-01", 6.0),
        # Complete, matching all filters
        create_raw_tmdb_movie(5, "Another Perfect", "2022-01-01", 8.5),
        # Empty title, matches year/rating (should be excluded)
        {
            'id': 6,
            'title': '',
            'poster_path': '/poster_6.jpg',
            'release_date': '2022-01-01',
            'vote_average': 8.0,
            'vote_count': 100,
            'runtime': None,
        },  # type: ignore
    ]

    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with year and rating filters
    result = service.discover_movies(
        page=1,
        year_min=2022,
        year_max=2022,
        rating_min=7.5
    )

    # Assert: Only complete movies matching all filters returned
    assert len(result.results) == 2
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 5}

    # Verify all movies have complete data and match filters
    for movie in result.results:
        assert movie.poster_path is not None and movie.poster_path != ''
        assert movie.title is not None and movie.title.strip() != ''
        assert movie.release_date is not None
        assert movie.release_date.year == 2022
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


# ============================================================================
# Historical Validation Tests
# ============================================================================


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
        create_raw_tmdb_movie(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_raw_tmdb_movie(2, "Early Silent Film", "1895-12-28", 6.5),
        create_raw_tmdb_movie(3, "The Great Train Robbery", "1903-01-01", 7.5),
        create_raw_tmdb_movie(4, "Modern Movie", "2022-01-01", 8.0),
        # Invalid movies (before 1888) - TMDB data quality issues
        create_raw_tmdb_movie(101, "Invalid 1887", "1887-01-01", 7.0),
        create_raw_tmdb_movie(102, "Invalid 1800", "1800-01-01", 7.0),
        create_raw_tmdb_movie(103, "Invalid 1500", "1500-01-01", 7.0),
        create_raw_tmdb_movie(104, "Invalid Year 1", "0001-01-01", 7.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
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
        create_raw_tmdb_movie(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_raw_tmdb_movie(2, "Another 1888 Film", "1888-12-31", 6.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
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
        create_raw_tmdb_movie(1, "Valid 1900", "1900-01-01", 7.0),
        create_raw_tmdb_movie(2, "Valid 1910", "1910-01-01", 7.5),
        create_raw_tmdb_movie(3, "Valid 1920", "1920-01-01", 8.0),
        # Invalid pre-cinema dates (should be excluded by historical validation)
        create_raw_tmdb_movie(101, "Invalid 1850", "1850-01-01", 7.0),
        create_raw_tmdb_movie(102, "Invalid 1700", "1700-01-01", 7.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request 1900-1920 range
    result = service.discover_movies(
        page=1,
        year_min=1900,
        year_max=1920
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


# ============================================================================
# Genre Quality Filtering Tests (Phase 3.6)
# ============================================================================


def test_genre_filter_excludes_movies_with_empty_genres() -> None:
    """Test that movies with empty genre_ids are ALWAYS filtered (completeness check).

    TMDB data quality issue: Some movies (especially misclassified or low-quality
    entries) have empty genre lists. Empty genres is a strong signal of data quality
    problems and should be filtered out just like movies with missing posters.

    This is part of the completeness filter that ALWAYS applies (not conditional
    on rating filters).
    """
    # Arrange: Mock client returns movies with and without genres
    mock_client = Mock(spec=['get'])

    # TMDB returns mix of complete movies and incomplete (no genres) entries
    tmdb_movies = [
        # Complete movies WITH genres (should pass)
        create_raw_tmdb_movie(1, "Complete Movie A", "2020-01-01", 7.5, vote_count=100),
        create_raw_tmdb_movie(2, "Complete Movie B", "2021-01-01", 8.0, vote_count=150),
        create_raw_tmdb_movie(3, "Complete Movie C", "2022-01-01", 6.5, vote_count=75),
        # Incomplete entries WITHOUT genres (should be filtered like missing posters)
        create_raw_tmdb_movie(
            101, "No Genres Entry A", "2020-01-01", 7.0, vote_count=100, genre_ids=[]
        ),
        create_raw_tmdb_movie(
            102, "No Genres Entry B", "2021-01-01", 8.5, vote_count=200, genre_ids=[]
        ),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies WITHOUT rating filter (completeness check still applies)
    result = service.discover_movies(page=1)

    # Assert: Only movies with genres returned (incomplete entries excluded)
    # Note: This test will FAIL initially (TDD Red phase) since genre filtering
    # is not implemented yet in completeness filter
    assert len(result.results) == 3, "Expected 3 complete movies with genres"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2, 3}, "Movies without genres should be filtered out"

    # Verify all returned movies have genres
    for movie in result.results:
        assert hasattr(movie, 'genre_ids'), "MovieBaseSchema should have genre_ids field"
        assert isinstance(movie.genre_ids, list), "genre_ids should be a list"
        assert len(movie.genre_ids) > 0, "Movies should have at least one genre"


def test_genre_filter_works_with_completeness_checks() -> None:
    """Test that genre filtering works alongside other completeness checks.

    Genre check is part of completeness filtering (like poster/title checks).
    All completeness filters should work together consistently.
    """
    # Arrange: Mix of complete/incomplete movies with various issues
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Complete movie (has poster, title, genres)
        create_raw_tmdb_movie(1, "Complete Movie", "2022-01-01", 7.5, vote_count=100),
        # Missing poster (should be filtered)
        create_raw_tmdb_movie(2, "No Poster", "2022-01-01", 8.0, vote_count=150, poster_path=''),
        # Missing genres (should be filtered)
        create_raw_tmdb_movie(3, "No Genres", "2022-01-01", 6.5, vote_count=75, genre_ids=[]),
        # Another complete movie
        create_raw_tmdb_movie(4, "Another Complete", "2022-01-01", 7.0, vote_count=200),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies
    result = service.discover_movies(page=1)

    # Assert: Only complete movies returned (both poster and genre checks applied)
    assert len(result.results) == 2, "Expected 2 complete movies"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 4}, "Incomplete movies should be filtered"


def test_combined_genre_and_vote_filters_with_rating_filter() -> None:
    """Test that completeness (genre) and vote count filters both apply with rating filter.

    Phase 3.6 dual quality approach:
    - Genre completeness filter: ALWAYS applies (like poster/title checks)
    - Vote count threshold: Changes from 50 to 5 when rating filter active

    When rating filter is active, both should apply together.
    """
    # Arrange: Mock client returns movies with various genre/vote combinations
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Pass both filters (has genres + 5+ votes)
        create_raw_tmdb_movie(1, "Good Quality A", "2020-01-01", 2.0, vote_count=10),
        create_raw_tmdb_movie(2, "Good Quality B", "2021-01-01", 1.5, vote_count=62),
        # Fail completeness filter (no genres) - filtered by completeness check
        create_raw_tmdb_movie(101, "No Genres", "2020-01-01", 2.5, vote_count=50, genre_ids=[]),
        # Fail vote filter (has genres but < 5 votes) - filtered by vote threshold
        create_raw_tmdb_movie(102, "Low Votes", "2021-01-01", 1.8, vote_count=3),
        # Fail both (no genres + < 5 votes)
        create_raw_tmdb_movie(103, "Fail Both", "2022-01-01", 2.2, vote_count=1, genre_ids=[]),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with rating filter (triggers 5-vote threshold + completeness check)
    result = service.discover_movies(page=1, rating_min=1.0, rating_max=3.5)

    # Assert: Only movies passing BOTH filters returned
    assert len(result.results) == 2, "Expected 2 movies passing both filters"
    returned_ids = {movie.tmdb_id for movie in result.results}
    assert returned_ids == {1, 2}, "Movies failing either filter should be excluded"

    # Verify all returned movies pass both filters
    for movie in result.results:
        assert hasattr(movie, 'genre_ids') and len(movie.genre_ids) > 0
        assert movie.vote_count is not None and movie.vote_count >= 5
