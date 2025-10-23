from __future__ import annotations

import logging
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from typing import cast

from core.services.api_response import ApiResponse
from core.services.tmdb_api_client import TMDBApiClient
from core.services.validators import (
    validate_tmdb_paginated_response,
    validate_tmdb_response,
)
from core.tmdb_models.tmdb_responses import (
    TMDBCreditsResponse,
    TMDBGenreListResponse,
    TMDBKeywordSearchResponse,
    TMDBMovieBase,
    TMDBMovieDetail,
    TMDBMovieSearchResponse,
    TMDBPersonSearchResponse,
)
from core.types.api_types import TMDBParams
from ninja.errors import HttpError

from ..schemas import (
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
)
from .result_filtering import filter_movies_by_rating, filter_movies_by_year

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')

# Initialize the TMDB API client
tmdb_client = TMDBApiClient()

# =========================
# Helper Functions
# =========================


# Legacy helper functions removed - replaced by Pydantic model factories and HttpError exceptions


def fetch_movie_runtimes(movie_ids: list[int]) -> dict[int, int]:
    """
    Fetch runtime data for multiple movies using typed API responses.

    Args:
        movie_ids: List of TMDB movie IDs

    Returns:
        Dictionary mapping movie IDs to runtime in minutes
    """
    runtimes: dict[int, int] = {}

    logger.info(
        f"Fetching runtimes for {len(movie_ids)} movies", extra={
            'operation': 'fetch_runtimes',
            'movie_count': len(movie_ids)
        }
    )

    for movie_id in movie_ids:
        try:
            # Use the typed get_movie_by_id function
            movie_detail = get_movie_by_id(movie_id)
            runtimes[movie_id] = movie_detail.runtime or 0

        except HttpError as e:
            logger.warning(
                f"Failed to fetch runtime for movie {movie_id}", extra={
                    'operation': 'fetch_runtime',
                    'movie_id': movie_id,
                    'error_status': getattr(e, 'status_code', None),
                    'error_message': getattr(e, 'message', str(e))
                },
                exc_info=True
            )
            runtimes[movie_id] = 0
        except Exception as e:
            logger.error(
                f"Unexpected error fetching runtime for movie {movie_id}", extra={
                    'operation': 'fetch_runtime',
                    'movie_id': movie_id,
                    'error_type': type(e).__name__,
                    'error': str(e)
                }
            )
            runtimes[movie_id] = 0

    return runtimes


# get_simple_credits function removed - credits processing now handled in
# create_movie_detail_from_tmdb factory


# =========================
# Pydantic Model Factory Utilities
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
    """
    try:
        # First, validate against TMDB response structure for type safety
        tmdb_movie = TMDBMovieBase.model_validate(tmdb_data, strict=False)

        # Then convert to application schema
        # Note: TMDB sometimes returns empty string for release_date instead of null
        # Convert empty strings to None to avoid Pydantic validation errors
        release_date = tmdb_movie.release_date
        if isinstance(release_date, str) and release_date.strip() == '':
            release_date = None

        validated_data = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': release_date,
            'vote_average': tmdb_movie.vote_average,
            'runtime': 0,  # Runtime not available in base movie responses
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
        detail_data: dict[str, object] = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': tmdb_movie.release_date,
            'vote_average': tmdb_movie.vote_average,
            'runtime': tmdb_movie.runtime or 0,
            'overview': tmdb_movie.overview or '',
            'user_movie_data': None,  # Will be set when user integration is implemented
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
        tmdb_search = TMDBMovieSearchResponse.model_validate(tmdb_response, strict=False)

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
        tmdb_keywords = TMDBKeywordSearchResponse.model_validate(tmdb_response, strict=False)

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
        tmdb_people = TMDBPersonSearchResponse.model_validate(tmdb_response, strict=False)

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


# =========================
# Single Resource Detail Service Methods
# =========================


def get_movie_by_id(tmdb_id: int) -> MovieDetailSchema:
    """
    Retrieves movie details and credits from TMDB by movie ID.

    Args:
        tmdb_id: TMDB movie ID

    Returns:
        MovieDetailSchema instance with validated movie data

    Raises:
        HttpError: If movie not found, API error, or data processing fails
    """
    # Use TMDB client for movie details
    info_response = tmdb_client.get_movie_details(tmdb_id)
    if not info_response.is_success():
        handle_tmdb_api_error(
            info_response,
            operation='get_movie_details',
            movie_id=tmdb_id,
            error_stage='fetching_movie_info'
        )

    # Use TMDB client for credits
    credits_response = tmdb_client.get(f"movie/{tmdb_id}/credits")
    if not credits_response.is_success():
        handle_tmdb_api_error(
            credits_response,
            operation='get_movie_credits',
            movie_id=tmdb_id,
            error_stage='fetching_credits'
        )

    info_result = info_response.get_json_data()
    credits_result = credits_response.get_json_data()

    # Type guard: ensure we have valid dictionaries
    if not info_result or not credits_result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': info_response.correlation_id,
                'operation': 'get_movie_by_id',
                'movie_id': tmdb_id,
                'info_data_valid': bool(info_result),
                'credits_data_valid': bool(credits_result)
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    # Use factory function to create properly typed MovieDetailSchema
    return create_movie_detail_from_tmdb(info_result, credits_result)

# =========================
# Paginated Resource Service Methods
# =========================


def get_now_playing_movies(page: int = 1) -> PaginatedMovieResponseSchema:
    """
    Retrieves a list of now playing movies from TMDB.

    Args:
        page: Page number for pagination

    Returns:
        PaginatedMovieResponseSchema with now playing movies

    Raises:
        HttpError: If API error or data processing fails
    """
    # Use the client's direct now playing method
    response = tmdb_client.get_now_playing_movies(page=page)

    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='get_now_playing_movies',
            page=page,
            error_stage='fetching_now_playing'
        )

    result = response.get_json_data()

    # Type guard: ensure we have a valid dictionary
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'get_now_playing_movies',
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    # Use factory function to create properly typed response
    return create_paginated_movie_response_from_tmdb(result)


def get_upcoming_movies(page: int = 1) -> PaginatedMovieResponseSchema:
    """
    Retrieves a list of upcoming movies from TMDB.

    Args:
        page: Page number for pagination

    Returns:
        PaginatedMovieResponseSchema with upcoming movies

    Raises:
        HttpError: If API error or data processing fails
    """
    today = datetime.now(tz=UTC)
    min_date = today.strftime("%Y-%m-%d")
    max_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

    params: TMDBParams = {
        "include_adult": False,
        "include_video": False,
        "language": "en-US",
        "region": "US",
        "page": page,
        "sort_by": "popularity.desc",
        "with_release_type": "2|3",
        "primary_release_date.gte": min_date,
        "primary_release_date.lte": max_date,
    }

    response = tmdb_client.get("discover/movie", cast(dict[str, object], params))

    # Use type-safe validator instead of manual error handling
    tmdb_response = validate_tmdb_paginated_response(response, TMDBMovieSearchResponse)
    result = tmdb_response.model_dump()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'get_upcoming_movies',
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    return create_paginated_movie_response_from_tmdb(result)


def search_movies(query: str, page: int = 1) -> PaginatedMovieResponseSchema:
    """
    Searches for movies by query string using TMDB.

    Args:
        query: Search query string
        page: Page number for pagination

    Returns:
        PaginatedMovieResponseSchema with filtered search results

    Raises:
        HttpError: If API error or data processing fails
    """
    # Use the client's direct search method
    response = tmdb_client.search_movies(
        query=query,
        page=page,
        include_adult=False,
        language="en-US",
        region="US"
    )

    # Use type-safe validator to get properly validated response
    tmdb_response = validate_tmdb_paginated_response(response, TMDBMovieSearchResponse)

    # Get the validated movies list
    movies = tmdb_response.results

    logger.debug("Search movies processing", extra={
        'operation': 'search_movies',
        'query': query,
        'page': page,
        'raw_results_count': len(movies)
    })

    # Filter out non-visual content (conservative approach)
    filtered_movies: list[TMDBMovieBase] = []
    for movie in movies:
        title = movie.title or ''
        title_lower = title.lower()

        # Skip if not a movie (search/movie should only return movies)
        # Note: TMDBMovieBase doesn't have media_type field, but search/movie endpoint
        # only returns movies anyway, so this check is redundant
        # if hasattr(movie, 'media_type') and movie.media_type and movie.media_type != 'movie':
        #     continue

        # Skip obvious non-visual content (very conservative)
        skip_terms = [
            'soundtrack', 'score', 'music from',
            'original motion picture soundtrack',
            'original score', 'music score', 'film score',
            'motion picture score'
        ]
        if any(skip_term in title_lower for skip_term in skip_terms):
            logger.debug("Filtering out non-visual content", extra={
                'operation': 'search_filter',
                'title': title,
                'reason': 'non_visual_content'
            })
            continue

        filtered_movies.append(movie)

    logger.debug("Search filtering completed", extra={
        'operation': 'search_filter_complete',
        'query': query,
        'raw_count': len(movies),
        'filtered_count': len(filtered_movies),
        'filtered_out': len(movies) - len(filtered_movies)
    })

    # Create filtered response using validated data
    filtered_total_results = (
        len(filtered_movies) +
        (tmdb_response.total_results - len(movies))
    )

    # Create a new TMDBMovieSearchResponse with filtered results
    filtered_response = TMDBMovieSearchResponse(
        page=tmdb_response.page,
        total_pages=tmdb_response.total_pages,
        total_results=filtered_total_results,
        results=filtered_movies
    )

    return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())


def discover_movies(
    page: int = 1,
    **filters: str | int | float | bool | None
) -> PaginatedMovieResponseSchema:
    """
    Flexible movie discovery with full TMDB filtering capabilities.

    Args:
        page: Page number for pagination
        **filters: Discovery filters including:
            - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
            - genres: Comma-separated genre IDs
            - year: Release year
            - vote_average_gte/lte: Rating range
            - keywords: Comma-separated keyword IDs
            - people: Comma-separated person IDs
            - release_date_gte/lte: Release date range
            - certification: Certification rating
            - region: Country code for regional release dates

    Returns:
        PaginatedMovieResponseSchema with discovered movies

    Raises:
        HttpError: If API error or data processing fails

    Note:
        Runtime filtering is disabled due to TMDB API limitations
    """
    logger.debug("Discover movies request", extra={
        'operation': 'discover_movies',
        'page': page,
        'filters': filters,
        'filter_count': len(filters)
    })

    # Build TMDB API parameters
    params: TMDBParams = {
        "include_adult": False,
        "include_video": False,
        "language": "en-US",
        "region": filters.get('region', 'US'),
        "page": page,
    }

    # Map filter names to TMDB parameter names
    # Support both underscore (direct service calls) and dot (API layer) parameter names
    filter_mapping = {
        'sort_by': 'sort_by',
        'genres': 'with_genres',
        'year': 'year',
        'vote_average_gte': 'vote_average.gte',  # Direct service calls with underscore
        'vote_average.gte': 'vote_average.gte',  # API sends with dot
        'vote_average_lte': 'vote_average.lte',  # Direct service calls with underscore
        'vote_average.lte': 'vote_average.lte',  # API sends with dot
        'keywords': 'with_keywords',
        'people': 'with_people',
        'release_date_gte': 'primary_release_date.gte',  # Direct service calls with underscore
        'release_date.gte': 'primary_release_date.gte',  # API sends with dot
        'release_date_lte': 'primary_release_date.lte',  # Direct service calls with underscore
        'release_date.lte': 'primary_release_date.lte',  # API sends with dot
        'certification': 'certification',
    }

    # Apply filters if provided
    for filter_name, tmdb_param in filter_mapping.items():
        if filter_name in filters and filters[filter_name] is not None:
            # Preserve data types for numeric parameters (support both naming conventions)
            numeric_params = [
                'year', 'primary_release_year',
                'vote_average_gte', 'vote_average.gte',
                'vote_average_lte', 'vote_average.lte',
                'vote_count', 'vote_count_gte', 'vote_count.gte',
                'vote_count_lte', 'vote_count.lte',
                'runtime', 'runtime_gte', 'runtime.gte',
                'runtime_lte', 'runtime.lte'
            ]
            if filter_name in numeric_params:
                params[tmdb_param] = filters[filter_name]
            else:
                params[tmdb_param] = str(filters[filter_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    response = tmdb_client.get("discover/movie", cast(dict[str, object], params))

    # Use type-safe validator to get properly validated response
    tmdb_response = validate_tmdb_paginated_response(response, TMDBMovieSearchResponse)

    # Get the validated movies list
    movies = tmdb_response.results

    # Log detailed discover response for debugging
    discover_metadata = {
        'operation': 'discover_response',
        'page': page,
        'movies_count': len(movies),
        'total_results': tmdb_response.total_results,
        'total_pages': tmdb_response.total_pages
    }

    if movies:
        first_movie = movies[0]
        discover_metadata['first_movie_release_date'] = str(
            first_movie.release_date) if first_movie.release_date else 'None'
        discover_metadata['first_movie_title'] = str(first_movie.title)
        discover_metadata['first_movie_id'] = int(first_movie.id)
        # Note: TMDBMovieBase doesn't include runtime field
        # Runtime is only available in TMDBMovieDetail for individual movie requests
        # if hasattr(first_movie, 'runtime') and first_movie.runtime:
        #     discover_metadata['first_movie_runtime'] = first_movie.runtime

    logger.debug("Discover movies response processed", extra=discover_metadata)

    return create_paginated_movie_response_from_tmdb(tmdb_response.model_dump())


# =========================
# Supporting Data Service Methods
# =========================


def get_movie_genres() -> list[GenreSchema]:
    """
    Retrieves the list of movie genres from TMDB.

    Returns:
        List of GenreSchema instances

    Raises:
        HttpError: If API error or data processing fails
    """
    response = tmdb_client.get("genre/movie/list")

    # Use type-safe validator
    tmdb_response = validate_tmdb_response(response, TMDBGenreListResponse)
    result = tmdb_response.model_dump()

    return create_genre_list_from_tmdb(result)


def get_popular_keywords(page: int = 1) -> PaginatedKeywordResponseSchema:
    """
    Retrieves popular keywords from TMDB.

    Args:
        page: Page number for pagination

    Returns:
        PaginatedKeywordResponseSchema with popular keywords

    Raises:
        HttpError: If API error or data processing fails
    """
    params: TMDBParams = {"page": page}
    response = tmdb_client.get("keyword/popular", cast(dict[str, object], params))
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='get_popular_keywords',
            page=page
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'get_popular_keywords',
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    return create_paginated_keyword_response_from_tmdb(result)


def search_keywords(query: str) -> PaginatedKeywordResponseSchema:
    """
    Searches for keywords by query string.

    Args:
        query: Search query string

    Returns:
        PaginatedKeywordResponseSchema with keyword search results

    Raises:
        HttpError: If API error or data processing fails
    """
    if not query or len(query.strip()) < 2:
        # Return empty response for invalid queries
        return PaginatedKeywordResponseSchema(
            page=1,
            total_pages=0,
            total_results=0,
            results=[]
        )

    response = tmdb_client.get("search/keyword", {"query": query})
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='search_keywords',
            query=query
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'search_keywords',
                'query': query
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    # Ensure we have results key for proper processing
    if 'results' not in result:
        result['results'] = []

    return create_paginated_keyword_response_from_tmdb(result)


def get_popular_people(page: int = 1) -> PaginatedPersonResponseSchema:
    """
    Retrieves popular people (actors, directors, etc.) from TMDB.

    Args:
        page: Page number for pagination

    Returns:
        PaginatedPersonResponseSchema with popular people

    Raises:
        HttpError: If API error or data processing fails
    """
    response = tmdb_client.get("person/popular", {"page": page})
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='get_popular_people',
            page=page
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'get_popular_people',
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    return create_paginated_person_response_from_tmdb(result)


def search_people(query: str) -> PaginatedPersonResponseSchema:
    """
    Searches for people by name.

    Args:
        query: Search query string

    Returns:
        PaginatedPersonResponseSchema with person search results

    Raises:
        HttpError: If API error or data processing fails
    """
    if not query or len(query.strip()) < 2:
        # Return empty response for invalid queries
        return PaginatedPersonResponseSchema(
            page=1,
            total_pages=0,
            total_results=0,
            results=[]
        )

    response = tmdb_client.get("search/person", {"query": query})
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='search_people',
            query=query
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'search_people',
                'query': query
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    # Ensure we have results key for proper processing
    if 'results' not in result:
        result['results'] = []

    return create_paginated_person_response_from_tmdb(result)


# =========================
# Class-Based Service Architecture
# =========================


class MovieService:
    """
    Class-based movie service with dependency injection for TMDB integration.

    This service encapsulates all TMDB API interactions with constructor-based
    dependency injection, enabling testability and maintaining separation of
    concerns. All business logic for movie discovery, search, and retrieval
    is centralized in this service layer.

    Architecture Pattern:
        - Dependency injection with TMDBApiClient
        - Class-based for state management and testability
        - Type-safe with full annotations
        - Single responsibility (TMDB integration)

    Usage:
        # Production usage (default client)
        service = MovieService()
        movies = service.search_movies("inception")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = MovieService(tmdb_client=mock_client)
        movies = service.search_movies("test")
    """

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        """
        Initialize the movie service with optional TMDB client injection.

        Args:
            tmdb_client: Optional TMDBApiClient instance. If None, creates
                default client. Inject mock clients for testing.

        Example:
            # Production usage (default client)
            service = MovieService()

            # Testing with mock client
            mock_client = MockTMDBApiClient()
            service = MovieService(tmdb_client=mock_client)
        """
        # Use injected client or create default
        if tmdb_client is not None:
            self._tmdb_client = tmdb_client
        else:
            self._tmdb_client = TMDBApiClient()

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _convert_schema_to_tmdb_movie(self, schema: MovieBaseSchema) -> TMDBMovieBase:
        """Convert MovieBaseSchema back to TMDBMovieBase for TMDB response.

        Args:
            schema: MovieBaseSchema instance to convert

        Returns:
            TMDBMovieBase instance with properly mapped fields
        """
        movie_dict = schema.model_dump()
        # Map tmdb_id → id
        movie_dict['id'] = movie_dict.pop('tmdb_id')
        # Convert date object to string if present
        if movie_dict.get('release_date'):
            movie_dict['release_date'] = movie_dict['release_date'].strftime('%Y-%m-%d')
        return TMDBMovieBase.model_validate(movie_dict)

    def _apply_filters(
        self,
        movies: list[TMDBMovieBase],
        year_min: int | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
    ) -> list[MovieBaseSchema]:
        """Apply year and rating filters to movie list.

        Args:
            movies: List of TMDBMovieBase objects from API response
            year_min: Minimum release year (inclusive), None for no lower bound
            year_max: Maximum release year (inclusive), None for no upper bound
            rating_min: Minimum rating (inclusive), None for no lower bound
            rating_max: Maximum rating (inclusive), None for no upper bound

        Returns:
            Filtered list of MovieBaseSchema objects matching all criteria
        """
        # Convert TMDB models to schemas first
        # Map id → tmdb_id for MovieBaseSchema compatibility
        movie_schemas: list[MovieBaseSchema] = []
        for m in movies:
            movie_dict = m.model_dump()
            # Rename id to tmdb_id for MovieBaseSchema
            movie_dict['tmdb_id'] = movie_dict.pop('id')
            # Normalize empty string dates to None (TMDB API quirk)
            if movie_dict.get('release_date') == '':
                movie_dict['release_date'] = None
            movie_schemas.append(MovieBaseSchema.model_validate(movie_dict))

        # Apply year filtering if specified
        if year_min is not None or year_max is not None:
            movie_schemas = filter_movies_by_year(movie_schemas, year_min, year_max)

        # Apply rating filtering if specified
        if rating_min is not None or rating_max is not None:
            movie_schemas = filter_movies_by_rating(movie_schemas, rating_min, rating_max)

        return movie_schemas

    def _apply_buffer_if_needed(
        self,
        filtered_movies: list[MovieBaseSchema],
        current_page: int,
        total_pages: int,
        year_min: int | None,
        year_max: int | None,
        rating_min: float | None,
        rating_max: float | None,
        fetch_next_page_func: object,  # Callable that fetches next page
    ) -> list[MovieBaseSchema]:
        """Apply 3-tier buffer mechanism to maintain consistent page sizes.

        Buffer threshold logic:
        - If filtered_count >= 20: Return first 20 (full page achieved)
        - If 10 <= filtered_count < 20: Fetch page N+1 to backfill
        - If filtered_count < 10: Return what we have (filter too restrictive)

        Args:
            filtered_movies: Movies from current page after filtering
            current_page: Current page number
            total_pages: Total pages available
            year_min: Year filter (passed to buffer page)
            year_max: Year filter (passed to buffer page)
            rating_min: Rating filter (passed to buffer page)
            rating_max: Rating filter (passed to buffer page)
            fetch_next_page_func: Function to fetch next page (takes page number)

        Returns:
            Up to 20 movies with buffer applied if needed
        """
        filtered_count = len(filtered_movies)

        # Full page achieved - return first 20
        if filtered_count >= 20:
            return filtered_movies[:20]

        # Filter too restrictive - don't waste API calls
        if filtered_count < 10:
            return filtered_movies

        # Between 10-19 results - fetch buffer if not on last page
        if current_page < total_pages:
            # Fetch page N+1 and apply same filters
            # fetch_next_page_func returns validated TMDBMovieSearchResponse
            import typing
            if typing.TYPE_CHECKING:
                from collections.abc import Callable
                fetch_func = typing.cast(
                    Callable[[int], TMDBMovieSearchResponse],
                    fetch_next_page_func
                )
            else:
                fetch_func = fetch_next_page_func

            buffer_response = fetch_func(current_page + 1)
            buffer_movies = self._apply_filters(
                buffer_response.results,
                year_min,
                year_max,
                rating_min,
                rating_max
            )

            # Combine and return up to 20 total
            combined = filtered_movies + buffer_movies
            return combined[:20]

        # On last page with 10-19 results - return what we have
        return filtered_movies

    # ========================================================================
    # Public Service Methods
    # ========================================================================

    def get_movie_by_id(self, tmdb_id: int) -> MovieDetailSchema:
        """
        Retrieves movie details and credits from TMDB by movie ID.

        Args:
            tmdb_id: TMDB movie ID

        Returns:
            MovieDetailSchema instance with validated movie data

        Raises:
            HttpError: If movie not found, API error, or data processing fails
        """
        # Use injected TMDB client for movie details
        info_response = self._tmdb_client.get_movie_details(tmdb_id)
        if not info_response.is_success():
            handle_tmdb_api_error(
                info_response,
                operation='get_movie_details',
                movie_id=tmdb_id,
                error_stage='fetching_movie_info'
            )

        # Use injected TMDB client for credits
        credits_response = self._tmdb_client.get(f"movie/{tmdb_id}/credits")
        if not credits_response.is_success():
            handle_tmdb_api_error(
                credits_response,
                operation='get_movie_credits',
                movie_id=tmdb_id,
                error_stage='fetching_credits'
            )

        info_result = info_response.get_json_data()
        credits_result = credits_response.get_json_data()

        # Type guard: ensure we have valid dictionaries
        if not info_result or not credits_result:
            logger.error(
                "Failed to get valid response data from TMDB",
                extra={
                    'correlation_id': info_response.correlation_id,
                    'operation': 'get_movie_by_id',
                    'movie_id': tmdb_id,
                    'info_data_valid': bool(info_result),
                    'credits_data_valid': bool(credits_result)
                }
            )
            raise HttpError(500, "Failed to get valid response data from TMDB")

        # Use factory function to create properly typed MovieDetailSchema
        return create_movie_detail_from_tmdb(info_result, credits_result)

    def get_now_playing_movies(
        self,
        page: int = 1,
        year_min: int | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
    ) -> PaginatedMovieResponseSchema:
        """
        Retrieves a list of now playing movies from TMDB.

        Args:
            page: Page number for pagination
            year_min: Minimum release year (inclusive), client-side filtered
            year_max: Maximum release year (inclusive), client-side filtered
            rating_min: Minimum rating (inclusive), client-side filtered
            rating_max: Maximum rating (inclusive), client-side filtered

        Returns:
            PaginatedMovieResponseSchema with now playing movies

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Year and rating filters are applied client-side due to TMDB API quirks.
        """
        # Helper function to fetch a specific page (used for buffering)
        def fetch_now_playing_page(page_num: int) -> TMDBMovieSearchResponse:
            """Fetch a specific now playing page."""
            page_response = self._tmdb_client.get_now_playing_movies(page=page_num)

            if not page_response.is_success():
                handle_tmdb_api_error(
                    page_response,
                    operation='get_now_playing_movies',
                    page=page_num,
                    error_stage='fetching_now_playing'
                )

            result = page_response.get_json_data()

            if not result:
                logger.error(
                    "Failed to get valid response data from TMDB",
                    extra={
                        'correlation_id': page_response.correlation_id,
                        'operation': 'get_now_playing_movies',
                        'page': page_num
                    }
                )
                raise HttpError(500, "Failed to get valid response data from TMDB")

            return TMDBMovieSearchResponse.model_validate(result)

        # Fetch initial page
        tmdb_response = fetch_now_playing_page(page)

        # Check if filtering is needed
        has_filters = (
            year_min is not None or year_max is not None or
            rating_min is not None or rating_max is not None
        )

        if not has_filters:
            # No filtering - return as-is
            return create_paginated_movie_response_from_tmdb(tmdb_response.model_dump())

        # Apply client-side filtering
        filtered_movies = self._apply_filters(
            tmdb_response.results,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

        # Apply buffer mechanism if needed
        final_movies = self._apply_buffer_if_needed(
            filtered_movies,
            page,
            tmdb_response.total_pages,
            year_min,
            year_max,
            rating_min,
            rating_max,
            fetch_now_playing_page
        )

        # Create response with filtered results
        # Convert MovieBaseSchema back to TMDBMovieBase
        tmdb_movies = [self._convert_schema_to_tmdb_movie(m) for m in final_movies]

        filtered_response = TMDBMovieSearchResponse(
            page=page,
            total_pages=tmdb_response.total_pages,
            total_results=len(final_movies),
            results=tmdb_movies
        )

        return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    def get_upcoming_movies(
        self,
        page: int = 1,
        year_min: int | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
    ) -> PaginatedMovieResponseSchema:
        """
        Retrieves a list of upcoming movies from TMDB.

        Args:
            page: Page number for pagination
            year_min: Minimum release year (inclusive), client-side filtered
            year_max: Maximum release year (inclusive), client-side filtered
            rating_min: Minimum rating (inclusive), client-side filtered
            rating_max: Maximum rating (inclusive), client-side filtered

        Returns:
            PaginatedMovieResponseSchema with upcoming movies

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Year and rating filters are applied client-side due to TMDB API quirks.
        """
        today = datetime.now(tz=UTC)
        min_date = today.strftime("%Y-%m-%d")
        max_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

        params: TMDBParams = {
            "include_adult": False,
            "include_video": False,
            "language": "en-US",
            "region": "US",
            "sort_by": "popularity.desc",
            "with_release_type": "2|3",
            "primary_release_date.gte": min_date,
            "primary_release_date.lte": max_date,
        }

        # Helper function to fetch a specific page (used for buffering)
        def fetch_upcoming_page(page_num: int) -> TMDBMovieSearchResponse:
            """Fetch a specific upcoming page."""
            page_params = params.copy()
            page_params['page'] = page_num  # type: ignore[assignment]
            page_response = self._tmdb_client.get(
                "discover/movie",
                cast(dict[str, object], page_params)
            )
            tmdb_resp = validate_tmdb_paginated_response(
                page_response,
                TMDBMovieSearchResponse
            )

            if not tmdb_resp:
                logger.error(
                    "Failed to get valid response data from TMDB",
                    extra={
                        'correlation_id': page_response.correlation_id,
                        'operation': 'get_upcoming_movies',
                        'page': page_num
                    }
                )
                raise HttpError(500, "Failed to get valid response data from TMDB")

            return tmdb_resp

        # Fetch initial page
        tmdb_response = fetch_upcoming_page(page)

        # Check if filtering is needed
        has_filters = (
            year_min is not None or year_max is not None or
            rating_min is not None or rating_max is not None
        )

        if not has_filters:
            # No filtering - return as-is
            return create_paginated_movie_response_from_tmdb(tmdb_response.model_dump())

        # Apply client-side filtering
        filtered_movies = self._apply_filters(
            tmdb_response.results,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

        # Apply buffer mechanism if needed
        final_movies = self._apply_buffer_if_needed(
            filtered_movies,
            page,
            tmdb_response.total_pages,
            year_min,
            year_max,
            rating_min,
            rating_max,
            fetch_upcoming_page
        )

        # Create response with filtered results
        # Convert MovieBaseSchema back to TMDBMovieBase
        tmdb_movies = [self._convert_schema_to_tmdb_movie(m) for m in final_movies]

        filtered_response = TMDBMovieSearchResponse(
            page=page,
            total_pages=tmdb_response.total_pages,
            total_results=len(final_movies),
            results=tmdb_movies
        )

        return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    def search_movies(
        self,
        query: str,
        page: int = 1,
        year_min: int | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
    ) -> PaginatedMovieResponseSchema:
        """
        Searches for movies by query string using TMDB.

        Args:
            query: Search query string
            page: Page number for pagination
            year_min: Minimum release year (inclusive), client-side filtered
            year_max: Maximum release year (inclusive), client-side filtered
            rating_min: Minimum rating (inclusive), client-side filtered
            rating_max: Maximum rating (inclusive), client-side filtered

        Returns:
            PaginatedMovieResponseSchema with filtered search results

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Year and rating filters are applied client-side due to TMDB API quirks.
        """
        # Helper function to fetch a specific page (used for buffering)
        def fetch_search_page(page_num: int) -> TMDBMovieSearchResponse:
            """Fetch a specific search page with current query."""
            page_response = self._tmdb_client.search_movies(
                query=query,
                page=page_num,
                include_adult=False,
                language="en-US",
                region="US"
            )
            return validate_tmdb_paginated_response(page_response, TMDBMovieSearchResponse)

        # Fetch initial page
        tmdb_response = fetch_search_page(page)

        # Get the validated movies list
        movies = tmdb_response.results

        logger.debug("Search movies processing", extra={
            'operation': 'search_movies',
            'query': query,
            'page': page,
            'raw_results_count': len(movies)
        })

        # Filter out non-visual content (conservative approach)
        non_visual_filtered: list[TMDBMovieBase] = []
        for movie in movies:
            title = movie.title or ''
            title_lower = title.lower()

            # Skip obvious non-visual content (very conservative)
            skip_terms = [
                'soundtrack', 'score', 'music from',
                'original motion picture soundtrack',
                'original score', 'music score', 'film score',
                'motion picture score'
            ]
            if any(skip_term in title_lower for skip_term in skip_terms):
                logger.debug("Filtering out non-visual content", extra={
                    'operation': 'search_filter',
                    'title': title,
                    'reason': 'non_visual_content'
                })
                continue

            non_visual_filtered.append(movie)

        logger.debug("Search filtering completed", extra={
            'operation': 'search_filter_complete',
            'query': query,
            'raw_count': len(movies),
            'filtered_count': len(non_visual_filtered),
            'filtered_out': len(movies) - len(non_visual_filtered)
        })

        # Check if year/rating filtering is needed
        has_filters = (
            year_min is not None or year_max is not None or
            rating_min is not None or rating_max is not None
        )

        if not has_filters:
            # No year/rating filtering - return with just non-visual filtering
            filtered_total_results = (
                len(non_visual_filtered) +
                (tmdb_response.total_results - len(movies))
            )

            filtered_response = TMDBMovieSearchResponse(
                page=tmdb_response.page,
                total_pages=tmdb_response.total_pages,
                total_results=filtered_total_results,
                results=non_visual_filtered
            )

            return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

        # Apply year/rating filtering
        filtered_movies = self._apply_filters(
            non_visual_filtered,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

        # Apply buffer mechanism if needed
        # Note: Buffer needs to apply non-visual filtering too
        def fetch_and_filter_search_buffer(page_num: int) -> TMDBMovieSearchResponse:
            """Fetch buffer page and apply non-visual filtering."""
            buffer_response = fetch_search_page(page_num)
            # Apply non-visual filtering to buffer too
            buffer_filtered: list[TMDBMovieBase] = []
            for movie in buffer_response.results:
                title = movie.title or ''
                title_lower = title.lower()
                skip_terms = [
                    'soundtrack', 'score', 'music from',
                    'original motion picture soundtrack',
                    'original score', 'music score', 'film score',
                    'motion picture score'
                ]
                if not any(skip_term in title_lower for skip_term in skip_terms):
                    buffer_filtered.append(movie)

            return TMDBMovieSearchResponse(
                page=buffer_response.page,
                total_pages=buffer_response.total_pages,
                total_results=buffer_response.total_results,
                results=buffer_filtered
            )

        final_movies = self._apply_buffer_if_needed(
            filtered_movies,
            page,
            tmdb_response.total_pages,
            year_min,
            year_max,
            rating_min,
            rating_max,
            fetch_and_filter_search_buffer
        )

        # Create response with filtered results
        # Convert MovieBaseSchema back to TMDBMovieBase
        tmdb_movies = [self._convert_schema_to_tmdb_movie(m) for m in final_movies]

        filtered_response = TMDBMovieSearchResponse(
            page=page,
            total_pages=tmdb_response.total_pages,
            total_results=len(final_movies),
            results=tmdb_movies
        )

        return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    def discover_movies(
        self,
        page: int = 1,
        year_min: int | None = None,
        year_max: int | None = None,
        rating_min: float | None = None,
        rating_max: float | None = None,
        **filters: str | int | float | bool | None
    ) -> PaginatedMovieResponseSchema:
        """
        Flexible movie discovery with full TMDB filtering capabilities.

        Args:
            page: Page number for pagination
            year_min: Minimum release year (inclusive), client-side filtered
            year_max: Maximum release year (inclusive), client-side filtered
            rating_min: Minimum rating (inclusive), client-side filtered
            rating_max: Maximum rating (inclusive), client-side filtered
            **filters: Discovery filters including:
                - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
                - genres: Comma-separated genre IDs
                - year: Release year
                - vote_average_gte/lte: Rating range
                - keywords: Comma-separated keyword IDs
                - people: Comma-separated person IDs
                - release_date_gte/lte: Release date range
                - certification: Certification rating
                - region: Country code for regional release dates

        Returns:
            PaginatedMovieResponseSchema with discovered movies

        Raises:
            HttpError: If API error or data processing fails

        Note:
            Runtime filtering is disabled due to TMDB API limitations.
            Year and rating filters are applied client-side due to TMDB API quirks.
        """
        logger.debug("Discover movies request", extra={
            'operation': 'discover_movies',
            'page': page,
            'filters': filters,
            'filter_count': len(filters)
        })

        # Build TMDB API parameters
        params: TMDBParams = {
            "include_adult": False,
            "include_video": False,
            "language": "en-US",
            "region": filters.get('region', 'US'),
            "page": page,
        }

        # Map filter names to TMDB parameter names
        # Support both underscore (direct service calls) and dot (API layer) parameter names
        filter_mapping = {
            'sort_by': 'sort_by',
            'genres': 'with_genres',
            'year': 'year',
            'vote_average_gte': 'vote_average.gte',  # Direct service calls with underscore
            'vote_average.gte': 'vote_average.gte',  # API sends with dot
            'vote_average_lte': 'vote_average.lte',  # Direct service calls with underscore
            'vote_average.lte': 'vote_average.lte',  # API sends with dot
            'keywords': 'with_keywords',
            'people': 'with_people',
            'release_date_gte': 'primary_release_date.gte',  # Direct service calls with underscore
            'release_date.gte': 'primary_release_date.gte',  # API sends with dot
            'release_date_lte': 'primary_release_date.lte',  # Direct service calls with underscore
            'release_date.lte': 'primary_release_date.lte',  # API sends with dot
            'certification': 'certification',
        }

        # Apply filters if provided
        for filter_name, tmdb_param in filter_mapping.items():
            if filter_name in filters and filters[filter_name] is not None:
                # Preserve data types for numeric parameters (support both naming conventions)
                numeric_params = [
                    'year', 'primary_release_year',
                    'vote_average_gte', 'vote_average.gte',
                    'vote_average_lte', 'vote_average.lte',
                    'vote_count', 'vote_count_gte', 'vote_count.gte',
                    'vote_count_lte', 'vote_count.lte',
                    'runtime', 'runtime_gte', 'runtime.gte',
                    'runtime_lte', 'runtime.lte'
                ]
                if filter_name in numeric_params:
                    params[tmdb_param] = filters[filter_name]
                else:
                    params[tmdb_param] = str(filters[filter_name])

        # Set default sort if not specified
        if 'sort_by' not in params:
            params['sort_by'] = 'popularity.desc'

        # Helper function to fetch a specific page (used for buffering)
        def fetch_discover_page(page_num: int) -> TMDBMovieSearchResponse:
            """Fetch a specific discover page with current filters."""
            page_params = params.copy()
            page_params['page'] = page_num
            page_response = self._tmdb_client.get(
                "discover/movie",
                cast(dict[str, object], page_params)
            )
            return validate_tmdb_paginated_response(
                page_response,
                TMDBMovieSearchResponse
            )

        # Fetch initial page
        tmdb_response = fetch_discover_page(page)

        # Get the validated movies list
        movies = tmdb_response.results

        # Log detailed discover response for debugging
        discover_metadata = {
            'operation': 'discover_response',
            'page': page,
            'movies_count': len(movies),
            'total_results': tmdb_response.total_results,
            'total_pages': tmdb_response.total_pages
        }

        if movies:
            first_movie = movies[0]
            discover_metadata['first_movie_release_date'] = str(
                first_movie.release_date) if first_movie.release_date else 'None'
            discover_metadata['first_movie_title'] = str(first_movie.title)
            discover_metadata['first_movie_id'] = int(first_movie.id)

        logger.debug("Discover movies response processed", extra=discover_metadata)

        # Check if filtering is needed
        has_filters = (
            year_min is not None or year_max is not None or
            rating_min is not None or rating_max is not None
        )

        if not has_filters:
            # No filtering - return as-is
            return create_paginated_movie_response_from_tmdb(tmdb_response.model_dump())

        # Apply client-side filtering
        filtered_movies = self._apply_filters(
            movies,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

        # Apply buffer mechanism if needed
        final_movies = self._apply_buffer_if_needed(
            filtered_movies,
            page,
            tmdb_response.total_pages,
            year_min,
            year_max,
            rating_min,
            rating_max,
            fetch_discover_page
        )

        # Create response with filtered results
        # Convert MovieBaseSchema back to TMDBMovieBase
        tmdb_movies = [self._convert_schema_to_tmdb_movie(m) for m in final_movies]

        filtered_response = TMDBMovieSearchResponse(
            page=page,
            total_pages=tmdb_response.total_pages,
            total_results=len(final_movies),  # Adjust to actual filtered count
            results=tmdb_movies
        )

        return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    def get_movie_genres(self) -> list[GenreSchema]:
        """
        Retrieves the list of movie genres from TMDB.

        Returns:
            List of GenreSchema instances

        Raises:
            HttpError: If API error or data processing fails
        """
        response = self._tmdb_client.get("genre/movie/list")

        # Use type-safe validator
        tmdb_response = validate_tmdb_response(response, TMDBGenreListResponse)
        result = tmdb_response.model_dump()

        return create_genre_list_from_tmdb(result)

    def fetch_movie_runtimes(self, movie_ids: list[int]) -> dict[int, int]:
        """
        Fetch runtime data for multiple movies using typed API responses.

        Args:
            movie_ids: List of TMDB movie IDs

        Returns:
            Dictionary mapping movie IDs to runtime in minutes
        """
        runtimes: dict[int, int] = {}

        logger.info(
            f"Fetching runtimes for {len(movie_ids)} movies", extra={
                'operation': 'fetch_runtimes',
                'movie_count': len(movie_ids)
            }
        )

        for movie_id in movie_ids:
            try:
                # Use the typed get_movie_by_id method
                movie_detail = self.get_movie_by_id(movie_id)
                runtimes[movie_id] = movie_detail.runtime or 0

            except HttpError as e:
                logger.warning(
                    f"Failed to fetch runtime for movie {movie_id}", extra={
                        'operation': 'fetch_runtime',
                        'movie_id': movie_id,
                        'error_status': getattr(e, 'status_code', None),
                        'error_message': getattr(e, 'message', str(e))
                    },
                    exc_info=True
                )
                runtimes[movie_id] = 0
            except Exception as e:
                logger.error(
                    f"Unexpected error fetching runtime for movie {movie_id}", extra={
                        'operation': 'fetch_runtime',
                        'movie_id': movie_id,
                        'error_type': type(e).__name__,
                        'error': str(e)
                    }
                )
                runtimes[movie_id] = 0

        return runtimes
