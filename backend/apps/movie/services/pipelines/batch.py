"""
Batch operations for TMDB movie data fetching.

This module provides helper functions for efficiently fetching multiple movies
from TMDB in batch operations, with graceful handling of partial failures and
structured logging for observability.
"""
from __future__ import annotations

import logging
from collections.abc import Mapping

from core.services.tmdb_api_client import TMDBApiClient

from ...schemas import MovieListItemSchema

# Use TMDB-specific logger for consistency with movie_service.py
logger = logging.getLogger('cinexplorer.tmdb')

# Initialize the TMDB API client
tmdb_client = TMDBApiClient()


def fetch_movies_batch(movie_ids: list[int]) -> list[MovieListItemSchema]:
    """
    Fetch multiple movies from TMDB by ID in a single batch operation.

    This function handles batch fetching of movies with graceful degradation:
    - Successfully fetched movies are returned
    - Failed fetches (404, rate limits, etc.) are logged but don't fail the entire batch
    - Duplicate IDs are deduplicated to avoid redundant API calls
    - Empty input returns empty list without making API calls

    Args:
        movie_ids: List of TMDB movie IDs to fetch

    Returns:
        List of successfully fetched MovieListItemSchema objects.
        May be shorter than input if some fetches fail.
        Order is not guaranteed to match input order.

    Example:
        >>> # Fetch a batch of movies
        >>> movie_ids = [550, 551, 552]
        >>> movies = fetch_movies_batch(movie_ids)
        >>> print(f"Fetched {len(movies)} out of {len(movie_ids)} movies")
        Fetched 2 out of 3 movies  # One might have failed

    Note:
        This function uses the same data transformation as create_movie_base_from_tmdb
        but handles errors gracefully instead of raising exceptions. Runtime will be 0
        as batch fetches use the basic movie endpoint, not the detailed endpoint.
    """
    # Handle empty input
    if not movie_ids:
        logger.debug(
            "Batch fetch called with empty movie list",
            extra={'operation': 'fetch_movies_batch', 'movie_count': 0}
        )
        return []

    # Deduplicate movie IDs to avoid redundant API calls
    unique_ids = list(set(movie_ids))

    logger.info(
        f"Starting batch fetch for {len(unique_ids)} movies",
        extra={
            'operation': 'fetch_movies_batch',
            'requested_count': len(movie_ids),
            'unique_count': len(unique_ids),
            'duplicates_removed': len(movie_ids) - len(unique_ids)
        }
    )

    successfully_fetched: list[MovieListItemSchema] = []
    failed_count = 0

    # Fetch each movie individually
    # Note: TMDB API v3 doesn't support true batch fetching in a single request
    for movie_id in unique_ids:
        try:
            # Fetch movie details from TMDB
            response = tmdb_client.get_movie_details(movie_id)

            # Check if request was successful
            if not response.is_success():
                failed_count += 1
                logger.warning(
                    f"Failed to fetch movie {movie_id} from TMDB",
                    extra={
                        'operation': 'fetch_single_movie',
                        'movie_id': movie_id,
                        'status_code': response.status_code,
                        'error_message': response.error_message,
                        'error_category': response.error_category
                    }
                )
                continue

            # Get response data
            data = response.get_json_data()

            # Validate we have data
            if not data:
                failed_count += 1
                logger.warning(
                    f"Movie {movie_id} returned null/empty data",
                    extra={
                        'operation': 'fetch_single_movie',
                        'movie_id': movie_id,
                        'issue': 'null_data'
                    }
                )
                continue

            # Transform TMDB data to MovieListItemSchema
            movie_schema = _create_movie_base_from_tmdb_data(data)

            if movie_schema:
                successfully_fetched.append(movie_schema)
            else:
                failed_count += 1

        except Exception as e:
            # Catch any unexpected errors to prevent entire batch from failing
            failed_count += 1
            logger.error(
                f"Unexpected error fetching movie {movie_id}",
                extra={
                    'operation': 'fetch_single_movie',
                    'movie_id': movie_id,
                    'error_type': type(e).__name__,
                    'error': str(e)
                },
                exc_info=True
            )

    # Log batch operation completion
    logger.info(
        f"Batch fetch completed: {len(successfully_fetched)} succeeded, {failed_count} failed",
        extra={
            'operation': 'fetch_movies_batch_complete',
            'requested_count': len(unique_ids),
            'success_count': len(successfully_fetched),
            'failed_count': failed_count,
            'success_rate': round(len(successfully_fetched) / len(unique_ids) * 100, 1)
            if unique_ids else 0
        }
    )

    return successfully_fetched


def _create_movie_base_from_tmdb_data(
    tmdb_data: Mapping[str, object],
) -> MovieListItemSchema | None:
    """
    Create a MovieListItemSchema from TMDB data with error handling.

    This is an internal helper that wraps the transformation logic from movie_service.py
    but returns None on error instead of raising exceptions (for graceful batch handling).

    Args:
        tmdb_data: Raw TMDB movie data dictionary

    Returns:
        MovieListItemSchema instance if successful, None if transformation fails
    """
    try:
        from core.tmdb_models.tmdb_responses import TMDBMovieBase

        # Validate against TMDB response structure for type safety
        tmdb_movie = TMDBMovieBase.model_validate(tmdb_data, strict=False)

        # Convert empty strings to None for release_date (TMDB quirk)
        release_date = tmdb_movie.release_date
        if isinstance(release_date, str) and release_date.strip() == '':
            release_date = None

        validated_data: dict[str, object] = {
            'tmdb_id': tmdb_movie.id,
            'title': tmdb_movie.title,
            'poster_path': tmdb_movie.poster_path,
            'release_date': release_date,
            'vote_average': tmdb_movie.vote_average,
            'runtime': 0,  # Runtime not available in basic movie responses
            'vote_count': tmdb_movie.vote_count,
            'genre_ids': tmdb_movie.genre_ids,
            'overview': tmdb_movie.overview,
        }

        return MovieListItemSchema.model_validate(validated_data, strict=False)

    except Exception as e:
        logger.warning(
            "Failed to create MovieListItemSchema from TMDB data",
            extra={
                'error': str(e),
                'tmdb_id': tmdb_data.get('id'),
                'operation': 'transform_movie_data',
                'error_type': type(e).__name__
            }
        )
        return None
