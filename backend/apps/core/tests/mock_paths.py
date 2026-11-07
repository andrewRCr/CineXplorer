"""Centralized mock target paths for core app tests.

This module provides constants for commonly-mocked module paths,
eliminating string duplication across test files and ensuring
path updates only need to happen in one place.

"""

# =============================================================================
# API Client Paths
# =============================================================================

# Base API client session (for mocking HTTP requests)
BASE_API_CLIENT_SESSION = "apps.core.services.base_api_client.BaseApiClient.session"

# TMDB client session
TMDB_CLIENT_SESSION = "apps.core.services.tmdb_api_client.TMDBApiClient.session"

# TMDB client get method
TMDB_CLIENT_GET = "apps.core.services.tmdb_api_client.TMDBApiClient.get"

# =============================================================================
# Management Command Paths
# =============================================================================

# Database connection check (wait_for_db command)
WAIT_FOR_DB_CONNECTIONS = "apps.core.management.commands.wait_for_db.connections"
