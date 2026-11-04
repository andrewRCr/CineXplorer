"""Data quality filtering for TMDB API responses.

This package provides second-pass filtering applied to TMDB responses.

Architecture:
    policy.py - Defines "what" and "why" (rules, thresholds, rationale)
    filters.py - Implements "how" (list filtering operations)

Policy Classes:
    VoteCountPolicy - When to apply/bypass vote count thresholds
    CompletenessPolicy - What constitutes complete movie data for display

Constants:
    VOTE_COUNT_THRESHOLD - Default minimum votes (10)
    EARLIEST_VALID_RELEASE_YEAR - Historical validation cutoff (1888)
    OVERVIEW_PLACEHOLDER_PATTERNS - Known TMDB placeholder text

Import directly from submodules:
    from apps.movie.services.data_quality.filters import apply_data_quality_filters
    from apps.movie.services.data_quality.policy import VoteCountPolicy, CompletenessPolicy
"""
