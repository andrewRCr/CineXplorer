"""
Unit tests for KeywordService class-based architecture.

Tests the KeywordService class with dependency injection pattern, verifying:
- Constructor injection of TMDB client
- All service methods use injected client (not global tmdb_client)
- Error handling and data transformation
- Factory function provides proper default client

These tests use mocked TMDBApiClient to verify service behavior without external API calls.

Test Coverage Target: 80% (general service layer coverage)
"""
from __future__ import annotations

from typing import Any
from unittest.mock import Mock

import pytest
from core.services.api_response import ApiResponse
from movie.schemas import PaginatedKeywordResponseSchema
from ninja.errors import HttpError

# ============================================================================
# KeywordService Class Tests - Constructor and DI
# ============================================================================


def test_keyword_service_constructor_with_injected_client() -> None:
    """Test KeywordService constructor accepts injected TMDB client."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client
    mock_client = Mock(spec=['get'])

    # Act: Inject client via constructor
    service = KeywordService(tmdb_client=mock_client)

    # Assert: Service stores the injected client (access protected attr for testing)
    assert service._tmdb_client is mock_client  # pyright: ignore[reportPrivateUsage]


def test_keyword_service_constructor_with_default_client() -> None:
    """Test KeywordService constructor creates default client when none injected."""
    from movie.services.keyword_service import KeywordService

    # Act: Create service without injecting client
    service = KeywordService()

    # Assert: Service has a TMDBApiClient instance (access protected attr for testing)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, 'get')  # pyright: ignore[reportPrivateUsage]


# ============================================================================
# KeywordService.get_popular_keywords Tests
# ============================================================================


def test_get_popular_keywords_uses_injected_client() -> None:
    """Test get_popular_keywords calls injected client, not global tmdb_client."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client with successful response
    mock_client = Mock(spec=['get'])

    keyword_data: dict[str, Any] = {
        'page': 1,
        'total_pages': 10,
        'total_results': 200,
        'results': [
            {'id': 1, 'name': 'action'},
            {'id': 2, 'name': 'adventure'}
        ]
    }
    mock_response = ApiResponse(status_code=200, data=keyword_data)
    mock_client.get.return_value = mock_response

    # Act: Call service method with injected client
    service = KeywordService(tmdb_client=mock_client)
    result = service.get_popular_keywords(page=1)

    # Assert: Injected client was called with correct endpoint and params
    mock_client.get.assert_called_once_with('keyword/popular', {'page': 1})

    # Assert: Response is properly structured
    assert isinstance(result, PaginatedKeywordResponseSchema)
    assert result.page == 1
    assert result.total_pages == 10
    assert result.total_results == 200
    assert len(result.results) == 2
    assert result.results[0].id == 1
    assert result.results[0].name == 'action'


def test_get_popular_keywords_handles_api_error() -> None:
    """Test get_popular_keywords raises HttpError when TMDB API fails."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client that returns error response
    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(status_code=500, data=None)
    mock_client.get.return_value = mock_response

    # Act & Assert: Service raises HttpError
    service = KeywordService(tmdb_client=mock_client)
    with pytest.raises(HttpError):
        service.get_popular_keywords(page=1)


def test_get_popular_keywords_default_page() -> None:
    """Test get_popular_keywords uses default page=1 when not specified."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client
    mock_client = Mock(spec=['get'])
    keyword_data: dict[str, Any] = {
        'page': 1,
        'total_pages': 5,
        'total_results': 100,
        'results': []
    }
    mock_response = ApiResponse(status_code=200, data=keyword_data)
    mock_client.get.return_value = mock_response

    # Act: Call without page parameter
    service = KeywordService(tmdb_client=mock_client)
    result = service.get_popular_keywords()

    # Assert: Default page=1 was used
    mock_client.get.assert_called_once_with('keyword/popular', {'page': 1})
    assert result.page == 1


# ============================================================================
# KeywordService.search_keywords Tests
# ============================================================================


def test_search_keywords_uses_injected_client() -> None:
    """Test search_keywords calls injected client, not global tmdb_client."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client with successful response
    mock_client = Mock(spec=['get'])

    keyword_data: dict[str, Any] = {
        'page': 1,
        'total_pages': 1,
        'total_results': 3,
        'results': [
            {'id': 10, 'name': 'superhero'},
            {'id': 11, 'name': 'superhero movie'},
            {'id': 12, 'name': 'superhero team'}
        ]
    }
    mock_response = ApiResponse(status_code=200, data=keyword_data)
    mock_client.get.return_value = mock_response

    # Act: Call service method with injected client
    service = KeywordService(tmdb_client=mock_client)
    result = service.search_keywords(query='superhero')

    # Assert: Injected client was called with correct endpoint and params
    mock_client.get.assert_called_once_with('search/keyword', {'query': 'superhero'})

    # Assert: Response is properly structured
    assert isinstance(result, PaginatedKeywordResponseSchema)
    assert result.total_results == 3
    assert len(result.results) == 3
    assert result.results[0].name == 'superhero'


def test_search_keywords_handles_empty_query() -> None:
    """Test search_keywords returns empty response for invalid queries."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create service (client won't be called)
    mock_client = Mock(spec=['get'])
    service = KeywordService(tmdb_client=mock_client)

    # Act & Assert: Empty query returns empty response
    result_empty = service.search_keywords(query='')
    assert result_empty.total_results == 0
    assert len(result_empty.results) == 0
    mock_client.get.assert_not_called()

    # Act & Assert: Single character query returns empty response
    result_short = service.search_keywords(query='a')
    assert result_short.total_results == 0
    assert len(result_short.results) == 0
    mock_client.get.assert_not_called()

    # Act & Assert: Whitespace-only query returns empty response
    result_whitespace = service.search_keywords(query='  ')
    assert result_whitespace.total_results == 0
    assert len(result_whitespace.results) == 0
    mock_client.get.assert_not_called()


def test_search_keywords_handles_api_error() -> None:
    """Test search_keywords raises HttpError when TMDB API fails."""
    from movie.services.keyword_service import KeywordService

    # Arrange: Create mock client that returns error response
    mock_client = Mock(spec=['get'])
    mock_response = ApiResponse(status_code=404, data=None)
    mock_client.get.return_value = mock_response

    # Act & Assert: Service raises HttpError
    service = KeywordService(tmdb_client=mock_client)
    with pytest.raises(HttpError):
        service.search_keywords(query='nonexistent')


# ============================================================================
# KeywordService Factory Function Tests
# ============================================================================


def test_get_keyword_service_factory_creates_service_with_default_client() -> None:
    """Test get_keyword_service factory function returns service with default client."""
    from movie.services.service_factory import get_keyword_service

    # Act: Create service via factory
    service = get_keyword_service()

    # Assert: Service is KeywordService instance with client
    from movie.services.keyword_service import KeywordService
    assert isinstance(service, KeywordService)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]


def test_get_keyword_service_factory_returns_keyword_service_instance() -> None:
    """Test get_keyword_service factory returns correct service type."""
    from movie.services.keyword_service import KeywordService
    from movie.services.service_factory import get_keyword_service

    # Act: Create service via factory
    service = get_keyword_service()

    # Assert: Service is KeywordService type
    assert isinstance(service, KeywordService)
    assert hasattr(service, 'get_popular_keywords')
    assert hasattr(service, 'search_keywords')
