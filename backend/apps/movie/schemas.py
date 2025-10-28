"""Pydantic schemas for the movie API."""
from __future__ import annotations

from datetime import date
from typing import Annotated

from core.models import Movie
from ninja import Schema
from ninja.orm import ModelSchema
from pydantic import Field, field_validator


class MovieSearchParamsSchema(Schema):
    """Schema for movie search parameters with empty string handling.

    Handles Django Ninja 1.4.3 + Pydantic 2.12.0 behavior where missing
    query parameters are sent as empty strings instead of being omitted.
    """
    query: str = Field(..., description="Search query string")
    page: int | None = Field(None, description="Page number for pagination")

    @field_validator('page', mode='before')
    @classmethod
    def convert_empty_page_to_none(cls, v: object) -> object:
        """Convert empty strings to None for page parameter."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class PaginationParamsSchema(Schema):
    """Schema for pagination parameters with empty string handling.

    Handles Django Ninja 1.4.3 + Pydantic 2.12.0 behavior where missing
    query parameters are sent as empty strings instead of being omitted.
    """
    page: int | None = Field(None, description="Page number for pagination")

    @field_validator('page', mode='before')
    @classmethod
    def convert_empty_page_to_none(cls, v: object) -> object:
        """Convert empty strings to None for page parameter."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


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
    vote_count: int | None = None
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
    """Standard TMDB-style pagination envelope for movie collections.

    Includes pagination metadata tracking for smart buffer mechanism:
    - next_tmdb_page_start: Tracks the next TMDB page to fetch when buffer
      consumes multiple pages per API response. This prevents duplicates when
      client requests subsequent pages.
    """

    page: int = 1
    total_pages: int = 0
    total_results: int = 0
    results: list[MovieBaseSchema] = Field(default_factory=_empty_movie_list)
    next_tmdb_page_start: int | None = Field(
        default=None,
        description="Next TMDB page to fetch for pagination continuation (smart buffer tracking)"
    )


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


class MovieDiscoverFilterSchema(Schema):
    """
    Schema for TMDB discover endpoint filtering with two-pass architecture.

    Extracts parameters for both:
    1. TMDB API filtering (primary) - Reduces millions of movies to thousands
    2. Backend filtering (second-pass) - Catches TMDB data quality issues

    For example, release_date_gte="2020-01-01" generates:
    - release_date.gte for TMDB API (primary filter)
    - year_min=2020 for backend filtering (data hygiene)

    Handles 40+ optional query parameters with automatic empty string to None
    conversion, solving Django Ninja 1.4.3 + Pydantic 2.12.0 validation issues
    where missing parameters are sent as empty strings instead of being omitted.

    See: External research on Django Ninja optional parameter handling (2025-10-09)
    """

    # Pagination
    page: Annotated[int | None, Field(description="Page number for pagination")] = None
    tmdb_page_start: Annotated[
        int | None,
        Field(description="TMDB page to start fetching from (smart buffer continuation)")
    ] = None

    # Genre/Keyword filters
    with_genres: Annotated[str | None, Field(description="Comma-separated genre IDs")] = None
    with_keywords: Annotated[str | None, Field(description="Comma-separated keyword IDs")] = None
    without_genres: str | None = None
    without_keywords: str | None = None

    # Cast/Crew filters
    with_cast: Annotated[str | None, Field(description="Comma-separated person IDs")] = None
    with_crew: str | None = None
    with_people: str | None = None

    # Company/Network filters
    with_companies: str | None = None
    with_networks: str | None = None
    without_companies: str | None = None
    without_networks: str | None = None

    # Watch provider filters
    with_watch_providers: str | None = None
    without_watch_providers: str | None = None
    with_watch_monetization_types: str | None = None

    # Boolean filters
    include_adult: bool | None = None
    include_video: bool | None = None

    # Language/Region filters
    language: Annotated[str | None, Field(description="ISO 639-1 language code")] = None
    region: Annotated[str | None, Field(description="ISO 3166-1 country code")] = None
    with_original_language: str | None = None
    without_original_language: str | None = None

    # Release date filters
    primary_release_year: int | None = None
    year: int | None = None
    primary_release_date_gte: str | None = None
    primary_release_date_lte: str | None = None
    release_date_gte: str | None = None
    release_date_lte: str | None = None
    with_release_type: str | None = None

    # Rating filters
    vote_count_gte: int | None = None
    vote_count_lte: int | None = None
    vote_average_gte: float | None = None
    vote_average_lte: float | None = None

    # Runtime filters
    with_runtime_gte: int | None = None
    with_runtime_lte: int | None = None

    # Certification filters
    certification_country: str | None = None
    certification: str | None = None
    certification_lte: str | None = None
    certification_gte: str | None = None

    # Sorting
    sort_by: Annotated[
        str | None,
        Field(description="Sort by field (e.g., popularity.desc, vote_average.desc)")
    ] = None

    # Frontend convenience aliases
    decade: Annotated[str | None, Field(description="Decade filter (e.g., '1990s')")] = None
    genres: Annotated[str | None, Field(description="Alias for with_genres")] = None

    @field_validator('*', mode='before')
    @classmethod
    def convert_empty_strings_to_none(cls, v: object) -> object:
        """
        Convert empty strings to None for all string fields.

        This handles the Django Test Client / Django Ninja 1.4.3 behavior of
        sending empty strings for omitted parameters, ensuring Pydantic validation
        passes for optional `str | None` and `int | None` fields.

        Args:
            v: The field value to validate

        Returns:
            None if v is an empty string, otherwise the original value
        """
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    def _extract_year_from_date(self, date_str: str) -> int:
        """Extract year as integer from ISO date string (e.g., '2020-01-01' → 2020)."""
        return int(date_str[:4])

    def _apply_derived_params(
        self,
        data: dict[str, object],
        params: dict[str, str | int | float | bool]
    ) -> None:
        """Apply derived parameters (backend filtering, aliases, transformations)."""
        # Backend filtering: Extract year boundaries from date strings
        if 'release_date_gte' in data:
            params['year_min'] = self._extract_year_from_date(str(data['release_date_gte']))  # type: ignore[assignment]
        if 'release_date_lte' in data:
            params['year_max'] = self._extract_year_from_date(str(data['release_date_lte']))  # type: ignore[assignment]

        # Backend filtering: Extract rating boundaries
        if 'vote_average_gte' in data:
            params['rating_min'] = data['vote_average_gte']  # type: ignore[assignment]
        if 'vote_average_lte' in data:
            params['rating_max'] = data['vote_average_lte']  # type: ignore[assignment]

        # Alias handling: 'genres' or 'with_genres' → 'genres'
        if 'genres' in data:
            params['genres'] = data['genres']  # type: ignore[assignment]
        elif 'with_genres' in data:
            params['genres'] = data['with_genres']  # type: ignore[assignment]

        # Decade conversion: "1990s" → date range
        if 'decade' in data:
            try:
                decade_str = str(data['decade'])
                year = int(decade_str[:4])
                start_year = year if decade_str.endswith('s') else (year // 10) * 10
                end_year = start_year + 9
                params['release_date.gte'] = f"{start_year}-01-01"
                params['release_date.lte'] = f"{end_year}-12-31"
            except (ValueError, TypeError):
                pass

    def to_service_params(self) -> dict[str, str | int | float | bool]:
        """
        Convert filter schema to service layer parameter format.

        The service layer (movie_service.discover_movies) expects parameter names
        in its own format (e.g., 'genres', 'vote_average.gte') which it then maps
        to TMDB API format internally.

        This method extracts parameters for both:
        1. TMDB API filtering (primary filter - reduces millions to thousands)
        2. Backend filtering (second-pass data hygiene - catches TMDB quality issues)

        Uses declarative field mappings for maintainability and extensibility.

        Returns:
            Dictionary with service layer parameters (None values excluded)
        """
        # Get all non-None values from schema using Pydantic's model_dump
        data = self.model_dump(exclude_none=True)
        params: dict[str, str | int | float | bool] = {}

        # Declarative field mappings: schema_field → service_parameter_name
        field_mappings: dict[str, str] = {
            'sort_by': 'sort_by',
            'year': 'year',
            'vote_average_gte': 'vote_average.gte',
            'vote_average_lte': 'vote_average.lte',
            'release_date_gte': 'release_date.gte',
            'release_date_lte': 'release_date.lte',
            'certification': 'certification',
            'region': 'region',
            'tmdb_page_start': 'tmdb_page_start',
        }

        # Apply simple field mappings (passthrough and renames)
        for schema_field, param_name in field_mappings.items():
            if schema_field in data:
                params[param_name] = data[schema_field]  # type: ignore[assignment]

        # Apply derived parameters (backend filtering, aliases, transformations)
        self._apply_derived_params(data, params)

        return params


__all__ = [
    "CastMemberSchema",
    "CrewMemberSchema",
    "GenreSchema",
    "KeywordSchema",
    "MediaReferenceSchema",
    "MovieBaseSchema",
    "MovieDetailSchema",
    "MovieDiscoverFilterSchema",
    "MovieModelSchema",
    "MovieSearchParamsSchema",
    "PaginatedKeywordResponseSchema",
    "PaginatedMovieResponseSchema",
    "PaginatedPersonResponseSchema",
    "PaginationParamsSchema",
    "PersonSchema",
    "ProductionCompanySchema",
    "UserMovieDataSchema",
]
