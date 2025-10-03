"""
Type stub file for user_movie_data.models.

This file provides explicit type annotations for Django model fields,
enabling perfect type inference in Pyright/Pylance.

⚠️ MAINTENANCE: Keep in sync with models.py
When adding/modifying fields in models.py, update this file accordingly.
"""
from core.models import Movie
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Manager

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

    # Manager
    objects: Manager[UserMovieData]

    def __str__(self) -> str: ...
