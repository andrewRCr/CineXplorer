"""
Filter parameter mapping and TMDB API parameter building.

This module handles the conversion of service-layer filter parameters to TMDB API
parameters, including parameter name mapping and type preservation logic.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import cast

from pydantic import BaseModel, ConfigDict

# Minimum vote threshold for data quality filtering
# Movies with fewer votes have unreliable ratings
MIN_VOTE_COUNT = 10


class ServiceParams(BaseModel):
    """Service layer parameters for movie discovery.

    This Pydantic model provides:
    - Runtime validation
    - Attribute access (params.year_min) with IDE type awareness
    - extra="forbid" to catch typos at runtime
    - Consistent pattern with Django Ninja schemas

    TMDB API params use underscore notation (Pythonic), converted to dot notation
    in get_tmdb_params() for TMDB API compatibility.
    """

    # TMDB API params
    sort_by: str | None = None
    genres: str | None = None
    keywords: str | None = None
    people: str | None = None
    year: int | None = None
    vote_average_gte: float | None = None
    vote_average_lte: float | None = None
    vote_count_gte: int | None = None
    vote_count_lte: int | None = None
    release_date_gte: str | None = None
    release_date_lte: str | None = None
    certification: str | None = None
    region: str | None = None
    with_release_type: str | None = None
    tmdb_page_start: int | None = None

    # Backend filtering params (not sent to TMDB API)
    year_min: int | None = None
    year_max: int | None = None
    rating_min: float | None = None
    rating_max: float | None = None
    min_vote_count: int | None = MIN_VOTE_COUNT  # None = disabled, int = threshold

    model_config = ConfigDict(extra="forbid")

    def get_tmdb_params(self) -> dict[str, str | int | float | bool]:
        """Get TMDB API params with dot notation, excluding backend-only fields.

        Converts underscore notation (Pythonic) to dot notation (TMDB API format)
        and excludes backend-only filtering parameters.

        Returns:
            Dictionary ready for build_tmdb_params() with dot notation keys
        """
        # Backend-only fields that shouldn't go to TMDB API
        backend_only = {
            'year_min', 'year_max', 'rating_min', 'rating_max', 'min_vote_count'
        }

        # Map underscore to dot notation for TMDB API
        underscore_to_dot = {
            'vote_average_gte': 'vote_average.gte',
            'vote_average_lte': 'vote_average.lte',
            'vote_count_gte': 'vote_count.gte',
            'vote_count_lte': 'vote_count.lte',
            'release_date_gte': 'release_date.gte',
            'release_date_lte': 'release_date.lte',
        }

        result: dict[str, str | int | float | bool] = {}
        for key, value in self.model_dump(exclude_none=True).items():
            if key in backend_only:
                continue
            # Convert to dot notation if needed
            output_key = underscore_to_dot.get(key, key)
            result[output_key] = value

        return result

# Parameter mapping: service parameter names (dot notation) → TMDB API parameter names
# This is the single source of truth for all parameter name transformations.
# Schema layer uses this for HTTP → service conversion, build_tmdb_params uses it for API calls.
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

# HTTP param name → ServiceParams field name (underscore notation)
# Used by schema layer to map HTTP parameters to ServiceParams fields
# Most are identity mappings since HTTP uses underscores, ServiceParams uses underscores
HTTP_TO_SERVICE_MAPPING: dict[str, str] = {
    'vote_average_gte': 'vote_average_gte',
    'vote_average_lte': 'vote_average_lte',
    'vote_count_gte': 'vote_count_gte',
    'vote_count_lte': 'vote_count_lte',
    'release_date_gte': 'release_date_gte',
    'release_date_lte': 'release_date_lte',
    'sort_by': 'sort_by',
    'year': 'year',
    'certification': 'certification',
    'region': 'region',
    'tmdb_page_start': 'tmdb_page_start',
}

# Derived parameter transforms: source HTTP field → (target service param, transform function)
# Used for backend filtering parameters that are derived from HTTP inputs
# Transform functions: object → int | float (typed at transform boundary)
DERIVED_PARAM_TRANSFORMS: dict[str, tuple[str, Callable[[object], int | float]]] = {
    # Year extraction from ISO date strings (e.g., '2020-01-01' → 2020)
    'release_date_gte': ('year_min', lambda v: int(str(v)[:4])),
    'release_date_lte': ('year_max', lambda v: int(str(v)[:4])),
    # Rating passthrough (Pydantic validates as float, cast tells type checker)
    'vote_average_gte': ('rating_min', lambda v: cast(float, v)),
    'vote_average_lte': ('rating_max', lambda v: cast(float, v)),
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
