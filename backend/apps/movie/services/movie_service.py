from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta

from core.services.api_response import ApiResponse
from core.services.tmdb_api_client import TMDBApiClient
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
    runtimes = {}

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
                    'error_status': e.status_code,
                    'error_message': e.message
                }
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


# get_simple_credits function removed - credits processing now handled in create_movie_detail_from_tmdb factory


# =========================
# Pydantic Model Factory Utilities
# =========================


def create_movie_base_from_tmdb(tmdb_data: dict[str, object]) -> MovieBaseSchema:
    """
    Create a MovieBaseSchema instance from TMDB API response data.

    Uses Pydantic's flexible validation to handle dynamic TMDB fields
    while ensuring type safety for our schema.

    Args:
        tmdb_data: Raw TMDB movie data dictionary

    Returns:
        MovieBaseSchema instance with validated data

    Raises:
        HttpError: If data validation fails or required fields are missing
    """
    try:
        # Extract and validate core fields with fallbacks
        validated_data = {
            'tmdb_id': tmdb_data.get('id'),
            'title': tmdb_data.get('title', ''),
            'poster_path': tmdb_data.get('poster_path'),
            'release_date': tmdb_data.get('release_date'),
            'vote_average': tmdb_data.get('vote_average'),
            'runtime': tmdb_data.get('runtime', 0),
        }

        # Use Pydantic validation with extra fields ignored
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

    Args:
        movie_data: TMDB movie details response
        credits_data: Optional TMDB credits response

    Returns:
        MovieDetailSchema instance with validated data

    Raises:
        HttpError: If data validation fails
    """
    try:
        # Start with base movie data
        detail_data = {
            'tmdb_id': movie_data.get('id'),
            'title': movie_data.get('title', ''),
            'poster_path': movie_data.get('poster_path'),
            'release_date': movie_data.get('release_date'),
            'vote_average': movie_data.get('vote_average'),
            'runtime': movie_data.get('runtime', 0),
            'overview': movie_data.get('overview', ''),
        }

        # Process genres
        genres_data = movie_data.get('genres', [])
        if isinstance(genres_data, list):
            detail_data['genres'] = [
                GenreSchema.model_validate(genre, strict=False)
                for genre in genres_data
                if isinstance(genre, dict) and 'id' in genre and 'name' in genre
            ]

        # Process production companies
        companies_data = movie_data.get('production_companies', [])
        if isinstance(companies_data, list):
            detail_data['production_companies'] = [
                ProductionCompanySchema.model_validate(company, strict=False)
                for company in companies_data
                if isinstance(company, dict) and 'id' in company and 'name' in company
            ]

        # Process credits if provided
        if credits_data:
            # Process cast
            cast_data = credits_data.get('cast', [])
            if isinstance(cast_data, list):
                detail_data['cast'] = [
                    CastMemberSchema.model_validate(person, strict=False)
                    for person in cast_data
                    if isinstance(person, dict) and 'id' in person and 'name' in person
                ]

            # Process crew
            crew_data = credits_data.get('crew', [])
            if isinstance(crew_data, list):
                detail_data['crew'] = [
                    CrewMemberSchema.model_validate(person, strict=False)
                    for person in crew_data
                    if isinstance(person, dict) and 'id' in person and 'name' in person
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


def create_paginated_movie_response_from_tmdb(tmdb_response: dict[str, object]) -> PaginatedMovieResponseSchema:
    """
    Create a PaginatedMovieResponseSchema from TMDB paginated response.

    Args:
        tmdb_response: TMDB search/discover response with pagination

    Returns:
        PaginatedMovieResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        # Extract pagination metadata
        pagination_data = {
            'page': tmdb_response.get('page', 1),
            'total_pages': tmdb_response.get('total_pages', 0),
            'total_results': tmdb_response.get('total_results', 0),
            'results': []
        }

        # Process movie results
        results = tmdb_response.get('results', [])
        if isinstance(results, list):
            pagination_data['results'] = [
                create_movie_base_from_tmdb(movie)
                for movie in results
                if isinstance(movie, dict)
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


def create_paginated_keyword_response_from_tmdb(tmdb_response: dict[str, object]) -> PaginatedKeywordResponseSchema:
    """
    Create a PaginatedKeywordResponseSchema from TMDB keyword response.

    Args:
        tmdb_response: TMDB keyword search/list response

    Returns:
        PaginatedKeywordResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        pagination_data = {
            'page': tmdb_response.get('page', 1),
            'total_pages': tmdb_response.get('total_pages', 0),
            'total_results': tmdb_response.get('total_results', 0),
            'results': []
        }

        results = tmdb_response.get('results', [])
        if isinstance(results, list):
            pagination_data['results'] = [
                KeywordSchema.model_validate(keyword, strict=False)
                for keyword in results
                if isinstance(keyword, dict) and 'id' in keyword and 'name' in keyword
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


def create_paginated_person_response_from_tmdb(tmdb_response: dict[str, object]) -> PaginatedPersonResponseSchema:
    """
    Create a PaginatedPersonResponseSchema from TMDB person response.

    Args:
        tmdb_response: TMDB person search/popular response

    Returns:
        PaginatedPersonResponseSchema instance

    Raises:
        HttpError: If data validation fails
    """
    try:
        pagination_data = {
            'page': tmdb_response.get('page', 1),
            'total_pages': tmdb_response.get('total_pages', 0),
            'total_results': tmdb_response.get('total_results', 0),
            'results': []
        }

        results = tmdb_response.get('results', [])
        if isinstance(results, list):
            pagination_data['results'] = [
                PersonSchema.model_validate(person, strict=False)
                for person in results
                if isinstance(person, dict) and 'id' in person and 'name' in person
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

    Args:
        tmdb_response: TMDB genre/movie/list response

    Returns:
        List of GenreSchema instances

    Raises:
        HttpError: If data validation fails
    """
    try:
        genres = tmdb_response.get('genres', [])
        if not isinstance(genres, list):
            return []

        return [
            GenreSchema.model_validate(genre, strict=False)
            for genre in genres
            if isinstance(genre, dict) and 'id' in genre and 'name' in genre
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


def get_nowPlaying_movies(page: int = 1) -> PaginatedMovieResponseSchema:
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
            operation='get_nowPlaying_movies',
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
                'operation': 'get_nowPlaying_movies',
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

    params = {
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "region": "US",
        "page": page,
        "sort_by": "popularity.desc",
        "with_release_type": "2|3",
        "primary_release_date.gte": min_date,
        "primary_release_date.lte": max_date,
    }

    response = tmdb_client.get("discover/movie", params)
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='get_upcoming_movies',
            page=page
        )

    result = response.get_json_data()
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
        include_adult="false",
        language="en-US",
        region="US"
    )

    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='search_movies',
            query=query,
            page=page,
            error_stage='tmdb_search_request'
        )

    result = response.get_json_data()

    # Type guard: ensure we have a valid dictionary
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'search_movies',
                'query': query,
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    movies = result.get('results', [])
    # Type validation: TMDB API should return list of movies
    if not isinstance(movies, list):
        logger.error(
            "TMDB API returned invalid results format",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'search_movies',
                'query': query,
                'page': page,
                'results_type': type(movies).__name__
            }
        )
        raise HttpError(500, "Invalid response format from external API")

    logger.debug("Search movies processing", extra={
        'operation': 'search_movies',
        'query': query,
        'page': page,
        'raw_results_count': len(movies)
    })

    # Filter out non-visual content (conservative approach)
    filtered_movies = []
    for movie in movies:
        title = movie.get('title', '')
        title_lower = title.lower()

        # Skip if not a movie (search/movie should only return movies)
        if movie.get('media_type') and movie.get('media_type') != 'movie':
            logger.debug("Filtering out non-movie content", extra={
                'operation': 'search_filter',
                'title': title,
                'media_type': movie.get('media_type'),
                'reason': 'wrong_media_type'
            })
            continue

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

    # Create filtered response data
    total_results = result.get('total_results', 0)
    total_results_int = int(total_results) if isinstance(total_results, (int, float, str)) and str(total_results).isdigit() else 0

    filtered_result = {
        'page': result.get('page', page),
        'total_pages': result.get('total_pages', 0),
        'results': filtered_movies,
        'total_results': (
            len(filtered_movies) +
            (total_results_int - len(movies))
        )
    }

    return create_paginated_movie_response_from_tmdb(filtered_result)


def discover_movies(page: int = 1, **filters: object) -> PaginatedMovieResponseSchema:
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
    params = {
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "region": filters.get('region', 'US'),
        "page": page,
    }

    # Map filter names to TMDB parameter names
    filter_mapping = {
        'sort_by': 'sort_by',
        'genres': 'with_genres',
        'year': 'year',
        'vote_average_gte': 'vote_average.gte',
        'vote_average_lte': 'vote_average.lte',
        'keywords': 'with_keywords',
        'people': 'with_people',
        'release_date_gte': 'primary_release_date.gte',
        'release_date_lte': 'primary_release_date.lte',
        'certification': 'certification',
    }

    # Apply filters if provided
    for filter_name, tmdb_param in filter_mapping.items():
        if filter_name in filters and filters[filter_name] is not None:
            params[tmdb_param] = str(filters[filter_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    response = tmdb_client.get("discover/movie", params)
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='discover_movies',
            page=page,
            filters=filters
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'discover_movies',
                'page': page
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

    movies = result.get('results', [])
    # Type validation: TMDB API should return list of movies
    if not isinstance(movies, list):
        logger.error(
            "TMDB API returned invalid results format",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'discover_movies',
                'page': page,
                'results_type': type(movies).__name__
            }
        )
        raise HttpError(500, "Invalid response format from external API")

    # Log detailed discover response for debugging
    discover_metadata = {
        'operation': 'discover_response',
        'page': page,
        'movies_count': len(movies),
        'total_results': result.get('total_results'),
        'total_pages': result.get('total_pages')
    }

    if movies:
        first_movie = movies[0]
        discover_metadata.update({
            'first_movie_release_date': first_movie.get('release_date'),
            'first_movie_fields': list(first_movie.keys()),
            'runtime_included': 'runtime' in first_movie
        })
        if 'runtime' in first_movie:
            discover_metadata['first_movie_runtime'] = first_movie['runtime']

    logger.debug("Discover movies response processed", extra=discover_metadata)

    return create_paginated_movie_response_from_tmdb(result)


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
    if not response.is_success():
        handle_tmdb_api_error(
            response,
            operation='get_movie_genres'
        )

    result = response.get_json_data()
    if not result:
        logger.error(
            "Failed to get valid response data from TMDB",
            extra={
                'correlation_id': response.correlation_id,
                'operation': 'get_movie_genres'
            }
        )
        raise HttpError(500, "Failed to get valid response data from TMDB")

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
    response = tmdb_client.get("keyword/popular", {"page": page})
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