"""Data quality policy definitions - single source of truth.

This module centralizes all data quality policy decisions for TMDB movie filtering.
Each policy class defines the "what" and "why" of filtering rules; the filters module
implements the "how" by applying these policies to movie lists.

Policy Classes:
    VoteCountPolicy: Tiered vote count thresholds based on user intent
    CompletenessPolicy: What constitutes "complete" movie data for display

Constants:
    STRICT_VOTE_THRESHOLD: High threshold for rating-dependent contexts (10 votes)
    MODERATE_VOTE_THRESHOLD: Light spam filter for general browsing (3 votes)
    VOTE_COUNT_THRESHOLD: Default threshold (alias for MODERATE for compatibility)
    EARLIEST_VALID_RELEASE_YEAR: Historical validation cutoff (1888)
    OVERVIEW_PLACEHOLDER_PATTERNS: Known TMDB placeholder text to exclude
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal, Protocol


# Protocol to avoid circular import with movie.schemas.MovieBaseSchema
# This defines the minimal interface needed for completeness validation
class MovieDataProtocol(Protocol):
    """Protocol for movie data with fields needed for completeness validation."""

    poster_path: str | None
    title: str
    genre_ids: list[int]
    overview: str | None

# ============================================================================
# Vote Count Policy
# ============================================================================

# Endpoint identifiers for policy decisions
EndpointType = Literal["browse", "search", "now_playing", "upcoming"]

# Tiered vote count thresholds
#
# The vote count filter serves two purposes:
#   1. Data quality - Movies with 0-2 votes often have bad metadata, spam, test entries
#   2. Content curation - Filtering out obscure/niche content
#
# Purpose 1 is almost always helpful. Purpose 2 depends on user intent.
# We use tiered thresholds to balance these concerns:
#
# STRICT (10 votes): For contexts where statistical validity matters
#   - vote_average.* sorts need enough votes for meaningful ratings
#   - Without this, a single 10/10 vote would top "highest rated"
#
# MODERATE (3 votes): Light spam filter that doesn't block legitimate content
#   - Filters test entries, metadata garbage, and spam
#   - Allows niche/obscure content that real users have watched
#   - 3 votes = "at least a few people have seen this"
#
# BYPASS (None): For contexts where users expect comprehensive results
#   - Search: User explicitly asked for something, show it if it exists
#   - Alphabetical sorts: Systematic browsing, users want full catalog
#   - Upcoming/Now Playing: Movies literally can't have votes yet
#
# CRITICAL UX PRINCIPLE: Less than 20 results per page looks like a broken app.
# Filtering must never be so aggressive that pages appear sparse. When in doubt,
# use the blacklist for spot-cleaning specific problematic content rather than
# broad vote-based filtering.

STRICT_VOTE_THRESHOLD = 10
MODERATE_VOTE_THRESHOLD = 3

# Default threshold - moderate for general use
# (kept for backward compatibility with existing code)
VOTE_COUNT_THRESHOLD = MODERATE_VOTE_THRESHOLD


class VoteCountPolicy:
    """Tiered vote count threshold policy based on user intent.

    Determines the appropriate vote count threshold based on context:
    endpoint type, sort parameters, and whether it's a search query.

    Guiding Principles:
        1. We are NOT content police - use blacklist for specific bad content
        2. Less than 20 results per page = broken UX, never acceptable
        3. Minimal filtering - only filter what's truly necessary
        4. Match user intent - curation vs completeness expectations

    Threshold Tiers:
        STRICT (10):   Rating-dependent sorts where statistical validity matters
        MODERATE (3):  General browsing - light spam filter, allows niche content
        BYPASS (None): User expects comprehensive results (search, alphabetical)

    Threshold Matrix by Context:
        +------------------------+------------+----------------------------------+
        | Context                | Threshold  | Rationale                        |
        +------------------------+------------+----------------------------------+
        | vote_average.* sorts   | STRICT(10) | Ratings need statistical validity|
        | popularity.desc        | MODERATE(3)| Curation helps, don't over-filter|
        | popularity.asc         | BYPASS     | User wants obscure content       |
        | release_date.desc new  | BYPASS     | New releases can't have votes    |
        | release_date.* other   | MODERATE(3)| Light filter for historical      |
        | original_title.*       | BYPASS     | Systematic browsing, show all    |
        | Search                 | BYPASS     | User searched for it, show it    |
        | Now Playing            | BYPASS     | New theatrical releases          |
        | Upcoming               | BYPASS     | Unreleased = 0 votes by def      |
        +------------------------+------------+----------------------------------+

    Usage:
        # Browse with rating sort - needs strict threshold
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="vote_average.desc"
        )  # Returns 10

        # Alphabetical browsing - bypass for comprehensive results
        threshold = VoteCountPolicy.get_threshold(
            endpoint="browse",
            sort_by="original_title.desc"
        )  # Returns None

        # Search - always bypass, user wants what they searched for
        threshold = VoteCountPolicy.get_threshold(endpoint="search")  # Returns None
    """

    STRICT_THRESHOLD = STRICT_VOTE_THRESHOLD
    MODERATE_THRESHOLD = MODERATE_VOTE_THRESHOLD

    # Year boundary for "recent" vs "historical" content
    # Movies from current year or last year are considered "recent"
    # (haven't had time to accumulate votes)
    RECENT_YEAR_BUFFER = 1

    @classmethod
    def _is_recent_content(cls, year_max: int | None) -> bool:
        """Check if the date filter indicates recent content.

        Args:
            year_max: Upper bound of year filter, or None if no filter

        Returns:
            True if content is recent (no filter or recent years),
            False if filtering to historical content
        """
        if year_max is None:
            # No date filter = could include recent content
            return True

        current_year = datetime.now(UTC).year
        # Recent = this year or last year
        return year_max >= current_year - cls.RECENT_YEAR_BUFFER

    @classmethod
    def _get_sort_threshold(
        cls,
        sort_by: str,
        year_max: int | None = None,
    ) -> int | None:
        """Get threshold based on sort type.

        Args:
            sort_by: TMDB sort parameter (e.g., "popularity.desc", "original_title.asc")
            year_max: Upper bound of year filter for context-aware decisions

        Returns:
            STRICT_THRESHOLD, MODERATE_THRESHOLD, or None (bypass)
        """
        # vote_average sorts: STRICT - ratings need statistical validity
        if "vote_average" in sort_by:
            return cls.STRICT_THRESHOLD

        # original_title sorts: BYPASS - systematic alphabetical browsing
        # Users browsing A-Z expect to see everything, not just popular content
        if "original_title" in sort_by:
            return None

        # popularity.asc: BYPASS - user explicitly wants obscure content
        if sort_by == "popularity.asc":
            return None

        # release_date sorts: Context-aware based on direction and date filter
        if "release_date" in sort_by:
            if sort_by.endswith(".desc") and cls._is_recent_content(year_max):
                # Newest first with recent content - bypass (new releases lack votes)
                return None
            # Historical content or oldest-first: moderate filter
            return cls.MODERATE_THRESHOLD

        # popularity.desc and any other sorts: MODERATE
        return cls.MODERATE_THRESHOLD

    @classmethod
    def get_threshold(
        cls,
        endpoint: EndpointType = "browse",
        sort_by: str | None = None,
        year_max: int | None = None,
    ) -> int | None:
        """Get the appropriate vote count threshold for given context.

        Args:
            endpoint: The API endpoint type (default: "browse")
            sort_by: Optional TMDB sort parameter
            year_max: Optional upper bound of year filter (for context-aware decisions)

        Returns:
            Vote count threshold (int) or None if filtering should be bypassed
        """
        # Endpoint-based bypass takes precedence (fundamental constraints)
        # Search: User explicitly asked for something - show it if it exists
        # Now Playing: New theatrical releases may have low initial votes
        # Upcoming: Unreleased movies have zero votes by definition
        if endpoint in ("search", "now_playing", "upcoming"):
            return None

        # Sort-based threshold with date context
        if sort_by:
            return cls._get_sort_threshold(sort_by, year_max)

        # Default: moderate threshold for general browsing
        return cls.MODERATE_THRESHOLD


# ============================================================================
# Historical Validation Policy
# ============================================================================

# The first film ever made was Roundhay Garden Scene (1888).
# Any movie with release_date before this year is a TMDB data quality issue
# (data entry errors, placeholder dates, etc.) and cannot represent an actual film.
# This validation is ALWAYS applied regardless of user-specified year filters.
EARLIEST_VALID_RELEASE_YEAR = 1888


# ============================================================================
# Completeness Policy
# ============================================================================

# Known TMDB placeholder text patterns for overview field (case-insensitive).
# Based on analysis of TMDB data, "Details Here" is the only text placeholder used.
# Empty/whitespace overviews are handled separately in validation.
OVERVIEW_PLACEHOLDER_PATTERNS: frozenset[str] = frozenset(["details here"])


class CompletenessPolicy:
    """Policy defining what constitutes 'complete' movie data for display.

    Movies missing critical display fields create poor UX (broken images, blank cards,
    missing descriptions). This policy defines the minimum data requirements for a
    movie to be shown in browse/search results.

    All checks are ALWAYS applied - completeness is a basic quality requirement,
    not a user-configurable filter.

    Usage:
        if CompletenessPolicy.is_complete(movie):
            # Movie has all required display data
    """

    @staticmethod
    def has_valid_poster(movie: MovieDataProtocol) -> bool:
        """Check if movie has a valid poster for display.

        Rationale: Movies without posters create broken image placeholders
        in the browse grid, degrading visual quality of the interface.
        """
        return bool(movie.poster_path and movie.poster_path.strip())

    @staticmethod
    def has_valid_title(movie: MovieDataProtocol) -> bool:
        """Check if movie has a valid title for display.

        Rationale: Movies without titles (empty or whitespace-only) create
        confusing blank cards that users cannot identify or interact with.
        """
        return bool(movie.title and movie.title.strip())

    @staticmethod
    def has_valid_genres(movie: MovieDataProtocol) -> bool:
        """Check if movie has genre classification.

        Rationale: Empty genre lists are a strong TMDB data quality signal,
        often correlating with inappropriate content, data entry errors,
        or unreleased/placeholder entries. This serves as a proxy quality filter.
        """
        return bool(movie.genre_ids and len(movie.genre_ids) > 0)

    @staticmethod
    def has_valid_overview(movie: MovieDataProtocol) -> bool:
        """Check if movie has a meaningful overview/description.

        Rationale: Movies without descriptions provide no context to users.
        TMDB sometimes returns empty overviews or placeholder text like
        "Details Here" for incomplete entries.

        Based on analysis of 100 upcoming movies:
        - 11% had placeholder overviews (9 empty, 2 with "Details Here")
        - Empty strings are the majority of placeholder patterns (82%)
        """
        if not movie.overview or not movie.overview.strip():
            return False

        # Check for known TMDB placeholder text
        overview_normalized = movie.overview.strip().lower()
        return overview_normalized not in OVERVIEW_PLACEHOLDER_PATTERNS

    @classmethod
    def is_complete(cls, movie: MovieDataProtocol) -> bool:
        """Check if movie meets all completeness requirements for display.

        Returns:
            True if movie has all required display data, False otherwise.
        """
        return (
            cls.has_valid_poster(movie)
            and cls.has_valid_title(movie)
            and cls.has_valid_genres(movie)
            and cls.has_valid_overview(movie)
        )
