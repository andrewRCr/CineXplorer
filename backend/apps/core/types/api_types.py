"""
Type definitions for API layer type safety.

This module provides type aliases and utilities for maintaining type safety
across the movie API layer, bridging the gap between generic API responses
and specific Pydantic model validation.
"""

from __future__ import annotations

from typing import Mapping, TypeAlias

# Type aliases for TMDB API parameter handling
TMDBParams: TypeAlias = Mapping[str, str | int | float | bool | None]
"""
Type alias for TMDB API parameters that matches the expected signature
of the TMDB client. Uses Mapping to communicate immutability and broaden
compatibility with read-only dict-like types.
"""

# Pre-validation response type from ApiResponse.data
TMDBResponseData: TypeAlias = Mapping[str, object]
"""
Type alias for TMDB response data before Pydantic validation.
Uses Mapping to communicate immutability and object for external API
data structures that will be validated by Pydantic models.
"""

__all__ = [
    'TMDBParams',
    'TMDBResponseData',
]
