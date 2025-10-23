from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import cast

from core.services.tmdb_api_client import TMDBApiClient
from core.services.validators import (
    validate_tmdb_paginated_response,
    validate_tmdb_response,
)
from core.tmdb_models.tmdb_responses import (
    TMDBGenreListResponse,
    TMDBMovieBase,
    TMDBMovieSearchResponse,
)
from core.types.api_types import TMDBParams
from ninja.errors import HttpError

from ..schemas import (
    GenreSchema,
    MovieBaseSchema,
    MovieDetailSchema,
    PaginatedKeywordResponseSchema,
    PaginatedMovieResponseSchema,
    PaginatedPersonResponseSchema,
)
from .result_filtering import filter_movies_by_rating, filter_movies_by_year
from .schema_factories import (
    create_genre_list_from_tmdb,
    create_movie_detail_from_tmdb,
    create_paginated_keyword_response_from_tmdb,
    create_paginated_movie_response_from_tmdb,
    create_paginated_person_response_from_tmdb,
    handle_tmdb_api_error,
)

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')

# Initialize the TMDB API client
tmdb_client = TMDBApiClient()

# =========================
# Helper Functions
# =========================


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

    def _filter_non_visual_content(self, movies: list[TMDBMovieBase]) -> list[TMDBMovieBase]:
        """Filter out non-visual content from movie search results.

        This filters out soundtracks, scores, and other non-visual media that
        sometimes appear in TMDB search results despite being irrelevant to
        visual movie discovery.

        Args:
            movies: List of TMDB movie objects to filter

        Returns:
            Filtered list with non-visual content removed

        Note:
            Uses a conservative approach - only filters obvious non-visual content
            to minimize false positives.
        """
        # Skip terms for identifying non-visual content
        skip_terms = [
            'soundtrack', 'score', 'music from',
            'original motion picture soundtrack',
            'original score', 'music score', 'film score',
            'motion picture score'
        ]

        filtered: list[TMDBMovieBase] = []
        for movie in movies:
            title = movie.title or ''
            title_lower = title.lower()

            # Skip if title contains non-visual indicators
            if any(skip_term in title_lower for skip_term in skip_terms):
                logger.debug("Filtering out non-visual content", extra={
                    'operation': 'filter_non_visual',
                    'title': title,
                    'reason': 'non_visual_content'
                })
                continue

            filtered.append(movie)

        return filtered

    def _build_filtered_response(
        self,
        movies: list[MovieBaseSchema],
        page: int,
        total_pages: int
    ) -> PaginatedMovieResponseSchema:
        """Build a paginated movie response from filtered MovieBaseSchema list.

        Handles the conversion from MovieBaseSchema back to TMDB format and
        wraps it in a paginated response structure.

        Args:
            movies: Filtered list of MovieBaseSchema objects
            page: Current page number
            total_pages: Total pages available

        Returns:
            PaginatedMovieResponseSchema with converted movie data

        Note:
            This method encapsulates the common pattern of:
            1. Converting MovieBaseSchema → TMDBMovieBase
            2. Creating TMDBMovieSearchResponse
            3. Converting to PaginatedMovieResponseSchema
        """
        # Convert MovieBaseSchema back to TMDBMovieBase
        tmdb_movies = [self._convert_schema_to_tmdb_movie(m) for m in movies]

        # Create TMDB response structure
        filtered_response = TMDBMovieSearchResponse(
            page=page,
            total_pages=total_pages,
            total_results=len(movies),
            results=tmdb_movies
        )

        # Convert to application schema
        return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())

    def _fetch_with_filters_and_buffer(
        self,
        fetch_page_func: object,  # Callable[[int], TMDBMovieSearchResponse]
        page: int,
        year_min: int | None,
        year_max: int | None,
        rating_min: float | None,
        rating_max: float | None,
        pre_filter_func: object | None = None,  # Optional pre-filter callable
    ) -> PaginatedMovieResponseSchema:
        """Template method for paginated fetch-filter-buffer workflow.

        Encapsulates the common pattern used across all paginated movie methods:
        1. Fetch initial page using provided fetch function
        2. Apply optional pre-filter (e.g., non-visual content filtering for search)
        3. Check if year/rating filters are needed
        4. Apply year/rating filters if needed
        5. Apply buffer mechanism if needed (fetch page N+1 to backfill)
        6. Build filtered response

        This eliminates ~160 lines of duplication across discover_movies,
        search_movies, get_now_playing_movies, and get_upcoming_movies.

        Args:
            fetch_page_func: Function to fetch a specific page (takes page_num: int)
                Returns TMDBMovieSearchResponse
            page: Current page number
            year_min: Minimum release year (inclusive), client-side filtered
            year_max: Maximum release year (inclusive), client-side filtered
            rating_min: Minimum rating (inclusive), client-side filtered
            rating_max: Maximum rating (inclusive), client-side filtered
            pre_filter_func: Optional pre-filter function (e.g., non-visual filtering)
                Takes list[TMDBMovieBase], returns list[TMDBMovieBase]
                Applied BEFORE year/rating filters

        Returns:
            PaginatedMovieResponseSchema with filtered and buffered results

        Note:
            Template method pattern: invariant workflow with variant behavior
            injection via fetch_page_func and pre_filter_func.
        """
        # Type casting for static analysis (pattern from _apply_buffer_if_needed)
        import typing
        if typing.TYPE_CHECKING:
            from collections.abc import Callable
            fetch_func = typing.cast(
                Callable[[int], TMDBMovieSearchResponse],
                fetch_page_func
            )
            pre_filter: Callable[[list[TMDBMovieBase]], list[TMDBMovieBase]] | None = (
                typing.cast(
                    Callable[[list[TMDBMovieBase]], list[TMDBMovieBase]],
                    pre_filter_func
                ) if pre_filter_func is not None else None
            )
        else:
            fetch_func = fetch_page_func
            pre_filter = pre_filter_func

        # Step 1: Fetch initial page
        tmdb_response = fetch_func(page)

        # Step 2: Apply optional pre-filter (e.g., non-visual content for search)
        movies = tmdb_response.results
        if pre_filter is not None:
            movies = pre_filter(movies)

        # Step 3: Check if year/rating filtering is needed
        has_filters = (
            year_min is not None or year_max is not None or
            rating_min is not None or rating_max is not None
        )

        # Early return if no filters needed
        if not has_filters:
            # If pre-filter was applied, we need to adjust the response
            if pre_filter is not None:
                adjusted_total = (
                    len(movies) +
                    (tmdb_response.total_results - len(tmdb_response.results))
                )
                filtered_response = TMDBMovieSearchResponse(
                    page=tmdb_response.page,
                    total_pages=tmdb_response.total_pages,
                    total_results=adjusted_total,
                    results=movies
                )
                return create_paginated_movie_response_from_tmdb(filtered_response.model_dump())
            else:
                # No filters at all - return original response
                return create_paginated_movie_response_from_tmdb(tmdb_response.model_dump())

        # Step 4: Apply year/rating filters
        filtered_movies = self._apply_filters(
            movies,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

        # Step 5: Apply buffer mechanism if needed
        # If pre-filter exists, wrap fetch function to apply it to buffer too
        if pre_filter is not None:
            def fetch_with_pre_filter(page_num: int) -> TMDBMovieSearchResponse:
                """Fetch buffer page and apply pre-filter."""
                buffer_response = fetch_func(page_num)
                buffer_filtered = pre_filter(buffer_response.results)  # type: ignore[misc]
                return TMDBMovieSearchResponse(
                    page=buffer_response.page,
                    total_pages=buffer_response.total_pages,
                    total_results=buffer_response.total_results,
                    results=buffer_filtered
                )
            buffer_fetch_func: object = fetch_with_pre_filter
        else:
            buffer_fetch_func = fetch_page_func

        final_movies = self._apply_buffer_if_needed(
            filtered_movies,
            page,
            tmdb_response.total_pages,
            year_min,
            year_max,
            rating_min,
            rating_max,
            buffer_fetch_func
        )

        # Step 6: Build filtered response
        return self._build_filtered_response(final_movies, page, tmdb_response.total_pages)

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

        return self._fetch_with_filters_and_buffer(
            fetch_now_playing_page,
            page,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

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

        return self._fetch_with_filters_and_buffer(
            fetch_upcoming_page,
            page,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

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
            Non-visual content (soundtracks, scores, etc.) is filtered out.
        """
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

        return self._fetch_with_filters_and_buffer(
            fetch_search_page,
            page,
            year_min,
            year_max,
            rating_min,
            rating_max,
            pre_filter_func=self._filter_non_visual_content
        )

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

        return self._fetch_with_filters_and_buffer(
            fetch_discover_page,
            page,
            year_min,
            year_max,
            rating_min,
            rating_max
        )

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
