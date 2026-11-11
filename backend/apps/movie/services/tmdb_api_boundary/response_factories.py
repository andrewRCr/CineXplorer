"""Pydantic schema factory functions for converting TMDB API responses to application schemas.

This module provides factory functions that handle the data transformation layer between
TMDB API responses (typed as TMDBMovieBase, TMDBMovieDetail, etc.) and our application
schemas (MovieListItemSchema, MovieDetailSchema, etc.).

These factories serve as the boundary layer for external TMDB data, ensuring:
- Complete type safety through two-stage validation (TMDB models → app schemas)
- Consistent error handling and logging
- Centralized handling of TMDB API quirks (empty string dates, missing fields, etc.)

Usage:
    # Convert TMDB movie response to MovieListItemSchema
    tmdb_data = {"id": 550, "title": "Fight Club", ...}
    movie = create_movie_base_from_tmdb(tmdb_data)

    # Convert TMDB paginated response
    tmdb_response = {"page": 1, "results": [...], ...}
    paginated = create_paginated_movie_response_from_tmdb(tmdb_response)

Architecture Notes:
    - These factories are pure functions with no side effects
    - They use the TMDB models from apps.core.tmdb_models for input validation
    - They create schemas from apps.movie.schemas for application use
    - Failed TMDB responses raise domain exceptions from apps.core.exceptions. Card mapping
      answers invalid data with an upstream error; MovieService's detail path translates
      conversion validation failures to 502. Other endpoint conversion paths keep their handling.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Mapping
from datetime import date
from typing import NoReturn

from django.core.exceptions import ValidationError as DjangoValidationError
from pydantic import ValidationError

from apps.core.exceptions import UpstreamError
from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.services.validators import raise_upstream_error
from apps.core.tmdb_models.tmdb_responses import (
    TMDBCreditsResponse,
    TMDBGenreListResponse,
    TMDBMovieDetail,
    TMDBPaginatedKeywordResponse,
    TMDBPaginatedMovieResponse,
    TMDBPaginatedPersonResponse,
    TMDBReleaseDatesResponse,
)

from ...schemas import (
    CastMemberSchema,
    CrewMemberSchema,
    GenreSchema,
    KeywordListResponseSchema,
    KeywordSchema,
    MovieDetailSchema,
    MovieListItemSchema,
    MovieListResponseSchema,
    PersonListResponseSchema,
    PersonSchema,
    ProductionCompanySchema,
    SpokenLanguageSchema,
)

# Use TMDB-specific logger for better log organization
logger = logging.getLogger("cinexplorer.tmdb")


# =========================
# Error Handling
# =========================


def handle_tmdb_api_error(
    api_response: ApiResponse, operation: str, *, lookup: bool = False, **context: object
) -> NoReturn:
    """Log a failed TMDB response and raise the client-facing error for it.

    Args:
        api_response: ApiResponse object from TMDB client
        operation: Name of the operation that failed
        lookup: True when the request fetched one resource by ID (see raise_upstream_error)
        **context: Additional context for logging

    Raises:
        NotFoundError, InvalidInputError or UpstreamError: 404, 400, or 502, 503 or 504,
            with a fixed message (see raise_upstream_error)
    """
    correlation_id = getattr(api_response, "correlation_id", str(uuid.uuid4())[:8])

    logger.error(
        f"TMDB API error in {operation}",
        extra={
            "correlation_id": correlation_id,
            "operation": operation,
            "status_code": api_response.status_code,
            "error_message": api_response.error_message,
            "error_category": api_response.error_category,
            **context,
        },
    )

    raise_upstream_error(api_response, lookup=lookup)


def get_validated_response(
    api_response: ApiResponse, operation: str, **context: object
) -> dict[str, object]:
    """Validate API response and return JSON data.

    Combines success check, error handling, and data extraction into a single call.
    Replaces the repeated pattern of is_success() → handle_error → get_json_data() → validate.

    Args:
        api_response: ApiResponse object from TMDB client
        operation: Name of the operation for error context
        **context: Additional context for logging (e.g., page=1, query="term")

    Returns:
        Validated JSON data dictionary

    Raises:
        InvalidInputError or UpstreamError: If the TMDB request failed (see raise_upstream_error)
        UpstreamError: If TMDB answered without data
    """
    if not api_response.is_success():
        # Lists and searches: a 404 here means the integration broke, not a missing resource
        handle_tmdb_api_error(api_response, operation=operation, lookup=False, **context)

    result = api_response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                "correlation_id": api_response.correlation_id,
                "operation": operation,
                **context,
            },
        )
        raise UpstreamError("Failed to get valid response data from TMDB")

    return result


# =========================
# TMDB Data Extraction Helpers
# =========================


def extract_us_certification(release_dates: TMDBReleaseDatesResponse | None) -> str | None:
    """Extract US MPAA certification from TMDB release_dates response.

    Priority: Prefer type 3 (theatrical release), fall back to any with certification.
    Release types: 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV

    Args:
        release_dates: Validated TMDB release_dates response model

    Returns:
        US certification string (e.g., "PG-13", "R") or None if unavailable
    """
    if not release_dates:
        return None

    # Find US entry
    us_entry = next(
        (country for country in release_dates.results if country.iso_3166_1 == "US"), None
    )
    if not us_entry:
        return None

    # Find theatrical (type 3) certification first
    theatrical = next(
        (r.certification for r in us_entry.release_dates if r.type == 3 and r.certification), None
    )
    if theatrical:
        return theatrical

    # Fall back to first valid certification
    return next((r.certification for r in us_entry.release_dates if r.certification), None)


# =========================
# Movie Schema Factories
# =========================


def create_movie_base_from_tmdb(tmdb_data: Mapping[str, object]) -> MovieListItemSchema:
    """Create a MovieListItemSchema instance from TMDB API response data.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_data: Raw TMDB movie data dictionary

    Returns:
        MovieListItemSchema instance with validated data

    Raises:
        pydantic.ValidationError: If data validation fails or required fields are missing;
            the error is logged and re-raised

    Note:
        TMDB API quirk: Sometimes returns empty string for release_date instead of null.
        This is normalized to None before Pydantic validation.
    """
    try:
        # First, validate against TMDB response structure for type safety
        from apps.core.tmdb_models.tmdb_responses import TMDBMovieBase

        tmdb_movie = TMDBMovieBase.model_validate(tmdb_data, strict=False)

        # Then convert to application schema
        # Note: TMDB sometimes returns empty string for release_date instead of null
        # Convert empty strings to None to avoid Pydantic validation errors
        release_date = tmdb_movie.release_date
        if isinstance(release_date, str) and release_date.strip() == "":
            release_date = None

        validated_data: dict[str, object] = {
            "tmdb_id": tmdb_movie.id,
            "title": tmdb_movie.title,
            "poster_path": tmdb_movie.poster_path,
            "release_date": release_date,
            "vote_average": tmdb_movie.vote_average,
            "vote_count": tmdb_movie.vote_count,
            "runtime": 0,  # Runtime not available in base movie responses
            "genre_ids": tmdb_data.get("genre_ids", []),  # Genre IDs for data quality filtering
            "overview": tmdb_movie.overview,
        }

        return MovieListItemSchema.model_validate(validated_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create MovieListItemSchema from TMDB data | error_type=%s",
            type(e).__name__,
            extra={"operation": "create_movie_base_from_tmdb", "error_type": type(e).__name__},
        )
        raise


def create_movie_detail_from_tmdb(
    movie_data: Mapping[str, object], credits_data: Mapping[str, object] | None = None
) -> MovieDetailSchema:
    """Create a MovieDetailSchema instance from TMDB movie and credits data.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        movie_data: TMDB movie details response
        credits_data: Optional TMDB credits response

    Returns:
        MovieDetailSchema instance with validated data

    Raises:
        pydantic.ValidationError: If data validation fails; the error is logged and re-raised
    """
    try:
        # First, validate against TMDB response structures for type safety
        tmdb_movie = TMDBMovieDetail.model_validate(movie_data, strict=False)
        tmdb_credits = None
        if credits_data:
            tmdb_credits = TMDBCreditsResponse.model_validate(credits_data, strict=False)

        # Convert TMDB movie to application schema
        # Normalize empty string release_date to None (TMDB API quirk)
        release_date = tmdb_movie.release_date
        if release_date == "":
            release_date = None

        # Extract US certification from release_dates (added via append_to_response)
        # Validate into typed model for clean extraction
        release_dates_raw = movie_data.get("release_dates")
        release_dates = None
        if isinstance(release_dates_raw, dict):
            release_dates = TMDBReleaseDatesResponse.model_validate(release_dates_raw)
        us_certification = extract_us_certification(release_dates)

        detail_data: dict[str, object] = {
            "tmdb_id": tmdb_movie.id,
            "title": tmdb_movie.title,
            "poster_path": tmdb_movie.poster_path,
            "release_date": release_date,
            "vote_average": tmdb_movie.vote_average,
            "vote_count": tmdb_movie.vote_count,
            "runtime": tmdb_movie.runtime or 0,
            "overview": tmdb_movie.overview or "",
            "user_movie_data": None,  # Will be set when user integration is implemented
            "us_certification": us_certification,
        }

        # Process genres from typed TMDB response
        detail_data["genres"] = [
            GenreSchema.model_validate({"id": genre.id, "name": genre.name}, strict=False)
            for genre in tmdb_movie.genres
        ]

        # Process production companies from typed TMDB response
        detail_data["production_companies"] = [
            ProductionCompanySchema.model_validate(
                {
                    "id": company.id,
                    "name": company.name,
                    "logo_path": company.logo_path,
                    "origin_country": company.origin_country,
                },
                strict=False,
            )
            for company in tmdb_movie.production_companies
        ]

        # Process spoken languages from typed TMDB response
        detail_data["spoken_languages"] = [
            SpokenLanguageSchema.model_validate(
                {
                    "iso_639_1": lang.iso_639_1,
                    "english_name": lang.english_name,
                },
                strict=False,
            )
            for lang in tmdb_movie.spoken_languages
        ]

        # Process credits if provided
        if tmdb_credits:
            # Process cast from typed TMDB response
            detail_data["cast"] = [
                CastMemberSchema.model_validate(
                    {
                        "id": person.id,
                        "name": person.name,
                        "character": person.character,
                        "profile_path": person.profile_path,
                        "cast_id": person.cast_id,
                        "credit_id": person.credit_id,
                        "order": person.order,
                    },
                    strict=False,
                )
                for person in tmdb_credits.cast
            ]

            # Process crew from typed TMDB response
            detail_data["crew"] = [
                CrewMemberSchema.model_validate(
                    {
                        "id": person.id,
                        "name": person.name,
                        "job": person.job,
                        "department": person.department,
                        "profile_path": person.profile_path,
                        "credit_id": person.credit_id,
                    },
                    strict=False,
                )
                for person in tmdb_credits.crew
            ]

        return MovieDetailSchema.model_validate(detail_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create MovieDetailSchema from TMDB data | error_type=%s",
            type(e).__name__,
            extra={"operation": "create_movie_detail_from_tmdb", "error_type": type(e).__name__},
        )
        raise


def create_paginated_movie_response_from_tmdb(
    tmdb_response: dict[str, object],
) -> MovieListResponseSchema:
    """Create a MovieListResponseSchema from TMDB paginated response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB search/discover response with pagination

    Returns:
        MovieListResponseSchema instance

    Raises:
        pydantic.ValidationError: If data validation fails; the error is logged and re-raised
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_search = TMDBPaginatedMovieResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            "page": tmdb_search.page,
            "total_pages": tmdb_search.total_pages,
            "total_results": tmdb_search.total_results,
            "results": [],
        }

        # Process movie results using typed models
        pagination_data["results"] = [
            create_movie_base_from_tmdb(movie.model_dump()) for movie in tmdb_search.results
        ]

        return MovieListResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create MovieListResponseSchema from TMDB data | error_type=%s",
            type(e).__name__,
            extra={
                "operation": "create_paginated_movie_response_from_tmdb",
                "error_type": type(e).__name__,
            },
        )
        raise


# =========================
# Supporting Data Factories
# =========================


def create_paginated_keyword_response_from_tmdb(
    tmdb_response: dict[str, object],
) -> KeywordListResponseSchema:
    """Create a KeywordListResponseSchema from TMDB keyword response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB keyword search/list response

    Returns:
        KeywordListResponseSchema instance

    Raises:
        pydantic.ValidationError: If data validation fails; the error is logged and re-raised
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_keywords = TMDBPaginatedKeywordResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            "page": tmdb_keywords.page,
            "total_pages": tmdb_keywords.total_pages,
            "total_results": tmdb_keywords.total_results,
            "results": [],
        }

        # Process keyword results using typed models
        pagination_data["results"] = [
            KeywordSchema.model_validate({"id": keyword.id, "name": keyword.name}, strict=False)
            for keyword in tmdb_keywords.results
        ]

        return KeywordListResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create KeywordListResponseSchema from TMDB data | error_type=%s",
            type(e).__name__,
            extra={
                "operation": "create_paginated_keyword_response_from_tmdb",
                "error_type": type(e).__name__,
            },
        )
        raise


def create_paginated_person_response_from_tmdb(
    tmdb_response: dict[str, object],
) -> PersonListResponseSchema:
    """Create a PersonListResponseSchema from TMDB person response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB person search/popular response

    Returns:
        PersonListResponseSchema instance

    Raises:
        pydantic.ValidationError: If data validation fails; the error is logged and re-raised
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_people = TMDBPaginatedPersonResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            "page": tmdb_people.page,
            "total_pages": tmdb_people.total_pages,
            "total_results": tmdb_people.total_results,
            "results": [],
        }

        # Process person results using typed models
        pagination_data["results"] = [
            PersonSchema.model_validate(
                {
                    "id": person.id,
                    "name": person.name,
                    "profile_path": person.profile_path,
                    "known_for_department": person.known_for_department,
                },
                strict=False,
            )
            for person in tmdb_people.results
        ]

        return PersonListResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create PersonListResponseSchema from TMDB data | error_type=%s",
            type(e).__name__,
            extra={
                "operation": "create_paginated_person_response_from_tmdb",
                "error_type": type(e).__name__,
            },
        )
        raise


def create_genre_list_from_tmdb(tmdb_response: Mapping[str, object]) -> list[GenreSchema]:
    """Create a list of GenreSchema instances from TMDB genre list response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB genre/movie/list response

    Returns:
        List of GenreSchema instances

    Raises:
        pydantic.ValidationError: If data validation fails; the error is logged and re-raised
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_genres = TMDBGenreListResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        return [
            GenreSchema.model_validate({"id": genre.id, "name": genre.name}, strict=False)
            for genre in tmdb_genres.genres
        ]

    except Exception as e:
        logger.error(
            "Failed to create genre list from TMDB data | error_type=%s",
            type(e).__name__,
            extra={"operation": "create_genre_list_from_tmdb", "error_type": type(e).__name__},
        )
        raise


def movie_card_fields(data: Mapping[str, object]) -> dict[str, object]:
    """Map a TMDB details payload to stored card fields."""
    try:
        detail = TMDBMovieDetail.model_validate(data)
        for field, value in (("title", detail.title), ("poster_path", detail.poster_path)):
            Movie._meta.get_field(field).run_validators(value)
        release_date = date.fromisoformat(detail.release_date) if detail.release_date else None
    except (ValidationError, DjangoValidationError, ValueError) as error:
        raise UpstreamError("Invalid movie data from external API") from error
    return {
        "title": detail.title,
        "poster_path": detail.poster_path,
        "release_date": release_date,
        "vote_average": detail.vote_average,
        "vote_count": detail.vote_count,
        "runtime": detail.runtime or None,
        "overview": detail.overview or None,
        "genre_ids": [genre.id for genre in detail.genres],
    }
