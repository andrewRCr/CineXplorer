"""
Centralized mock target paths for movie app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

Usage:
    from apps.movie.tests.mock_paths import TMDB_CLIENT_GET

    @patch(TMDB_CLIENT_GET)
    def test_something(mock_get):
        ...
"""

# =============================================================================
# TMDB API Client Paths
# =============================================================================

# Core TMDB client methods (used by movie service layer)
TMDB_CLIENT_GET = "apps.core.services.tmdb_api_client.TMDBApiClient.get"
TMDB_CLIENT_GET_MOVIE_DETAILS = (
    "apps.core.services.tmdb_api_client.TMDBApiClient.get_movie_details"
)

# Batch pipeline's local tmdb_client reference (module-level import)
BATCH_TMDB_GET_MOVIE_DETAILS = (
    "apps.movie.services.pipelines.batch.tmdb_client.get_movie_details"
)

# =============================================================================
# Data Quality / Filtering Paths
# =============================================================================

# Blacklist filtering
BLACKLIST_GET_IDS = "apps.movie.services.data_quality.filters.get_blacklisted_ids"
BLACKLIST_CACHE = "apps.movie.services.data_quality.filters.cache"

# Deduplication tracker
DEDUP_GET_CLIENT = "apps.movie.services.deduplication_tracker.get_atomic_set_client"
