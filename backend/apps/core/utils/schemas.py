"""Generic schema definitions for cross-domain use.

This module provides reusable Pydantic schemas that can be used across
different API endpoints in the application.
"""

from ninja import Schema


class PaginatedResponse[T](Schema):
    """Generic paginated response schema for list endpoints.

    This schema provides a consistent structure for paginated API responses
    across all domains. It includes pagination metadata and results.

    Type Parameters:
        T: The type of items in the results list

    Attributes:
        page: Current page number (1-indexed)
        total_pages: Total number of pages available
        total_results: Total number of items across all pages
        results: List of items for the current page

    Example:
        >>> from core.utils.schemas import PaginatedResponse
        >>> from movie.schemas import MovieSchema
        >>>
        >>> @router.get("/movies", response=PaginatedResponse[MovieSchema])
        >>> def list_movies(request: HttpRequest, page: int = 1) -> PaginatedResponse[MovieSchema]:
        ...     movies = get_paginated_movies(page)
        ...     return PaginatedResponse(
        ...         page=page,
        ...         total_pages=10,
        ...         total_results=100,
        ...         results=movies
        ...     )
    """

    page: int = 1
    total_pages: int = 0
    total_results: int = 0
    results: list[T] = []
