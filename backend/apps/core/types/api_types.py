"""
Type definitions for API layer type safety.

This module provides type aliases and utilities for maintaining type safety
across the movie API layer, bridging the gap between generic API responses
and specific Pydantic model validation.
"""

from __future__ import annotations

from typing import TypeAlias, Any

# Type aliases for TMDB API parameter handling
TMDBParams: TypeAlias = dict[str, str | int | float | bool | None]
"""
Type alias for TMDB API parameters that matches the expected signature
of the TMDB client. Supports all common parameter types while being
compatible with dict[str, object] interface.
"""

# Pre-validation response type from ApiResponse.data
TMDBResponseData: TypeAlias = dict[str, Any]
"""
Type alias for TMDB response data before Pydantic validation.
Uses Any since we need to validate the structure with Pydantic models.
This is one of the justified uses of Any - for external API data that
will be immediately validated.
"""

__all__ = [
    'TMDBParams',
    'TMDBResponseData',
]
