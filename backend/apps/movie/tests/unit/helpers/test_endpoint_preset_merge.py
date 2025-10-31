"""Unit tests for endpoint preset merge helper.

Tests the merge_with_preset() function which combines user filters with
endpoint presets while respecting protected keys that preserve endpoint
semantic identity.
"""


from movie.helpers import (
    BROWSE_PROTECTED_KEYS,
    NOW_PLAYING_PROTECTED_KEYS,
    UPCOMING_PROTECTED_KEYS,
    merge_with_preset,
)


class TestMergeWithPreset:
    """Tests for merge_with_preset() helper function."""

    def test_protected_keys_override_user_values(self) -> None:
        """Protected keys in preset should always override user values."""
        user_filters = {
            "with_genres": "28",
            "primary_release_date.gte": "2020-01-01",  # User tries to override
            "primary_release_date.lte": "2025-12-31",  # User tries to override
        }
        preset = {
            "primary_release_date.gte": "2025-10-01",
            "primary_release_date.lte": "2025-11-05",
            "with_release_type": "2|3",
        }
        protected_keys = [
            "primary_release_date.gte",
            "primary_release_date.lte",
            "with_release_type",
        ]

        result = merge_with_preset(user_filters, preset, protected_keys)

        # Protected keys from preset should override user values
        assert result["primary_release_date.gte"] == "2025-10-01"
        assert result["primary_release_date.lte"] == "2025-11-05"
        assert result["with_release_type"] == "2|3"

        # Non-protected user keys should be preserved
        assert result["with_genres"] == "28"

    def test_non_protected_keys_merge_correctly(self) -> None:
        """Non-protected keys should allow user values to take precedence."""
        user_filters = {
            "with_genres": "28",
            "vote_average.gte": "7.0",
        }
        preset = {
            "sort_by": "popularity.desc",
            "vote_average.gte": "5.0",  # User's 7.0 should win (not protected)
        }
        protected_keys = ["sort_by"]

        result = merge_with_preset(user_filters, preset, protected_keys)

        # Protected key from preset should be used
        assert result["sort_by"] == "popularity.desc"

        # Non-protected key: user value should win
        assert result["vote_average.gte"] == "7.0"

        # User's genre filter should be preserved
        assert result["with_genres"] == "28"

    def test_user_only_keys_preserved(self) -> None:
        """User keys not present in preset should be preserved."""
        user_filters = {
            "with_genres": "28",
            "with_keywords": "9715",
            "vote_average.gte": "8.0",
        }
        preset = {
            "sort_by": "popularity.desc",
        }
        protected_keys = ["sort_by"]

        result = merge_with_preset(user_filters, preset, protected_keys)

        # All user keys should be present
        assert result["with_genres"] == "28"
        assert result["with_keywords"] == "9715"
        assert result["vote_average.gte"] == "8.0"

        # Preset key should also be present
        assert result["sort_by"] == "popularity.desc"

    def test_empty_user_filters(self) -> None:
        """Empty user filters should result in just the preset values."""
        user_filters: dict[str, str | int | float | bool | None] = {}
        preset = {
            "primary_release_date.gte": "2025-10-01",
            "primary_release_date.lte": "2025-11-05",
            "with_release_type": "2|3",
        }
        protected_keys = [
            "primary_release_date.gte",
            "primary_release_date.lte",
            "with_release_type",
        ]

        result = merge_with_preset(user_filters, preset, protected_keys)

        # Should contain all preset values
        assert result == preset

    def test_empty_preset(self) -> None:
        """Empty preset should result in just the user filters."""
        user_filters = {
            "with_genres": "28",
            "vote_average.gte": "7.0",
        }
        preset: dict[str, str | int | float | bool | None] = {}
        protected_keys: list[str] = []

        result = merge_with_preset(user_filters, preset, protected_keys)

        # Should contain all user filters
        assert result == user_filters

    def test_no_protected_keys(self) -> None:
        """With no protected keys, user values should win for conflicts."""
        user_filters = {
            "sort_by": "release_date.desc",
            "with_genres": "28",
        }
        preset = {
            "sort_by": "popularity.desc",
            "vote_count.gte": "100",
        }
        protected_keys = None  # No protected keys

        result = merge_with_preset(user_filters, preset, protected_keys)

        # User's sort_by should win (not protected)
        assert result["sort_by"] == "release_date.desc"

        # User's genre should be preserved
        assert result["with_genres"] == "28"

        # Preset's vote_count should be added (not in user filters)
        assert result["vote_count.gte"] == "100"

    def test_now_playing_protected_keys_constant(self) -> None:
        """Verify NOW_PLAYING_PROTECTED_KEYS contains expected keys."""
        assert "with_release_type" in NOW_PLAYING_PROTECTED_KEYS
        assert "release_date.gte" in NOW_PLAYING_PROTECTED_KEYS
        assert "release_date.lte" in NOW_PLAYING_PROTECTED_KEYS
        assert "year" in NOW_PLAYING_PROTECTED_KEYS
        assert "primary_release_year" in NOW_PLAYING_PROTECTED_KEYS
        assert len(NOW_PLAYING_PROTECTED_KEYS) == 5

    def test_upcoming_protected_keys_constant(self) -> None:
        """Verify UPCOMING_PROTECTED_KEYS contains expected keys."""
        assert "with_release_type" in UPCOMING_PROTECTED_KEYS
        assert "release_date.gte" in UPCOMING_PROTECTED_KEYS
        assert "release_date.lte" in UPCOMING_PROTECTED_KEYS
        assert "year" in UPCOMING_PROTECTED_KEYS
        assert "primary_release_year" in UPCOMING_PROTECTED_KEYS
        assert len(UPCOMING_PROTECTED_KEYS) == 5

    def test_browse_protected_keys_constant(self) -> None:
        """Verify BROWSE_PROTECTED_KEYS is empty (no restrictions)."""
        assert len(BROWSE_PROTECTED_KEYS) == 0

    def test_realistic_now_playing_scenario(self) -> None:
        """Test realistic now-playing endpoint scenario with genre filter."""
        # User wants action movies from now-playing endpoint
        user_filters = {
            "with_genres": "28",  # Action
            "vote_average.gte": "7.0",
        }

        # Now-playing preset with date range and theatrical releases
        # Uses schema parameter names (release_date.gte) not TMDB names
        preset = {
            "release_date.gte": "2025-10-01",
            "release_date.lte": "2025-11-05",
            "with_release_type": "2|3",
        }

        result = merge_with_preset(user_filters, preset, NOW_PLAYING_PROTECTED_KEYS)

        # User filters should be preserved
        assert result["with_genres"] == "28"
        assert result["vote_average.gte"] == "7.0"

        # Preset date range should be enforced
        assert result["release_date.gte"] == "2025-10-01"
        assert result["release_date.lte"] == "2025-11-05"
        assert result["with_release_type"] == "2|3"

    def test_realistic_upcoming_scenario(self) -> None:
        """Test realistic upcoming endpoint scenario with multiple filters."""
        # User wants sci-fi movies with high ratings from upcoming endpoint
        user_filters = {
            "with_genres": "878",  # Sci-Fi
            "vote_average.gte": "8.0",
            "with_keywords": "9715",  # Superhero
        }

        # Upcoming preset with future date range
        # Uses schema parameter names (release_date.gte) not TMDB names
        preset = {
            "release_date.gte": "2025-11-06",
            "release_date.lte": "2025-12-31",
            "with_release_type": "2|3",
        }

        result = merge_with_preset(user_filters, preset, UPCOMING_PROTECTED_KEYS)

        # All user filters should be preserved
        assert result["with_genres"] == "878"
        assert result["vote_average.gte"] == "8.0"
        assert result["with_keywords"] == "9715"

        # Preset date range should be enforced
        assert result["release_date.gte"] == "2025-11-06"
        assert result["release_date.lte"] == "2025-12-31"
        assert result["with_release_type"] == "2|3"

    def test_year_filters_blocked_for_now_playing(self) -> None:
        """Test that year filters are blocked by now-playing protected keys."""
        # User tries to filter by year (should be ignored due to protected keys)
        user_filters = {
            "with_genres": "28",  # Action
            "year": "2020",  # User tries to filter for 2020
        }

        # Now-playing preset defines date range (which implicitly sets year to 2025)
        preset = {
            "release_date.gte": "2025-10-01",
            "release_date.lte": "2025-11-05",
            "with_release_type": "2|3",
        }

        result = merge_with_preset(user_filters, preset, NOW_PLAYING_PROTECTED_KEYS)

        # User's genre filter should be preserved
        assert result["with_genres"] == "28"

        # User's year filter should NOT be in result (blocked by protected keys)
        # The preset doesn't set 'year', so it should be completely absent
        assert "year" not in result
        assert "primary_release_year" not in result

        # Preset date range should be present
        assert result["release_date.gte"] == "2025-10-01"
        assert result["release_date.lte"] == "2025-11-05"

    def test_realistic_browse_scenario(self) -> None:
        """Test realistic browse endpoint scenario with no protected keys."""
        # User has full control on browse endpoint
        user_filters = {
            "with_genres": "28",
            "primary_release_year": "2023",
            "sort_by": "vote_average.desc",
            "vote_count.gte": "1000",
        }

        # Browse has no preset (or minimal preset)
        preset = {
            "sort_by": "popularity.desc",  # Default sort
        }

        result = merge_with_preset(user_filters, preset, BROWSE_PROTECTED_KEYS)

        # User values should win for everything (no protected keys)
        assert result["with_genres"] == "28"
        assert result["primary_release_year"] == "2023"
        assert result["sort_by"] == "vote_average.desc"  # User's sort wins
        assert result["vote_count.gte"] == "1000"
