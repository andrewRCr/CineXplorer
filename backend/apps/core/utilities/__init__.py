"""
Core / common helper functions.
"""
from __future__ import annotations

from typing import TypeVar

T = TypeVar('T')


def coalesce(*args: T | None) -> T | None:
    """ Returns the first argument that is not None. """
    return next((a for a in args if a is not None), None)
