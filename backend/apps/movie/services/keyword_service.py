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

from typing import cast

from apps.core.types.api_types import TMDBParams
from apps.movie.schemas import KeywordListResponseSchema
from apps.movie.services.base_service import BaseTMDBService
from apps.movie.services.tmdb_api_boundary.response_factories import (
    create_paginated_keyword_response_from_tmdb,
)


class KeywordService(BaseTMDBService):
    """
    Service for TMDB keyword operations with dependency injection.

    This service handles keyword-related TMDB API interactions, providing
    methods for discovering popular keywords and searching for keywords by query.

    Inherits from BaseTMDBService for common DI pattern and logging.

    Example:
        # Production usage with factory
        from apps.movie.services.service_factory import get_keyword_service
        service = get_keyword_service()
        keywords = service.search_keywords("action")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = KeywordService(tmdb_client=mock_client)
        keywords = service.search_keywords("action")
    """

    def get_popular_keywords(self, page: int = 1) -> KeywordListResponseSchema:
        """
        Retrieve popular keywords from TMDB.

        Args:
            page: Page number for pagination (default: 1)

        Returns:
            KeywordListResponseSchema with popular keywords

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
        result = self._get_validated_response(
            response, operation='get_popular_keywords', page=page
        )
        return create_paginated_keyword_response_from_tmdb(result)

    def search_keywords(self, query: str) -> KeywordListResponseSchema:
        """
        Search for keywords by query string.

        For queries that are empty or less than 2 characters, returns an empty
        response without making an API call (TMDB API requirement).

        Args:
            query: Search query string (minimum 2 characters for API call)

        Returns:
            KeywordListResponseSchema with keyword search results

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
            return KeywordListResponseSchema(
                page=1,
                total_pages=0,
                total_results=0,
                results=[]
            )

        response = self._tmdb_client.get("search/keyword", {"query": query})
        result = self._get_validated_response(response, operation='search_keywords', query=query)

        # Ensure we have results key for proper processing
        if 'results' not in result:
            result['results'] = []

        return create_paginated_keyword_response_from_tmdb(result)
