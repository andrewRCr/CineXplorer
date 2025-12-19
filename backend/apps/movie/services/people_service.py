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

from typing import cast

from apps.core.types.api_types import TMDBParams
from apps.movie.schemas import PersonListResponseSchema
from apps.movie.services.base_service import BaseTMDBService
from apps.movie.services.tmdb_api_boundary.response_factories import (
    create_paginated_person_response_from_tmdb,
)


class PeopleService(BaseTMDBService):
    """
    Service for TMDB people operations with dependency injection.

    This service handles people-related TMDB API interactions, providing
    methods for discovering popular people and searching for actors, directors,
    and other film industry professionals by name.

    Inherits from BaseTMDBService for common DI pattern and logging.

    Example:
        # Production usage with factory
        from apps.movie.services.service_factory import get_people_service
        service = get_people_service()
        people = service.search_people("Tom Hanks")

        # Testing with mock client
        mock_client = MockTMDBApiClient()
        service = PeopleService(tmdb_client=mock_client)
        people = service.search_people("Tom Hanks")
    """

    def get_popular_people(self, page: int = 1) -> PersonListResponseSchema:
        """
        Retrieve popular people (actors, directors, etc.) from TMDB.

        Args:
            page: Page number for pagination (default: 1)

        Returns:
            PersonListResponseSchema with popular people

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
        result = self._get_validated_response(response, operation='get_popular_people', page=page)
        return create_paginated_person_response_from_tmdb(result)

    def search_people(self, query: str) -> PersonListResponseSchema:
        """
        Search for people by name.

        For queries that are empty or less than 2 characters, returns an empty
        response without making an API call (TMDB API requirement).

        Args:
            query: Search query string (minimum 2 characters for API call)

        Returns:
            PersonListResponseSchema with person search results

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
            return PersonListResponseSchema(
                page=1,
                total_pages=0,
                total_results=0,
                results=[]
            )

        response = self._tmdb_client.get("search/person", {"query": query})
        result = self._get_validated_response(response, operation='search_people', query=query)

        # Ensure we have results key for proper processing
        if 'results' not in result:
            result['results'] = []

        return create_paginated_person_response_from_tmdb(result)
