"""
TMDB API parameter building.

This module handles the conversion of ServiceParams to TMDB API parameters,
including parameter name mapping and type preservation logic.

For HTTP → ServiceParams transformation, see api_boundary.param_transformer.
"""

from __future__ import annotations

from ..api_boundary.service_params import ServiceParams
from ..data_quality.policy import VOTE_COUNT_THRESHOLD

# Re-export ServiceParams for backwards compatibility with existing imports
__all__ = ["NUMERIC_PARAMS", "PARAM_MAPPING", "ServiceParams", "build_tmdb_params"]

# Parameter mapping: service parameter names (dot notation) → TMDB API parameter names
# This is the single source of truth for ServiceParams → TMDB API parameter name transformations.
PARAM_MAPPING: dict[str, str] = {
    'sort_by': 'sort_by',
    'genres': 'with_genres',
    'year': 'year',
    'vote_average.gte': 'vote_average.gte',
    'vote_average.lte': 'vote_average.lte',
    'vote_count.gte': 'vote_count.gte',
    'vote_count.lte': 'vote_count.lte',
    'keywords': 'with_keywords',
    'people': 'with_people',
    'release_date.gte': 'primary_release_date.gte',
    'release_date.lte': 'primary_release_date.lte',
    'certification': 'certification',
    'with_release_type': 'with_release_type',
    'region': 'region',
    'tmdb_page_start': 'tmdb_page_start',
}

# Numeric parameters that should preserve type (not convert to string)
# Used during filter mapping to TMDB API parameters
# Only dot notation needed since service layer uses dot notation exclusively
NUMERIC_PARAMS: frozenset[str] = frozenset([
    'year',
    'primary_release_year',
    'vote_average.gte',
    'vote_average.lte',
    'vote_count.gte',
    'vote_count.lte',
    'runtime.gte',
    'runtime.lte',
])


def build_tmdb_params(
    page: int,
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = None,
    **filters: str | int | float | bool | None
) -> dict[str, str | int | float | bool | None]:
    """
    Build TMDB API parameters from service-layer filters.

    Converts service parameter names to TMDB API parameter names, preserves
    numeric types for appropriate parameters, and adds default values.

    Args:
        page: Page number for pagination
        rating_min: Minimum rating (inclusive), added to TMDB params for first-pass filtering
        rating_max: Maximum rating (inclusive), added to TMDB params for first-pass filtering
        min_vote_count: Minimum vote count threshold for TMDB first-pass filtering.
            Should match the backend filter threshold from VoteCountPolicy.
            If None, a fallback is used for rating sorts (VOTE_COUNT_THRESHOLD).
        **filters: Discovery filters using service parameter names:
            - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
            - genres: Comma-separated genre IDs
            - year: Release year
            - vote_average_gte/lte: Rating range
            - keywords: Comma-separated keyword IDs
            - people: Comma-separated person IDs
            - release_date_gte/lte: Release date range (mapped to primary_release_date)
            - with_release_type: Release type (2|3 for theatrical)
            - certification: Certification rating

    Returns:
        Dictionary of TMDB API parameters ready for API call

    Example:
        >>> params = build_tmdb_params(
        ...     page=1,
        ...     rating_min=7.0,
        ...     genres="28,12",
        ...     sort_by="popularity.desc"
        ... )
        >>> params['with_genres']
        '28,12'
        >>> params['vote_average.gte']
        7.0

    Note:
        Region parameter is NOT included - incompatible with primary_release_date filters
        per TMDB API research (see research-tmdb-api-date-filtering.md).
    """
    # Build TMDB API parameters
    # Start as mutable dict for construction, will be passed as TMDBParams (immutable Mapping)
    params: dict[str, str | int | float | bool | None] = {
        "include_adult": False,
        "include_video": False,
        "language": "en-US",
        # NOTE: 'region' parameter is NOT compatible with primary_release_date filters
        # When region is specified with primary_release_date, TMDB's behavior becomes
        # undefined - it may ignore date filters or check ALL release dates worldwide.
        # See: TMDB API research (external-research-analyst, 2025-10-27)
        # For year-based filtering, we use primary_release_date without region.
        # "region": filters.get('region', 'US'),  # REMOVED - incompatible
        "page": page,
    }

    # Apply filters using module-level mapping constants
    for param_name, tmdb_param in PARAM_MAPPING.items():
        if param_name in filters and filters[param_name] is not None:
            # Preserve data types for numeric parameters, convert others to string
            if param_name in NUMERIC_PARAMS:
                params[tmdb_param] = filters[param_name]
            else:
                params[tmdb_param] = str(filters[param_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    # Add rating filters to TMDB params for first-pass filtering
    # This prevents excessive backend filtering and buffer page fetching
    if rating_min is not None:
        params['vote_average.gte'] = rating_min
    if rating_max is not None:
        params['vote_average.lte'] = rating_max

    # Set vote_count.gte to match backend filter threshold for consistency
    # This ensures TMDB sends movies that will pass our backend vote count filter,
    # preventing excessive filtering that causes page underfill.
    # Priority: explicit min_vote_count > fallback for rating sorts
    if min_vote_count is not None and 'vote_count.gte' not in params:
        params['vote_count.gte'] = min_vote_count
    elif (
        isinstance(params.get('sort_by', ''), str)
        and 'vote_average' in str(params.get('sort_by', ''))
        and 'vote_count.gte' not in params
    ):
        # Fallback: rating sorts need some threshold even if min_vote_count not provided
        params['vote_count.gte'] = VOTE_COUNT_THRESHOLD

    return params
