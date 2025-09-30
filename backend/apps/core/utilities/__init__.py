"""
Core / common helper functions.
"""
from __future__ import annotations

from typing import TypeVar

T = TypeVar('T')


def coalesce(*args: T | None) -> T | None:
    """Return the first non-None argument, or None if none are provided or all are None."""
    return next((a for a in args if a is not None), None)
