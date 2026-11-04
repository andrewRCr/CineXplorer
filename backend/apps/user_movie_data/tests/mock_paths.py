"""Centralized mock target paths for user_movie_data app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

Usage:
    from apps.user_movie_data.tests.mock_paths import FETCH_MOVIES_BATCH

    @patch(FETCH_MOVIES_BATCH)
    def test_something(mock_fetch):
        ...
"""

# Re-export from movie tests (shared TMDB client paths)
from apps.movie.tests.mock_paths import (
    TMDB_CLIENT_GET,
    TMDB_CLIENT_GET_MOVIE_DETAILS,
)

# =============================================================================
# User Movie Data Service Paths
# =============================================================================

# fetch_movies_batch used in user_movie_data_service
FETCH_MOVIES_BATCH = "apps.user_movie_data.services.user_movie_data_service.fetch_movies_batch"

# Expose re-exported paths for IDE discovery
__all__ = [
    "FETCH_MOVIES_BATCH",
    "TMDB_CLIENT_GET",
    "TMDB_CLIENT_GET_MOVIE_DETAILS",
]
