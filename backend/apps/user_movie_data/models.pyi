"""Type stub file for user_movie_data.models.

This file provides explicit type annotations for Django model fields,
enabling perfect type inference in Pyright/Pylance.

⚠️ MAINTENANCE: Keep in sync with models.py
When adding/modifying fields in models.py, update this file accordingly.
"""

from django.db import models

from apps.core.models import Movie
from apps.users.models import User

class UserMovieData(models.Model):
    """Type stub for UserMovieData model with explicit field types."""

    # Primary key (auto-generated)
    id: int

    # Foreign keys with explicit types
    user: User
    movie: Movie

    # Boolean fields
    user_watched: bool
    user_on_watchlist: bool
    user_liked: bool

    # Nullable fields
    user_rating: int | None
    user_review: str | None

    def __str__(self) -> str: ...
