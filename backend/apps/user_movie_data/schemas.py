"""Shared user movie state and partial-save validation."""

from __future__ import annotations

from typing import Literal

from ninja import Schema
from pydantic import Field

from apps.user_movie_data.models import UserMovieData


class UserMovieDataSchema(Schema):
    """The same complete user state on saved-data and movie responses."""

    tmdb_id: int
    user_watched: bool
    user_on_watchlist: bool
    user_liked: bool
    user_rating: int | None = Field(..., ge=1, le=10)

    @classmethod
    def from_record(cls, record: UserMovieData) -> UserMovieDataSchema:
        return cls(
            tmdb_id=record.movie.tmdb_id,
            user_watched=record.user_watched,
            user_on_watchlist=record.user_on_watchlist,
            user_liked=record.user_liked,
            user_rating=record.user_rating,
        )


class UserMovieDataPatchSchema(Schema):
    """An absent field stays unchanged except where data rules change it; null clears it."""

    user_watched: bool = False
    user_on_watchlist: bool = False
    user_liked: bool = False
    user_rating: int | None = Field(default=None, ge=1, le=10)


class LibraryQuerySchema(Schema):
    """Validated bounds and stable ordering for database-served collections."""

    watchlist: bool = False
    watched: bool = False
    liked: bool = False
    rated: bool = False
    sort: Literal["added", "watched", "rating", "title", "release"] = "added"
    direction: Literal["asc", "desc"] = "desc"
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=20, ge=1, le=100)
