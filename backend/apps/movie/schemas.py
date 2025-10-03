"""Pydantic schemas for the movie API."""
from __future__ import annotations

from datetime import date

from core.models import Movie
from ninja import Schema
from ninja.orm import ModelSchema
from pydantic import Field


def _empty_genre_list() -> list[GenreSchema]:
    return []


def _empty_company_list() -> list[ProductionCompanySchema]:
    return []


def _empty_cast_list() -> list[CastMemberSchema]:
    return []


def _empty_crew_list() -> list[CrewMemberSchema]:
    return []


def _empty_movie_list() -> list[MovieBaseSchema]:
    return []


def _empty_keyword_list() -> list[KeywordSchema]:
    return []


def _empty_media_reference_list() -> list[MediaReferenceSchema]:
    return []


def _empty_person_list() -> list[PersonSchema]:
    return []


class MovieModelSchema(ModelSchema):
    """Mirror of the local `Movie` model for endpoints that touch persisted data."""

    class Meta:
        model = Movie
        fields = ["tmdb_id", "title", "poster_path", "release_date"]


class UserMovieDataSchema(Schema):
    """Shape of the user-specific movie metadata attached to TMDB responses."""

    id: int | None = None
    tmdb_id: int | None = None
    title: str | None = None
    user_watched: bool = False
    user_on_watchlist: bool = False
    user_liked: bool = False
    user_rating: int | None = None
    user_review: str | None = None


class MovieBaseSchema(Schema):
    """Minimal movie representation used in list endpoints."""

    tmdb_id: int
    title: str
    poster_path: str | None = None
    release_date: date | None = None
    vote_average: float | None = None
    runtime: int | None = None
    user_movie_data: UserMovieDataSchema | None = None


class GenreSchema(Schema):
    id: int
    name: str


class ProductionCompanySchema(Schema):
    id: int
    name: str
    logo_path: str | None = None
    origin_country: str | None = None


class CrewMemberSchema(Schema):
    id: int
    name: str
    job: str | None = None
    profile_path: str | None = None


class CastMemberSchema(Schema):
    id: int
    name: str
    character: str | None = None
    profile_path: str | None = None


class MovieDetailSchema(MovieBaseSchema):
    """Extended movie representation for detail endpoints."""

    overview: str | None = None
    genres: list[GenreSchema] = Field(default_factory=_empty_genre_list)
    production_companies: list[ProductionCompanySchema] = Field(
        default_factory=_empty_company_list
    )
    cast: list[CastMemberSchema] = Field(default_factory=_empty_cast_list)
    crew: list[CrewMemberSchema] = Field(default_factory=_empty_crew_list)


class PaginatedMovieResponseSchema(Schema):
    """Standard TMDB-style pagination envelope for movie collections."""

    page: int = 1
    total_pages: int = 0
    total_results: int = 0
    results: list[MovieBaseSchema] = Field(default_factory=_empty_movie_list)


class KeywordSchema(Schema):
    id: int
    name: str


class PaginatedKeywordResponseSchema(Schema):
    page: int = 1
    total_pages: int = 0
    total_results: int = 0
    results: list[KeywordSchema] = Field(default_factory=_empty_keyword_list)


class MediaReferenceSchema(Schema):
    id: int | None = None
    media_type: str | None = None
    title: str | None = None
    name: str | None = None
    poster_path: str | None = None
    profile_path: str | None = None


class PersonSchema(Schema):
    id: int
    name: str
    profile_path: str | None = None
    known_for_department: str | None = None
    known_for: list[MediaReferenceSchema] = Field(default_factory=_empty_media_reference_list)


class PaginatedPersonResponseSchema(Schema):
    page: int = 1
    total_pages: int = 0
    total_results: int = 0
    results: list[PersonSchema] = Field(default_factory=_empty_person_list)


__all__ = [
    "CastMemberSchema",
    "CrewMemberSchema",
    "GenreSchema",
    "KeywordSchema",
    "MediaReferenceSchema",
    "MovieBaseSchema",
    "MovieDetailSchema",
    "MovieModelSchema",
    "PaginatedKeywordResponseSchema",
    "PaginatedMovieResponseSchema",
    "PaginatedPersonResponseSchema",
    "PersonSchema",
    "ProductionCompanySchema",
    "UserMovieDataSchema",
]
