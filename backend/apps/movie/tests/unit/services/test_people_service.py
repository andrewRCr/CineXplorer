"""
Unit tests for PeopleService class-based architecture.

Tests the PeopleService class with dependency injection pattern, verifying:
- Constructor injection of TMDB client
- All service methods use injected client (not global tmdb_client)
- Error handling and data transformation
- Factory function provides proper default client

These tests use mocked TMDBApiClient to verify service behavior without external API calls.

Test Coverage Target: 80% (general service layer coverage)
"""

from __future__ import annotations

from unittest.mock import Mock

import pytest
from ninja.errors import HttpError

from apps.core.services.api_response import ApiResponse
from apps.movie.schemas import PersonListResponseSchema
from apps.movie.tests.tmdb_test_builders import TMDBPersonResponse

# ============================================================================
# PeopleService Class Tests - Constructor and DI
# ============================================================================


def test_people_service_constructor_with_injected_client() -> None:
    """Test PeopleService constructor accepts injected TMDB client."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client
    mock_client = Mock(spec=["get"])

    # Act: Inject client via constructor
    service = PeopleService(tmdb_client=mock_client)

    # Assert: Service stores the injected client (access protected attr for testing)
    assert service._tmdb_client is mock_client  # pyright: ignore[reportPrivateUsage]


def test_people_service_constructor_with_default_client() -> None:
    """Test PeopleService constructor creates default client when none injected."""
    from apps.movie.services.people_service import PeopleService

    # Act: Create service without injecting client
    service = PeopleService()

    # Assert: Service has a TMDBApiClient instance (access protected attr for testing)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, "get")  # pyright: ignore[reportPrivateUsage]


# ============================================================================
# PeopleService.get_popular_people Tests
# ============================================================================


def test_get_popular_people_uses_injected_client() -> None:
    """Test get_popular_people calls injected client, not global tmdb_client."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client with successful response
    mock_client = Mock(spec=["get"])

    person_data: TMDBPersonResponse = {
        "page": 1,
        "total_pages": 10,
        "total_results": 200,
        "results": [
            {
                "id": 1,
                "name": "Tom Hanks",
                "known_for_department": "Acting",
                "profile_path": "/path1.jpg",
            },
            {
                "id": 2,
                "name": "Meryl Streep",
                "known_for_department": "Acting",
                "profile_path": "/path2.jpg",
            },
        ],
    }
    mock_response = ApiResponse(status_code=200, data=person_data)
    mock_client.get.return_value = mock_response

    # Act: Call service method with injected client
    service = PeopleService(tmdb_client=mock_client)
    result = service.get_popular_people(page=1)

    # Assert: Injected client was called with correct endpoint and params
    mock_client.get.assert_called_once_with("person/popular", {"page": 1})

    # Assert: Response is properly structured
    assert isinstance(result, PersonListResponseSchema)
    assert result.page == 1
    assert result.total_pages == 10
    assert result.total_results == 200
    assert len(result.results) == 2
    assert result.results[0].id == 1
    assert result.results[0].name == "Tom Hanks"


def test_get_popular_people_handles_api_error() -> None:
    """Test get_popular_people raises HttpError when TMDB API fails."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client that returns error response
    mock_client = Mock(spec=["get"])
    mock_response = ApiResponse(status_code=500, data=None)
    mock_client.get.return_value = mock_response

    # Act & Assert: Service raises HttpError
    service = PeopleService(tmdb_client=mock_client)
    with pytest.raises(HttpError):
        service.get_popular_people(page=1)


def test_get_popular_people_default_page() -> None:
    """Test get_popular_people uses default page=1 when not specified."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client
    mock_client = Mock(spec=["get"])
    person_data: TMDBPersonResponse = {
        "page": 1,
        "total_pages": 5,
        "total_results": 100,
        "results": [],
    }
    mock_response = ApiResponse(status_code=200, data=person_data)
    mock_client.get.return_value = mock_response

    # Act: Call without page parameter
    service = PeopleService(tmdb_client=mock_client)
    result = service.get_popular_people()

    # Assert: Default page=1 was used
    mock_client.get.assert_called_once_with("person/popular", {"page": 1})
    assert result.page == 1


# ============================================================================
# PeopleService.search_people Tests
# ============================================================================


def test_search_people_uses_injected_client() -> None:
    """Test search_people calls injected client, not global tmdb_client."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client with successful response
    mock_client = Mock(spec=["get"])

    person_data: TMDBPersonResponse = {
        "page": 1,
        "total_pages": 1,
        "total_results": 3,
        "results": [
            {
                "id": 10,
                "name": "Tom Holland",
                "known_for_department": "Acting",
                "profile_path": "/tom.jpg",
            },
            {
                "id": 11,
                "name": "Tom Hardy",
                "known_for_department": "Acting",
                "profile_path": "/hardy.jpg",
            },
            {
                "id": 12,
                "name": "Tom Cruise",
                "known_for_department": "Acting",
                "profile_path": "/cruise.jpg",
            },
        ],
    }
    mock_response = ApiResponse(status_code=200, data=person_data)
    mock_client.get.return_value = mock_response

    # Act: Call service method with injected client
    service = PeopleService(tmdb_client=mock_client)
    result = service.search_people(query="Tom")

    # Assert: Injected client was called with correct endpoint and params
    mock_client.get.assert_called_once_with("search/person", {"query": "Tom"})

    # Assert: Response is properly structured
    assert isinstance(result, PersonListResponseSchema)
    assert result.total_results == 3
    assert len(result.results) == 3
    assert result.results[0].name == "Tom Holland"


def test_search_people_handles_empty_query() -> None:
    """Test search_people returns empty response for invalid queries."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create service (client won't be called)
    mock_client = Mock(spec=["get"])
    service = PeopleService(tmdb_client=mock_client)

    # Act & Assert: Empty query returns empty response
    result_empty = service.search_people(query="")
    assert result_empty.total_results == 0
    assert len(result_empty.results) == 0
    mock_client.get.assert_not_called()

    # Act & Assert: Single character query returns empty response
    result_short = service.search_people(query="a")
    assert result_short.total_results == 0
    assert len(result_short.results) == 0
    mock_client.get.assert_not_called()

    # Act & Assert: Whitespace-only query returns empty response
    result_whitespace = service.search_people(query="  ")
    assert result_whitespace.total_results == 0
    assert len(result_whitespace.results) == 0
    mock_client.get.assert_not_called()


def test_search_people_handles_api_error() -> None:
    """Test search_people raises HttpError when TMDB API fails."""
    from apps.movie.services.people_service import PeopleService

    # Arrange: Create mock client that returns error response
    mock_client = Mock(spec=["get"])
    mock_response = ApiResponse(status_code=404, data=None)
    mock_client.get.return_value = mock_response

    # Act & Assert: Service raises HttpError
    service = PeopleService(tmdb_client=mock_client)
    with pytest.raises(HttpError):
        service.search_people(query="nonexistent")


# ============================================================================
# PeopleService Factory Function Tests
# ============================================================================


def test_get_people_service_factory_creates_service_with_default_client() -> None:
    """Test get_people_service factory function returns service with default client."""
    from apps.movie.services.service_factory import get_people_service

    # Act: Create service via factory
    service = get_people_service()

    # Assert: Service is PeopleService instance with client
    from apps.movie.services.people_service import PeopleService

    assert isinstance(service, PeopleService)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]


def test_get_people_service_factory_returns_people_service_instance() -> None:
    """Test get_people_service factory returns correct service type."""
    from apps.movie.services.people_service import PeopleService
    from apps.movie.services.service_factory import get_people_service

    # Act: Create service via factory
    service = get_people_service()

    # Assert: Service is PeopleService type
    assert isinstance(service, PeopleService)
    assert hasattr(service, "get_popular_people")
    assert hasattr(service, "search_people")
