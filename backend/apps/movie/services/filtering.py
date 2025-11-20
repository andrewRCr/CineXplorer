"""
Filter parameter mapping and TMDB API parameter building.

This module handles the conversion of service-layer filter parameters to TMDB API
parameters, including parameter name mapping and type preservation logic.
"""

from __future__ import annotations

from .result_filtering import MIN_VOTE_COUNT

# Filter mapping: service parameter names → TMDB API parameter names
# Supports both underscore (direct service calls) and dot (API layer) parameter names
FILTER_MAPPING: dict[str, str] = {
    'sort_by': 'sort_by',
    'genres': 'with_genres',
    'year': 'year',
    'vote_average_gte': 'vote_average.gte',  # Direct service calls with underscore
    'vote_average.gte': 'vote_average.gte',  # API sends with dot
    'vote_average_lte': 'vote_average.lte',  # Direct service calls with underscore
    'vote_average.lte': 'vote_average.lte',  # API sends with dot
    'vote_count_gte': 'vote_count.gte',  # Min vote count for quality filtering
    'vote_count.gte': 'vote_count.gte',  # API sends with dot
    'vote_count_lte': 'vote_count.lte',  # Max vote count
    'vote_count.lte': 'vote_count.lte',  # API sends with dot
    'keywords': 'with_keywords',
    'people': 'with_people',
    'release_date_gte': 'primary_release_date.gte',  # Direct service calls with underscore
    'release_date.gte': 'primary_release_date.gte',  # API sends with dot
    'release_date_lte': 'primary_release_date.lte',  # Direct service calls with underscore
    'release_date.lte': 'primary_release_date.lte',  # API sends with dot
    'certification': 'certification',
    'with_release_type': 'with_release_type',  # Theatrical release type filtering
}

# Numeric parameters that should preserve type (not convert to string)
# Used during filter mapping to TMDB API parameters
NUMERIC_FILTER_PARAMS: frozenset[str] = frozenset([
    'year',
    'primary_release_year',
    'vote_average_gte',
    'vote_average.gte',
    'vote_average_lte',
    'vote_average.lte',
    'vote_count',
    'vote_count_gte',
    'vote_count.gte',
    'vote_count_lte',
    'vote_count.lte',
    'runtime',
    'runtime_gte',
    'runtime.gte',
    'runtime_lte',
    'runtime.lte',
])


def build_tmdb_params(
    page: int,
    rating_min: float | None = None,
    rating_max: float | None = None,
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
    for filter_name, tmdb_param in FILTER_MAPPING.items():
        if filter_name in filters and filters[filter_name] is not None:
            # Preserve data types for numeric parameters, convert others to string
            if filter_name in NUMERIC_FILTER_PARAMS:
                params[tmdb_param] = filters[filter_name]
            else:
                params[tmdb_param] = str(filters[filter_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    # Add rating filters to TMDB params for first-pass filtering
    # This prevents excessive backend filtering and buffer page fetching
    if rating_min is not None:
        params['vote_average.gte'] = rating_min
    if rating_max is not None:
        params['vote_average.lte'] = rating_max

    # Auto-add vote_count.gte for rating-based sorts to ensure results pass backend filter
    # Without this, rating sorts return movies with <10 votes that get filtered out
    # Uses MIN_VOTE_COUNT (10) for data quality, not curation - true sorting behavior
    # (Curated "top rated" content belongs in Collections feature, not sort controls)
    sort_by = params.get('sort_by', '')
    if (
        isinstance(sort_by, str)
        and 'vote_average' in sort_by
        and 'vote_count.gte' not in params
    ):
        params['vote_count.gte'] = MIN_VOTE_COUNT

    return params
