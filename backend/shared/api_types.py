"""
TMDB API type definitions stub.

🚨 TECHNICAL DEBT: These type definitions will be replaced by Pydantic schemas
   during the Django Ninja migration. The Pydantic schemas will provide:
   - Better type safety
   - Automatic validation
   - Auto-generated TypeScript types for frontend
   - Single source of truth for API contracts

Status: Temporary stub - to be replaced by Pydantic ModelSchemas.
"""
from __future__ import annotations

from typing import Any, Dict, List, TypedDict


class TMDBMovieResponse(TypedDict, total=False):
    """Type definition for TMDB movie detail response."""
    # Core movie fields
    id: int
    title: str
    overview: str
    poster_path: str | None
    release_date: str | None
    vote_average: float
    runtime: int

    # Extended fields for detail responses
    genres: List[Dict[str, Any]]
    crew: List[Dict[str, Any]]
    cast: List[Dict[str, Any]]
    production_companies: List[Dict[str, Any]]

    # Allow any additional fields from TMDB
    # (TypedDict with total=False allows optional additional fields)


class TMDBSearchResponse(TypedDict, total=False):
    """Type definition for TMDB paginated search response."""
    page: int
    results: List[TMDBMovieResponse]
    total_pages: int
    total_results: int

    # Allow any additional pagination fields from TMDB
