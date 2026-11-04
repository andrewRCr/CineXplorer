"""Type stub file for core.models.

This file provides explicit type annotations for Django model fields,
enabling perfect type inference in Pyright/Pylance.

⚠️ MAINTENANCE: Keep in sync with models.py
When adding/modifying fields in models.py, update this file accordingly.
"""

from datetime import date

from django.db import models

class Movie(models.Model):
    """Type stub for Movie model with explicit field types."""

    # Primary key (explicit)
    tmdb_id: int

    # Fields with explicit types
    title: str
    poster_path: str | None
    release_date: date | None

    # Note: Manager not declared - django-types provides it automatically

    def __str__(self) -> str: ...
