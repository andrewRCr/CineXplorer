"""
🚨 DEPRECATED: Shared module stub for CineXplorer development.

✅ COMPLETED (Task 5.6.8): TypedDict stubs → Pydantic models migration

STATUS: TMDB type definitions have been migrated to proper Pydantic models
providing complete type safety, validation, and auto-generated TypeScript types.

USE INSTEAD:
    from core.tmdb_models.tmdb_responses import (
        TMDBMovieBase, TMDBMovieDetail, TMDBCreditsResponse, etc.
    )

This module maintains minimal compatibility for error codes only.
"""
from __future__ import annotations

import warnings
from typing import TypeAlias

# Only maintain error codes for backward compatibility
from .error_codes import ERROR_CODES

# Issue deprecation warning when imported (only once per session to avoid CI noise)
warnings.simplefilter('once', DeprecationWarning)
warnings.warn(
    "shared module is deprecated. TMDB types have been migrated to "
    "core.tmdb_models.tmdb_responses with Pydantic models for complete type safety.",
    DeprecationWarning,
    stacklevel=2
)

# Type alias for UserMovieData (used in serializers)
# This is a temporary placeholder - will be replaced by proper Pydantic schemas
UserMovieData: TypeAlias = dict[str, object]  # Simplified type for now

__all__ = [
    'ERROR_CODES',
    'UserMovieData',
]
