from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import cast

from core.services.api_response import ApiResponse
from core.services.tmdb_api_client import TMDBApiClient
from core.services.validators import (
    validate_tmdb_response,
    validate_tmdb_paginated_response,
)
from core.types.api_types import TMDBParams
from core.tmdb_models.tmdb_responses import (
    TMDBMovieBase,
    TMDBMovieDetail,
    TMDBCreditsResponse,
    TMDBMovieSearchResponse,
    TMDBKeywordSearchResponse,
    TMDBPersonSearchResponse,
    TMDBGenreListResponse,
)
from ninja.errors import HttpError
from ..schemas import (
    MovieBaseSchema,
    MovieDetailSchema,
    PaginatedMovieResponseSchema,
    GenreSchema,
    ProductionCompanySchema,
    CastMemberSchema,
    CrewMemberSchema,
    KeywordSchema,
    PaginatedKeywordResponseSchema,
    PersonSchema,
    PaginatedPersonResponseSchema,
)

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


def create_movie_base_from_tmdb(tmdb_data: dict[str, object]) -> MovieBaseSchema:
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
        validated_data = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': tmdb_movie.release_date,
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
        raise HttpError(500, "Failed to process movie data")


def create_movie_detail_from_tmdb(
    movie_data: dict[str, object],
    credits_data: dict[str, object] | None = None
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
        raise HttpError(500, "Failed to process movie details")


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
        raise HttpError(500, "Failed to process movie search results")


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
        raise HttpError(500, "Failed to process keyword results")


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
        raise HttpError(500, "Failed to process person results")


def create_genre_list_from_tmdb(tmdb_response: dict[str, object]) -> list[GenreSchema]:
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
        raise HttpError(500, "Failed to process genre data")


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
    today = datetime.today()
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
