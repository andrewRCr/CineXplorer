"""
User movie data models.

This module contains models related to user interactions with movies,
including watchlist status, ratings, reviews, and viewing history.
"""

from django.conf import settings
from django.db import models
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)


class UserMovieData(models.Model):
    """ Represents a user's data about a particular movie. """

    user = models.ForeignKey(  # type: ignore[misc]  # Django field
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    movie = models.ForeignKey(  # type: ignore[misc]  # Django field
        'core.Movie',
        on_delete=models.CASCADE,
        related_name='user_movie_data'
    )
    user_watched = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_on_watchlist = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_liked = models.BooleanField(
        default=False, db_index=True
    )  # type: ignore[misc]  # Django field
    user_rating = models.IntegerField(  # type: ignore[misc]  # Django field
        null=True, blank=True, default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    user_review = models.TextField(
        blank=True, null=True
    )  # type: ignore[misc]  # Django field

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self) -> str:
        return (
            f"{self.user.username} - {self.movie.title}"
        )  # type: ignore[attr-defined]  # Django field access
