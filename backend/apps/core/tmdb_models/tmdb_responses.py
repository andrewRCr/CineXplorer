"""
Pydantic models for TMDB API response structures.

This module defines typed response models for The Movie Database (TMDB) API
to replace generic dict[str, object] usage and provide complete type safety
throughout the application.

These models are used internally for parsing TMDB responses before converting
them to our application schemas (MovieDetailSchema, MovieBaseSchema, etc.).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TMDBGenre(BaseModel):
    """TMDB genre response structure."""
    id: int
    name: str


class TMDBProductionCompany(BaseModel):
    """TMDB production company response structure."""
    id: int
    name: str
    logo_path: str | None = None
    origin_country: str | None = None


class TMDBCastMember(BaseModel):
    """TMDB cast member response structure."""
    id: int
    name: str
    character: str | None = None
    profile_path: str | None = None
    cast_id: int | None = None
    credit_id: str | None = None
    order: int | None = None
    gender: int | None = None
    known_for_department: str | None = None


class TMDBCrewMember(BaseModel):
    """TMDB crew member response structure."""
    id: int
    name: str
    job: str | None = None
    department: str | None = None
    profile_path: str | None = None
    credit_id: str | None = None
    gender: int | None = None
    known_for_department: str | None = None


class TMDBCreditsResponse(BaseModel):
    """TMDB movie credits response structure."""
    id: int | None = None
    cast: list[TMDBCastMember] = Field(default_factory=list)
    crew: list[TMDBCrewMember] = Field(default_factory=list)


class TMDBMovieBase(BaseModel):
    """Base TMDB movie response structure (shared fields)."""
    id: int
    title: str
    overview: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    # Keep as string to match TMDB API format (ISO 8601 YYYY-MM-DD)
    # Parsing to date is deferred - conversion handled at application layer if needed
    release_date: str | None = None
    vote_average: float | None = None
    vote_count: int | None = None
    popularity: float | None = None
    adult: bool | None = None
    video: bool | None = None
    original_language: str | None = None
    original_title: str | None = None
    genre_ids: list[int] = Field(default_factory=list)


class TMDBMovieDetail(TMDBMovieBase):
    """TMDB movie detail response structure (extends base with detail fields)."""
    runtime: int | None = None
    genres: list[TMDBGenre] = Field(default_factory=list)
    production_companies: list[TMDBProductionCompany] = Field(default_factory=list)
    budget: int | None = None
    revenue: int | None = None
    status: str | None = None
    tagline: str | None = None
    homepage: str | None = None
    imdb_id: str | None = None
    # Any: TMDB /movie/{id} - collection structure rarely used, fields vary by collection type
    # TODO: Create TMDBCollectionModel if collection features are implemented
    belongs_to_collection: dict[str, Any] | None = None
    # Any: TMDB /movie/{id} - country/language structures unused in current codebase
    # TODO: Create TMDBCountryModel and TMDBLanguageModel if needed for internationalization
    production_countries: list[dict[str, Any]] = Field(default_factory=list)
    spoken_languages: list[dict[str, Any]] = Field(default_factory=list)


class TMDBPaginatedResponse(BaseModel):
    """Base TMDB paginated response structure."""
    page: int
    total_pages: int
    total_results: int


class TMDBMovieSearchResponse(TMDBPaginatedResponse):
    """TMDB movie search/discover response structure."""
    results: list[TMDBMovieBase] = Field(default_factory=list)


class TMDBKeyword(BaseModel):
    """TMDB keyword response structure."""
    id: int
    name: str


class TMDBKeywordSearchResponse(TMDBPaginatedResponse):
    """TMDB keyword search response structure."""
    results: list[TMDBKeyword] = Field(default_factory=list)


class TMDBPerson(BaseModel):
    """TMDB person response structure."""
    id: int
    name: str
    profile_path: str | None = None
    adult: bool | None = None
    popularity: float | None = None
    known_for_department: str | None = None
    gender: int | None = None
    # Any: TMDB /search/person - known_for contains mixed movie/TV show structures
    # TODO: Create TMDBKnownForModel with discriminated union if person search features expand
    known_for: list[dict[str, Any]] = Field(default_factory=list)


class TMDBPersonSearchResponse(TMDBPaginatedResponse):
    """TMDB person search response structure."""
    results: list[TMDBPerson] = Field(default_factory=list)


class TMDBGenreListResponse(BaseModel):
    """TMDB genre list response structure."""
    genres: list[TMDBGenre] = Field(default_factory=list)
