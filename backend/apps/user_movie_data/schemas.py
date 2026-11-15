"""Shared user movie state and partial-save validation."""

from __future__ import annotations

from datetime import date
from errno import ENAMETOOLONG
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ninja import Schema
from pydantic import Field, field_validator

from apps.user_movie_data.models import UserMovieData, UserMovieEntry


class UserMovieDataSchema(Schema):
    """The same complete user state on saved-data and movie responses."""

    tmdb_id: int
    user_watched: bool
    user_on_watchlist: bool
    user_liked: bool
    user_rating: int | None = Field(..., ge=1, le=10)
    has_entries: bool
    last_logged_on: date | None

    @classmethod
    def from_record(cls, record: UserMovieData) -> UserMovieDataSchema:
        return cls(
            tmdb_id=record.movie.tmdb_id,
            user_watched=record.user_watched,
            user_on_watchlist=record.user_on_watchlist,
            user_liked=record.user_liked,
            user_rating=record.user_rating,
            has_entries=record.has_entries,
            last_logged_on=record.last_logged_on,
        )


class UserMovieDataPatchSchema(Schema):
    """An absent field stays unchanged except where data rules change it; null clears it."""

    user_watched: bool = False
    user_on_watchlist: bool = False
    user_liked: bool = False
    user_rating: int | None = Field(default=None, ge=1, le=10)
    undo: bool = False


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


class UserMovieEntryWriteSchema(Schema):
    """A complete viewing or review write in the user's time zone."""

    watched_on: date | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    review: str | None = Field(default=None, max_length=10000)
    rewatch: bool = False
    liked: bool
    time_zone: str

    @field_validator("review")
    @classmethod
    def normalize_review(cls, review: str | None) -> str | None:
        if review is not None and "\x00" in review:
            raise ValueError("Review must not contain NUL characters")
        return review if review is not None and review.strip() else None

    @field_validator("time_zone")
    @classmethod
    def validate_time_zone(cls, name: str) -> str:
        try:
            ZoneInfo(name)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Unknown time zone") from error
        except OSError as error:
            if error.errno != ENAMETOOLONG:
                raise
            raise ValueError("Unknown time zone") from error
        return name


class UserMovieEntrySchema(Schema):
    """A private viewing or review, without its internal ordering timestamps."""

    id: int
    tmdb_id: int
    watched_on: date | None
    rating: int | None = Field(..., ge=1, le=10)
    review: str | None
    rewatch: bool

    @classmethod
    def from_entry(cls, entry: UserMovieEntry, tmdb_id: int) -> UserMovieEntrySchema:
        return cls(
            id=entry.pk,
            tmdb_id=tmdb_id,
            watched_on=entry.watched_on,
            rating=entry.rating,
            review=entry.review,
            rewatch=entry.rewatch,
        )


class UserMovieEntryWriteResponseSchema(Schema):
    entry: UserMovieEntrySchema
    record: UserMovieDataSchema


class MovieEntriesSchema(Schema):
    record: UserMovieDataSchema
    entries: list[UserMovieEntrySchema]


class ActivityQuerySchema(Schema):
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=20, ge=1, le=100)


class ActivityEntrySchema(UserMovieEntrySchema):
    title: str
    release_date: date | None
    poster_path: str | None
