from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Union

from core.services.tmdb_api_client import TMDBApiClient
from shared.api_types import TMDBSearchResponse, TMDBMovieResponse

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')

# Initialize the TMDB API client
tmdb_client = TMDBApiClient()

# =========================
# Helper Functions
# =========================


def propagate_error_context(
        error_dict: dict[str, object], operation: str, **additional_context: object
) -> dict[str, object]:
    """
    Propagate error context through service layer calls.
    Ensures correlation IDs and error details are preserved through call stack.
    """
    if not isinstance(error_dict, dict) or 'error' not in error_dict:
        return error_dict

    # Preserve existing correlation ID or generate new one
    correlation_id = error_dict.get(
        'correlation_id', str(uuid.uuid4())[:8]
    )

    enhanced_error = {
        **error_dict,
        'correlation_id': correlation_id,
        'operation': operation,
        **additional_context
    }

    return enhanced_error


def tmdb_dict_to_movie_dict(tmdb_dict: dict[str, object]) -> dict[str, object]:
    """
    Convert a TMDB API dict to a movie dictionary for serialization.
    This function creates a dictionary with only the fields needed by
    the serializer.
    """
    return {
        'tmdb_id': tmdb_dict.get('id'),
        'title': tmdb_dict.get('title'),
        'poster_path': tmdb_dict.get('poster_path', ''),
        'release_date': tmdb_dict.get('release_date') or None,
        'vote_average': tmdb_dict.get('vote_average'),
        'runtime': tmdb_dict.get('runtime', 0),  # runtime for filtering
    }


def tmdb_get(endpoint: str, params: dict[str, object] | None = None) -> dict[str, object]:
    """
    Generic TMDB GET request using the new API client architecture.

    This function provides backward compatibility with the existing codebase
    while leveraging the new centralized HTTP client infrastructure.
    """
    response = tmdb_client.get(endpoint, params)
    return response.to_legacy_dict()


def fetch_movie_runtimes(movie_ids: list[int]) -> dict[int, int]:
    """Fetch runtime data using centralized logging."""
    runtimes = {}

    logger.info(
        f"Fetching runtimes for {len(movie_ids)} movies", extra={
            'operation': 'fetch_runtimes',
            'movie_count': len(movie_ids)
        }
    )

    for movie_id in movie_ids:
        result = tmdb_get(f"movie/{movie_id}")
        if "error" in result:
            logger.warning(
                f"Failed to fetch runtime for movie {movie_id}", extra={
                    'operation': 'fetch_runtime',
                    'movie_id': movie_id,
                    'error': result.get('error')
                }
            )
            runtimes[movie_id] = 0
        else:
            runtime = result.get('runtime', 0)
            runtimes[movie_id] = int(runtime) if isinstance(runtime, (int, float)) else 0

    return runtimes


def get_simple_credits(credits_response: dict[str, object]) -> dict[str, list[dict[str, object]]]:
    """Extracts simplified, relevant credits from TMDB credits response."""
    crew = credits_response.get('crew', [])
    cast = credits_response.get('cast', [])

    # Type assertions for TMDB API contract
    assert isinstance(crew, list), "TMDB crew should be a list"
    assert isinstance(cast, list), "TMDB cast should be a list"

    return {
        'crew': [
            {
                'id': person['id'],
                'name': person['name'],
                'job': person['job'],
                'profile_path': person['profile_path']
            }
            for person in crew
            if isinstance(person, dict)
        ],
        'cast': [
            {
                'id': person['id'],
                'name': person['name'],
                'character': person['character'],
                'profile_path': person['profile_path']
            }
            for person in cast
            if isinstance(person, dict)
        ]
    }


# =========================
# Single Resource Detail Service Methods
# =========================


def get_movie_by_id(tmdb_id: int) -> Union[TMDBMovieResponse, dict[str, object]]:
    """
    Retrieves movie details and credits from TMDB by movie ID using
    centralized logging.
    """

    # Use TMDB client for movie details
    info_response = tmdb_client.get_movie_details(tmdb_id)
    if not info_response.is_success():
        error_dict = info_response.to_legacy_dict()
        return propagate_error_context(
            error_dict,
            operation='get_movie_details',
            movie_id=tmdb_id,
            error_stage='fetching_movie_info'
        )

    # Use TMDB client for credits
    credits_response = tmdb_client.get(f"movie/{tmdb_id}/credits")
    if not credits_response.is_success():
        error_dict = credits_response.to_legacy_dict()
        return propagate_error_context(
            error_dict,
            operation='get_movie_credits',
            movie_id=tmdb_id,
            error_stage='fetching_credits'
        )

    info_result = info_response.get_json_data()
    credits_result = credits_response.get_json_data()

    # Type guard: ensure we have valid dictionaries
    if not info_result or not credits_result:
        return {
            'error': 'Failed to get valid response data from TMDB',
            'status': 500,
            'correlation_id': info_response.correlation_id,
            'operation': 'get_movie_by_id',
            'movie_id': tmdb_id
        }

    # Combine movie info with credits
    try:
        movie_dict = tmdb_dict_to_movie_dict(info_result)
        credits = get_simple_credits(credits_result)

        movie_dict.update({
            'crew': credits.get('crew', []),
            'cast': credits.get('cast', []),
            'overview': info_result.get('overview', ''),
            'genres': info_result.get('genres', []),
            'production_companies': (
                info_result.get('production_companies', [])
            ),
            'runtime': info_result.get('runtime', 0),
        })

        return movie_dict

    except Exception as processing_error:
        # Log processing errors with full context
        correlation_id = info_result.get(
            'correlation_id', str(uuid.uuid4())[:8]
        )
        logger.error(
            f"Error processing movie data for ID {tmdb_id}", extra={
                'correlation_id': correlation_id,
                'operation': 'process_movie_data',
                'movie_id': tmdb_id,
                'error_type': type(processing_error).__name__,
                'error_category': 'data_processing_error',
                'processing_error': str(processing_error),
                'is_critical': True
            }
        )

        return {
            'error': f'Failed to process movie data: {processing_error}',
            'status': 500,
            'correlation_id': correlation_id,
            'operation': 'get_movie_by_id',
            'movie_id': tmdb_id,
            'error_details': (
                'An error occurred while processing movie data from TMDB'
            )
        }

# =========================
# Paginated Resource Service Methods
# =========================


def get_nowPlaying_movies(page: int = 1) -> Union[TMDBSearchResponse, dict[str, object]]:
    """
    Retrieves a list of now playing movies from TMDB with error context
    propagation.
    """
    # Use the client's direct now playing method
    response = tmdb_client.get_now_playing_movies(page=page)

    if not response.is_success():
        error_dict = response.to_legacy_dict()
        return propagate_error_context(
            error_dict,
            operation='get_nowPlaying_movies',
            page=page,
            error_stage='fetching_now_playing'
        )

    result = response.get_json_data()

    # Type guard: ensure we have a valid dictionary
    if not result:
        return {
            'error': 'Failed to get valid response data from TMDB',
            'status': 500,
            'correlation_id': response.correlation_id,
            'operation': 'get_nowPlaying_movies'
        }

    try:
        movies = result.get('results', [])
        # Type assertion: TMDB API returns list of movies
        assert isinstance(movies, list), "TMDB results should be a list"
        result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies if isinstance(m, dict)]
        return result
    except Exception as processing_error:
        correlation_id = result.get(
            'correlation_id', str(uuid.uuid4())[:8]
        )
        logger.error("Error processing now playing movies", extra={
            'correlation_id': correlation_id,
            'operation': 'process_nowplaying_movies',
            'page': page,
            'error_type': type(processing_error).__name__,
            'processing_error': str(processing_error)
        })

        return {
            'error': (
                f'Failed to process now playing movies: {processing_error}'
            ),
            'status': 500,
            'correlation_id': correlation_id,
            'operation': 'get_nowPlaying_movies'
        }


def get_upcoming_movies(page: int = 1) -> Union[TMDBSearchResponse, dict[str, object]]:
    """
    Retrieves a list of upcoming movies from TMDB, paginated by page param.
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
    result = tmdb_get("discover/movie", params)
    if "error" in result:
        return result
    movies = result.get('results', [])
    # Type assertion: TMDB API returns list of movies
    assert isinstance(movies, list), "TMDB results should be a list"
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies if isinstance(m, dict)]
    return result


def search_movies(query: str, page: int = 1) -> dict[str, object]:
    """Searches for movies by query string using TMDB, with pagination."""
    # Use the client's direct search method instead of generic get
    response = tmdb_client.search_movies(
        query=query,
        page=page,
        include_adult="false",
        language="en-US",
        region="US"
    )

    if not response.is_success():
        error_dict = response.to_legacy_dict()
        return propagate_error_context(
            error_dict,
            operation='search_movies',
            query=query,
            page=page,
            error_stage='tmdb_search_request'
        )

    result = response.get_json_data()

    # Type guard: ensure we have a valid dictionary
    if not result:
        return {
            'error': 'Failed to get valid response data from TMDB',
            'status': 500,
            'correlation_id': response.correlation_id,
            'operation': 'search_movies'
        }

    movies = result.get('results', [])
    # Type assertion: TMDB API returns list of movies
    assert isinstance(movies, list), "TMDB results should be a list"
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
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in filtered_movies]
    # Update total_results to reflect filtered count
    total_results = result.get('total_results', 0)
    total_results_int = int(total_results) if isinstance(total_results, (int, float)) else 0
    result['total_results'] = (
        len(filtered_movies) +
        (total_results_int - len(movies))
    )

    return result


def discover_movies(page: int = 1, **filters: object) -> dict[str, object]:
    """
    Flexible movie discovery with full TMDB filtering capabilities.

    Supported filters:
    - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
    - genres: Comma-separated genre IDs
    - year: Release year
    - vote_average_gte/lte: Rating range
    - keywords: Comma-separated keyword IDs
    - people: Comma-separated person IDs
    - release_date_gte/lte: Release date range
    - runtime_gte/lte: Runtime range in minutes
      * runtime_gte=0 is converted to 1 for TMDB compatibility
      * runtime_lte=999 is omitted (treated as no upper limit)
    - certification: Certification rating
    - region: Country code for regional release dates
    """
    logger.debug("Discover movies request", extra={
        'operation': 'discover_movies',
        'page': page,
        'filters': filters,
        'filter_count': len(filters)
    })

    # Debug runtime filtering - DISABLED due to TMDB API limitations
    # TMDB's runtime filtering returns incorrect results
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
        # DISABLED: Runtime filtering - TMDB API returns incorrect results
        # 'runtime_gte': 'with_runtime.gte',
        # 'runtime_lte': 'with_runtime.lte',
        'certification': 'certification',
    }

    # Apply filters if provided
    for filter_name, tmdb_param in filter_mapping.items():
        if filter_name in filters and filters[filter_name] is not None:
            # DISABLED: Runtime special case - no longer needed
            # since runtime filtering is disabled
            params[tmdb_param] = str(filters[filter_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    result = tmdb_get("discover/movie", params)
    if "error" in result:
        return result

    movies = result.get('results', [])
    # Type assertion: TMDB API returns list of movies
    assert isinstance(movies, list), "TMDB results should be a list"

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

    result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies if isinstance(m, dict)]
    return result


# =========================
# Supporting Data Service Methods
# =========================


def get_movie_genres() -> list[dict[str, object]] | dict[str, object]:
    """Retrieves the list of movie genres from TMDB."""
    result = tmdb_get("genre/movie/list")
    if "error" in result:
        return result
    genres = result.get('genres', [])
    # Type assertion: TMDB API returns list of genres
    assert isinstance(genres, list), "TMDB genres should be a list"
    return genres


def get_popular_keywords(page: int = 1) -> dict[str, object]:
    """Retrieves popular keywords from TMDB."""
    result = tmdb_get("keyword/popular", {"page": page})
    if "error" in result:
        return result
    return result


def search_keywords(query: str) -> dict[str, object]:
    """Searches for keywords by query string."""
    if not query or len(query.strip()) < 2:
        return {"results": []}

    result = tmdb_get("search/keyword", {"query": query})
    if "error" in result:
        return result

    # Ensure we return the full result structure with results key
    if 'results' not in result:
        result['results'] = []
    return result


def get_popular_people(page: int = 1) -> dict[str, object]:
    """Retrieves popular people (actors, directors, etc.) from TMDB."""
    result = tmdb_get("person/popular", {"page": page})
    if "error" in result:
        return result
    return result


def search_people(query: str) -> dict[str, object]:
    """Searches for people by name."""
    if not query or len(query.strip()) < 2:
        return {"results": []}

    result = tmdb_get("search/person", {"query": query})
    if "error" in result:
        return result

    # Ensure we return the full result structure with results key
    if 'results' not in result:
        result['results'] = []
    return result
