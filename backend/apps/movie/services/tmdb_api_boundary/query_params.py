"""
TMDB API parameter building.

This module handles the conversion of BrowseServiceParams to TMDB API parameters,
including parameter name mapping and type preservation logic.

Pipeline Position:
    HTTP Request → [param_transformer] → BrowseServiceParams → [query_params] → TMDB API
                                                                ^^^^^^^^^^^^^^^^
                                                                This module (step 2 of 2)

For HTTP → BrowseServiceParams transformation, see api_boundary.param_transformer.

Parameter Flow Reference (HTTP → BrowseServiceParams → TMDB API):
    ┌──────────────────────────────────────────────────────────────────────────────────┐
    │ HTTP Param           │ BrowseServiceParams Field │ TMDB API Param              │
    ├──────────────────────────────────────────────────────────────────────────────────┤
    │ sort_by              │ sort_by                   │ sort_by                     │
    │ genres / with_genres │ genres                    │ with_genres                 │
    │ release_date_gte     │ release_date_gte          │ primary_release_date.gte    │
    │ release_date_lte     │ release_date_lte          │ primary_release_date.lte    │
    │ vote_average_gte     │ vote_average_gte          │ vote_average.gte            │
    │ vote_average_lte     │ vote_average_lte          │ vote_average.lte            │
    │ vote_count_gte       │ vote_count_gte            │ vote_count.gte              │
    │ language             │ language                  │ with_original_language      │
    │ certification        │ certification             │ certification               │
    │ certification_country│ certification_country     │ certification_country       │
    │ year                 │ year                      │ year                        │
    └──────────────────────────────────────────────────────────────────────────────────┘

    Derived Parameters (computed in param_transformer):
    ┌──────────────────────────────────────────────────────────────────────────────────┐
    │ Source HTTP          │ Derived BrowseServiceParam │ Purpose                     │
    ├──────────────────────────────────────────────────────────────────────────────────┤
    │ release_date_gte     │ year_min                   │ Backend year filtering      │
    │ release_date_lte     │ year_max                   │ Backend year filtering      │
    │ vote_average_gte     │ rating_min                 │ Backend rating filtering    │
    │ vote_average_lte     │ rating_max                 │ Backend rating filtering    │
    │ (computed)           │ min_vote_count             │ VoteCountPolicy threshold   │
    └──────────────────────────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

from ..api_boundary.browse_service_params import BrowseServiceParams
from ..data_quality.policy import VOTE_COUNT_THRESHOLD

__all__ = ["NUMERIC_PARAMS", "PARAM_MAPPING", "BrowseServiceParams", "build_tmdb_params"]

# Parameter mapping: service parameter names (dot notation) → TMDB API parameter names
# Single source of truth for BrowseServiceParams → TMDB API param transformations.
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
    'certification_country': 'certification_country',
    'with_release_type': 'with_release_type',
    'region': 'region',
    'tmdb_page_start': 'tmdb_page_start',
    'language': 'with_original_language',  # Filter by movie's original language
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

    # Fix TMDB API bug: release_date sort doesn't work correctly with date range filters.
    # TMDB sorts by earliest regional release date globally, not the displayed release_date.
    # Using primary_release_date sort instead produces correct, consistent ordering.
    # See: https://www.themoviedb.org/talk/59d3f79ec3a3684561005cd5
    if params.get('sort_by') == 'release_date.asc':
        params['sort_by'] = 'primary_release_date.asc'
    elif params.get('sort_by') == 'release_date.desc':
        params['sort_by'] = 'primary_release_date.desc'

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
