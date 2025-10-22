"""Pydantic schemas for the movie API."""
from __future__ import annotations

from datetime import date

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


class MovieDiscoverFilterSchema(Schema):
    """
    Schema for TMDB discover endpoint filtering.

    Handles 40+ optional query parameters with automatic empty string to None
    conversion, solving Django Ninja 1.4.3 + Pydantic 2.12.0 validation issues
    where missing parameters are sent as empty strings instead of being omitted.

    See: External research on Django Ninja optional parameter handling (2025-10-09)
    """

    # Pagination
    page: int | None = Field(None, description="Page number for pagination")

    # Genre/Keyword filters
    with_genres: str | None = Field(None, description="Comma-separated genre IDs")
    with_keywords: str | None = Field(None, description="Comma-separated keyword IDs")
    without_genres: str | None = None
    without_keywords: str | None = None

    # Cast/Crew filters
    with_cast: str | None = Field(None, description="Comma-separated person IDs")
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
    language: str | None = Field(None, description="ISO 639-1 language code")
    region: str | None = Field(None, description="ISO 3166-1 country code")
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
    sort_by: str | None = Field(
        None,
        description="Sort by field (e.g., popularity.desc, vote_average.desc)"
    )

    # Frontend convenience aliases
    decade: str | None = Field(None, description="Decade filter (e.g., '1990s')")
    genres: str | None = Field(None, description="Alias for with_genres")

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

    def to_service_params(self) -> dict[str, str | int | float | bool]:
        """
        Convert filter schema to service layer parameter format.

        The service layer (movie_service.discover_movies) expects parameter names
        in its own format (e.g., 'genres', 'vote_average.gte') which it then maps
        to TMDB API format internally.

        Returns:
            Dictionary with service layer parameters (None values excluded)
        """
        params: dict[str, str | int | float | bool] = {}

        # Map schema fields to service layer parameter names
        # The service layer will handle further mapping to TMDB API format
        if self.sort_by is not None:
            params['sort_by'] = self.sort_by  # type: ignore[assignment]
        if self.year is not None:
            params['year'] = self.year  # type: ignore[assignment]
        if self.vote_average_gte is not None:
            params['vote_average.gte'] = self.vote_average_gte  # type: ignore[assignment]
        if self.vote_average_lte is not None:
            params['vote_average.lte'] = self.vote_average_lte  # type: ignore[assignment]
        if self.release_date_gte is not None:
            params['release_date.gte'] = self.release_date_gte  # type: ignore[assignment]
        if self.release_date_lte is not None:
            params['release_date.lte'] = self.release_date_lte  # type: ignore[assignment]
        if self.certification is not None:
            params['certification'] = self.certification  # type: ignore[assignment]
        if self.region is not None:
            params['region'] = self.region  # type: ignore[assignment]

        # Handle 'genres' alias - service layer expects 'genres', not 'with_genres'
        if self.genres is not None:
            params['genres'] = self.genres  # type: ignore[assignment]
        elif self.with_genres is not None:
            params['genres'] = self.with_genres  # type: ignore[assignment]

        # Handle decade conversion
        if self.decade is not None:
            try:
                decade_str = str(self.decade)
                year = int(decade_str[:4])
                start_year = year if decade_str.endswith('s') else (year // 10) * 10
                end_year = start_year + 9
                params['release_date.gte'] = f"{start_year}-01-01"
                params['release_date.lte'] = f"{end_year}-12-31"
            except (ValueError, TypeError):
                pass

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
