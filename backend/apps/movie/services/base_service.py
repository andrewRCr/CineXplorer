"""
BaseTMDBService - Base class for TMDB integration services.

This module provides a common base class for all TMDB service classes,
encapsulating shared patterns like dependency injection, logging setup,
and common error handling.

Architecture:
- Constructor injection of TMDBApiClient for testability
- Shared logger for consistent TMDB-related logging
- Common response validation for simple endpoints
- DRY foundation for MovieService, KeywordService, PeopleService
"""

from __future__ import annotations

import logging
from typing import ClassVar

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient

from .tmdb_api_boundary.response_factories import get_validated_response


class BaseTMDBService:
    """
    Base class for TMDB API integration services.

    Provides common initialization pattern with dependency injection
    and shared logging configuration. All TMDB service classes should
    inherit from this base to ensure consistent patterns.

    Attributes:
        _tmdb_client: Injected TMDB API client for making requests
        logger: Class-level logger for TMDB operations

    Example:
        class MyService(BaseTMDBService):
            def get_data(self) -> dict[str, object]:
                response = self._tmdb_client.get("endpoint")
                self.logger.info("Fetched data")
                return response.get_json_data()
    """

    logger: ClassVar[logging.Logger] = logging.getLogger("cinexplorer.tmdb")

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        """
        Initialize service with optional TMDB client injection.

        Args:
            tmdb_client: Optional TMDBApiClient instance. If None, creates
                        default client. Inject mock clients for testing.

        Example:
            # Production usage (default client)
            service = MyService()

            # Testing with mock client
            mock_client = MockTMDBApiClient()
            service = MyService(tmdb_client=mock_client)
        """
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

    def _get_validated_response(
        self, api_response: ApiResponse, operation: str, **context: object
    ) -> dict[str, object]:
        """
        Validate API response and return JSON data as untyped dictionary.

        Convenience wrapper for common validation pattern: check success,
        handle errors, extract JSON data. Use this for simple endpoints
        that pass results to factory functions for schema conversion.

        Args:
            api_response: ApiResponse object from TMDB client
            operation: Name of the operation for error context
            **context: Additional context for logging (e.g., page=1, query="term")

        Returns:
            Validated JSON data dictionary

        Raises:
            HttpError: If API error or invalid/empty data

        Example:
            response = self._tmdb_client.get("keyword/popular", params)
            result = self._get_validated_response(
                response, operation='get_popular_keywords', page=1
            )
            return create_paginated_keyword_response_from_tmdb(result)

        Note:
            MovieService uses typed Pydantic validators (validate_tmdb_response,
            validate_tmdb_paginated_response) instead of this method because it
            needs strongly-typed Pydantic models returned directly, not untyped
            dictionaries. Both patterns are valid - use this for simplicity when
            factory functions handle the typing, use typed validators when you
            need the Pydantic model immediately.
        """
        return get_validated_response(api_response, operation, **context)
