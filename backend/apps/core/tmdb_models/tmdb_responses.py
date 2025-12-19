"""
Pydantic models for TMDB API response structures.

This module defines typed response models for The Movie Database (TMDB) API
to replace generic dict[str, object] usage and provide complete type safety
throughout the application.

These models are used internally for parsing TMDB responses before converting
them to our application schemas (MovieDetailSchema, MovieListItemSchema, etc.).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel


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
    cast: list[TMDBCastMember] = []
    crew: list[TMDBCrewMember] = []


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
    genre_ids: list[int] = []


class TMDBSpokenLanguage(BaseModel):
    """TMDB spoken language response structure.

    TMDB returns both 'name' (native) and 'english_name' fields.
    We use english_name for consistent display. The 'name' field is
    inconsistently populated per TMDB docs, so we skip it.
    """
    iso_639_1: str
    english_name: str


class TMDBMovieDetail(TMDBMovieBase):
    """TMDB movie detail response structure (extends base with detail fields)."""
    runtime: int | None = None
    genres: list[TMDBGenre] = []
    production_companies: list[TMDBProductionCompany] = []
    budget: int | None = None
    revenue: int | None = None
    status: str | None = None
    tagline: str | None = None
    homepage: str | None = None
    imdb_id: str | None = None
    # Any: TMDB /movie/{id} - collection structure rarely used, fields vary by collection type
    # TODO: Create TMDBCollectionModel if collection features are implemented
    belongs_to_collection: dict[str, Any] | None = None
    # Any: TMDB /movie/{id} - production_countries structure unused in current codebase
    # TODO: Create TMDBCountryModel if needed for internationalization
    production_countries: list[dict[str, Any]] = []
    spoken_languages: list[TMDBSpokenLanguage] = []


class TMDBPaginatedResponse(BaseModel):
    """Base TMDB paginated response structure."""
    page: int
    total_pages: int
    total_results: int


class TMDBPaginatedMovieResponse(TMDBPaginatedResponse):
    """TMDB paginated movie response for search, discover, and browse endpoints."""
    results: list[TMDBMovieBase] = []


class TMDBKeyword(BaseModel):
    """TMDB keyword response structure."""
    id: int
    name: str


class TMDBPaginatedKeywordResponse(TMDBPaginatedResponse):
    """TMDB paginated keyword response for search endpoints."""
    results: list[TMDBKeyword] = []


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
    known_for: list[dict[str, Any]] = []


class TMDBPaginatedPersonResponse(TMDBPaginatedResponse):
    """TMDB paginated person response for search endpoints."""
    results: list[TMDBPerson] = []


class TMDBGenreListResponse(BaseModel):
    """TMDB genre list response structure."""
    genres: list[TMDBGenre] = []


# =========================
# Release Dates Models (for certification extraction)
# =========================


class TMDBReleaseDate(BaseModel):
    """Individual release entry within a country's releases.

    TMDB release types:
    1 = Premiere, 2 = Theatrical (limited), 3 = Theatrical,
    4 = Digital, 5 = Physical, 6 = TV
    """
    certification: str = ''
    release_date: str = ''
    type: int = 0
    note: str = ''


class TMDBCountryReleases(BaseModel):
    """Per-country release information with certification data."""
    iso_3166_1: str
    release_dates: list[TMDBReleaseDate] = []


class TMDBReleaseDatesResponse(BaseModel):
    """TMDB release_dates append_to_response structure."""
    results: list[TMDBCountryReleases] = []
