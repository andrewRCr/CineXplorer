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

# First film ever made: Roundhay Garden Scene (1888)
# Any movies with earlier release dates are TMDB data quality issues
FIRST_FILM_YEAR = 1888


def filter_movies_by_year(
    movies: list[MovieBaseSchema],
    year_min: int | None = None,
    year_max: int | None = None,
) -> list[MovieBaseSchema]:
    """Filter movies by release year range with historical validation.

    Filters out movies with release dates outside the specified year range.
    This is necessary because TMDB API sometimes returns movies from incorrect
    years despite API filters being applied (likely due to re-releases,
    international releases, or data hygiene issues).

    Historical Validation:
        Always excludes movies with release dates before 1888 (first film ever made).
        Any dates before 1888 are TMDB data quality issues and cannot represent
        actual films. This validation applies regardless of user-specified filters.

    Args:
        movies: List of MovieBaseSchema objects to filter
        year_min: Minimum year (inclusive). None means no lower bound.
        year_max: Maximum year (inclusive). None means no upper bound.

    Returns:
        Filtered list containing only movies within the year range and after 1888.
        Movies without release_date are excluded.

    Examples:
        >>> # Filter to 2020s movies (automatically excludes pre-1888)
        >>> filtered = filter_movies_by_year(movies, year_min=2020, year_max=2029)

        >>> # Filter to movies from 2020 onward
        >>> filtered = filter_movies_by_year(movies, year_min=2020)

        >>> # Filter to movies up to 2020
        >>> filtered = filter_movies_by_year(movies, year_max=2020)

        >>> # Single year (2022 only)
        >>> filtered = filter_movies_by_year(movies, year_min=2022, year_max=2022)

        >>> # No filters specified - still validates historical dates
        >>> filtered = filter_movies_by_year(movies)  # Excludes pre-1888

    Note:
        Movies with missing release_date (None) are automatically filtered out,
        as we cannot determine if they match the year criteria.
    """
    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Skip movies without release date
        if movie.release_date is None:
            continue

        movie_year = movie.release_date.year

        # Historical validation: Exclude movies before first film (1888)
        # This is ALWAYS applied, regardless of user filters
        if movie_year < FIRST_FILM_YEAR:
            continue

        # Apply user-specified year range filters
        if year_min is not None and movie_year < year_min:
            continue
        if year_max is not None and movie_year > year_max:
            continue

        # Movie passes all year filters
        filtered.append(movie)

    return filtered


# ============================================================================
# Rating Filtering
# ============================================================================

# Vote count quality threshold for filtering movies by engagement level
#
# MIN_VOTE_COUNT (10 votes):
#   Applied universally across all browsing and filtering scenarios.
#   Removes statistical noise and low-quality content from movies with 1-9 votes
#   while maintaining broad catalog access to legitimate films.
#   Filters ~15% of results on popular pages, primarily affecting unreleased titles,
#   limited releases, and adult-oriented content that slips through genre filtering.
#   Works with genre completeness filtering for dual quality assurance.
MIN_VOTE_COUNT = 10


def filter_movies_by_rating(
    movies: list[MovieBaseSchema],
    rating_min: float | None = None,
    rating_max: float | None = None,
    min_vote_count: int | None = MIN_VOTE_COUNT,
) -> list[MovieBaseSchema]:
    """Filter movies by vote average (rating) range with vote count quality check.

    Filters out movies with ratings outside the specified range and/or with
    insufficient vote counts. Vote count filtering can be applied independently
    of rating filtering for general browsing quality.

    Args:
        movies: List of MovieBaseSchema objects to filter
        rating_min: Minimum rating (inclusive, 0.0-10.0 scale). None means no lower bound.
        rating_max: Maximum rating (inclusive, 0.0-10.0 scale). None means no upper bound.
        min_vote_count: Minimum number of votes required. Can be applied with or without
                       rating filters. None means no vote threshold.
                       Default: MIN_VOTE_COUNT (10 votes).

    Returns:
        Filtered list containing only movies matching criteria.
        - With rating filters: Movies within range and meeting vote threshold
        - Without rating filters but with vote threshold: Movies meeting vote threshold
        - Neither filter: All movies returned

    Examples:
        >>> # Filter by rating with vote threshold
        >>> filtered = filter_movies_by_rating(movies, rating_min=7.5, min_vote_count=50)

        >>> # General browsing quality filter (vote threshold only, no rating filter)
        >>> filtered = filter_movies_by_rating(movies, min_vote_count=10)

        >>> # Rating filter with lower vote threshold
        >>> filtered = filter_movies_by_rating(
        ...     movies, rating_min=1.0, rating_max=3.5, min_vote_count=5
        ... )

        >>> # No filters at all
        >>> all_movies = filter_movies_by_rating(movies, min_vote_count=None)

    Note:
        Vote count filtering works independently of rating filters, allowing general
        browsing quality filtering (10 votes) while still supporting lower thresholds
        (5 votes) when rating filters are active.

        TMDB ratings are on a 0.0-10.0 scale (e.g., 7.5 = 75%).

    Quality Rationale:
        Movies with few votes have unreliable ratings or represent statistical noise
        (unreleased films, data entry errors, etc.). Vote thresholds improve catalog
        quality during both general browsing and filtered searches.
    """
    # Fast path: no filters at all
    if rating_min is None and rating_max is None and min_vote_count is None:
        return movies

    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Vote count quality check (can apply independently of rating filters)
        if min_vote_count is not None and (
            movie.vote_count is None or movie.vote_count < min_vote_count
        ):
            continue

        # Rating filter checks (only if rating filters specified)
        if rating_min is not None or rating_max is not None:
            # Skip movies without rating when rating filter active
            if movie.vote_average is None:
                continue

            movie_rating = movie.vote_average

            # Apply rating range filters
            if rating_min is not None and movie_rating < rating_min:
                continue
            if rating_max is not None and movie_rating > rating_max:
                continue

        # Movie passes all applicable filters
        filtered.append(movie)

    return filtered


# ============================================================================
# Completeness Filtering
# ============================================================================


def filter_movies_by_completeness(
    movies: list[MovieBaseSchema],
) -> list[MovieBaseSchema]:
    """Filter movies to ensure display quality by excluding incomplete records.

    Excludes movies that are missing critical display fields. This ensures
    the UI can properly render movie cards without broken images or missing data.

    Exclusion criteria:
    - Missing poster_path (empty string or None): No broken image placeholders in grid
    - Empty or whitespace-only title: No blank movie cards
    - Empty genre_ids list: Strong TMDB data quality signal (often correlates with
      inappropriate content, data entry errors, or unreleased/placeholder entries)
    - Missing or placeholder overview: No description means poor UX, placeholder text
      like "Details Here" indicates incomplete TMDB data

    Args:
        movies: List of MovieBaseSchema objects to filter

    Returns:
        Filtered list containing only movies with complete display data.

    Examples:
        >>> # Filter out movies without posters, titles, genres, or overviews
        >>> complete = filter_movies_by_completeness(movies)

    Note:
        This filter is ALWAYS applied (not configurable) as it's a basic quality
        requirement for proper UI display. Movies without posters create broken
        image placeholders; movies without titles create confusing blank cards;
        movies without genres indicate poor data quality; movies without overviews
        provide no description to users.

    Quality Rationale:
        TMDB sometimes returns movies with missing posters (especially older or
        unreleased films), placeholder/empty titles, empty genre lists, or placeholder
        overviews. These create poor UX and should be filtered out before display.

        Based on analysis of 100 upcoming movies:
        - 11% had placeholder overviews (9 empty, 2 with "Details Here" text)
        - "Details Here" (case-insensitive) is the only text placeholder TMDB uses
        - Empty strings are the majority of placeholder patterns (82%)

        This filter ensures users only see movies with meaningful descriptions.
    """
    filtered: list[MovieBaseSchema] = []

    for movie in movies:
        # Exclude movies without poster (broken images in grid)
        if not movie.poster_path or movie.poster_path.strip() == '':
            continue

        # Exclude movies with empty or whitespace-only titles (blank cards)
        if not movie.title or movie.title.strip() == '':
            continue

        # Exclude movies with empty genre list (data quality signal)
        # Empty genres correlate with inappropriate/incomplete content
        if not movie.genre_ids or len(movie.genre_ids) == 0:
            continue

        # Exclude movies with missing or placeholder overview
        # Empty overviews provide no value to users
        if not movie.overview or movie.overview.strip() == '':
            continue

        # Exclude movies with TMDB's placeholder text (case-insensitive)
        # Based on data analysis, "Details Here" is the only text placeholder used
        overview_lower = movie.overview.strip().lower()
        if overview_lower == 'details here':
            continue

        # Movie has complete display data
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
