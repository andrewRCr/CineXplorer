"""
PeopleService - TMDB people integration service.

This service provides people-related operations with dependency injection pattern,
encapsulating TMDB API interactions for discovering popular people and searching
for actors, directors, and other film industry professionals.

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
from movie.schemas import PaginatedPersonResponseSchema
from movie.services.schema_factories import (
    create_paginated_person_response_from_tmdb,
    handle_tmdb_api_error,
)
from ninja.errors import HttpError

# Use TMDB-specific logger for better log organization
logger = logging.getLogger('cinexplorer.tmdb')


class PeopleService:
    """
    Service for TMDB people operations with dependency injection.

    This service handles people-related TMDB API interactions, providing
    methods for discovering popular people and searching for actors, directors,
    and other film industry professionals by name.

    Attributes:
        _tmdb_client: Injected TMDB API client for making requests

    Example:
        # Production usage with factory
        from movie.services.service_factory import get_people_service
        service = get_people_service()
        people = service.search_people("Tom Hanks")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = PeopleService(tmdb_client=mock_client)
        people = service.search_people("Tom Hanks")
    """

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        """
        Initialize PeopleService with optional TMDB client injection.

        Args:
            tmdb_client: Optional TMDBApiClient instance. If None, creates default client.
                        Injecting a mock client enables testing without external API calls.

        Example:
            # With default client (production)
            service = PeopleService()

            # With injected client (testing)
            mock_client = Mock(spec=TMDBApiClient)
            service = PeopleService(tmdb_client=mock_client)
        """
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

    def get_popular_people(self, page: int = 1) -> PaginatedPersonResponseSchema:
        """
        Retrieve popular people (actors, directors, etc.) from TMDB.

        Args:
            page: Page number for pagination (default: 1)

        Returns:
            PaginatedPersonResponseSchema with popular people

        Raises:
            HttpError: If API error or data processing fails

        Example:
            service = PeopleService()
            result = service.get_popular_people(page=1)
            for person in result.results:
                print(f"{person.id}: {person.name} ({person.known_for_department})")
        """
        params: TMDBParams = {"page": page}
        response = self._tmdb_client.get("person/popular", cast(dict[str, object], params))

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

    def search_people(self, query: str) -> PaginatedPersonResponseSchema:
        """
        Search for people by name.

        For queries that are empty or less than 2 characters, returns an empty
        response without making an API call (TMDB API requirement).

        Args:
            query: Search query string (minimum 2 characters for API call)

        Returns:
            PaginatedPersonResponseSchema with person search results

        Raises:
            HttpError: If API error or data processing fails

        Example:
            service = PeopleService()

            # Valid query
            result = service.search_people("Tom Hanks")
            print(f"Found {result.total_results} people")

            # Empty/short query returns empty response
            result = service.search_people("")
            assert result.total_results == 0
        """
        # Return empty response for invalid queries (TMDB API requirement)
        if not query or len(query.strip()) < 2:
            return PaginatedPersonResponseSchema(
                page=1,
                total_pages=0,
                total_results=0,
                results=[]
            )

        response = self._tmdb_client.get("search/person", {"query": query})

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
