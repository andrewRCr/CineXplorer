"""
Unit tests for VoteCountPolicy - direct policy decision testing.

Tests the vote count threshold decision logic in isolation, verifying when
thresholds are applied vs bypassed based on endpoint, sort type, and date context.

This complements the integration tests in test_vote_count_filtering.py which test
the filtering EFFECT through MovieService. These tests verify the policy DECISIONS.
"""
from __future__ import annotations

from datetime import UTC, datetime

from movie.services.data_quality.policy import VOTE_COUNT_THRESHOLD, VoteCountPolicy


class TestVoteCountPolicyEndpointBehavior:
    """Test endpoint-based threshold decisions."""

    def test_browse_endpoint_applies_threshold(self) -> None:
        """Browse endpoint should apply vote count threshold by default."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse")
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_now_playing_endpoint_bypasses_threshold(self) -> None:
        """Now-playing endpoint should bypass threshold (recent theatrical releases)."""
        threshold = VoteCountPolicy.get_threshold(endpoint="now_playing")
        assert threshold is None

    def test_upcoming_endpoint_bypasses_threshold(self) -> None:
        """Upcoming endpoint should bypass threshold (unreleased movies have 0 votes)."""
        threshold = VoteCountPolicy.get_threshold(endpoint="upcoming")
        assert threshold is None

    def test_endpoint_bypass_takes_precedence_over_sort(self) -> None:
        """Endpoint bypass should take precedence even with sort that would apply threshold."""
        # popularity.desc would normally apply threshold, but upcoming bypasses
        threshold = VoteCountPolicy.get_threshold(
            endpoint="upcoming",
            sort_by="popularity.desc"
        )
        assert threshold is None


class TestVoteCountPolicySortBehavior:
    """Test sort-based threshold decisions for browse endpoint."""

    def test_popularity_desc_applies_threshold(self) -> None:
        """popularity.desc (default sort) should apply threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="popularity.desc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_popularity_asc_bypasses_threshold(self) -> None:
        """popularity.asc (impractical edge case) should bypass threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="popularity.asc"
        )
        assert threshold is None

    def test_vote_average_desc_applies_threshold(self) -> None:
        """vote_average.desc should apply threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.desc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_vote_average_asc_applies_threshold(self) -> None:
        """vote_average.asc should apply threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.asc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_original_title_asc_applies_threshold(self) -> None:
        """original_title.asc (A-Z) should apply threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="original_title.asc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_original_title_desc_applies_threshold(self) -> None:
        """original_title.desc (Z-A) should apply threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="original_title.desc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD


class TestVoteCountPolicyReleaseDateSort:
    """Test release_date sort behavior with date context awareness."""

    def test_release_date_asc_always_applies_threshold(self) -> None:
        """release_date.asc (oldest first) should always apply threshold.

        Oldest-first means movies have had decades to accumulate votes.
        """
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.asc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_release_date_asc_applies_threshold_even_with_recent_filter(self) -> None:
        """release_date.asc should apply threshold even with recent year filter.

        The sort direction matters more than the filter - oldest first means
        we're looking at old movies that should have votes.
        """
        current_year = datetime.now(UTC).year
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.asc",
            year_max=current_year,
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_release_date_desc_without_filter_bypasses_threshold(self) -> None:
        """release_date.desc without date filter should bypass threshold.

        No filter means results could include recent releases that haven't
        had time to accumulate votes.
        """
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=None,
        )
        assert threshold is None

    def test_release_date_desc_with_current_year_bypasses_threshold(self) -> None:
        """release_date.desc with current year filter should bypass threshold."""
        current_year = datetime.now(UTC).year
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=current_year,
        )
        assert threshold is None

    def test_release_date_desc_with_last_year_bypasses_threshold(self) -> None:
        """release_date.desc with last year filter should bypass threshold.

        Movies from last year may still be accumulating votes.
        """
        last_year = datetime.now(UTC).year - 1
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=last_year,
        )
        assert threshold is None

    def test_release_date_desc_with_historical_filter_applies_threshold(self) -> None:
        """release_date.desc with historical year filter should apply threshold.

        Filtering to 2 or more years ago means movies have had time for votes.
        """
        historical_year = datetime.now(UTC).year - 2
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=historical_year,
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_release_date_desc_1990s_filter_applies_threshold(self) -> None:
        """release_date.desc with 1990s filter should apply threshold.

        Movies from 30+ years ago have definitely had time for votes.
        """
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=1999,
        )
        assert threshold == VOTE_COUNT_THRESHOLD


class TestVoteCountPolicyHelperMethods:
    """Test public helper methods."""

    def test_should_bypass_for_endpoint_browse(self) -> None:
        """Browse should not bypass."""
        assert VoteCountPolicy.should_bypass_for_endpoint("browse") is False

    def test_should_bypass_for_endpoint_now_playing(self) -> None:
        """Now-playing should bypass."""
        assert VoteCountPolicy.should_bypass_for_endpoint("now_playing") is True

    def test_should_bypass_for_endpoint_upcoming(self) -> None:
        """Upcoming should bypass."""
        assert VoteCountPolicy.should_bypass_for_endpoint("upcoming") is True


class TestVoteCountPolicyEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_no_sort_applies_default_threshold(self) -> None:
        """No sort parameter should apply default threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by=None)
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_unknown_sort_applies_threshold(self) -> None:
        """Unknown/future sort types should apply threshold (safe default)."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="some_future_sort.desc"
        )
        assert threshold == VOTE_COUNT_THRESHOLD

    def test_year_max_boundary_at_buffer_edge(self) -> None:
        """Test exact boundary at RECENT_YEAR_BUFFER edge.

        With RECENT_YEAR_BUFFER=1, year_max = current_year - 1 is recent,
        year_max = current_year - 2 is historical.
        """
        current_year = datetime.now(UTC).year
        boundary_year = current_year - VoteCountPolicy.RECENT_YEAR_BUFFER

        # At boundary (last year) - should be recent
        threshold_at_boundary = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=boundary_year,
        )
        assert threshold_at_boundary is None  # Recent = bypass

        # One year before boundary - should be historical
        threshold_before_boundary = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=boundary_year - 1,
        )
        assert threshold_before_boundary == VOTE_COUNT_THRESHOLD  # Historical = apply
