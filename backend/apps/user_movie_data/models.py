"""Models for a user's watchlist, ratings, reviews and viewing history."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, ClassVar, Self

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.db.models.functions import Coalesce, Length
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

    def liked(self) -> Self:
        return self.filter(user_liked=True)

    def with_state(self) -> Self:
        return self.filter(
            models.Q(user_on_watchlist=True)
            | models.Q(user_watched=True)
            | models.Q(user_liked=True)
            | models.Q(user_rating__isnull=False)
        )

    def with_log_summary(self) -> Self:
        entries = UserMovieEntry.objects.filter(record_id=models.OuterRef("pk"))
        dated = entries.filter(watched_on__isnull=False).order_by("-watched_on")
        return self.annotate(
            has_entries=models.Exists(entries),
            last_logged_on=models.Subquery(dated.values("watched_on")[:1]),
        )

    def ordered_for_library(
        self, sort: str, direction: str, added_field: str = "created_at"
    ) -> Self:
        field = {
            "added": added_field,
            "watched": "last_logged_on",
            "rating": "user_rating",
            "title": "movie__title",
            "release": "movie__release_date",
        }[sort]
        ascending = direction == "asc"
        primary = (
            models.F(field).asc(nulls_last=True)
            if ascending
            else models.F(field).desc(nulls_last=True)
        )
        return self.order_by(primary, "movie_id" if ascending else "-movie_id")


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
        has_entries: bool
        last_logged_on: date | None

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
    watched_added_at = models.DateTimeField(blank=True, null=True)
    watchlist_added_at = models.DateTimeField(blank=True, null=True)
    liked_added_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Django permits custom managers; the base stub declares an invariant ClassVar.
    objects: ClassVar[UserMovieDataManager] = UserMovieDataManager()  # pyright: ignore[reportIncompatibleVariableOverride]

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "movie"], name="user_movie_unique"),
            models.CheckConstraint(
                condition=models.Q(user_rating__isnull=True)
                | models.Q(user_rating__range=(1, 10)),
                name="user_movie_rating_range",
            ),
            models.CheckConstraint(
                condition=models.Q(user_rating__isnull=True) | models.Q(user_watched=True),
                name="user_movie_rating_watched",
            ),
            models.CheckConstraint(
                condition=models.Q(user_watched=False) | models.Q(watched_added_at__isnull=False),
                name="user_movie_watched_added",
            ),
            models.CheckConstraint(
                condition=models.Q(user_on_watchlist=False)
                | models.Q(watchlist_added_at__isnull=False),
                name="user_movie_watchlist_added",
            ),
            models.CheckConstraint(
                condition=models.Q(user_liked=False) | models.Q(liked_added_at__isnull=False),
                name="user_movie_liked_added",
            ),
        ]
        indexes = [models.Index(fields=["user", "-created_at"], name="user_movie_added_idx")]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.movie.title}"


class UserMovieEntryQuerySet(models.QuerySet["UserMovieEntry"]):
    """One descending viewing order, shared by latest-rating decisions and lists."""

    def ordered_for_history(self) -> Self:
        return self.alias(effective_on=Coalesce("watched_on", "made_on")).order_by(
            "-effective_on", "-created_at", "-pk"
        )


class UserMovieEntryManager(models.Manager["UserMovieEntry"]):
    _hints: dict[str, models.Model]

    def get_queryset(self) -> UserMovieEntryQuerySet:
        return UserMovieEntryQuerySet(self.model, using=self._db, hints=self._hints)


class UserMovieEntry(models.Model):
    """One dated viewing, review, or both, retaining its own rating."""

    if TYPE_CHECKING:
        id: int
        record_id: int

    record: models.ForeignKey[UserMovieData] = models.ForeignKey(
        UserMovieData, on_delete=models.CASCADE, related_name="entries"
    )
    watched_on = models.DateField(blank=True, null=True)
    rating = models.IntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    review = models.TextField(blank=True, null=True, max_length=10000)
    rewatch = models.BooleanField(default=False)
    made_on = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Django permits custom managers; the base stub declares an invariant ClassVar.
    objects: ClassVar[UserMovieEntryManager] = UserMovieEntryManager()  # pyright: ignore[reportIncompatibleVariableOverride]

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(watched_on__isnull=False) | models.Q(review__isnull=False),
                name="user_movie_entry_has_content",
            ),
            models.CheckConstraint(
                condition=models.Q(rewatch=False) | models.Q(watched_on__isnull=False),
                name="user_movie_entry_rewatch_dated",
            ),
            models.CheckConstraint(
                condition=models.Q(rating__isnull=True) | models.Q(rating__range=(1, 10)),
                name="user_movie_entry_rating_range",
            ),
            models.CheckConstraint(
                condition=models.Q(review__isnull=True)
                | models.Q(review__regex=REVIEW_HAS_TEXT_PATTERN),
                name="user_movie_entry_review_has_text",
            ),
            models.CheckConstraint(
                condition=models.Q(review__isnull=True)
                | models.Q(LessThanOrEqual(Length("review"), models.Value(10000))),
                name="user_movie_entry_review_length",
            ),
        ]

    def __str__(self) -> str:
        return f"Entry {self.pk} for record {self.record_id}"
