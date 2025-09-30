"""
🚨 DEPRECATED: TMDB API TypedDict stubs.

This module has been replaced by proper Pydantic models for complete type safety.

✅ COMPLETED (Task 5.6.8): TypedDict stubs → Pydantic models migration

STATUS: All TypedDict stubs have been successfully replaced by Pydantic schemas
providing complete type safety, validation, and auto-generated TypeScript types.

USE INSTEAD:
    from core.tmdb_models.tmdb_responses import (
        TMDBMovieBase,
        TMDBMovieDetail,
        TMDBCreditsResponse,
        TMDBMovieSearchResponse,
        TMDBKeywordSearchResponse,
        TMDBPersonSearchResponse,
        TMDBGenreListResponse,
    )

BENEFITS ACHIEVED:
✅ Better type safety - Pydantic validates TMDB response structure
✅ Automatic validation - Invalid TMDB responses caught early
✅ Auto-generated TypeScript types for frontend
✅ Single source of truth for API contracts
✅ Django Ninja integration for OpenAPI documentation
✅ Comprehensive error handling with detailed validation messages

🔄 This file can be removed once all external references are verified updated.
"""
from __future__ import annotations

# Deprecated - use core.tmdb_models.tmdb_responses instead
import warnings

warnings.warn(
    "shared.api_types module is deprecated. All TMDB type definitions have been "
    "migrated to core.tmdb_models.tmdb_responses with Pydantic models for complete "
    "type safety and validation.",
    DeprecationWarning,
    stacklevel=2
)
