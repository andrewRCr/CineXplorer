"""Data quality filters for TMDB API responses.

This module provides the filter implementations that apply policies defined in
policy.py. These are "second pass" filters applied to TMDB responses, distinct
from TMDB query parameters (first pass) in tmdb_api_boundary/query_params.py.

Architecture:
    policy.py - Defines "what" and "why" (rules, thresholds, rationale)
    filters.py - Implements "how" (list filtering operations)

TMDB API Quirks Addressed:
    - Year filtering: TMDB sometimes returns movies from wrong decades
    - Rating filtering: TMDB returns movies with 0.0 ratings despite filters
    - Runtime filtering: NOT SUPPORTED (requires individual movie detail fetches)

Filter Pipeline (applied in apply_data_quality_filters):
    1. Blacklist filtering (content policy - exclude specific TMDB IDs)
    2. Completeness filter (always enabled - basic quality requirement)
    3. Year filtering (always enabled for historical validation)
    4. Rating filtering with vote threshold
"""

from __future__ import annotations

import logging

from core.tmdb_models.tmdb_responses import TMDBMovieBase
from django.core.cache import cache
from movie.schemas import MovieBaseSchema

from .policy import (
    EARLIEST_VALID_RELEASE_YEAR,
    VOTE_COUNT_THRESHOLD,
    CompletenessPolicy,
)

logger = logging.getLogger('cinexplorer.tmdb')

# Cache settings for blacklisted movie IDs
BLACKLIST_CACHE_KEY = "movie_blacklist_ids"
BLACKLIST_CACHE_TIMEOUT = 300  # 5 minutes

__all__ = [
    'apply_data_quality_filters',
    'filter_movies_by_blacklist',
    'filter_movies_by_completeness',
    'filter_movies_by_rating',
    'filter_movies_by_year',
    'get_blacklisted_ids',
]


# ============================================================================
# Orchestration Function (Main Entry Point)
# ============================================================================


def apply_data_quality_filters(
    movies: list[TMDBMovieBase],
    year_min: int | None = None,
    year_max: int | None = None,
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = VOTE_COUNT_THRESHOLD,
) -> list[MovieBaseSchema]:
    """Apply all data quality filters to TMDB movie list.

    This is the main orchestration function for second-pass filtering. It converts
    TMDB response models to application schemas and applies the full filter pipeline.

    Args:
        movies: List of TMDBMovieBase objects from API response
        year_min: Minimum release year (inclusive), None for no lower bound
        year_max: Maximum release year (inclusive), None for no upper bound
        rating_min: Minimum rating (inclusive), None for no lower bound
        rating_max: Maximum rating (inclusive), None for no upper bound
        min_vote_count: Minimum vote count threshold. None to skip vote filtering.
            Default: VOTE_COUNT_THRESHOLD (10)

    Returns:
        Filtered list of MovieBaseSchema objects matching all criteria

    Pipeline Order:
        1. Blacklist filter - exclude problematic TMDB IDs (runs first for efficiency)
        2. Completeness filter - require poster, title, genres, overview
        3. Year filter - validate release year (includes 1888 historical check)
        4. Rating filter - apply rating range and vote count threshold
    """
    # Convert TMDB models to schemas (map id → tmdb_id for compatibility)
    movie_schemas: list[MovieBaseSchema] = []
    for m in movies:
        movie_dict = m.model_dump()
        movie_dict['tmdb_id'] = movie_dict.pop('id')
        # Normalize empty string dates to None (TMDB API quirk)
        if movie_dict.get('release_date') == '':
            movie_dict['release_date'] = None
        movie_schemas.append(MovieBaseSchema.model_validate(movie_dict))

    # Apply filter pipeline
    movie_schemas = filter_movies_by_blacklist(movie_schemas)
    movie_schemas = filter_movies_by_completeness(movie_schemas)
    movie_schemas = filter_movies_by_year(movie_schemas, year_min, year_max)
    movie_schemas = filter_movies_by_rating(
        movie_schemas, rating_min, rating_max, min_vote_count=min_vote_count
    )

    return movie_schemas


# ============================================================================
# Blacklist Filtering
# ============================================================================


def get_blacklisted_ids() -> set[int]:
    """Get set of blacklisted TMDB movie IDs from cache or database.

    Results are cached for 5 minutes to avoid repeated database queries.
    """
    cached = cache.get(BLACKLIST_CACHE_KEY)
    if cached is not None:
        return cached

    from movie.models import BlacklistedMovie

    blacklist_ids = set(
        BlacklistedMovie.objects.values_list("tmdb_id", flat=True)
    )

    cache.set(BLACKLIST_CACHE_KEY, blacklist_ids, BLACKLIST_CACHE_TIMEOUT)
    logger.debug(f"Loaded {len(blacklist_ids)} blacklisted movie IDs from database")

    return blacklist_ids


def filter_movies_by_blacklist(
    movies: list[MovieBaseSchema],
) -> list[MovieBaseSchema]:
    """Filter out movies on the blacklist.

    Excludes movies whose TMDB IDs are in the BlacklistedMovie table.
    This is a content policy filter for problematic TMDB content.
    """
    blacklist_ids = get_blacklisted_ids()

    if not blacklist_ids:
        return movies

    return [m for m in movies if m.tmdb_id not in blacklist_ids]


# ============================================================================
# Completeness Filtering
# ============================================================================


def filter_movies_by_completeness(
    movies: list[MovieBaseSchema],
) -> list[MovieBaseSchema]:
    """Filter to movies meeting completeness requirements.

    Uses CompletenessPolicy to validate each movie has required display data.
    See policy.py CompletenessPolicy for validation rules and rationale.
    """
    return [m for m in movies if CompletenessPolicy.is_complete(m)]


# ============================================================================
# Year Filtering
# ============================================================================


def filter_movies_by_year(
    movies: list[MovieBaseSchema],
    year_min: int | None = None,
    year_max: int | None = None,
) -> list[MovieBaseSchema]:
    """Filter movies by release year range with historical validation.

    Always excludes movies before EARLIEST_VALID_RELEASE_YEAR (1888) regardless
    of user-specified filters. See policy.py for historical validation rationale.

    Args:
        movies: List of MovieBaseSchema objects to filter
        year_min: Minimum year (inclusive). None means no lower bound.
        year_max: Maximum year (inclusive). None means no upper bound.

    Returns:
        Filtered list. Movies without release_date are excluded.
    """
    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        if movie.release_date is None:
            continue

        movie_year = movie.release_date.year

        # Historical validation (always applied)
        if movie_year < EARLIEST_VALID_RELEASE_YEAR:
            continue

        # User-specified year range
        if year_min is not None and movie_year < year_min:
            continue
        if year_max is not None and movie_year > year_max:
            continue

        filtered.append(movie)

    return filtered


# ============================================================================
# Rating Filtering
# ============================================================================


def filter_movies_by_rating(
    movies: list[MovieBaseSchema],
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = VOTE_COUNT_THRESHOLD,
) -> list[MovieBaseSchema]:
    """Filter movies by rating range with vote count quality check.

    Vote count filtering can be applied independently of rating filtering
    for general browsing quality. See policy.py VoteCountPolicy for threshold
    bypass rules.

    Args:
        movies: List of MovieBaseSchema objects to filter
        rating_min: Minimum rating (inclusive, 0.0-10.0). None for no lower bound.
        rating_max: Maximum rating (inclusive, 0.0-10.0). None for no upper bound.
        min_vote_count: Minimum votes required. None to skip. Default: VOTE_COUNT_THRESHOLD.

    Returns:
        Filtered list matching all specified criteria.
    """
    # Fast path: no filters
    if rating_min is None and rating_max is None and min_vote_count is None:
        return movies

    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Vote count check (independent of rating filters)
        if min_vote_count is not None and (
            movie.vote_count is None or movie.vote_count < min_vote_count
        ):
            continue

        # Rating range checks (only if filters specified)
        if rating_min is not None or rating_max is not None:
            if movie.vote_average is None:
                continue

            if rating_min is not None and movie.vote_average < rating_min:
                continue
            if rating_max is not None and movie.vote_average > rating_max:
                continue

        filtered.append(movie)

    return filtered


# ============================================================================
# Runtime Filtering (NOT IMPLEMENTED)
# ============================================================================
# Runtime filtering is NOT implemented because TMDB discover/search endpoints
# do not return runtime data. Would require N separate API calls to movie
# details endpoint, which is impractical given rate limits (40 req/10 sec).
# See module docstring for more details.
# ============================================================================
