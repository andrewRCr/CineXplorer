"""
Unit tests for MovieService class-based architecture.

Tests the MovieService class with dependency injection pattern, verifying:
- Constructor injection of TMDB client
- All service methods use injected client (not global tmdb_client)
- Error handling and data transformation
- Factory function provides proper default client

These tests use mocked TMDBApiClient to verify service behavior without external API calls.

Test Coverage Target: 80% (general service layer coverage)
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock

import pytest
from core.services.api_response import ApiResponse
from movie.schemas import (
    MovieDetailSchema,
    PaginatedMovieResponseSchema,
)
from movie.tests.test_fixtures_tmdb import (
    TMDBCreditsResponse,
    TMDBGenreListResponse,
    TMDBMovieDetail,
    TMDBMovieResponse,
)
from ninja.errors import HttpError

if TYPE_CHECKING:
    pass


# ============================================================================
# MovieService Class Tests - Constructor and DI
# ============================================================================


def test_movie_service_constructor_with_injected_client() -> None:
    """Test MovieService constructor accepts injected TMDB client."""
    from movie.services.movie_service import MovieService

    # Arrange: Create mock client
    mock_client = Mock(
        spec=['get', 'get_movie_details', 'search_movies', 'get_now_playing_movies']
    )

    # Act: Inject client via constructor
    service = MovieService(tmdb_client=mock_client)

    # Assert: Service stores the injected client (access protected attr for testing)
    assert service._tmdb_client is mock_client  # pyright: ignore[reportPrivateUsage]


def test_movie_service_constructor_with_default_client() -> None:
    """Test MovieService constructor creates default client when none injected."""
    from movie.services.movie_service import MovieService

    # Act: Create service without injecting client
    service = MovieService()

    # Assert: Service has a TMDBApiClient instance (access protected attr for testing)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, 'get')  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, 'get_movie_details')  # pyright: ignore[reportPrivateUsage]


# ============================================================================
# MovieService.get_movie_by_id Tests
# ============================================================================


def test_get_movie_by_id_uses_injected_client() -> None:
    """Test get_movie_by_id calls injected client, not global tmdb_client."""
    from movie.services.movie_service import MovieService

    # Arrange: Create mock client with successful responses
    mock_client = Mock(spec=['get', 'get_movie_details'])

    # Mock movie details response
    movie_data: TMDBMovieDetail = {
        'id': 123,
        'title': 'Test Movie',
        'poster_path': '/test.jpg',
        'release_date': '2023-01-01',
        'vote_average': 8.0,
        'runtime': 120,
        'overview': 'Test overview',
        'genres': [{'id': 1, 'name': 'Action'}],
        'production_companies': []
    }
    mock_details_response = ApiResponse(status_code=200, data=movie_data)
    mock_client.get_movie_details.return_value = mock_details_response

    # Mock credits response
    credits_data: TMDBCreditsResponse = {
        'cast': [],
        'crew': []
    }
    mock_credits_response = ApiResponse(status_code=200, data=credits_data)
    mock_client.get.return_value = mock_credits_response

    # Inject mock client
    service = MovieService(tmdb_client=mock_client)

    # Act: Call service method
    result = service.get_movie_by_id(123)

    # Assert: Injected client was called, not global
    mock_client.get_movie_details.assert_called_once_with(123)
    mock_client.get.assert_called_once_with("movie/123/credits")
    assert isinstance(result, MovieDetailSchema)
    assert result.tmdb_id == 123


def test_get_movie_by_id_handles_movie_not_found() -> None:
    """Test get_movie_by_id raises HttpError(404) when movie not found."""
    from movie.services.movie_service import MovieService

    # Arrange: Mock client returns 404
    mock_client = Mock(spec=['get_movie_details'])
    mock_response = ApiResponse(
        status_code=404,
        data=None,
        error_message="Movie not found"
    )
    mock_client.get_movie_details.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act & Assert: Should raise HttpError(404)
    with pytest.raises(HttpError) as exc_info:
        service.get_movie_by_id(999999)

    assert exc_info.value.status_code == 404


# ============================================================================
# MovieService.search_movies Tests
# ============================================================================


def test_search_movies_uses_injected_client() -> None:
    """Test search_movies calls injected client with correct parameters."""
    from movie.services.movie_service import MovieService

    # Arrange: Mock client
    mock_client = Mock(spec=['search_movies'])

    search_response: TMDBMovieResponse = {
        'results': [
            {
                'id': 1,
                'title': 'Test Movie',
                'poster_path': '/test.jpg',
                'release_date': '2023-01-01',
                'vote_average': 8.0,
                'vote_count': 100,
                'genre_ids': [28, 12]  # Action, Adventure
            }
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 1
    }
    mock_api_response = ApiResponse(status_code=200, data=search_response)
    mock_client.search_movies.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call search_movies
    result = service.search_movies(query="test", page=2)

    # Assert: Injected client was called with correct params
    mock_client.search_movies.assert_called_once_with(
        query="test",
        page=2,
        include_adult=False,
        language="en-US",
        region="US"
    )
    assert isinstance(result, PaginatedMovieResponseSchema)
    assert len(result.results) == 1


def test_search_movies_filters_soundtrack_results() -> None:
    """Test search_movies filters out soundtrack/score entries."""
    from movie.services.movie_service import MovieService

    # Arrange: Mock response with soundtrack entry
    mock_client = Mock(spec=['search_movies'])

    search_response: TMDBMovieResponse = {
        'results': [
            {
                'id': 1,
                'title': 'Real Movie',
                'poster_path': '/real.jpg',
                'release_date': '2023-01-01',
                'vote_average': 8.0,
                'vote_count': 100,
                'genre_ids': [28, 12]  # Action, Adventure
            },
            {
                'id': 2,
                'title': 'Movie Soundtrack',
                'poster_path': '/soundtrack.jpg',
                'release_date': '2023-01-01',
                'vote_average': 7.0,
                'vote_count': 50,
                'genre_ids': [10402]  # Music
            },
            {
                'id': 3,
                'title': 'Original Motion Picture Score',
                'poster_path': '/score.jpg',
                'release_date': '2023-01-01',
                'vote_average': 6.0,
                'vote_count': 30,
                'genre_ids': [10402]  # Music
            }
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 3
    }
    mock_api_response = ApiResponse(status_code=200, data=search_response)
    mock_client.search_movies.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call search_movies
    result = service.search_movies(query="test")

    # Assert: Only real movie returned (soundtracks filtered)
    assert len(result.results) == 1
    assert result.results[0].title == 'Real Movie'


# ============================================================================
# MovieService.discover_movies Tests
# ============================================================================


def test_discover_movies_uses_injected_client() -> None:
    """Test discover_movies calls injected client with mapped parameters."""
    from movie.services.movie_service import MovieService

    # Arrange: Mock client
    mock_client = Mock(spec=['get'])

    discover_response: TMDBMovieResponse = {
        'results': [],
        'page': 1,
        'total_pages': 1,
        'total_results': 0
    }
    mock_api_response = ApiResponse(status_code=200, data=discover_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call discover with friendly parameter names
    service.discover_movies(
        page=2,
        genres='28,12',  # Should map to with_genres
        year=2023,
        vote_average_gte=7.5
    )

    # Assert: Client called with TMDB parameter names
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    endpoint = call_args[0][0]
    params = call_args[0][1]

    assert endpoint == "discover/movie"
    assert params['page'] == 2
    assert params['with_genres'] == '28,12'
    assert params['year'] == 2023
    assert params['vote_average.gte'] == 7.5


def test_discover_movies_sets_default_parameters() -> None:
    """Test discover_movies includes default TMDB parameters."""
    from movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=['get'])
    discover_response: TMDBMovieResponse = {
        'results': [], 'page': 1, 'total_pages': 1, 'total_results': 0
    }
    mock_api_response = ApiResponse(status_code=200, data=discover_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    service.discover_movies(page=1)

    # Assert: Default parameters set
    call_args = mock_client.get.call_args
    params = call_args[0][1]

    assert params['include_adult'] is False
    assert params['include_video'] is False
    assert params['language'] == 'en-US'
    assert params['sort_by'] == 'popularity.desc'


# ============================================================================
# MovieService.get_now_playing_movies Tests
# ============================================================================


def test_get_now_playing_movies_uses_injected_client() -> None:
    """Test get_now_playing_movies calls discover endpoint with date presets."""
    from movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=['get'])

    now_playing_response: TMDBMovieResponse = {
        'results': [
            {
                'id': 1,
                'title': 'Now Playing',
                'poster_path': '/now.jpg',
                'release_date': '2023-01-01',
                'vote_average': 8.0
            }
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 1
    }
    mock_api_response = ApiResponse(status_code=200, data=now_playing_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.get_now_playing_movies(page=2)

    # Assert: Service calls discover/movie with date preset
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    endpoint = call_args[0][0]
    params = call_args[0][1]

    assert endpoint == 'discover/movie'
    assert params['page'] == 2
    # Date range preset applied (mapped to TMDB parameter names)
    assert 'primary_release_date.gte' in params
    assert 'primary_release_date.lte' in params
    assert params['with_release_type'] == '2|3'
    assert isinstance(result, PaginatedMovieResponseSchema)
    # Note: Result is empty due to backend filtering removing mock data
    assert len(result.results) == 0


# ============================================================================
# MovieService.get_upcoming_movies Tests
# ============================================================================


def test_get_upcoming_movies_uses_injected_client() -> None:
    """Test get_upcoming_movies calls injected client with date range."""
    from movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=['get'])

    upcoming_response: TMDBMovieResponse = {
        'results': [
            {
                'id': 1,
                'title': 'Upcoming',
                'poster_path': '/upcoming.jpg',
                'release_date': '2024-01-01',
                'vote_average': 8.0
            }
        ],
        'page': 1,
        'total_pages': 1,
        'total_results': 1
    }
    mock_api_response = ApiResponse(status_code=200, data=upcoming_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.get_upcoming_movies(page=1)

    # Assert: Client called with discover/movie and date range params
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    endpoint = call_args[0][0]
    params = call_args[0][1]

    assert endpoint == "discover/movie"
    assert 'primary_release_date.gte' in params
    assert 'primary_release_date.lte' in params
    assert isinstance(result, PaginatedMovieResponseSchema)


# ============================================================================
# Factory Function Tests
# ============================================================================


def test_get_movie_service_factory_creates_service_with_default_client() -> None:
    """Test get_movie_service() factory creates service with default client."""
    from movie.services.service_factory import get_movie_service

    # Act
    service = get_movie_service()

    # Assert: Service has proper client (access protected attr for testing)
    assert service is not None
    assert hasattr(service, '_tmdb_client')
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]


def test_get_movie_service_factory_returns_movie_service_instance() -> None:
    """Test factory returns MovieService instance."""
    from movie.services.movie_service import MovieService
    from movie.services.service_factory import get_movie_service

    # Act
    service = get_movie_service()

    # Assert
    assert isinstance(service, MovieService)


# ============================================================================
# Supporting Methods Tests
# ============================================================================


def test_get_movie_genres_uses_injected_client() -> None:
    """Test get_movie_genres calls injected client."""
    from movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=['get'])

    genres_response: TMDBGenreListResponse = {
        'genres': [
            {'id': 1, 'name': 'Action'},
            {'id': 2, 'name': 'Comedy'}
        ]
    }
    mock_api_response = ApiResponse(status_code=200, data=genres_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.get_movie_genres()

    # Assert
    mock_client.get.assert_called_once_with("genre/movie/list")
    assert len(result) == 2
    assert result[0].name == 'Action'


def test_fetch_movie_runtimes_uses_injected_client() -> None:
    """Test fetch_movie_runtimes method uses injected client."""
    from movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=['get_movie_details', 'get'])

    # Mock movie details responses
    movie_data_1: TMDBMovieDetail = {
        'id': 1,
        'title': 'Movie 1',
        'poster_path': '/test1.jpg',
        'release_date': '2023-01-01',
        'vote_average': 8.0,
        'runtime': 120,
        'overview': 'Test',
        'genres': [],
        'production_companies': []
    }
    movie_data_2: TMDBMovieDetail = {
        'id': 2,
        'title': 'Movie 2',
        'poster_path': '/test2.jpg',
        'release_date': '2023-01-02',
        'vote_average': 7.5,
        'runtime': 90,
        'overview': 'Test',
        'genres': [],
        'production_companies': []
    }

    credits_data: TMDBCreditsResponse = {'cast': [], 'crew': []}

    # Mock responses for both movies
    mock_client.get_movie_details.side_effect = [
        ApiResponse(status_code=200, data=movie_data_1),
        ApiResponse(status_code=200, data=movie_data_2),
    ]
    mock_client.get.return_value = ApiResponse(status_code=200, data=credits_data)

    service = MovieService(tmdb_client=mock_client)

    # Act
    runtimes = service.fetch_movie_runtimes([1, 2])

    # Assert
    assert runtimes == {1: 120, 2: 90}
    assert mock_client.get_movie_details.call_count == 2
