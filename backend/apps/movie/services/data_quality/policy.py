"""Data quality policy definitions - single source of truth.

This module centralizes all data quality policy decisions for TMDB movie filtering.
Each policy class defines the "what" and "why" of filtering rules; the filters module
implements the "how" by applying these policies to movie lists.

Policy Classes:
    VoteCountPolicy: When to apply/bypass vote count thresholds
    CompletenessPolicy: What constitutes "complete" movie data for display

Constants:
    VOTE_COUNT_THRESHOLD: Default minimum votes for data quality
    EARLIEST_VALID_RELEASE_YEAR: Historical validation cutoff (1888)
    OVERVIEW_PLACEHOLDER_PATTERNS: Known TMDB placeholder text to exclude
"""

from __future__ import annotations

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
EndpointType = Literal["browse", "now_playing", "upcoming"]

# Default threshold for vote count filtering
# Movies with fewer votes are excluded from results (data quality measure)
VOTE_COUNT_THRESHOLD = 10


class VoteCountPolicy:
    """Centralized policy for vote count threshold decisions.

    Determines when min_vote_count filtering should be applied vs bypassed
    based on endpoint type and sort parameters.

    Bypass Rules:
        Certain contexts naturally include low-vote movies and should bypass filtering:
        - Date-based sorts: New releases haven't accumulated votes yet
        - Alphabetical sorts: Ordering doesn't imply quality threshold
        - Ascending popularity: Least popular movies by definition have few interactions
        - Now-playing endpoint: Recent theatrical releases may have low initial votes
        - Upcoming endpoint: Unreleased movies have zero votes

    Usage:
        threshold = VoteCountPolicy.get_threshold(endpoint="browse", sort_by="popularity.desc")
    """

    DEFAULT_THRESHOLD = VOTE_COUNT_THRESHOLD

    @classmethod
    def should_bypass_for_sort(cls, sort_by: str) -> bool:
        """Determine if vote count filter should be bypassed based on sort type.

        Args:
            sort_by: TMDB sort parameter (e.g., "popularity.desc", "original_title.asc")

        Returns:
            True if filtering should be bypassed, False if threshold should apply
        """
        return (
            "release_date" in sort_by
            or "original_title" in sort_by
            or sort_by == "popularity.asc"
        )

    @classmethod
    def should_bypass_for_endpoint(cls, endpoint: EndpointType) -> bool:
        """Determine if vote count filter should be bypassed based on endpoint.

        Args:
            endpoint: The API endpoint type

        Returns:
            True if filtering should be bypassed, False if threshold should apply
        """
        return endpoint in ("now_playing", "upcoming")

    @classmethod
    def get_threshold(
        cls,
        endpoint: EndpointType = "browse",
        sort_by: str | None = None,
    ) -> int | None:
        """Get the appropriate vote count threshold for given context.

        Args:
            endpoint: The API endpoint type (default: "browse")
            sort_by: Optional TMDB sort parameter

        Returns:
            Vote count threshold (int) or None if filtering should be bypassed
        """
        if cls.should_bypass_for_endpoint(endpoint):
            return None

        if sort_by and cls.should_bypass_for_sort(sort_by):
            return None

        return cls.DEFAULT_THRESHOLD


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
