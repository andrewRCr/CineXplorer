"""Movie domain helper functions for common operations.

This module provides reusable helper functions for movie API endpoints,
reducing code duplication and centralizing common patterns.
"""

from collections.abc import Sequence

from django.http import HttpRequest

from apps.authentication.auth_ninja import get_current_user_optional
from apps.core.types.api_types import TMDBParams
from apps.movie.schemas import MovieListItemSchema, MovieListResponseSchema
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

# Singleton enrichment service instance
_enrichment_service = MovieEnrichmentService()


# Protected keys for endpoint presets
# These parameters define the semantic identity of each curated endpoint
# and cannot be overridden by user filters to preserve endpoint meaning.

NOW_PLAYING_PROTECTED_KEYS: Sequence[str] = [
    "with_release_type",
    "release_date_gte",
    "release_date_lte",
    "year",
    "primary_release_year",
]
"""
Protected keys for now-playing endpoint.

Date range, release type, and year filters define "movies currently in theaters"
and must be controlled by the endpoint preset to maintain this semantic meaning.

Protected parameters:
- Date range: Defines the "now playing" window (e.g., today -30 to +5 days)
- Release type: Ensures theatrical releases only (not TV, VOD, etc.)
- Year filters: Redundant with date range, prevented to avoid user confusion

Users can still filter by genre, rating, keywords, cast, and change sort order.

Note: Uses BrowseServiceParams field names (release_date_gte) which get_tmdb_params()
converts to TMDB dot notation format (release_date.gte).
"""

UPCOMING_PROTECTED_KEYS: Sequence[str] = [
    "with_release_type",
    "release_date_gte",
    "release_date_lte",
    "year",
    "primary_release_year",
]
"""
Protected keys for upcoming endpoint.

Date range, release type, and year filters define "movies coming soon to theaters"
and must be controlled by the endpoint preset to maintain this semantic meaning.

Protected parameters:
- Date range: Defines the "upcoming" window (e.g., today +5 to end of year)
- Release type: Ensures theatrical releases only (not TV, VOD, etc.)
- Year filters: Redundant with date range, prevented to avoid user confusion

Users can still apply genre filters, rating filters, keyword searches, cast filters,
and change sort order.

Note: Uses BrowseServiceParams field names (release_date_gte) which get_tmdb_params()
converts to TMDB dot notation format (release_date.gte).
"""

BROWSE_PROTECTED_KEYS: Sequence[str] = []
"""
Protected keys for browse endpoint.

Browse has NO protected keys - users have full control over all filter
parameters. This is the general-purpose discovery endpoint with zero presets.
"""


def enrich_response_with_user_movie_data(
    request: HttpRequest,
    response: MovieListResponseSchema,
) -> MovieListResponseSchema:
    """Enrich paginated movie response with user movie data.

    HTTP helper that extracts the current user (if authenticated) and enriches
    the response's movie results with user movie data (watchlist status, ratings,
    reviews) from the UserMovieData model using the movie enrichment service.

    This is a convenience wrapper around the enrichment service for use in
    API endpoints. For direct movie list enrichment, use MovieEnrichmentService
    directly.

    For unauthenticated requests, returns the response unchanged.

    Args:
        request: HTTP request object (used to extract current user)
        response: Paginated movie response from TMDB service

    Returns:
        The same response object with enriched movie results

    Example:
        >>> @movies_router.get("/now-playing", response=MovieListResponseSchema, auth=None)
        >>> def get_now_playing(request: HttpRequest, params: PaginationParams):
        ...     # Fetch movies from TMDB
        ...     response = movie_service.get_now_playing_movies(page=params.page or 1)
        ...
        ...     # Enrich response with UserMovieData if authenticated (one-liner)
        ...     return enrich_response_with_user_movie_data(request, response)
    """
    user = get_current_user_optional(request)
    response.results = _enrichment_service.enrich_movies_with_user_movie_data(
        response.results, user
    )
    return response


def enrich_single_movie_with_user_movie_data(
    request: HttpRequest,
    movie: MovieListItemSchema,
) -> MovieListItemSchema:
    """Enrich single movie object with user movie data.

    HTTP helper that extracts the current user (if authenticated) and enriches
    a single movie object with user movie data from the UserMovieData model
    using the movie enrichment service.

    Similar to enrich_response_with_user_movie_data but operates on a single
    movie object rather than a paginated response wrapper.

    This is a convenience wrapper around the enrichment service for use in
    API endpoints that return single movies. For direct movie list enrichment,
    use MovieEnrichmentService directly.

    Args:
        request: HTTP request object (used to extract current user)
        movie: Single movie schema from TMDB service

    Returns:
        The same movie object with enriched user movie data

    Example:
        >>> @movies_router.get("/{movie_id}", response=MovieDetailSchema, auth=None)
        >>> def get_movie_detail(request: HttpRequest, movie_id: int):
        ...     # Fetch movie from TMDB
        ...     movie = movie_service.get_movie_by_id(movie_id)
        ...
        ...     # Enrich single movie with UserMovieData if authenticated (one-liner)
        ...     return enrich_single_movie_with_user_movie_data(request, movie)
    """
    user = get_current_user_optional(request)
    enriched_list = _enrichment_service.enrich_movies_with_user_movie_data([movie], user)
    return enriched_list[0]


def merge_with_preset(
    user_filters: TMDBParams,
    preset: TMDBParams,
    protected_keys: Sequence[str] | None = None,
) -> dict[str, str | int | float | bool | None]:
    """Merge user filters with endpoint preset, respecting protected keys.

    Creates a merged parameter dictionary by combining user-provided filters
    with endpoint-specific preset values. Protected keys ensure that certain
    parameters (like date ranges for time-constrained endpoints) cannot be
    overridden by user input, preserving the semantic identity of the endpoint.

    Merge behavior:
    - Protected keys: Preset value always wins (user value ignored)
    - Non-protected preset keys: Added only if not present in user filters
    - User-only keys: Preserved in result (allows additive filtering)

    This enables the thin wrapper pattern where curated endpoints (now-playing,
    upcoming) call discover with specific presets while still allowing users to
    apply additional filters like genres or ratings.

    Args:
        user_filters: Filter parameters from user request (e.g., genres, ratings)
        preset: Endpoint's default filter values (e.g., date range, release type)
        protected_keys: List of parameter keys where preset must override user input.
            Common examples: ['sort_by'], ['primary_release_date.gte', 'primary_release_date.lte']

    Returns:
        Merged parameter dictionary with preset taking precedence for protected keys

    Example:
        >>> # Now Playing endpoint: date range is protected, but genre filtering allowed
        >>> user_filters = {"with_genres": "28", "primary_release_date.gte": "2020-01-01"}
        >>> preset = {
        ...     "primary_release_date.gte": "2025-10-01",
        ...     "primary_release_date.lte": "2025-11-05",
        ...     "with_release_type": "2|3",
        ... }
        >>> protected = [
        ...     "primary_release_date.gte",
        ...     "primary_release_date.lte",
        ...     "with_release_type",
        ... ]
        >>> merge_with_preset(user_filters, preset, protected)
        {
            "with_genres": "28",  # User filter preserved
            "primary_release_date.gte": "2025-10-01",  # Preset wins (protected)
            "primary_release_date.lte": "2025-11-05",  # Preset wins (protected)
            "with_release_type": "2|3"  # Preset wins (protected)
        }
    """
    # Start with all user filters
    merged: dict[str, str | int | float | bool | None] = dict(user_filters)

    # Protected keys: preset controls these parameters completely
    # - If protected key is in preset → use preset value (overwrite user)
    # - If protected key is NOT in preset → remove it (user cannot set it)
    protected_set: set[str] = set(protected_keys) if protected_keys else set()
    for key in protected_set:
        if key in preset:
            merged[key] = preset[key]
        elif key in merged:
            # Remove user's value for protected key not in preset
            del merged[key]

    # Non-protected preset keys: add only if not present in user filters
    for key, value in preset.items():
        if key not in protected_set and key not in user_filters:
            merged[key] = value

    return merged
