"""
Unit tests for VoteCountPolicy - direct policy decision testing.

Tests the tiered vote count threshold decision logic in isolation, verifying when
thresholds are applied at different levels (STRICT, MODERATE, BYPASS) based on
endpoint, sort type, rating filters, and date context.

Threshold Tiers:
    STRICT (200):  Rating-dependent sorts without filters (statistical validity)
    MODERATE (3):  General browsing, alphabetical (light spam filter)
    BYPASS (None): Endpoints where votes don't exist yet (search, upcoming, recent)

This complements the integration tests in test_vote_count_filtering.py which test
the filtering EFFECT through MovieService. These tests verify the policy DECISIONS.
"""

from __future__ import annotations

from datetime import UTC, datetime

from apps.movie.services.data_quality.policy import (
    MODERATE_VOTE_THRESHOLD,
    STRICT_VOTE_THRESHOLD,
    VoteCountPolicy,
)


class TestVoteCountPolicyEndpointBehavior:
    """Test endpoint-based threshold decisions."""

    def test_browse_endpoint_applies_moderate_threshold(self) -> None:
        """Browse endpoint should apply moderate threshold by default (no sort)."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse")
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_search_endpoint_bypasses_threshold(self) -> None:
        """Search endpoint should bypass threshold (user searched for it, show it)."""
        threshold = VoteCountPolicy.get_threshold(endpoint="search")
        assert threshold is None

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
        # vote_average.desc would normally apply STRICT threshold, but search bypasses
        threshold = VoteCountPolicy.get_threshold(endpoint="search", sort_by="vote_average.desc")
        assert threshold is None


class TestVoteCountPolicySortBehavior:
    """Test sort-based threshold decisions for browse endpoint."""

    def test_popularity_desc_applies_moderate_threshold(self) -> None:
        """popularity.desc (default sort) should apply moderate threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="popularity.desc")
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_popularity_asc_bypasses_threshold(self) -> None:
        """popularity.asc (user wants obscure content) should bypass threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="popularity.asc")
        assert threshold is None

    def test_vote_average_desc_no_filter_applies_strict_threshold(self) -> None:
        """vote_average.desc without rating filter should apply STRICT threshold.

        "Highest Rated" without filters = user expects famous, universally loved films.
        Need high vote count (200) for statistical validity.
        """
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="vote_average.desc")
        assert threshold == STRICT_VOTE_THRESHOLD

    def test_vote_average_asc_no_filter_applies_strict_threshold(self) -> None:
        """vote_average.asc without rating filter should apply STRICT threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="vote_average.asc")
        assert threshold == STRICT_VOTE_THRESHOLD

    def test_original_title_asc_applies_moderate_threshold(self) -> None:
        """original_title.asc (A-Z) should apply moderate threshold.

        Changed from BYPASS: 0-vote entries are garbage, not legitimate obscure films.
        3-vote threshold still allows niche content while filtering data quality issues.
        """
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="original_title.asc")
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_original_title_desc_applies_moderate_threshold(self) -> None:
        """original_title.desc (Z-A) should apply moderate threshold.

        Changed from BYPASS: 0-vote entries are garbage, not legitimate obscure films.
        """
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="original_title.desc")
        assert threshold == MODERATE_VOTE_THRESHOLD


class TestVoteCountPolicyRatingContext:
    """Test rating filter context for vote_average sorts."""

    def test_vote_average_with_rating_min_uses_moderate(self) -> None:
        """vote_average sort with rating_min filter should use MODERATE threshold.

        User is browsing within a rating band - they're not looking for "top rated
        of all time", just ordering within their specified criteria.
        """
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.desc",
            rating_min=7.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_vote_average_with_rating_max_uses_moderate(self) -> None:
        """vote_average sort with rating_max filter should use MODERATE threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.desc",
            rating_max=8.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_vote_average_with_both_rating_filters_uses_moderate(self) -> None:
        """vote_average sort with both rating filters should use MODERATE threshold."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.desc",
            rating_min=6.0,
            rating_max=8.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_vote_average_asc_with_rating_filter_uses_moderate(self) -> None:
        """vote_average.asc with rating filter should also use MODERATE."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.asc",
            rating_min=5.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_rating_filter_only_affects_vote_average_sorts(self) -> None:
        """Rating filter context should only affect vote_average sorts.

        Other sorts should ignore rating context and follow normal rules.
        """
        # popularity.desc with rating filter still uses MODERATE (its normal behavior)
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="popularity.desc",
            rating_min=7.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

        # original_title with rating filter still uses MODERATE
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="original_title.asc",
            rating_min=7.0,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD


class TestVoteCountPolicyReleaseDateSort:
    """Test release_date sort behavior with date context awareness."""

    def test_release_date_asc_applies_moderate_threshold(self) -> None:
        """release_date.asc (oldest first) should apply moderate threshold.

        Oldest-first means movies have had decades to accumulate votes.
        """
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="release_date.asc")
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_release_date_asc_applies_moderate_even_with_recent_filter(self) -> None:
        """release_date.asc should apply moderate threshold even with recent year filter.

        The sort direction matters more than the filter - oldest first means
        we're looking at old movies that should have votes.
        """
        current_year = datetime.now(UTC).year
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.asc",
            year_max=current_year,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

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

    def test_release_date_desc_with_historical_filter_applies_moderate(self) -> None:
        """release_date.desc with historical year filter should apply moderate threshold.

        Filtering to 2 or more years ago means movies have had time for votes.
        """
        historical_year = datetime.now(UTC).year - 2
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=historical_year,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_release_date_desc_1990s_filter_applies_moderate(self) -> None:
        """release_date.desc with 1990s filter should apply moderate threshold.

        Movies from 30+ years ago have definitely had time for votes.
        """
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="release_date.desc",
            year_max=1999,
        )
        assert threshold == MODERATE_VOTE_THRESHOLD


class TestVoteCountPolicyTieredThresholds:
    """Test that the correct threshold tier is returned."""

    def test_strict_threshold_is_200(self) -> None:
        """STRICT threshold should be 200 (matches TMDB Top Rated minimum)."""
        assert STRICT_VOTE_THRESHOLD == 200
        assert VoteCountPolicy.STRICT_THRESHOLD == 200

    def test_moderate_threshold_is_3(self) -> None:
        """MODERATE threshold should be 3 (spam filter, allows niche content)."""
        assert MODERATE_VOTE_THRESHOLD == 3
        assert VoteCountPolicy.MODERATE_THRESHOLD == 3

    def test_vote_average_without_filter_uses_strict(self) -> None:
        """Rating sorts without rating filter should use STRICT threshold."""
        for sort in ["vote_average.desc", "vote_average.asc"]:
            threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by=sort)
            assert threshold == VoteCountPolicy.STRICT_THRESHOLD, f"Failed for {sort}"

    def test_vote_average_with_filter_uses_moderate(self) -> None:
        """Rating sorts with rating filter should use MODERATE threshold."""
        for sort in ["vote_average.desc", "vote_average.asc"]:
            threshold = VoteCountPolicy.get_threshold(
                endpoint="browse", sort_by=sort, rating_min=7.0
            )
            assert threshold == VoteCountPolicy.MODERATE_THRESHOLD, f"Failed for {sort}"

    def test_popularity_desc_uses_moderate(self) -> None:
        """popularity.desc should use MODERATE threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="popularity.desc")
        assert threshold == VoteCountPolicy.MODERATE_THRESHOLD

    def test_alphabetical_uses_moderate(self) -> None:
        """Alphabetical sorts should use MODERATE threshold.

        Changed from BYPASS: 0-vote entries are garbage, not legitimate obscure films.
        """
        for sort in ["original_title.asc", "original_title.desc"]:
            threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by=sort)
            assert threshold == MODERATE_VOTE_THRESHOLD, f"Failed for {sort}"


class TestVoteCountPolicyEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_no_sort_applies_moderate_threshold(self) -> None:
        """No sort parameter should apply moderate threshold."""
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by=None)
        assert threshold == MODERATE_VOTE_THRESHOLD

    def test_unknown_sort_applies_moderate_threshold(self) -> None:
        """Unknown/future sort types should apply moderate threshold (safe default)."""
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse", sort_by="some_future_sort.desc"
        )
        assert threshold == MODERATE_VOTE_THRESHOLD

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
        assert threshold_before_boundary == MODERATE_VOTE_THRESHOLD  # Historical = moderate
