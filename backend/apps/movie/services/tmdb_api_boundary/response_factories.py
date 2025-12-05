"""
Pydantic schema factory functions for converting TMDB API responses to application schemas.

This module provides factory functions that handle the data transformation layer between
TMDB API responses (typed as TMDBMovieBase, TMDBMovieDetail, etc.) and our application
schemas (MovieBaseSchema, MovieDetailSchema, etc.).

These factories serve as the boundary layer for external TMDB data, ensuring:
- Complete type safety through two-stage validation (TMDB models → app schemas)
- Consistent error handling and logging
- Centralized handling of TMDB API quirks (empty string dates, missing fields, etc.)

Usage:
    # Convert TMDB movie response to MovieBaseSchema
    tmdb_data = {"id": 550, "title": "Fight Club", ...}
    movie = create_movie_base_from_tmdb(tmdb_data)

    # Convert TMDB paginated response
    tmdb_response = {"page": 1, "results": [...], ...}
    paginated = create_paginated_movie_response_from_tmdb(tmdb_response)

Architecture Notes:
    - These factories are pure functions with no side effects
    - They use the TMDB models from core.tmdb_models for input validation
    - They create schemas from movie.schemas for application use
    - Error handling follows the standard HttpError pattern for API consistency
"""
from __future__ import annotations

import logging
import uuid
from collections.abc import Mapping

from core.services.api_response import ApiResponse
from core.tmdb_models.tmdb_responses import (
    TMDBCreditsResponse,
    TMDBGenreListResponse,
    TMDBMovieDetail,
    TMDBPaginatedKeywordResponse,
    TMDBPaginatedMovieResponse,
    TMDBPaginatedPersonResponse,
    TMDBReleaseDatesResponse,
)
from ninja.errors import HttpError

from ...schemas import (
    CastMemberSchema,
    CrewMemberSchema,
    GenreSchema,
    KeywordSchema,
    MovieBaseSchema,
    MovieDetailSchema,
    PaginatedKeywordResponseSchema,
    PaginatedMovieResponseSchema,
    PaginatedPersonResponseSchema,
    PersonSchema,
    ProductionCompanySchema,
    SpokenLanguageSchema,
)

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')


# =========================
# Error Handling
# =========================


def handle_tmdb_api_error(api_response: ApiResponse, operation: str, **context: object) -> None:
    """
    Handle TMDB API errors by raising appropriate HttpError exceptions.

    Args:
        api_response: ApiResponse object from TMDB client
        operation: Name of the operation that failed
        **context: Additional context for logging

    Raises:
        HttpError: With appropriate status code and message
    """
    correlation_id = getattr(api_response, 'correlation_id', str(uuid.uuid4())[:8])

    logger.error(
        f"TMDB API error in {operation}",
        extra={
            'correlation_id': correlation_id,
            'operation': operation,
            'status_code': api_response.status_code,
            'error_message': api_response.error_message,
            'error_category': api_response.error_category,
            **context
        }
    )

    # Map TMDB status codes to appropriate HTTP errors
    if api_response.status_code == 404:
        raise HttpError(404, "Resource not found")
    elif api_response.status_code == 429:
        raise HttpError(429, "Rate limit exceeded, please try again later")
    elif 400 <= api_response.status_code < 500:
        raise HttpError(400, "Invalid request")
    else:
        raise HttpError(500, "External API error")


def get_validated_response(
    api_response: ApiResponse,
    operation: str,
    **context: object
) -> dict[str, object]:
    """
    Validate API response and return JSON data.

    Combines success check, error handling, and data extraction into a single call.
    Replaces the repeated pattern of is_success() → handle_error → get_json_data() → validate.

    Args:
        api_response: ApiResponse object from TMDB client
        operation: Name of the operation for error context
        **context: Additional context for logging (e.g., page=1, query="term")

    Returns:
        Validated JSON data dictionary

    Raises:
        HttpError: If API error or invalid/empty data
    """
    if not api_response.is_success():
        handle_tmdb_api_error(api_response, operation=operation, **context)

    result = api_response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': api_response.correlation_id,
                'operation': operation,
                **context
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    return result


# =========================
# TMDB Data Extraction Helpers
# =========================


def extract_us_certification(release_dates: TMDBReleaseDatesResponse | None) -> str | None:
    """
    Extract US MPAA certification from TMDB release_dates response.

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
        (country for country in release_dates.results if country.iso_3166_1 == 'US'),
        None
    )
    if not us_entry:
        return None

    # Find theatrical (type 3) certification first
    theatrical = next(
        (r.certification for r in us_entry.release_dates if r.type == 3 and r.certification),
        None
    )
    if theatrical:
        return theatrical

    # Fall back to first valid certification
    return next(
        (r.certification for r in us_entry.release_dates if r.certification),
        None
    )


# =========================
# Movie Schema Factories
# =========================


def create_movie_base_from_tmdb(tmdb_data: Mapping[str, object]) -> MovieBaseSchema:
    """
    Create a MovieBaseSchema instance from TMDB API response data.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_data: Raw TMDB movie data dictionary

    Returns:
        MovieBaseSchema instance with validated data

    Raises:
        HttpError: If data validation fails or required fields are missing

    Note:
        TMDB API quirk: Sometimes returns empty string for release_date instead of null.
        This is normalized to None before Pydantic validation.
    """
    try:
        # First, validate against TMDB response structure for type safety
        from core.tmdb_models.tmdb_responses import TMDBMovieBase
        tmdb_movie = TMDBMovieBase.model_validate(tmdb_data, strict=False)

        # Then convert to application schema
        # Note: TMDB sometimes returns empty string for release_date instead of null
        # Convert empty strings to None to avoid Pydantic validation errors
        release_date = tmdb_movie.release_date
        if isinstance(release_date, str) and release_date.strip() == '':
            release_date = None

        validated_data: dict[str, object] = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': release_date,
            'vote_average': tmdb_movie.vote_average,
            'vote_count': tmdb_movie.vote_count,
            'runtime': 0,  # Runtime not available in base movie responses
            'genre_ids': tmdb_data.get('genre_ids', []),  # Genre IDs for data quality filtering
            'overview': tmdb_movie.overview,
        }

        return MovieBaseSchema.model_validate(validated_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create MovieBaseSchema from TMDB data",
            extra={
                'error': str(e),
                'tmdb_id': tmdb_data.get('id'),
                'operation': 'create_movie_base_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process movie data") from e


def create_movie_detail_from_tmdb(
    movie_data: Mapping[str, object],
    credits_data: Mapping[str, object] | None = None
) -> MovieDetailSchema:
    """
    Create a MovieDetailSchema instance from TMDB movie and credits data.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        movie_data: TMDB movie details response
        credits_data: Optional TMDB credits response

    Returns:
        MovieDetailSchema instance with validated data

    Raises:
        HttpError: If data validation fails
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
        if release_date == '':
            release_date = None

        # Extract US certification from release_dates (added via append_to_response)
        # Validate into typed model for clean extraction
        release_dates_raw = movie_data.get('release_dates')
        release_dates = None
        if isinstance(release_dates_raw, dict):
            release_dates = TMDBReleaseDatesResponse.model_validate(release_dates_raw)
        us_certification = extract_us_certification(release_dates)

        detail_data: dict[str, object] = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': release_date,
            'vote_average': tmdb_movie.vote_average,
            'runtime': tmdb_movie.runtime or 0,
            'overview': tmdb_movie.overview or '',
            'user_movie_data': None,  # Will be set when user integration is implemented
            'us_certification': us_certification,
        }

        # Process genres from typed TMDB response
        detail_data['genres'] = [
            GenreSchema.model_validate({
                'id': genre.id,
                'name': genre.name
            }, strict=False)
            for genre in tmdb_movie.genres
        ]

        # Process production companies from typed TMDB response
        detail_data['production_companies'] = [
            ProductionCompanySchema.model_validate({
                'id': company.id,
                'name': company.name,
                'logo_path': company.logo_path,
                'origin_country': company.origin_country
            }, strict=False)
            for company in tmdb_movie.production_companies
        ]

        # Process spoken languages from typed TMDB response
        detail_data['spoken_languages'] = [
            SpokenLanguageSchema.model_validate({
                'iso_639_1': lang.iso_639_1,
                'english_name': lang.english_name,
            }, strict=False)
            for lang in tmdb_movie.spoken_languages
        ]

        # Process credits if provided
        if tmdb_credits:
            # Process cast from typed TMDB response
            detail_data['cast'] = [
                CastMemberSchema.model_validate({
                    'id': person.id,
                    'name': person.name,
                    'character': person.character,
                    'profile_path': person.profile_path,
                    'cast_id': person.cast_id,
                    'credit_id': person.credit_id,
                    'order': person.order
                }, strict=False)
                for person in tmdb_credits.cast
            ]

            # Process crew from typed TMDB response
            detail_data['crew'] = [
                CrewMemberSchema.model_validate({
                    'id': person.id,
                    'name': person.name,
                    'job': person.job,
                    'department': person.department,
                    'profile_path': person.profile_path,
                    'credit_id': person.credit_id
                }, strict=False)
                for person in tmdb_credits.crew
            ]

        return MovieDetailSchema.model_validate(detail_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create MovieDetailSchema from TMDB data",
            extra={
                'error': str(e),
                'tmdb_id': movie_data.get('id'),
                'operation': 'create_movie_detail_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process movie details") from e


def create_paginated_movie_response_from_tmdb(
    tmdb_response: dict[str, object]
) -> PaginatedMovieResponseSchema:
    """
    Create a PaginatedMovieResponseSchema from TMDB paginated response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB search/discover response with pagination

    Returns:
        PaginatedMovieResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_search = TMDBPaginatedMovieResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            'page': tmdb_search.page,
            'total_pages': tmdb_search.total_pages,
            'total_results': tmdb_search.total_results,
            'results': []
        }

        # Process movie results using typed models
        pagination_data['results'] = [
            create_movie_base_from_tmdb(movie.model_dump())
            for movie in tmdb_search.results
        ]

        return PaginatedMovieResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create PaginatedMovieResponseSchema from TMDB data",
            extra={
                'error': str(e),
                'operation': 'create_paginated_movie_response_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process movie search results") from e


# =========================
# Supporting Data Factories
# =========================


def create_paginated_keyword_response_from_tmdb(
    tmdb_response: dict[str, object]
) -> PaginatedKeywordResponseSchema:
    """
    Create a PaginatedKeywordResponseSchema from TMDB keyword response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB keyword search/list response

    Returns:
        PaginatedKeywordResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_keywords = TMDBPaginatedKeywordResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            'page': tmdb_keywords.page,
            'total_pages': tmdb_keywords.total_pages,
            'total_results': tmdb_keywords.total_results,
            'results': []
        }

        # Process keyword results using typed models
        pagination_data['results'] = [
            KeywordSchema.model_validate({
                'id': keyword.id,
                'name': keyword.name
            }, strict=False)
            for keyword in tmdb_keywords.results
        ]

        return PaginatedKeywordResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create PaginatedKeywordResponseSchema from TMDB data",
            extra={
                'error': str(e),
                'operation': 'create_paginated_keyword_response_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process keyword results") from e


def create_paginated_person_response_from_tmdb(
    tmdb_response: dict[str, object]
) -> PaginatedPersonResponseSchema:
    """
    Create a PaginatedPersonResponseSchema from TMDB person response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB person search/popular response

    Returns:
        PaginatedPersonResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_people = TMDBPaginatedPersonResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        pagination_data: dict[str, object] = {
            'page': tmdb_people.page,
            'total_pages': tmdb_people.total_pages,
            'total_results': tmdb_people.total_results,
            'results': []
        }

        # Process person results using typed models
        pagination_data['results'] = [
            PersonSchema.model_validate({
                'id': person.id,
                'name': person.name,
                'profile_path': person.profile_path,
                'known_for_department': person.known_for_department
            }, strict=False)
            for person in tmdb_people.results
        ]

        return PaginatedPersonResponseSchema.model_validate(pagination_data, strict=False)

    except Exception as e:
        logger.error(
            "Failed to create PaginatedPersonResponseSchema from TMDB data",
            extra={
                'error': str(e),
                'operation': 'create_paginated_person_response_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process person results") from e


def create_genre_list_from_tmdb(tmdb_response: Mapping[str, object]) -> list[GenreSchema]:
    """
    Create a list of GenreSchema instances from TMDB genre list response.

    Uses typed TMDB response models for validation before converting to
    application schema, ensuring complete type safety.

    Args:
        tmdb_response: TMDB genre/movie/list response

    Returns:
        List of GenreSchema instances

    Raises:
        HttpError: If data validation fails
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_genres = TMDBGenreListResponse.model_validate(tmdb_response, strict=False)

        # Convert to application schema
        return [
            GenreSchema.model_validate({
                'id': genre.id,
                'name': genre.name
            }, strict=False)
            for genre in tmdb_genres.genres
        ]

    except Exception as e:
        logger.error(
            "Failed to create genre list from TMDB data",
            extra={
                'error': str(e),
                'operation': 'create_genre_list_from_tmdb',
                'error_type': type(e).__name__
            }
        )
        raise HttpError(500, "Failed to process genre data") from e
