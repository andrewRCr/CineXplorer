"""Models for a user's watchlist, ratings, reviews and viewing history."""

from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar, Self

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

if TYPE_CHECKING:
    from apps.core.models import Movie
    from apps.users.models import User


class UserMovieDataQuerySet(models.QuerySet["UserMovieData"]):
    """Composable filters shared by user-data reads and movie enrichment."""

    def for_user(self, user: AbstractBaseUser) -> Self:
        return self.filter(user=user)

    def on_watchlist(self) -> Self:
        return self.filter(user_on_watchlist=True)

    def watched(self) -> Self:
        return self.filter(user_watched=True)

    def rated(self) -> Self:
        return self.filter(user_rating__isnull=False)

    def for_movies(self, tmdb_ids: list[int]) -> Self:
        return self.filter(movie_id__in=tmdb_ids)


class UserMovieDataManager(models.Manager["UserMovieData"]):
    """Expose the custom QuerySet with its concrete type to callers."""

    # Django supplies routing hints on managers; django-types omits this attribute.
    _hints: dict[str, models.Model]

    def get_queryset(self) -> UserMovieDataQuerySet:
        return UserMovieDataQuerySet(self.model, using=self._db, hints=self._hints)


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

    # Django permits custom managers; the base stub declares an invariant ClassVar.
    objects: ClassVar[UserMovieDataManager] = UserMovieDataManager()  # pyright: ignore[reportIncompatibleVariableOverride]

    class Meta:
        unique_together = ("user", "movie")

    def __str__(self) -> str:
        return f"{self.user.username} - {self.movie.title}"
