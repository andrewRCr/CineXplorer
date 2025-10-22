"""
Response builder for user movie data collections.

This module provides functions for building paginated movie responses that
compose pagination, batch fetching, and enrichment services to deliver
complete user-specific movie data.

**Architecture Pattern:**
- Functional composition: Orchestrates multiple service functions
- Pure data transformation: No side effects beyond external API calls
- Type-safe pipeline: Full type annotations, no `Any` usage

**Usage Example:**
    from user_movie_data.services.response_builder import build_user_movies_response
    from user_movie_data.models import UserMovieData

    # Get user's watchlist QuerySet
    watchlist_qs = UserMovieData.objects.filter(
        user=request.user,
        user_on_watchlist=True
    ).select_related('movie')

    # Build paginated response
    response = build_user_movies_response(
        queryset=watchlist_qs,
        user=request.user,
        page=1,
        page_size=20
    )

    # Response contains:
    # - Paginated movie data from TMDB
    # - User-specific enrichment (watchlist status, ratings, reviews)
    # - Pagination metadata (page, total_pages, total_results)
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from core.pagination import paginate_queryset
from movie.schemas import PaginatedMovieResponseSchema
from movie.services.batch_operations import fetch_movies_batch
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser
    from django.db.models import QuerySet
    from user_movie_data.models import UserMovieData


def build_user_movies_response(
    queryset: QuerySet[UserMovieData],
    user: AbstractBaseUser | None,
    page: int,
    page_size: int | None = None
) -> PaginatedMovieResponseSchema:
    """
    Build paginated movie response with user-specific enrichment.

    This function composes three service functions to create a complete
    paginated movie response:
    1. **Pagination** (paginate_queryset): Slice QuerySet and calculate metadata
    2. **Batch Fetch** (fetch_movies_batch): Fetch movie data from TMDB in batch
    3. **Enrichment** (MovieEnrichmentService): Add user-specific data to movies

    **Flow:**
    ```
    UserMovieData QuerySet
      ↓
    [1. paginate_queryset] → Paginated slice + metadata
      ↓
    Extract TMDB IDs from UserMovieData.movie.tmdb_id
      ↓
    [2. fetch_movies_batch] → List[MovieBaseSchema] from TMDB
      ↓
    [3. MovieEnrichmentService.enrich] → Movies with user_movie_data populated
      ↓
    PaginatedMovieResponseSchema
    ```

    **Graceful Degradation:**
    - If TMDB batch fetch fails for some movies, returns partial results
    - Empty QuerySet returns valid empty response (total_pages=0)
    - Page beyond total_pages returns empty results with valid metadata

    **Performance Characteristics:**
    - Single database query for pagination count (via paginate_queryset)
    - Single database query for UserMovieData slice (via QuerySet evaluation)
    - N TMDB API calls for page_size movies (batch fetch has no multi-ID endpoint)
    - Single database query for user enrichment data (bulk query in MovieEnrichmentService)

    Args:
        queryset: UserMovieData QuerySet to paginate (should use select_related('movie')
                  for optimal performance)
        user: Authenticated user for enrichment (None for unauthenticated)
        page: Page number to retrieve (1-indexed, < 1 defaults to 1)
        page_size: Number of items per page (optional, defaults to 20,
                   clamped to 1-100 range)

    Returns:
        PaginatedMovieResponseSchema with:
        - page: Current page number
        - total_pages: Total number of pages
        - total_results: Total number of items across all pages
        - results: List of MovieBaseSchema with user_movie_data populated

    Example:
        >>> # Get watchlist for page 2
        >>> watchlist_qs = UserMovieData.objects.filter(
        ...     user=request.user,
        ...     user_on_watchlist=True
        ... ).select_related('movie')
        >>> response = build_user_movies_response(watchlist_qs, request.user, page=2)
        >>> print(f"Page {response.page} of {response.total_pages}")
        Page 2 of 5
        >>> print(f"Movies on this page: {len(response.results)}")
        Movies on this page: 20

    Notes:
        - QuerySet should use select_related('movie') to avoid N+1 queries
        - TMDB batch fetch may return fewer movies than requested (404s, rate limits)
        - Enrichment is skipped for unauthenticated users (user=None)
        - Pagination metadata always reflects database count, not TMDB fetch count
    """
    # Step 1: Paginate the UserMovieData QuerySet
    paginated_qs, metadata = paginate_queryset(
        queryset=queryset,
        page=page,
        page_size=page_size
    )

    # Step 2: Extract TMDB IDs from the paginated UserMovieData entries
    # This evaluates the QuerySet (1 database query if select_related('movie') was used)
    user_movie_data_list = list(paginated_qs)
    tmdb_ids = [umd.movie.tmdb_id for umd in user_movie_data_list]  # type: ignore[misc]

    # Step 3: Batch fetch movie data from TMDB
    # Returns list of MovieBaseSchema (may be shorter than tmdb_ids if some fail)
    movies = fetch_movies_batch(tmdb_ids)

    # Step 4: Enrich movies with user-specific data
    # For authenticated users, populates user_movie_data field on each MovieBaseSchema
    enrichment_service = MovieEnrichmentService()
    enriched_movies = enrichment_service.enrich_movies_with_user_movie_data(
        movies=movies,
        user=user
    )

    # Step 5: Build and return paginated response
    return PaginatedMovieResponseSchema(
        page=metadata['page'],
        total_pages=metadata['total_pages'],
        total_results=metadata['total_results'],
        results=enriched_movies
    )


__all__ = ['build_user_movies_response']
