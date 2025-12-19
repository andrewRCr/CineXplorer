"""
Centralized mock target paths for core app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

Usage:
    from apps.core.tests.mock_paths import TMDB_SETTINGS

    @patch(TMDB_SETTINGS)
    def test_something(mock_settings):
        ...
"""

# =============================================================================
# Django Settings Paths
# =============================================================================

# TMDB API client settings (for API key injection)
TMDB_SETTINGS = "apps.core.services.tmdb_api_client.settings"

# =============================================================================
# API Client Paths
# =============================================================================

# Base API client session (for mocking HTTP requests)
BASE_API_CLIENT_SESSION = "apps.core.services.base_api_client.BaseApiClient.session"

# TMDB client session
TMDB_CLIENT_SESSION = "apps.core.services.tmdb_api_client.TMDBApiClient.session"

# TMDB client get method
TMDB_CLIENT_GET = "apps.core.services.tmdb_api_client.TMDBApiClient.get"
