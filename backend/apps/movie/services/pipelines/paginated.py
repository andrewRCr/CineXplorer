"""
Pagination and buffer management utilities for TMDB movie responses.

This module provides composable helper functions for paginated movie fetching,
filtering, and buffer management to maintain consistent page sizes.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from core.tmdb_models.tmdb_responses import TMDBMovieBase, TMDBPaginatedMovieResponse

from ...schemas import MovieBaseSchema, PaginatedMovieResponseSchema
from ..data_quality.filters import apply_data_quality_filters
from ..tmdb_api_boundary.query_params import MIN_VOTE_COUNT
from ..tmdb_api_boundary.response_factories import create_paginated_movie_response_from_tmdb

if TYPE_CHECKING:
    from collections.abc import Callable

# Use TMDB-specific logger for consistency
logger = logging.getLogger('cinexplorer.tmdb')


def convert_schema_to_tmdb_movie(schema: MovieBaseSchema) -> TMDBMovieBase:
    """Convert MovieBaseSchema back to TMDBMovieBase for TMDB response.

    Args:
        schema: MovieBaseSchema instance to convert

    Returns:
        TMDBMovieBase instance with properly mapped fields

    Note:
        Performs bidirectional schema conversion for response building.
        Maps tmdb_id → id and converts date objects to strings.
    """
    movie_dict = schema.model_dump()
    # Map tmdb_id → id
    movie_dict['id'] = movie_dict.pop('tmdb_id')
    # Convert date object to string if present
    if movie_dict.get('release_date'):
        movie_dict['release_date'] = movie_dict['release_date'].strftime('%Y-%m-%d')
    return TMDBMovieBase.model_validate(movie_dict)


def build_filtered_response(
    movies: list[MovieBaseSchema],
    page: int,
    total_pages: int,
    total_results: int,
    next_tmdb_page_start: int | None = None
) -> PaginatedMovieResponseSchema:
    """Build a paginated movie response from filtered MovieBaseSchema list.

    Handles the conversion from MovieBaseSchema back to TMDB format and
    wraps it in a paginated response structure.

    Args:
        movies: Filtered list of MovieBaseSchema objects
        page: Current page number
        total_pages: Total pages available
        total_results: Total results available (from original TMDB response)
        next_tmdb_page_start: Next TMDB page to fetch for pagination continuation
            (smart buffer tracking to prevent duplicates)

    Returns:
        PaginatedMovieResponseSchema with converted movie data

    Note:
        This function encapsulates the common pattern of:
        1. Converting MovieBaseSchema → TMDBMovieBase
        2. Creating TMDBPaginatedMovieResponse
        3. Converting to PaginatedMovieResponseSchema

        The total_results preserves the original TMDB count, even though
        the results array may be smaller due to backend filtering (completeness,
        year, rating filters). This maintains accurate pagination display.
    """
    # Convert MovieBaseSchema back to TMDBMovieBase
    tmdb_movies = [convert_schema_to_tmdb_movie(m) for m in movies]

    # Create TMDB response structure
    filtered_response = TMDBPaginatedMovieResponse(
        page=page,
        total_pages=total_pages,
        total_results=total_results,
        results=tmdb_movies
    )

    # Convert to application schema
    response = create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    # Include pagination metadata if provided
    if next_tmdb_page_start is not None:
        response.next_tmdb_page_start = next_tmdb_page_start

    return response


def apply_buffer_if_needed(
    filtered_movies: list[MovieBaseSchema],
    current_page: int,
    total_pages: int,
    year_min: int | None,
    year_max: int | None,
    rating_min: float | None,
    rating_max: float | None,
    fetch_next_page_func: Callable[[int], TMDBPaginatedMovieResponse],
    min_vote_count: int | None = MIN_VOTE_COUNT,
) -> tuple[list[MovieBaseSchema], int]:
    """Apply smart buffer mechanism to maintain consistent page sizes.

    Smart buffer logic:
    - If we have >= 20 results: Return first 20 (full page achieved)
    - If we have < 20 results AND more pages available: Keep fetching
      additional pages until we reach 20 results or run out of pages
    - Safety limit: Maximum 5 additional page fetches to prevent pathological cases

    This ensures consistent 20-result pages even with very restrictive filters
    (e.g., rating 0-6.0) as long as sufficient results exist in the dataset.

    Args:
        filtered_movies: Movies from current page after filtering
        current_page: Current page number
        total_pages: Total pages available
        year_min: Year filter (passed to buffer page)
        year_max: Year filter (passed to buffer page)
        rating_min: Rating filter (passed to buffer page)
        rating_max: Rating filter (passed to buffer page)
        fetch_next_page_func: Function to fetch next page (takes page number)
        min_vote_count: Minimum vote count threshold (passed to buffer page).
            Default: MIN_VOTE_COUNT (10)

    Returns:
        Tuple of (movies, pages_consumed) where:
        - movies: Up to 20 movies with buffer applied if needed
        - pages_consumed: Total TMDB pages consumed (includes initial page)

    Note:
        Deduplication by tmdb_id ensures no duplicates across page boundaries.
        Blacklist filtering is handled by apply_data_quality_filters().
    """
    # Full page achieved - return first 20 with page count = 1
    if len(filtered_movies) >= 20:
        return (filtered_movies[:20], 1)

    # If we're on the last page, return what we have with page count = 1
    if current_page >= total_pages:
        return (filtered_movies, 1)

    # Smart buffering: Keep fetching pages until we have 20 unique results or run out
    combined_movies = filtered_movies
    next_page = current_page + 1
    max_buffer_pages = 5  # Safety limit to prevent excessive API calls

    pages_fetched = 0
    while (
        len(combined_movies) < 20
        and next_page <= total_pages
        and pages_fetched < max_buffer_pages
    ):
        # Fetch next page and apply same filters
        buffer_response = fetch_next_page_func(next_page)
        buffer_movies = apply_data_quality_filters(
            buffer_response.results,
            year_min,
            year_max,
            rating_min,
            rating_max,
            min_vote_count
        )

        combined_movies = combined_movies + buffer_movies
        next_page += 1
        pages_fetched += 1

        # Deduplicate by tmdb_id, preserving first occurrence order
        seen_ids: set[int] = set()
        deduplicated: list[MovieBaseSchema] = []
        for movie in combined_movies:
            if movie.tmdb_id not in seen_ids:
                seen_ids.add(movie.tmdb_id)
                deduplicated.append(movie)
        combined_movies = deduplicated

    # Return up to 20 unique movies + total pages consumed (initial + buffered)
    total_pages_consumed = 1 + pages_fetched
    return (combined_movies[:20], total_pages_consumed)


def fetch_with_filters_and_buffer(
    fetch_page_func: Callable[[int], TMDBPaginatedMovieResponse],
    page: int,
    year_min: int | None,
    year_max: int | None,
    rating_min: float | None,
    rating_max: float | None,
    pre_filter_func: Callable[[list[TMDBMovieBase]], list[TMDBMovieBase]] | None = None,
    tmdb_page_start: int | None = None,
    min_vote_count: int | None = MIN_VOTE_COUNT,
) -> PaginatedMovieResponseSchema:
    """Template function for paginated fetch-filter-buffer workflow.

    Encapsulates the common pattern used across all paginated movie methods:
    1. Fetch initial page using provided fetch function
    2. Apply optional pre-filter (e.g., non-visual content filtering for search)
    3. Check if year/rating filters are needed
    4. Apply year/rating filters if needed
    5. Apply buffer mechanism if needed (fetch page N+1 to backfill)
    6. Build filtered response with pagination metadata

    This eliminates ~160 lines of duplication across discover_movies,
    search_movies, get_now_playing_movies, and get_upcoming_movies.

    Args:
        fetch_page_func: Function to fetch a specific page (takes page_num: int)
            Returns TMDBPaginatedMovieResponse
        page: Current page number
        year_min: Minimum release year (inclusive), backend filtered (second-pass data hygiene)
        year_max: Maximum release year (inclusive), backend filtered (second-pass data hygiene)
        rating_min: Minimum rating (inclusive), backend filtered (second-pass data hygiene)
        rating_max: Maximum rating (inclusive), backend filtered (second-pass data hygiene)
        pre_filter_func: Optional pre-filter function (e.g., non-visual filtering)
            Takes list[TMDBMovieBase], returns list[TMDBMovieBase]
            Applied BEFORE year/rating filters
        tmdb_page_start: Starting TMDB page for smart buffer continuation.
            If provided, overrides `page` for TMDB fetching
            (enables metadata-driven pagination)
        min_vote_count: Minimum vote count threshold. None to skip vote filtering.
            Default: MIN_VOTE_COUNT (10)

    Returns:
        PaginatedMovieResponseSchema with filtered and buffered results, including
        next_tmdb_page_start metadata for pagination continuation

    Note:
        Template method pattern: invariant workflow with variant behavior
        injection via fetch_page_func and pre_filter_func.
    """
    # Step 1: Fetch initial page (use tmdb_page_start if provided, otherwise use page)
    effective_page = tmdb_page_start if tmdb_page_start is not None else page
    tmdb_response = fetch_page_func(effective_page)

    # Step 2: Apply optional pre-filter (e.g., non-visual content for search)
    movies = tmdb_response.results
    if pre_filter_func is not None:
        movies = pre_filter_func(movies)

    # Step 3: Apply completeness and year/rating filters (completeness always applied)
    # Note: Completeness filter is ALWAYS applied for UI quality, even without other filters
    original_count = len(movies)
    filtered_movies = apply_data_quality_filters(
        movies,
        year_min,
        year_max,
        rating_min,
        rating_max,
        min_vote_count
    )
    filtered_count = len(filtered_movies)

    # Log if any movies were filtered out (data quality issues)
    if filtered_count < original_count:
        removed_count = original_count - filtered_count
        logger.warning(
            f"Backend filtering removed {removed_count} movies from TMDB response "
            f"(TMDB sent {original_count}, we're returning {filtered_count})"
        )

    # Step 5: Apply buffer mechanism if needed
    # If pre-filter exists, wrap fetch function to apply it to buffer too
    if pre_filter_func is not None:
        def fetch_with_pre_filter(page_num: int) -> TMDBPaginatedMovieResponse:
            """Fetch buffer page and apply pre-filter."""
            buffer_response = fetch_page_func(page_num)
            buffer_filtered = pre_filter_func(buffer_response.results)
            return TMDBPaginatedMovieResponse(
                page=buffer_response.page,
                total_pages=buffer_response.total_pages,
                total_results=buffer_response.total_results,
                results=buffer_filtered
            )
        buffer_fetch_func = fetch_with_pre_filter
    else:
        buffer_fetch_func = fetch_page_func

    final_movies, pages_consumed = apply_buffer_if_needed(
        filtered_movies,
        effective_page,
        tmdb_response.total_pages,
        year_min,
        year_max,
        rating_min,
        rating_max,
        buffer_fetch_func,
        min_vote_count
    )

    # Step 6: Calculate next TMDB page start for pagination continuation
    next_tmdb_page_start = effective_page + pages_consumed

    # Step 7: Build filtered response with pagination metadata
    return build_filtered_response(
        final_movies,
        page,
        tmdb_response.total_pages,
        tmdb_response.total_results,
        next_tmdb_page_start
    )
