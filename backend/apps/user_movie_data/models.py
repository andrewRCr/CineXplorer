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
from django.db.models.functions import Length
from django.db.models.lookups import LessThanOrEqual

if TYPE_CHECKING:
    from apps.core.models import Movie
    from apps.users.models import User


# Match the same whitespace characters that review normalization strips.
REVIEW_HAS_TEXT_PATTERN = (
    "[^\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0"
    "\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008"
    "\u2009\u200a\u2028\u2029\u202f\u205f\u3000]"
)


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
    user_watched = models.BooleanField(default=False)
    user_on_watchlist = models.BooleanField(default=False)
    user_liked = models.BooleanField(default=False)
    user_rating = models.IntegerField(
        null=True,
        blank=True,
        default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    user_review = models.TextField(blank=True, null=True, max_length=10000)
    watched_at = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Django permits custom managers; the base stub declares an invariant ClassVar.
    objects: ClassVar[UserMovieDataManager] = UserMovieDataManager()  # pyright: ignore[reportIncompatibleVariableOverride]

    class Meta:
        # django-types still names CheckConstraint's deprecated `check` argument.
        constraints = [
            models.UniqueConstraint(fields=["user", "movie"], name="user_movie_unique"),
            models.CheckConstraint(  # pyright: ignore[reportCallIssue]
                condition=models.Q(user_rating__isnull=True)  # pyright: ignore[reportCallIssue]
                | models.Q(user_rating__range=(1, 10)),
                name="user_movie_rating_range",
            ),
            models.CheckConstraint(  # pyright: ignore[reportCallIssue]
                condition=models.Q(user_review__isnull=True)  # pyright: ignore[reportCallIssue]
                | models.Q(user_review__regex=REVIEW_HAS_TEXT_PATTERN),
                name="user_movie_review_has_text",
            ),
            models.CheckConstraint(  # pyright: ignore[reportCallIssue]
                condition=models.Q(user_review__isnull=True)  # pyright: ignore[reportCallIssue]
                | models.Q(LessThanOrEqual(Length("user_review"), models.Value(10000))),
                name="user_movie_review_length",
            ),
            models.CheckConstraint(  # pyright: ignore[reportCallIssue]
                condition=models.Q(watched_at__isnull=True) | models.Q(user_watched=True),  # pyright: ignore[reportCallIssue]
                name="user_movie_watched_date",
            ),
        ]
        indexes = [models.Index(fields=["user", "-created_at"], name="user_movie_added_idx")]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.movie.title}"
