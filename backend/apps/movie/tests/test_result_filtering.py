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
    TMDBMovieBase,
    create_movie_dict,
    create_paginated_tmdb_response,
)

if TYPE_CHECKING:
    pass


# ============================================================================
# Test Fixtures and Helpers
# ============================================================================
# Helpers imported from test_fixtures_tmdb.py:
# - create_movie_dict(): Create mock TMDB movie dictionaries
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
        create_movie_dict(1, "Correct 2020", "2020-01-01", 8.0),
        create_movie_dict(2, "Correct 2021", "2021-01-01", 7.5),
        create_movie_dict(3, "Correct 2022", "2022-01-01", 8.2),
        create_movie_dict(4, "Correct 2023", "2023-01-01", 7.8),
        create_movie_dict(5, "Correct 2024", "2024-01-01", 8.5),
        create_movie_dict(6, "Correct 2025", "2025-01-01", 7.9),
        create_movie_dict(7, "Correct 2026", "2026-01-01", 8.1),
        create_movie_dict(8, "Correct 2027", "2027-01-01", 7.6),
        create_movie_dict(9, "Correct 2028", "2028-01-01", 8.3),
        create_movie_dict(10, "Correct 2029", "2029-01-01", 7.7),
        create_movie_dict(11, "Correct 2020 B", "2020-06-15", 8.0),
        create_movie_dict(12, "Correct 2021 B", "2021-12-25", 7.4),
        create_movie_dict(13, "Correct 2022 B", "2022-03-10", 8.6),
        create_movie_dict(14, "Correct 2023 B", "2023-11-20", 7.9),
        create_movie_dict(15, "Correct 2024 B", "2024-07-04", 8.2),
        # Incorrect years (2010s) - should be filtered out (TMDB data hygiene issue)
        create_movie_dict(101, "Wrong 2015", "2015-01-01", 8.0),
        create_movie_dict(102, "Wrong 2016", "2016-01-01", 7.5),
        create_movie_dict(103, "Wrong 2017", "2017-01-01", 8.2),
        create_movie_dict(104, "Wrong 2018", "2018-01-01", 7.8),
        create_movie_dict(105, "Wrong 2019", "2019-01-01", 8.5),
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
        create_movie_dict(1, "The Batman (2022)", "2022-03-04", 8.0),
        create_movie_dict(2, "Batman: The Long Halloween (2021)", "2021-06-22", 7.5),
        create_movie_dict(3, "Batman: Soul of the Dragon (2021)", "2021-01-12", 7.0),
        create_movie_dict(4, "Batman: The Audio Adventures (2023)", "2023-09-01", 7.8),
        create_movie_dict(5, "Batman: Caped Crusader (2024)", "2024-08-01", 8.2),
        create_movie_dict(6, "Batman: Future State (2025)", "2025-01-15", 7.6),
        create_movie_dict(7, "Batman: New 52 (2026)", "2026-05-20", 7.9),
        # Incorrect years (older Batman movies leaking through)
        create_movie_dict(101, "The Dark Knight (2008)", "2008-07-18", 9.0),
        create_movie_dict(102, "Batman Begins (2005)", "2005-06-15", 8.2),
        create_movie_dict(103, "Batman (1989)", "1989-06-23", 7.5),
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
        create_movie_dict(1, "2022 Movie A", "2022-01-01", 8.0),
        create_movie_dict(2, "2022 Movie B", "2022-06-15", 7.5),
        create_movie_dict(3, "2022 Movie C", "2022-12-31", 8.2),
        # Wrong years
        create_movie_dict(101, "2021 Movie", "2021-01-01", 7.8),
        create_movie_dict(102, "2023 Movie", "2023-01-01", 8.5),
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
    movie_without_date: TMDBMovieBase = {
        'id': 2, 'title': "Movie without date", 'poster_path': '/test.jpg',
        'vote_average': 7.5, 'release_date': None  # TMDB data quality issue
    }
    movie_empty_date: TMDBMovieBase = {
        'id': 3, 'title': "Movie with empty date", 'poster_path': '/test.jpg',
        'vote_average': 8.0, 'release_date': ""  # TMDB data quality issue
    }

    tmdb_movies: list[TMDBMovieBase] = [
        create_movie_dict(1, "Movie with date", "2022-01-01", 8.0),
        movie_without_date,
        movie_empty_date,
        create_movie_dict(4, "Another with date", "2022-06-15", 7.8),
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
        create_movie_dict(1, "Good Movie A", "2022-01-01", 8.0),
        create_movie_dict(2, "Good Movie B", "2022-01-01", 7.5),
        create_movie_dict(3, "Good Movie C", "2022-01-01", 8.2),
        create_movie_dict(4, "Good Movie D", "2022-01-01", 7.8),
        create_movie_dict(5, "Good Movie E", "2022-01-01", 8.5),
        create_movie_dict(6, "Good Movie F", "2022-01-01", 7.9),
        create_movie_dict(7, "Good Movie G", "2022-01-01", 8.1),
        create_movie_dict(8, "Good Movie H", "2022-01-01", 7.6),
        create_movie_dict(9, "Good Movie I", "2022-01-01", 8.3),
        create_movie_dict(10, "Good Movie J", "2022-01-01", 7.7),
        create_movie_dict(11, "Good Movie K", "2022-01-01", 9.0),
        create_movie_dict(12, "Good Movie L", "2022-01-01", 7.5),
        create_movie_dict(13, "Good Movie M", "2022-01-01", 8.6),
        create_movie_dict(14, "Good Movie N", "2022-01-01", 7.9),
        create_movie_dict(15, "Good Movie O", "2022-01-01", 8.2),
        # Incorrect ratings (placeholder 0.0) - should be filtered out
        create_movie_dict(101, "Placeholder Rating A", "2022-01-01", 0.0),
        create_movie_dict(102, "Placeholder Rating B", "2022-01-01", 0.0),
        create_movie_dict(103, "Low Rating A", "2022-01-01", 6.0),
        create_movie_dict(104, "Low Rating B", "2022-01-01", 5.5),
        create_movie_dict(105, "Low Rating C", "2022-01-01", 7.0),
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
        create_movie_dict(1, "In Range A", "2022-01-01", 7.0),
        create_movie_dict(2, "In Range B", "2022-01-01", 7.5),
        create_movie_dict(3, "In Range C", "2022-01-01", 8.0),
        create_movie_dict(4, "In Range D", "2022-01-01", 7.2),
        create_movie_dict(5, "In Range E", "2022-01-01", 7.8),
        # Out of range - should be filtered out
        create_movie_dict(101, "Too Low A", "2022-01-01", 6.9),
        create_movie_dict(102, "Too Low B", "2022-01-01", 5.0),
        create_movie_dict(103, "Too High A", "2022-01-01", 8.1),
        create_movie_dict(104, "Too High B", "2022-01-01", 9.0),
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
    movie_without_rating: TMDBMovieBase = {
        'id': 2, 'title': "Movie without rating", 'poster_path': '/test.jpg',
        'release_date': "2022-01-01", 'vote_average': None  # TMDB data quality issue
    }

    tmdb_movies: list[TMDBMovieBase] = [
        create_movie_dict(1, "Movie with rating", "2022-01-01", 8.0),
        movie_without_rating,
        create_movie_dict(3, "Another with rating", "2022-01-01", 7.5),
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

    When users filter by rating, movies with very few votes are unreliable
    (e.g., a single 10/10 vote makes average 10.0). We exclude movies with
    fewer than min_vote_count votes to ensure rating quality.
    """
    # Arrange: Mock client returns mix of high-vote and low-vote movies
    mock_client = Mock(spec=['get'])

    # Create test movies using existing fixture helper
    high_vote_movie_1: TMDBMovieBase = {
        'id': 1, 'title': "Reliable High Rating", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 100
    }
    high_vote_movie_2: TMDBMovieBase = {
        'id': 2, 'title': "Another Reliable", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 8.5, 'vote_count': 500
    }
    low_vote_movie: TMDBMovieBase = {
        'id': 3, 'title': "Unreliable Rating", 'poster_path': '/poster3.jpg',
        'release_date': "2022-03-01", 'vote_average': 9.0,
        'vote_count': 5  # High rating but only 5 votes!
    }

    tmdb_movies: list[TMDBMovieBase] = [
        high_vote_movie_1,
        high_vote_movie_2,
        low_vote_movie,
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request movies rated 7.5+ (triggers vote count filtering)
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only high vote count movies returned (low vote movie excluded)
    assert len(result.results) == 2
    assert all(m.vote_count is not None and m.vote_count >= 50 for m in result.results)


def test_vote_count_filter_not_applied_without_rating_filter() -> None:
    """Test that vote count filtering is NOT applied when no rating filter specified.

    Vote count quality check only applies when user explicitly filters by rating.
    When browsing without rating filters, all movies should be shown regardless
    of vote count.
    """
    # Arrange: Mock client returns movies with various vote counts
    mock_client = Mock(spec=['get'])

    low_vote_movie: TMDBMovieBase = {
        'id': 1, 'title': "Low Vote Movie", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 5
    }
    high_vote_movie: TMDBMovieBase = {
        'id': 2, 'title': "High Vote Movie", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 7.0, 'vote_count': 100
    }

    tmdb_movies: list[TMDBMovieBase] = [low_vote_movie, high_vote_movie]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request without rating filter
    result = service.discover_movies(page=1)

    # Assert: ALL movies returned (vote count check not applied)
    assert len(result.results) == 2


def test_vote_count_filter_excludes_movies_without_vote_count() -> None:
    """Test that movies missing vote_count field are excluded when rating filter applied."""
    # Arrange: Mock client returns movies with missing vote_count
    mock_client = Mock(spec=['get'])

    movie_with_votes: TMDBMovieBase = {
        'id': 1, 'title': "Has Vote Count", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 100
    }
    movie_without_votes: TMDBMovieBase = {
        'id': 2, 'title': "No Vote Count", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 8.5
        # vote_count field missing (TMDB data quality issue)
    }

    tmdb_movies: list[TMDBMovieBase] = [movie_with_votes, movie_without_votes]

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


def test_custom_min_vote_count_threshold_respected() -> None:
    """Test that custom min_vote_count threshold is respected in filtering."""
    # Arrange: Mock client returns movies with vote counts around threshold
    mock_client = Mock(spec=['get'])

    movie_above_threshold: TMDBMovieBase = {
        'id': 1, 'title': "Above Threshold", 'poster_path': '/poster1.jpg',
        'release_date': "2022-01-01", 'vote_average': 8.0, 'vote_count': 30
    }
    movie_at_threshold: TMDBMovieBase = {
        'id': 2, 'title': "At Threshold", 'poster_path': '/poster2.jpg',
        'release_date': "2022-02-01", 'vote_average': 8.5, 'vote_count': 25
    }
    movie_below_threshold: TMDBMovieBase = {
        'id': 3, 'title': "Below Threshold", 'poster_path': '/poster3.jpg',
        'release_date': "2022-03-01", 'vote_average': 9.0, 'vote_count': 20
    }

    tmdb_movies: list[TMDBMovieBase] = [
        movie_above_threshold,
        movie_at_threshold,
        movie_below_threshold
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request with rating filter (uses custom threshold of 25 from settings)
    # Note: This test will need settings update - we'll use default 50 for now
    result = service.discover_movies(page=1, rating_min=7.5)

    # Assert: Only movies with vote_count >= 50 returned (using default threshold)
    # After implementing custom threshold, we'll test with min_vote_count=25
    assert len(result.results) == 0  # All below default threshold of 50


# ============================================================================
# Combined Filtering Tests (Year + Rating)
# ============================================================================


def test_combined_year_and_rating_filtering() -> None:
    """Test that year and rating filters work together correctly."""
    # Arrange: Mock client returns movies with various year/rating combinations
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        # Correct year AND rating - should be kept
        create_movie_dict(1, "Good 2022 A", "2022-01-01", 8.0),
        create_movie_dict(2, "Good 2022 B", "2022-06-15", 7.5),
        create_movie_dict(3, "Good 2022 C", "2022-12-31", 8.5),
        # Correct year, wrong rating
        create_movie_dict(101, "2022 Low Rating", "2022-01-01", 6.0),
        # Wrong year, correct rating
        create_movie_dict(102, "2021 High Rating", "2021-01-01", 8.0),
        # Wrong year AND rating
        create_movie_dict(103, "2019 Low Rating", "2019-01-01", 5.0),
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
        create_movie_dict(1, "Good A", "2022-01-01", 8.0),
        create_movie_dict(2, "Good B", "2022-01-01", 7.5),
        create_movie_dict(3, "Good C", "2022-01-01", 8.2),
        create_movie_dict(4, "Good D", "2022-01-01", 7.8),
        create_movie_dict(5, "Good E", "2022-01-01", 8.5),
        create_movie_dict(6, "Good F", "2022-01-01", 7.9),
        create_movie_dict(7, "Good G", "2022-01-01", 8.1),
        create_movie_dict(8, "Good H", "2022-01-01", 7.6),
        create_movie_dict(9, "Good I", "2022-01-01", 8.3),
        create_movie_dict(10, "Good J", "2022-01-01", 7.7),
        create_movie_dict(11, "Good K", "2022-01-01", 8.0),
        create_movie_dict(12, "Good L", "2022-01-01", 7.5),
        # 8 movies filtered out (wrong year or rating)
        create_movie_dict(101, "Wrong Year", "2021-01-01", 8.0),
        create_movie_dict(102, "Wrong Rating", "2022-01-01", 6.0),
        create_movie_dict(103, "Wrong Year 2", "2019-01-01", 7.5),
        create_movie_dict(104, "Wrong Rating 2", "2022-01-01", 5.5),
        create_movie_dict(105, "Wrong Year 3", "2023-01-01", 8.0),
        create_movie_dict(106, "Wrong Rating 3", "2022-01-01", 7.0),
        create_movie_dict(107, "Wrong Year 4", "2020-01-01", 7.5),
        create_movie_dict(108, "Wrong Rating 4", "2022-01-01", 6.5),
    ]

    # Page 2: 20 movies, 10 match filters (buffer page)
    page_2_movies = [
        # 10 movies matching filters (for buffer)
        create_movie_dict(21, "Buffer A", "2022-01-01", 8.0),
        create_movie_dict(22, "Buffer B", "2022-01-01", 7.5),
        create_movie_dict(23, "Buffer C", "2022-01-01", 8.2),
        create_movie_dict(24, "Buffer D", "2022-01-01", 7.8),
        create_movie_dict(25, "Buffer E", "2022-01-01", 8.5),
        create_movie_dict(26, "Buffer F", "2022-01-01", 7.9),
        create_movie_dict(27, "Buffer G", "2022-01-01", 8.1),
        create_movie_dict(28, "Buffer H", "2022-01-01", 7.6),
        # 10 movies filtered out
        *[create_movie_dict(200 + i, f"Buffer Wrong {i}", "2021-01-01", 6.0)
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
        create_movie_dict(i, f"Good Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
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
        create_movie_dict(1, "Good A", "2022-01-01", 9.0),
        create_movie_dict(2, "Good B", "2022-01-01", 8.9),
        create_movie_dict(3, "Good C", "2022-01-01", 8.8),
        create_movie_dict(4, "Good D", "2022-01-01", 8.7),
        create_movie_dict(5, "Good E", "2022-01-01", 8.6),
        create_movie_dict(6, "Good F", "2022-01-01", 8.5),
        create_movie_dict(7, "Good G", "2022-01-01", 9.1),
        create_movie_dict(8, "Good H", "2022-01-01", 9.2),
        # 12 movies filtered out
        *[create_movie_dict(100 + i, f"Wrong {i}", "2022-01-01", 7.0)
          for i in range(12)],
    ]

    # Page 2: 12 more matching movies
    page_2_movies = [
        *[create_movie_dict(20 + i, f"Good {chr(73 + i)}", "2022-01-01", 8.5 + i * 0.1)
          for i in range(12)],
        # 8 movies filtered out
        *[create_movie_dict(200 + i, f"Wrong {i}", "2022-01-01", 7.0)
          for i in range(8)],
    ]

    def mock_get_side_effect(*args, **kwargs):
        params = args[1] if len(args) > 1 else kwargs.get('params', {})
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
        create_movie_dict(i, f"Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
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
        create_movie_dict(i, f"Page1 Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
        for i in range(1, 16)
    ]

    # Page 2 buffer: 10 valid + 10 invalid movies
    page_2_movies = [
        # 10 valid movies (should be used for buffer)
        *[create_movie_dict(20 + i, f"Valid Buffer {i}", "2022-01-01", 7.5 + (i * 0.1))
          for i in range(1, 11)],
        # 10 invalid movies (should NOT leak into results)
        *[create_movie_dict(100 + i, f"Invalid Buffer {i}", "2019-01-01", 6.0)
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
    mock_client = Mock(spec=['get', 'get_now_playing_movies'])

    # Now playing includes some 2021 movies (extended theatrical runs)
    tmdb_movies = [
        # Current 2024 movies
        create_movie_dict(1, "New Release A", "2024-01-01", 7.5),
        create_movie_dict(2, "New Release B", "2024-02-01", 8.0),
        create_movie_dict(3, "New Release C", "2024-03-01", 7.8),
        # Extended run from 2021 (should be filtered if user wants 2024 only)
        create_movie_dict(101, "Extended Run", "2021-01-01", 8.5),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get_now_playing_movies.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request now playing, filtered to 2024 only
    result = service.get_now_playing_movies(page=1, year_min=2024, year_max=2024)

    # Assert: Only 2024 movies returned
    assert len(result.results) == 3
    for movie in result.results:
        assert movie.release_date is not None
        assert movie.release_date.year == 2024


def test_filtering_applies_to_upcoming_endpoint() -> None:
    """Test that filtering applies to get_upcoming_movies endpoint."""
    # Arrange: Mock client returns upcoming movies with mixed ratings
    mock_client = Mock(spec=['get'])

    # Upcoming movies often have placeholder 0.0 ratings
    tmdb_movies = [
        # Movies with ratings
        create_movie_dict(1, "Upcoming A", "2024-06-01", 7.5),
        create_movie_dict(2, "Upcoming B", "2024-07-01", 8.0),
        # Movies with placeholder ratings
        create_movie_dict(101, "No Rating Yet", "2024-08-01", 0.0),
        create_movie_dict(102, "Also No Rating", "2024-09-01", 0.0),
    ]

    mock_response = ApiResponse(
        status_code=200,
        data=create_paginated_tmdb_response(tmdb_movies, page=1, total_pages=1)
    )
    mock_client.get.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Request upcoming movies, filtered by rating 7.5+
    result = service.get_upcoming_movies(page=1, rating_min=7.5)

    # Assert: Only movies with ratings >= 7.5 returned
    assert len(result.results) == 2
    for movie in result.results:
        assert movie.vote_average is not None
        assert movie.vote_average >= 7.5


# ============================================================================
# No Filtering Tests (Ensure Normal Behavior)
# ============================================================================


def test_no_filters_returns_all_results_unchanged() -> None:
    """Test that when no filters applied, all results are returned unchanged."""
    # Arrange: Mock client returns 20 diverse movies
    mock_client = Mock(spec=['get'])

    tmdb_movies = [
        create_movie_dict(i, f"Movie {i}", f"{2020 + (i % 5)}-01-01", 5.0 + (i * 0.2))
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
        create_movie_dict(i, f"Movie {i}", "2022-01-01", 7.0)
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
        create_movie_dict(1, "Has Poster", "2022-01-01", 7.5),
        create_movie_dict(2, "Missing Poster", "2022-01-01", 8.0, poster_path=''),
        create_movie_dict(3, "Has Poster 2", "2022-01-01", 7.8),
        create_movie_dict(4, "Null Poster", "2022-01-01", 8.2, poster_path=''),
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

    tmdb_movies: list[TMDBMovieBase] = [
        create_movie_dict(1, "Valid Title", "2022-01-01", 7.5),
        {  # Empty title
            'id': 2,
            'title': '',
            'poster_path': '/poster_2.jpg',
            'release_date': '2022-01-01',
            'vote_average': 8.0,
            'vote_count': 100,
            'runtime': None,
        },  # type: ignore
        create_movie_dict(3, "Another Valid", "2022-01-01", 7.8),
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
        create_movie_dict(i, f"Complete Movie {i}", "2022-01-01", 7.5 + (i * 0.1))
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
    tmdb_movies: list[TMDBMovieBase] = [
        # Complete, matching all filters
        create_movie_dict(1, "Perfect Movie", "2022-01-01", 8.0),
        # Missing poster, matches year/rating (should be excluded)
        create_movie_dict(2, "No Poster", "2022-01-01", 8.0, poster_path=''),
        # Complete, wrong year (should be excluded)
        create_movie_dict(3, "Wrong Year", "2019-01-01", 8.0),
        # Complete, low rating (should be excluded)
        create_movie_dict(4, "Low Rating", "2022-01-01", 6.0),
        # Complete, matching all filters
        create_movie_dict(5, "Another Perfect", "2022-01-01", 8.5),
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
        create_movie_dict(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_movie_dict(2, "Early Silent Film", "1895-12-28", 6.5),
        create_movie_dict(3, "The Great Train Robbery", "1903-01-01", 7.5),
        create_movie_dict(4, "Modern Movie", "2022-01-01", 8.0),
        # Invalid movies (before 1888) - TMDB data quality issues
        create_movie_dict(101, "Invalid 1887", "1887-01-01", 7.0),
        create_movie_dict(102, "Invalid 1800", "1800-01-01", 7.0),
        create_movie_dict(103, "Invalid 1500", "1500-01-01", 7.0),
        create_movie_dict(104, "Invalid Year 1", "0001-01-01", 7.0),
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
        create_movie_dict(1, "Roundhay Garden Scene", "1888-10-14", 7.0),
        create_movie_dict(2, "Another 1888 Film", "1888-12-31", 6.5),
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
        create_movie_dict(1, "Valid 1900", "1900-01-01", 7.0),
        create_movie_dict(2, "Valid 1910", "1910-01-01", 7.5),
        create_movie_dict(3, "Valid 1920", "1920-01-01", 8.0),
        # Invalid pre-cinema dates (should be excluded by historical validation)
        create_movie_dict(101, "Invalid 1850", "1850-01-01", 7.0),
        create_movie_dict(102, "Invalid 1700", "1700-01-01", 7.0),
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
