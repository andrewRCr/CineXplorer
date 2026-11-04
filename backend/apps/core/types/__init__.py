"""
Core type definitions for the CineXplorer application.

This package provides type aliases, utilities, and infrastructure
for maintaining type safety across the application layers.
"""

from .api_types import TMDBParams, TMDBResponseData

__all__ = (
    "TMDBParams",
    "TMDBResponseData",
)
