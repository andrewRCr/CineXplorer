"""Pagination helper functions for Django QuerySets.

This module provides reusable pagination utilities for standardizing
pagination across all API endpoints in the application.

**Design Principles:**
- Pure functions: No side effects, returns new data structures
- Type safety: Full type annotations, no `Any` usage
- TMDB-style pagination: Consistent with TMDB API response format
- Bounds validation: Defensive input handling with sensible defaults

**Usage Example:**
    from core.pagination import paginate_queryset
    from core.models import Movie

    # Get paginated results
    queryset = Movie.objects.all().order_by('-release_date')
    paginated_qs, metadata = paginate_queryset(queryset, page=1, page_size=20)

    # Use results
    movies = list(paginated_qs)
    print(f"Page {metadata['page']} of {metadata['total_pages']}")
    print(f"Total results: {metadata['total_results']}")

**Pagination Metadata Format:**
    {
        'page': int,           # Current page number (1-indexed)
        'total_pages': int,    # Total number of pages
        'total_results': int,  # Total number of items across all pages
    }
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from django.db.models import Model, QuerySet


class PaginationMetadata(TypedDict):
    """Type definition for pagination metadata dictionary.

    Attributes:
        page: Current page number (1-indexed)
        total_pages: Total number of pages available
        total_results: Total number of items across all pages
    """

    page: int
    total_pages: int
    total_results: int


# Pagination constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_PAGE_SIZE = 1


def paginate_queryset[ModelT: 'Model'](
    queryset: QuerySet[ModelT],
    page: int,
    page_size: int | None = None
) -> tuple[QuerySet[ModelT], PaginationMetadata]:
    """Paginate a Django QuerySet and return results with metadata.

    This function provides TMDB-style pagination for any Django QuerySet,
    handling bounds validation, page size limits, and metadata calculation.

    **Input Validation:**
    - page < 1: Defaults to page 1
    - page_size < 1: Defaults to DEFAULT_PAGE_SIZE (20)
    - page_size > MAX_PAGE_SIZE: Clamped to MAX_PAGE_SIZE (100)
    - page > total_pages: Returns empty QuerySet with valid metadata

    **Pagination Behavior:**
    - Pages are 1-indexed (first page is page=1)
    - Empty QuerySets return valid metadata (total_pages=0, total_results=0)
    - QuerySet ordering is preserved
    - QuerySet optimizations (select_related, prefetch_related) are preserved

    Args:
        queryset: Django QuerySet to paginate (any model)
        page: Page number to retrieve (1-indexed, < 1 defaults to 1)
        page_size: Number of items per page (optional, defaults to 20,
                   clamped to 1-100 range)

    Returns:
        Tuple of:
        - QuerySet slice for the requested page (may be empty)
        - PaginationMetadata dict with page info

    Examples:
        >>> # Basic pagination
        >>> qs = Movie.objects.all()
        >>> movies, meta = paginate_queryset(qs, page=1)
        >>> print(meta)
        {'page': 1, 'total_pages': 5, 'total_results': 100}

        >>> # Custom page size
        >>> movies, meta = paginate_queryset(qs, page=2, page_size=10)
        >>> print(meta)
        {'page': 2, 'total_pages': 10, 'total_results': 100}

        >>> # Page beyond available results
        >>> movies, meta = paginate_queryset(qs, page=999)
        >>> print(movies.count())  # 0
        >>> print(meta['total_pages'])  # 5

        >>> # Empty QuerySet
        >>> empty_qs = Movie.objects.filter(tmdb_id=999999)
        >>> movies, meta = paginate_queryset(empty_qs, page=1)
        >>> print(meta)
        {'page': 1, 'total_pages': 0, 'total_results': 0}

    Notes:
        - This function does NOT execute the QuerySet - it returns a sliced
          QuerySet that will be executed when evaluated
        - Preserves all QuerySet optimizations (select_related, etc.)
        - Safe for use with filtered, ordered, or annotated QuerySets
    """
    # Validate and normalize page_size
    if page_size is None or page_size < MIN_PAGE_SIZE:
        page_size = DEFAULT_PAGE_SIZE
    elif page_size > MAX_PAGE_SIZE:
        page_size = MAX_PAGE_SIZE

    # Validate and normalize page number
    if page < 1:
        page = 1

    # Get total count (this executes a COUNT query)
    total_results = queryset.count()

    # Calculate total pages (ceiling division)
    total_pages = math.ceil(total_results / page_size) if total_results > 0 else 0

    # Calculate slice boundaries
    start_index = (page - 1) * page_size
    end_index = start_index + page_size

    # Slice the QuerySet
    # Note: If page > total_pages, this returns an empty QuerySet (valid behavior)
    paginated_qs = queryset[start_index:end_index]

    # Build metadata
    metadata: PaginationMetadata = {
        "page": page,
        "total_pages": total_pages,
        "total_results": total_results,
    }

    return paginated_qs, metadata
