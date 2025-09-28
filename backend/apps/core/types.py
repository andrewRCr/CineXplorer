"""
🚨 DEPRECATED: TypedDict stubs for TMDB API responses.

This module has been replaced by proper Pydantic models for complete type safety.

USE INSTEAD:
    from core.tmdb_models.tmdb_responses import (
        TMDBMovieBase,
        TMDBMovieDetail,
        TMDBCreditsResponse,
        TMDBMovieSearchResponse,
        etc.
    )

STATUS:
    ✅ Replaced by Pydantic models (Task 5.6.8 - API Layer Modernization)
    ❌ TypedDict stubs deprecated - provided complete type safety with validation
    🔄 This file can be removed once all references are updated

BENEFITS OF NEW PYDANTIC MODELS:
    - Complete type safety with validation
    - Better error messages for invalid TMDB responses
    - Auto-generated TypeScript types for frontend
    - Single source of truth for TMDB API contracts
    - Integration with Django Ninja's response validation
"""
from __future__ import annotations

# Deprecated - use core.tmdb_models.tmdb_responses instead
import warnings

warnings.warn(
    "core.types module is deprecated. Use core.tmdb_models.tmdb_responses for "
    "complete type safety with Pydantic models.",
    DeprecationWarning,
    stacklevel=2
)
