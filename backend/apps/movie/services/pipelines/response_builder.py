"""
Response building utilities for movie pagination responses.

This module provides helper functions for converting between schema types
and building paginated responses. Extracted from paginated.py for clarity.
"""

from __future__ import annotations

from core.tmdb_models.tmdb_responses import TMDBMovieBase, TMDBPaginatedMovieResponse

from ...schemas import MovieBaseSchema, PaginatedMovieResponseSchema
from ..tmdb_api_boundary.response_factories import create_paginated_movie_response_from_tmdb


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
