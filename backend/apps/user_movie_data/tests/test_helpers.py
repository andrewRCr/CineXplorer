"""Plain saved-row factories for user-movie service tests."""

from __future__ import annotations

from datetime import date

from django.contrib.auth.models import AbstractBaseUser
from django.utils import timezone

from apps.core.models import Movie
from apps.user_movie_data.models import UserMovieData


def create_movie(tmdb_id: int = 550, **overrides: object) -> Movie:
    """Save a local movie with defaults that callers can override."""
    fields: dict[str, object] = {
        "title": "Test Movie",
        "poster_path": "/poster.jpg",
        "release_date": date(2023, 1, 1),
    }
    fields.update(overrides)
    return Movie.objects.create(tmdb_id=tmdb_id, **fields)


def create_user_movie_data(
    user: AbstractBaseUser, movie: Movie | None = None, **overrides: object
) -> UserMovieData:
    """Save a user's record, creating its movie when one is not supplied."""
    for flag, stamp in [
        ("user_watched", "watched_added_at"),
        ("user_on_watchlist", "watchlist_added_at"),
        ("user_liked", "liked_added_at"),
    ]:
        if overrides.get(flag) and stamp not in overrides:
            overrides[stamp] = timezone.now()
    return UserMovieData.objects.create(
        user=user, movie=movie if movie is not None else create_movie(), **overrides
    )
