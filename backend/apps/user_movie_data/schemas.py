"""Shared user movie state and partial-save validation."""

from __future__ import annotations

from datetime import date
from typing import Literal

from ninja import Schema
from pydantic import Field, field_validator

from apps.user_movie_data.models import UserMovieData


class UserMovieDataSchema(Schema):
    """The same complete user state on saved-data and movie responses."""

    tmdb_id: int
    user_watched: bool
    user_on_watchlist: bool
    user_liked: bool
    user_rating: int | None = Field(..., ge=1, le=10)
    user_review: str | None
    watched_at: date | None

    @classmethod
    def from_record(cls, record: UserMovieData) -> UserMovieDataSchema:
        return cls(
            tmdb_id=record.movie.tmdb_id,
            user_watched=record.user_watched,
            user_on_watchlist=record.user_on_watchlist,
            user_liked=record.user_liked,
            user_rating=record.user_rating,
            user_review=record.user_review,
            watched_at=record.watched_at,
        )


class UserMovieDataPatchSchema(Schema):
    """An absent field stays unchanged except where data rules change it; null clears it."""

    user_watched: bool = False
    user_on_watchlist: bool = False
    user_liked: bool = False
    user_rating: int | None = Field(default=None, ge=1, le=10)
    user_review: str | None = Field(default=None, max_length=10000)
    watched_at: date | None = None

    @field_validator("user_review")
    @classmethod
    def normalize_review(cls, review: str | None) -> str | None:
        if review is not None and "\x00" in review:
            raise ValueError("Review must not contain NUL characters")
        return review if review is not None and review.strip() else None


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
