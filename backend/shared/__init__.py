"""
Shared module stub for CineXplorer development.

This is a temporary local implementation to provide types and constants
that are normally available in the Docker-mounted /shared directory.

🚨 TECHNICAL DEBT: This entire module will be eliminated during Django Ninja migration
   when Pydantic schemas replace these manual type definitions and auto-generate
   TypeScript types for the frontend.

Status: Temporary stub - to be replaced by Pydantic schemas in Django Ninja migration.
"""
from __future__ import annotations

# Re-export all the commonly used types and constants
from .api_types import TMDBMovieResponse, TMDBSearchResponse
from .error_codes import ERROR_CODES

# Type alias for UserMovieData (used in serializers)
# This is a temporary placeholder - will be replaced by proper Pydantic schemas
UserMovieData = dict[str, object]  # Simplified type for now

__all__ = [
    'TMDBMovieResponse',
    'TMDBSearchResponse',
    'ERROR_CODES',
    'UserMovieData',
]
