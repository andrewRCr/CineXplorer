"""
Type definitions for TMDB API responses.

This is a stub module to provide type definitions when the shared module
is not available (e.g., in local development environments).
"""
from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class TMDBMovieResponse(TypedDict, total=False):
    """Type definition for TMDB movie response."""
    id: int
    title: str
    overview: str
    poster_path: str | None
    release_date: str | None
    vote_average: float
    runtime: int
    genres: List[Dict[str, Any]]
    crew: List[Dict[str, Any]]
    cast: List[Dict[str, Any]]
    production_companies: List[Dict[str, Any]]
    # Allow any other fields that might be present
    # TMDBMovieResponse can contain additional fields


class TMDBSearchResponse(TypedDict, total=False):
    """Type definition for TMDB search response."""
    page: int
    results: List[Dict[str, Any]]
    total_pages: int
    total_results: int
