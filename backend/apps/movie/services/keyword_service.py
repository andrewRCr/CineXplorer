"""
KeywordService - TMDB keyword integration service.

This service provides keyword-related operations with dependency injection pattern,
encapsulating TMDB API interactions for keyword discovery and search.

Architecture:
- Constructor injection of TMDBApiClient for testability
- Methods return Pydantic schemas for type safety
- Error handling via HttpError for API layer consistency
"""
from __future__ import annotations

import logging
from typing import cast

from core.services.tmdb_api_client import TMDBApiClient
from core.types.api_types import TMDBParams
from movie.schemas import PaginatedKeywordResponseSchema
from movie.services.schema_factories import (
    create_paginated_keyword_response_from_tmdb,
    handle_tmdb_api_error,
)
from ninja.errors import HttpError

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')


class KeywordService:
    """
    Service for TMDB keyword operations with dependency injection.

    This service handles keyword-related TMDB API interactions, providing
    methods for discovering popular keywords and searching for keywords by query.

    Attributes:
        _tmdb_client: Injected TMDB API client for making requests

    Example:
        # Production usage with factory
        from movie.services.service_factory import get_keyword_service
        service = get_keyword_service()
        keywords = service.search_keywords("action")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = KeywordService(tmdb_client=mock_client)
        keywords = service.search_keywords("action")
    """

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        """
        Initialize KeywordService with optional TMDB client injection.

        Args:
            tmdb_client: Optional TMDBApiClient instance. If None, creates default client.
                        Injecting a mock client enables testing without external API calls.

        Example:
            # With default client (production)
            service = KeywordService()

            # With injected client (testing)
            mock_client = Mock(spec=TMDBApiClient)
            service = KeywordService(tmdb_client=mock_client)
        """
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

    def get_popular_keywords(self, page: int = 1) -> PaginatedKeywordResponseSchema:
        """
        Retrieve popular keywords from TMDB.

        Args:
            page: Page number for pagination (default: 1)

        Returns:
            PaginatedKeywordResponseSchema with popular keywords

        Raises:
            HttpError: If API error or data processing fails

        Example:
            service = KeywordService()
            result = service.get_popular_keywords(page=1)
            for keyword in result.results:
                print(f"{keyword.id}: {keyword.name}")
        """
        params: TMDBParams = {"page": page}
        response = self._tmdb_client.get("keyword/popular", cast(dict[str, object], params))

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

    def search_keywords(self, query: str) -> PaginatedKeywordResponseSchema:
        """
        Search for keywords by query string.

        For queries that are empty or less than 2 characters, returns an empty
        response without making an API call (TMDB API requirement).

        Args:
            query: Search query string (minimum 2 characters for API call)

        Returns:
            PaginatedKeywordResponseSchema with keyword search results

        Raises:
            HttpError: If API error or data processing fails

        Example:
            service = KeywordService()

            # Valid query
            result = service.search_keywords("superhero")
            print(f"Found {result.total_results} keywords")

            # Empty/short query returns empty response
            result = service.search_keywords("")
            assert result.total_results == 0
        """
        # Return empty response for invalid queries (TMDB API requirement)
        if not query or len(query.strip()) < 2:
            return PaginatedKeywordResponseSchema(
                page=1,
                total_pages=0,
                total_results=0,
                results=[]
            )

        response = self._tmdb_client.get("search/keyword", {"query": query})

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
