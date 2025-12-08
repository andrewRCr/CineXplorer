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
from ..api_boundary import BrowseServiceParams, SearchServiceParams
from ..data_quality.filters import apply_data_quality_filters
from .response_builder import build_filtered_response

if TYPE_CHECKING:
    from collections.abc import Callable

# Use TMDB-specific logger for consistency
logger = logging.getLogger('cinexplorer.tmdb')


def apply_buffer_if_needed(
    filtered_movies: list[MovieBaseSchema],
    current_page: int,
    total_pages: int,
    params: BrowseServiceParams | SearchServiceParams,
    fetch_next_page_func: Callable[[int], TMDBPaginatedMovieResponse],
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
        params: Service params with filter values (BrowseServiceParams or SearchServiceParams)
        fetch_next_page_func: Function to fetch next page (takes page number)

    Returns:
        Tuple of (movies, pages_consumed) where:
        - movies: Up to 20 movies with buffer applied if needed
        - pages_consumed: Total TMDB pages consumed (includes initial page)

    Note:
        Deduplication by tmdb_id ensures no duplicates across page boundaries.
        Blacklist filtering is handled by apply_data_quality_filters().
    """
    # Extract filter values from params
    # BrowseServiceParams has min_vote_count and language; SearchServiceParams doesn't
    year_min = params.year_min
    year_max = params.year_max
    rating_min = params.rating_min
    rating_max = params.rating_max
    min_vote_count = getattr(params, 'min_vote_count', None)
    language_filter = getattr(params, 'language', None)

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
            min_vote_count,
            language_filter
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
    params: BrowseServiceParams | SearchServiceParams,
    pre_filter_func: Callable[[list[TMDBMovieBase]], list[TMDBMovieBase]] | None = None,
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
        params: Service params with filter values (BrowseServiceParams or SearchServiceParams).
            Extracts: year_min/max, rating_min/max from both types.
            BrowseServiceParams also: tmdb_page_start, min_vote_count, language.
            SearchServiceParams also: query.
        pre_filter_func: Optional pre-filter function (e.g., non-visual filtering)
            Takes list[TMDBMovieBase], returns list[TMDBMovieBase]
            Applied BEFORE year/rating filters

    Returns:
        PaginatedMovieResponseSchema with filtered and buffered results, including
        next_tmdb_page_start metadata for pagination continuation

    Note:
        Template method pattern: invariant workflow with variant behavior
        injection via fetch_page_func and pre_filter_func.
    """
    # Extract filter values from params
    # BrowseServiceParams has tmdb_page_start, min_vote_count, language; Search doesn't
    year_min = params.year_min
    year_max = params.year_max
    rating_min = params.rating_min
    rating_max = params.rating_max
    tmdb_page_start = getattr(params, 'tmdb_page_start', None)
    min_vote_count = getattr(params, 'min_vote_count', None)
    language_filter = getattr(params, 'language', None)

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
        min_vote_count,
        language_filter
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
        params,
        buffer_fetch_func,
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
