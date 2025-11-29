"""
TDD tests for production company blacklist filtering.

These tests are written BEFORE implementation (Test-Driven Development).
They will fail until:
- Phase 4: BlacklistedProductionCompany model created
- Phase 6: get_blacklisted_company_ids() and filter_movies_by_blacklisted_company() implemented

Test Organization:
- BlacklistedProductionCompany model: Database model tests
- get_blacklisted_company_ids(): Database lookup and caching behavior
- filter_movies_by_blacklisted_company(): Filtering logic on movies with company data

DRY Note: Uses create_movie_schema() from test_blacklist_filtering.py.
Adds create_movie_with_companies() helper for production company testing.

Type Safety Note: This file has pyright errors because it imports code that doesn't
exist yet (TDD pattern). Errors will resolve when Phase 4/6 implementation complete.
"""
# pyright: reportAttributeAccessIssue=false
# pyright: reportUnknownVariableType=false
# pyright: reportUnknownMemberType=false
# pyright: reportConstantRedefinition=false
# pyright: reportPossiblyUnboundVariable=false
# pyright: reportUnknownArgumentType=false
# pyright: reportOptionalMemberAccess=false
# pyright: reportArgumentType=false
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest

# TDD imports - these will fail until implementation exists
# Phase 4: Model
# Phase 6: Filter functions
try:
    from movie.models import BlacklistedProductionCompany

    MODEL_AVAILABLE = True
except ImportError:
    MODEL_AVAILABLE = False
    BlacklistedProductionCompany = None  # type: ignore[misc, assignment]

try:
    from movie.services.data_quality_filters import (
        COMPANY_BLACKLIST_CACHE_KEY,
        COMPANY_BLACKLIST_CACHE_TIMEOUT,
        filter_movies_by_blacklisted_company,
        get_blacklisted_company_ids,
    )

    FILTER_FUNCTIONS_AVAILABLE = True
except ImportError:
    FILTER_FUNCTIONS_AVAILABLE = False
    COMPANY_BLACKLIST_CACHE_KEY = "company_blacklist_ids"  # Expected value
    COMPANY_BLACKLIST_CACHE_TIMEOUT = 300  # Expected value (5 minutes)

    if TYPE_CHECKING:
        # Placeholders for type checking only - never executed
        def get_blacklisted_company_ids() -> set[int]: ...
        def filter_movies_by_blacklisted_company(
            movies: list[object],
        ) -> list[object]: ...




# ============================================================================
# Test Helpers
# ============================================================================


class MovieWithCompanies:
    """Test helper class representing a movie with production company data.

    Used for testing filter_movies_by_blacklisted_company() which needs
    movies with production company IDs. In production, this would be
    TMDBMovieDetail or a schema that includes company data.

    This helper allows testing filter logic before deciding on final
    schema design.
    """

    def __init__(
        self,
        tmdb_id: int,
        title: str,
        production_company_ids: list[int],
        release_date: date | None = None,
        vote_average: float = 7.5,
    ) -> None:
        self.tmdb_id = tmdb_id
        self.title = title
        self.production_company_ids = production_company_ids
        self.release_date = release_date or date(2022, 1, 15)
        self.vote_average = vote_average


def create_movie_with_companies(
    tmdb_id: int,
    title: str = "Test Movie",
    company_ids: list[int] | None = None,
    release_date: date | None = None,
    vote_average: float = 7.5,
) -> MovieWithCompanies:
    """Create a movie object with production company IDs for filter testing.

    Args:
        tmdb_id: TMDB movie ID
        title: Movie title
        company_ids: List of production company TMDB IDs (default: [1, 2])
        release_date: Release date (default: 2022-01-15)
        vote_average: Rating (default: 7.5)

    Returns:
        MovieWithCompanies instance for filter testing
    """
    if company_ids is None:
        company_ids = [1, 2]  # Default: two generic companies

    return MovieWithCompanies(
        tmdb_id=tmdb_id,
        title=title,
        production_company_ids=company_ids,
        release_date=release_date,
        vote_average=vote_average,
    )


# ============================================================================
# BlacklistedProductionCompany Model Tests (Phase 4)
# ============================================================================


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model not implemented yet (Phase 4)")
@pytest.mark.django_db
class TestBlacklistedProductionCompanyModel:
    """Tests for BlacklistedProductionCompany Django model."""

    def test_model_creation_with_required_fields(self) -> None:
        """Model can be created with tmdb_company_id and reason."""
        entry = BlacklistedProductionCompany.objects.create(
            tmdb_company_id=12345,
            reason="Exclusively produces exploitation content",
        )

        assert entry.tmdb_company_id == 12345
        assert entry.reason == "Exclusively produces exploitation content"
        assert entry.added_at is not None  # Auto-set

    def test_unique_constraint_on_tmdb_company_id(self) -> None:
        """Cannot create duplicate entries for same company ID."""
        from django.db import IntegrityError

        BlacklistedProductionCompany.objects.create(
            tmdb_company_id=99999,
            reason="First entry",
        )

        with pytest.raises(IntegrityError):
            BlacklistedProductionCompany.objects.create(
                tmdb_company_id=99999,
                reason="Duplicate entry",
            )

    def test_str_representation(self) -> None:
        """String representation includes company ID and reason."""
        entry = BlacklistedProductionCompany.objects.create(
            tmdb_company_id=54321,
            reason="Pink film studio",
        )

        str_repr = str(entry)
        assert "54321" in str_repr
        assert "Pink film studio" in str_repr


# ============================================================================
# get_blacklisted_company_ids() Tests (Phase 6)
# ============================================================================


@pytest.mark.skipif(
    not FILTER_FUNCTIONS_AVAILABLE, reason="Filter functions not implemented yet (Phase 6)"
)
@pytest.mark.django_db
class TestGetBlacklistedCompanyIds:
    """Tests for get_blacklisted_company_ids() database lookup and caching."""

    def test_returns_empty_set_when_no_blacklist_entries(self) -> None:
        """Returns empty set when BlacklistedProductionCompany table is empty."""
        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            result = get_blacklisted_company_ids()

            assert result == set()
            mock_cache.get.assert_called_once_with(COMPANY_BLACKLIST_CACHE_KEY)
            mock_cache.set.assert_called_once_with(
                COMPANY_BLACKLIST_CACHE_KEY, set(), COMPANY_BLACKLIST_CACHE_TIMEOUT
            )

    def test_returns_correct_ids_from_database(self) -> None:
        """Returns set of company IDs from BlacklistedProductionCompany entries."""
        BlacklistedProductionCompany.objects.create(
            tmdb_company_id=1001, reason="Exploitation studio"
        )
        BlacklistedProductionCompany.objects.create(
            tmdb_company_id=2002, reason="Pink film producer"
        )
        BlacklistedProductionCompany.objects.create(
            tmdb_company_id=3003, reason="Adult content mislabeled"
        )

        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            result = get_blacklisted_company_ids()

            assert result == {1001, 2002, 3003}

    def test_returns_cached_value_when_available(self) -> None:
        """Returns cached set without database query when cache hit."""
        cached_ids = {8888, 9999}

        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = cached_ids

            result = get_blacklisted_company_ids()

            assert result == cached_ids
            mock_cache.get.assert_called_once_with(COMPANY_BLACKLIST_CACHE_KEY)
            mock_cache.set.assert_not_called()

    def test_caches_result_with_correct_timeout(self) -> None:
        """Caches database result with 5-minute TTL."""
        BlacklistedProductionCompany.objects.create(
            tmdb_company_id=7777, reason="Test entry"
        )

        with patch("movie.services.data_quality_filters.cache") as mock_cache:
            mock_cache.get.return_value = None

            get_blacklisted_company_ids()

            mock_cache.set.assert_called_once()
            call_args = mock_cache.set.call_args
            assert call_args[0][0] == COMPANY_BLACKLIST_CACHE_KEY
            assert 7777 in call_args[0][1]
            assert call_args[0][2] == 300  # 5 minutes


# ============================================================================
# filter_movies_by_blacklisted_company() Tests (Phase 6)
# ============================================================================


@pytest.mark.skipif(
    not FILTER_FUNCTIONS_AVAILABLE, reason="Filter functions not implemented yet (Phase 6)"
)
class TestFilterMoviesByBlacklistedCompany:
    """Tests for filter_movies_by_blacklisted_company() filtering logic."""

    def test_excludes_movies_from_blacklisted_company(self) -> None:
        """Movies from blacklisted production companies are excluded."""
        movies = [
            create_movie_with_companies(1, "Safe Movie", company_ids=[100, 200]),
            create_movie_with_companies(2, "Blacklisted Co", company_ids=[999, 200]),
            create_movie_with_companies(3, "Another Safe", company_ids=[300, 400]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999}  # Company 999 is blacklisted

            result = filter_movies_by_blacklisted_company(movies)

            assert len(result) == 2
            result_ids = {m.tmdb_id for m in result}
            assert result_ids == {1, 3}

    def test_excludes_if_any_company_blacklisted(self) -> None:
        """Movie excluded if ANY of its production companies is blacklisted.

        A movie may have multiple production companies. If even one is
        blacklisted (e.g., a studio that exclusively produces problematic
        content), the entire movie should be excluded.
        """
        movies = [
            # Multiple companies, one blacklisted
            create_movie_with_companies(1, "Mixed Prod", company_ids=[100, 999, 200]),
            # All companies safe
            create_movie_with_companies(2, "All Safe", company_ids=[100, 200, 300]),
            # Single blacklisted company
            create_movie_with_companies(3, "Single Bad", company_ids=[888]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999, 888}

            result = filter_movies_by_blacklisted_company(movies)

            # Only movie 2 passes (no blacklisted companies)
            assert len(result) == 1
            assert result[0].tmdb_id == 2

    def test_handles_movies_with_no_production_company_data(self) -> None:
        """Movies with empty production company list pass through.

        Some TMDB entries may lack production company data. These should
        not be excluded by the company blacklist filter (benefit of doubt).
        """
        movies = [
            create_movie_with_companies(1, "Has Companies", company_ids=[100, 200]),
            create_movie_with_companies(2, "No Companies", company_ids=[]),
            create_movie_with_companies(3, "Blacklisted Co", company_ids=[999]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999}

            result = filter_movies_by_blacklisted_company(movies)

            assert len(result) == 2
            result_ids = {m.tmdb_id for m in result}
            assert result_ids == {1, 2}  # Movie with no companies passes

    def test_returns_all_movies_when_blacklist_empty(self) -> None:
        """All movies pass through when company blacklist is empty."""
        movies = [
            create_movie_with_companies(1, "Movie 1", company_ids=[100]),
            create_movie_with_companies(2, "Movie 2", company_ids=[200]),
            create_movie_with_companies(3, "Movie 3", company_ids=[300]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = set()

            result = filter_movies_by_blacklisted_company(movies)

            assert len(result) == 3

    def test_returns_empty_list_when_all_from_blacklisted_companies(self) -> None:
        """Returns empty list when all movies are from blacklisted companies."""
        movies = [
            create_movie_with_companies(1, "Bad 1", company_ids=[999]),
            create_movie_with_companies(2, "Bad 2", company_ids=[888, 999]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999, 888}

            result = filter_movies_by_blacklisted_company(movies)

            assert result == []

    def test_handles_empty_input_list(self) -> None:
        """Handles empty input list gracefully."""
        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999}

            result = filter_movies_by_blacklisted_company([])

            assert result == []

    def test_preserves_movie_order(self) -> None:
        """Maintains original order of non-excluded movies."""
        movies = [
            create_movie_with_companies(5, "Fifth", company_ids=[100]),
            create_movie_with_companies(9, "Blacklisted", company_ids=[999]),
            create_movie_with_companies(3, "Third", company_ids=[200]),
            create_movie_with_companies(1, "First", company_ids=[300]),
        ]

        with patch(
            "movie.services.data_quality_filters.get_blacklisted_company_ids"
        ) as mock_get_ids:
            mock_get_ids.return_value = {999}

            result = filter_movies_by_blacklisted_company(movies)

            assert [m.tmdb_id for m in result] == [5, 3, 1]
