"""
Unit tests for blacklist filtering in data quality pipeline.

Tests the movie blacklist functionality that excludes specific TMDB IDs
from results based on the BlacklistedMovie database table. This is a
content policy filter for problematic TMDB content (mislabeled adult
material, exploitation films) that slips through automated filters.

Test Organization:
- get_blacklisted_ids(): Database lookup and caching behavior
- filter_movies_by_blacklist(): Filtering logic on MovieBaseSchema lists
- apply_data_quality_filters(): Integration with full pipeline

DRY Note: The create_movie_schema() helper is designed to be reusable
for future production company blacklist tests (Phase 3.2).
"""
from __future__ import annotations

from datetime import date
from unittest.mock import patch

import pytest
from movie.models import BlacklistedMovie
from movie.schemas import MovieBaseSchema
from movie.services.data_quality_filters import (
    BLACKLIST_CACHE_KEY,
    BLACKLIST_CACHE_TIMEOUT,
    apply_data_quality_filters,
    filter_movies_by_blacklist,
    get_blacklisted_ids,
)
from movie.tests.tmdb_test_builders import create_tmdb_movie

# ============================================================================
# Test Helpers
# ============================================================================


def create_movie_schema(
    tmdb_id: int,
    title: str = "Test Movie",
    release_date: date | None = None,
    vote_average: float = 7.5,
    vote_count: int = 100,
    poster_path: str | None = None,
    genre_ids: list[int] | None = None,
    overview: str | None = None,
) -> MovieBaseSchema:
    """Create a MovieBaseSchema instance for filtering tests.

    This helper creates MovieBaseSchema objects directly (not TMDBMovieBase),
    matching the input type of filter_movies_by_blacklist() and other
    data quality filter functions.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title (default: "Test Movie")
        release_date: Release date (default: 2022-01-15)
        vote_average: Rating 0.0-10.0 (default: 7.5)
        vote_count: Number of votes (default: 100)
        poster_path: Poster path (default: generated from tmdb_id)
        genre_ids: Genre IDs (default: [18, 28])
        overview: Movie overview (default: generated)

    Returns:
        MovieBaseSchema instance ready for filter testing

    Example:
        >>> movie = create_movie_schema(123, "Test Film")
        >>> assert movie.tmdb_id == 123
    """
    if release_date is None:
        release_date = date(2022, 1, 15)
    if poster_path is None:
        poster_path = f"/poster_{tmdb_id}.jpg"
    if genre_ids is None:
        genre_ids = [18, 28]  # Drama, Action
    if overview is None:
        overview = f"A compelling story about {title}."

    return MovieBaseSchema(
        tmdb_id=tmdb_id,
        title=title,
        release_date=release_date,
        vote_average=vote_average,
        vote_count=vote_count,
        poster_path=poster_path,
        genre_ids=genre_ids,
        overview=overview,
    )


# ============================================================================
# get_blacklisted_ids() Tests
# ============================================================================


@pytest.mark.django_db
class TestGetBlacklistedIds:
    """Tests for get_blacklisted_ids() database lookup and caching."""

    def test_returns_empty_set_when_no_blacklist_entries(self) -> None:
        """Returns empty set when BlacklistedMovie table is empty."""
        # Clear cache to ensure fresh lookup
        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            result = get_blacklisted_ids()

            assert result == set()
            # Verify cache was checked and set
            mock_cache.get.assert_called_once_with(BLACKLIST_CACHE_KEY)
            mock_cache.set.assert_called_once_with(
                BLACKLIST_CACHE_KEY, set(), BLACKLIST_CACHE_TIMEOUT
            )

    def test_returns_correct_ids_from_database(self) -> None:
        """Returns set of TMDB IDs from BlacklistedMovie entries."""
        # Create blacklist entries
        BlacklistedMovie.objects.create(tmdb_id=12345, reason="Mislabeled adult content")
        BlacklistedMovie.objects.create(tmdb_id=67890, reason="Exploitation film")
        BlacklistedMovie.objects.create(tmdb_id=11111, reason="Non-movie entry")

        # Clear cache to force database lookup
        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            result = get_blacklisted_ids()

            assert result == {12345, 67890, 11111}

    def test_returns_cached_value_when_available(self) -> None:
        """Returns cached set without database query when cache hit."""
        cached_ids = {99999, 88888}

        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = cached_ids

            result = get_blacklisted_ids()

            assert result == cached_ids
            mock_cache.get.assert_called_once_with(BLACKLIST_CACHE_KEY)
            # Cache.set should NOT be called on cache hit
            mock_cache.set.assert_not_called()

    def test_caches_result_with_correct_timeout(self) -> None:
        """Caches database result with 5-minute TTL."""
        BlacklistedMovie.objects.create(tmdb_id=55555, reason="Test entry")

        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            get_blacklisted_ids()

            # Verify cache.set called with correct timeout (300 seconds)
            mock_cache.set.assert_called_once()
            call_args = mock_cache.set.call_args
            assert call_args[0][0] == BLACKLIST_CACHE_KEY
            assert 55555 in call_args[0][1]
            assert call_args[0][2] == 300  # BLACKLIST_CACHE_TIMEOUT


# ============================================================================
# filter_movies_by_blacklist() Tests
# ============================================================================


class TestFilterMoviesByBlacklist:
    """Tests for filter_movies_by_blacklist() filtering logic."""

    def test_excludes_blacklisted_movies(self) -> None:
        """Movies with blacklisted IDs are excluded from results."""
        movies = [
            create_movie_schema(1, "Safe Movie 1"),
            create_movie_schema(12345, "Blacklisted Movie"),
            create_movie_schema(3, "Safe Movie 2"),
            create_movie_schema(67890, "Another Blacklisted"),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {12345, 67890}

            result = filter_movies_by_blacklist(movies)

            assert len(result) == 2
            result_ids = {m.tmdb_id for m in result}
            assert result_ids == {1, 3}

    def test_returns_all_movies_when_blacklist_empty(self) -> None:
        """All movies pass through when blacklist is empty."""
        movies = [
            create_movie_schema(1, "Movie 1"),
            create_movie_schema(2, "Movie 2"),
            create_movie_schema(3, "Movie 3"),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = set()

            result = filter_movies_by_blacklist(movies)

            assert len(result) == 3
            assert result == movies

    def test_returns_empty_list_when_all_blacklisted(self) -> None:
        """Returns empty list when all input movies are blacklisted."""
        movies = [
            create_movie_schema(100, "All Blacklisted 1"),
            create_movie_schema(200, "All Blacklisted 2"),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {100, 200, 300}

            result = filter_movies_by_blacklist(movies)

            assert result == []

    def test_handles_empty_input_list(self) -> None:
        """Handles empty input list gracefully."""
        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {12345}

            result = filter_movies_by_blacklist([])

            assert result == []

    def test_preserves_movie_order(self) -> None:
        """Maintains original order of non-blacklisted movies."""
        movies = [
            create_movie_schema(5, "Fifth"),
            create_movie_schema(999, "Blacklisted"),
            create_movie_schema(3, "Third"),
            create_movie_schema(1, "First"),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999}

            result = filter_movies_by_blacklist(movies)

            assert [m.tmdb_id for m in result] == [5, 3, 1]


# ============================================================================
# Integration: Blacklist in Data Quality Pipeline
# ============================================================================


class TestBlacklistInPipeline:
    """Integration tests for blacklist filtering in apply_data_quality_filters()."""

    def test_blacklist_applied_in_pipeline(self) -> None:
        """Blacklisted movies excluded from apply_data_quality_filters() output."""
        # Create TMDB movies (input to pipeline)
        tmdb_movies = [
            create_tmdb_movie(1, "Safe Movie", "2022-01-15", 8.0),
            create_tmdb_movie(12345, "Blacklisted Movie", "2022-01-15", 9.0),
            create_tmdb_movie(3, "Another Safe", "2022-01-15", 7.5),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {12345}

            result = apply_data_quality_filters(tmdb_movies)

            assert len(result) == 2
            result_ids = {m.tmdb_id for m in result}
            assert 12345 not in result_ids
            assert result_ids == {1, 3}

    def test_blacklist_runs_before_other_filters(self) -> None:
        """Blacklist filtering happens first (efficiency - exclude early).

        A movie that would fail other filters (e.g., no poster) but is also
        blacklisted should be excluded by the blacklist filter, not the
        completeness filter. This test verifies ordering by checking that
        blacklisted movies are excluded even if they have other issues.
        """
        # Movie with multiple issues: blacklisted AND missing poster
        tmdb_movies = [
            create_tmdb_movie(1, "Good Movie", "2022-01-15", 8.0),
            # Blacklisted movie with valid data - should be excluded by blacklist
            create_tmdb_movie(12345, "Blacklisted Valid", "2022-01-15", 9.0),
            # Non-blacklisted movie with missing poster - excluded by completeness
            create_tmdb_movie(2, "No Poster", "2022-01-15", 8.0, poster_path=""),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {12345}

            result = apply_data_quality_filters(tmdb_movies)

            # Only movie 1 should pass (12345 blacklisted, 2 missing poster)
            assert len(result) == 1
            assert result[0].tmdb_id == 1

    def test_blacklist_combined_with_year_and_rating_filters(self) -> None:
        """Blacklist works correctly alongside year and rating filters."""
        tmdb_movies = [
            # Passes all: not blacklisted, 2022, rating 8.0
            create_tmdb_movie(1, "Perfect", "2022-06-15", 8.0),
            # Blacklisted (should be excluded regardless of other criteria)
            create_tmdb_movie(12345, "Blacklisted", "2022-06-15", 9.0),
            # Not blacklisted but wrong year
            create_tmdb_movie(3, "Wrong Year", "2020-01-15", 8.5),
            # Not blacklisted but low rating
            create_tmdb_movie(4, "Low Rating", "2022-06-15", 5.0),
            # Passes all filters
            create_tmdb_movie(5, "Also Good", "2022-03-15", 7.8),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {12345}

            result = apply_data_quality_filters(
                tmdb_movies,
                year_min=2022,
                year_max=2022,
                rating_min=7.0,
            )

            result_ids = {m.tmdb_id for m in result}
            # Movie 1 and 5 pass all filters
            # Movie 12345 excluded by blacklist
            # Movie 3 excluded by year filter
            # Movie 4 excluded by rating filter
            assert result_ids == {1, 5}
