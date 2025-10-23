"""
Result filtering helpers for TMDB API responses.

This module provides client-side filtering functions to handle TMDB API quirks:
- TMDB returns movies with incorrect release years despite API filters
- TMDB returns movies with placeholder ratings (0.0) despite rating filters

These functions are used by MovieService to filter results after fetching from TMDB,
ensuring users only see movies that match their filter criteria.

TMDB API Quirks (Data Hygiene Issues):
- Year filtering: TMDB sometimes returns movies from wrong decades, likely due to
  re-releases, international releases, or data entry errors
- Rating filtering: TMDB returns movies with 0.0 ratings (placeholders) despite
  rating filters being applied
- Genre filtering: Works correctly (TMDB handles this properly server-side)
- Runtime filtering: NOT SUPPORTED - TMDB API doesn't provide runtime filtering
  capability, would require fetching movie details for every result (expensive)

Related Frontend Code Being Replaced:
- frontend/src/utilities/movieFilterUtils.ts (filterMoviesByYear, filterMoviesByRating)
- frontend/src/hooks/useEnhancedFetcher.ts (client-side filtering logic)
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from movie.schemas import MovieBaseSchema


# ============================================================================
# Year Filtering
# ============================================================================


def filter_movies_by_year(
    movies: list[MovieBaseSchema],
    year_min: int | None = None,
    year_max: int | None = None,
) -> list[MovieBaseSchema]:
    """Filter movies by release year range.

    Filters out movies with release dates outside the specified year range.
    This is necessary because TMDB API sometimes returns movies from incorrect
    years despite API filters being applied (likely due to re-releases,
    international releases, or data hygiene issues).

    Args:
        movies: List of MovieBaseSchema objects to filter
        year_min: Minimum year (inclusive). None means no lower bound.
        year_max: Maximum year (inclusive). None means no upper bound.

    Returns:
        Filtered list containing only movies within the year range.
        Movies without release_date are excluded.

    Examples:
        >>> # Filter to 2020s movies
        >>> filtered = filter_movies_by_year(movies, year_min=2020, year_max=2029)

        >>> # Filter to movies from 2020 onward
        >>> filtered = filter_movies_by_year(movies, year_min=2020)

        >>> # Filter to movies up to 2020
        >>> filtered = filter_movies_by_year(movies, year_max=2020)

        >>> # Single year (2022 only)
        >>> filtered = filter_movies_by_year(movies, year_min=2022, year_max=2022)

    Note:
        Movies with missing release_date (None) are automatically filtered out,
        as we cannot determine if they match the year criteria.
    """
    # If no year filters specified, return all movies
    if year_min is None and year_max is None:
        return movies

    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Skip movies without release date
        if movie.release_date is None:
            continue

        movie_year = movie.release_date.year

        # Apply year range filters
        if year_min is not None and movie_year < year_min:
            continue
        if year_max is not None and movie_year > year_max:
            continue

        # Movie passes year filter
        filtered.append(movie)

    return filtered


# ============================================================================
# Rating Filtering
# ============================================================================


def filter_movies_by_rating(
    movies: list[MovieBaseSchema],
    rating_min: float | None = None,
    rating_max: float | None = None,
) -> list[MovieBaseSchema]:
    """Filter movies by vote average (rating) range.

    Filters out movies with ratings outside the specified range.
    This is necessary because TMDB API sometimes returns movies with placeholder
    0.0 ratings despite rating filters being applied (likely for movies with
    limited release data or alternative releases).

    Args:
        movies: List of MovieBaseSchema objects to filter
        rating_min: Minimum rating (inclusive, 0.0-10.0 scale). None means no lower bound.
        rating_max: Maximum rating (inclusive, 0.0-10.0 scale). None means no upper bound.

    Returns:
        Filtered list containing only movies within the rating range.
        Movies without vote_average are excluded.

    Examples:
        >>> # Filter to highly-rated movies (7.5+)
        >>> filtered = filter_movies_by_rating(movies, rating_min=7.5)

        >>> # Filter to rating range (7.0-8.5)
        >>> filtered = filter_movies_by_rating(movies, rating_min=7.0, rating_max=8.5)

        >>> # Filter to movies rated below 6.0
        >>> filtered = filter_movies_by_rating(movies, rating_max=6.0)

    Note:
        Movies with missing vote_average (None) are automatically filtered out,
        as we cannot determine if they match the rating criteria.

        TMDB ratings are on a 0.0-10.0 scale (e.g., 7.5 = 75%).
    """
    # If no rating filters specified, return all movies
    if rating_min is None and rating_max is None:
        return movies

    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Skip movies without rating
        if movie.vote_average is None:
            continue

        movie_rating = movie.vote_average

        # Apply rating range filters
        if rating_min is not None and movie_rating < rating_min:
            continue
        if rating_max is not None and movie_rating > rating_max:
            continue

        # Movie passes rating filter
        filtered.append(movie)

    return filtered


# ============================================================================
# Runtime Filtering (NOT IMPLEMENTED)
# ============================================================================
# Runtime filtering is NOT implemented because:
# 1. TMDB discover/search endpoints do NOT return runtime data in results
# 2. Runtime is only available via movie details endpoint (individual fetch)
# 3. Would require N separate API calls (one per movie) to get runtime data
# 4. For 20-result page with buffer, could require 40+ API calls per request
# 5. TMDB API rate limits (40 requests/10 seconds) make this impractical
#
# Future solution would require:
# - Pre-populating local database with TMDB movie catalog (including runtime)
# - Background sync jobs to keep data fresh
# - Query local DB for runtime filtering, then fetch fresh data from TMDB for display
# - This is a major architectural change warranting its own PRD; likely not feasible
#
# See: .arc/active/technical/prd-service-layer-modernization.md section 6.5
#      for detailed analysis of runtime filtering feasibility
# ============================================================================
