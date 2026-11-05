"""Models for a user's watchlist, ratings, reviews and viewing history."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

if TYPE_CHECKING:
    from apps.core.models import Movie
    from apps.users.models import User


class UserMovieData(models.Model):
    """Represents a user's data about a particular movie."""

    if TYPE_CHECKING:
        id: int

    user: models.ForeignKey[User] = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    movie: models.ForeignKey[Movie] = models.ForeignKey(
        "core.Movie", on_delete=models.CASCADE, related_name="user_movie_data"
    )
    user_watched = models.BooleanField(default=False, db_index=True)
    user_on_watchlist = models.BooleanField(default=False, db_index=True)
    user_liked = models.BooleanField(default=False, db_index=True)
    user_rating = models.IntegerField(
        null=True,
        blank=True,
        default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    user_review = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("user", "movie")

    def __str__(self) -> str:
        return f"{self.user.username} - {self.movie.title}"
