"""HTTP to ServiceParams transformation logic.

This module handles the conversion of HTTP request parameters (from Django Ninja schemas)
into ServiceParams for the service layer. It extracts parameters for both:
1. TMDB API filtering (primary) - Reduces millions of movies to thousands
2. Backend filtering (second-pass) - Catches TMDB data quality issues

The transformation is the boundary between HTTP/API concerns and service layer logic.
This includes computing context-aware vote count thresholds via VoteCountPolicy.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, cast

from ..data_quality.policy import VoteCountPolicy
from .service_params import ServiceParams

if TYPE_CHECKING:
    from movie.schemas import MovieDiscoverFilterSchema


# HTTP param name → ServiceParams field name (underscore notation)
# Used to map HTTP parameters to ServiceParams fields.
# Most are identity mappings since HTTP uses underscores, ServiceParams uses underscores.
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
# Used for backend filtering parameters that are derived from HTTP inputs.
# Transform functions: object → int | float (typed at transform boundary)
DERIVED_PARAM_TRANSFORMS: dict[str, tuple[str, Callable[[object], int | float]]] = {
    # Year extraction from ISO date strings (e.g., '2020-01-01' → 2020)
    'release_date_gte': ('year_min', lambda v: int(str(v)[:4])),
    'release_date_lte': ('year_max', lambda v: int(str(v)[:4])),
    # Rating passthrough (Pydantic validates as float, cast tells type checker)
    'vote_average_gte': ('rating_min', lambda v: cast(float, v)),
    'vote_average_lte': ('rating_max', lambda v: cast(float, v)),
}


def _apply_derived_params(
    data: dict[str, object],
    params: dict[str, str | int | float | bool | None]
) -> None:
    """Apply derived parameters (backend filtering, aliases, transformations).

    Args:
        data: Raw HTTP parameter data from schema
        params: Target dictionary to populate with derived parameters
    """
    # Apply declarative transforms from mapping (year extraction, rating passthrough)
    for source_key, (target_key, transform) in DERIVED_PARAM_TRANSFORMS.items():
        if source_key in data:
            params[target_key] = transform(data[source_key])

    # Alias handling: 'genres' or 'with_genres' → 'genres'
    if 'genres' in data:
        params['genres'] = cast(str, data['genres'])
    elif 'with_genres' in data:
        params['genres'] = cast(str, data['with_genres'])

    # Decade conversion: "1990s" → date range
    if 'decade' in data:
        try:
            decade_str = str(data['decade'])
            year = int(decade_str[:4])
            start_year = year if decade_str.endswith('s') else (year // 10) * 10
            end_year = start_year + 9
            params['release_date_gte'] = f"{start_year}-01-01"
            params['release_date_lte'] = f"{end_year}-12-31"
        except (ValueError, TypeError):
            pass


def transform_to_service_params(schema: MovieDiscoverFilterSchema) -> ServiceParams:
    """Transform HTTP filter schema to ServiceParams.

    This function extracts parameters for both:
    1. TMDB API filtering (primary filter - reduces millions to thousands)
    2. Backend filtering (second-pass data hygiene - catches TMDB quality issues)
    3. Vote count threshold (computed via VoteCountPolicy based on context)

    Args:
        schema: MovieDiscoverFilterSchema from HTTP request

    Returns:
        ServiceParams model with validated parameters
    """
    # Get all non-None values from schema using Pydantic's model_dump
    data = schema.model_dump(exclude_none=True)
    params: dict[str, str | int | float | bool | None] = {}

    # Apply field mappings
    for http_field, service_param in HTTP_TO_SERVICE_MAPPING.items():
        if http_field in data:
            params[service_param] = data[http_field]  # type: ignore[assignment]

    # Apply derived parameters (backend filtering, aliases, transformations)
    _apply_derived_params(data, params)

    # Compute vote count threshold based on context (sort_by, year_max, rating filters)
    # VoteCountPolicy determines appropriate tier: STRICT, MODERATE, or BYPASS
    sort_by = cast(str | None, params.get('sort_by'))
    year_max = cast(int | None, params.get('year_max'))
    rating_min = cast(float | None, params.get('rating_min'))
    rating_max = cast(float | None, params.get('rating_max'))
    params['min_vote_count'] = VoteCountPolicy.get_threshold(
        endpoint="browse",
        sort_by=sort_by,
        year_max=year_max,
        rating_min=rating_min,
        rating_max=rating_max,
    )

    # Use model_validate for type coercion from mixed dict types
    return ServiceParams.model_validate(params)


__all__ = [
    "DERIVED_PARAM_TRANSFORMS",
    "HTTP_TO_SERVICE_MAPPING",
    "transform_to_service_params",
]
