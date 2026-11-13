"""Unit tests for MovieService class-based architecture.

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

from apps.core.exceptions import NotFoundError
from apps.core.services.api_response import ApiResponse
from apps.movie.schemas import (
    MovieDetailSchema,
    MovieListResponseSchema,
)
from apps.movie.tests.test_helpers import (
    create_mock_movie_detail_response,
    create_mock_paginated_response,
    create_tmdb_movie,
)
from apps.movie.tests.tmdb_test_builders import (
    TMDBCreditsResponse,
    TMDBGenreListResponse,
    TMDBMovieResponse,
)

if TYPE_CHECKING:
    pass


# ============================================================================
# MovieService Class Tests - Constructor and DI
# ============================================================================


def test_movie_service_constructor_with_injected_client() -> None:
    """Test MovieService constructor accepts injected TMDB client."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Create mock client
    mock_client = Mock(
        spec=["get", "get_movie_details", "search_movies", "get_now_playing_movies"]
    )

    # Act: Inject client via constructor
    service = MovieService(tmdb_client=mock_client)

    # Assert: Service stores the injected client (access protected attr for testing)
    assert service._tmdb_client is mock_client  # pyright: ignore[reportPrivateUsage]


def test_movie_service_constructor_with_default_client() -> None:
    """Test MovieService constructor creates default client when none injected."""
    from apps.movie.services.movie_service import MovieService

    # Act: Create service without injecting client
    service = MovieService()

    # Assert: Service has a TMDBApiClient instance (access protected attr for testing)
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, "get")  # pyright: ignore[reportPrivateUsage]
    assert hasattr(service._tmdb_client, "get_movie_details")  # pyright: ignore[reportPrivateUsage]


# ============================================================================
# MovieService.get_movie_by_id Tests
# ============================================================================


@pytest.mark.django_db
def test_get_movie_by_id_uses_injected_client() -> None:
    """Test get_movie_by_id calls injected client, not global tmdb_client."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Create mock client with successful responses
    mock_client = Mock(spec=["get", "get_movie_details"])

    # Mock movie details response
    mock_details_response = create_mock_movie_detail_response(
        tmdb_id=123,
        title="Test Movie",
        release_date="2023-01-01",
        vote_average=8.0,
        runtime=120,
        overview="Test overview",
        genres=[{"id": 1, "name": "Action"}],
        poster_path="/test.jpg",
    )
    mock_client.get_movie_details.return_value = mock_details_response

    # Mock credits response
    credits_data: TMDBCreditsResponse = {"cast": [], "crew": []}
    mock_credits_response = ApiResponse(status_code=200, data=credits_data)
    mock_client.get.return_value = mock_credits_response

    # Inject mock client
    service = MovieService(tmdb_client=mock_client)

    # Act: Call service method
    result = service.get_movie_by_id(123)

    # Assert: Injected client was called, not global
    # append_to_response='release_dates' fetches certification data for MovieDetail
    mock_client.get_movie_details.assert_called_once_with(123, append_to_response="release_dates")
    mock_client.get.assert_called_once_with("movie/123/credits")
    assert isinstance(result, MovieDetailSchema)
    assert result.tmdb_id == 123


def test_get_movie_by_id_handles_movie_not_found() -> None:
    """Test get_movie_by_id raises NotFoundError (404) when movie not found."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Mock client returns 404
    mock_client = Mock(spec=["get_movie_details"])
    mock_response = ApiResponse(status_code=404, data=None, error_message="Movie not found")
    mock_client.get_movie_details.return_value = mock_response

    service = MovieService(tmdb_client=mock_client)

    # Act & Assert: Should raise NotFoundError (404)
    with pytest.raises(NotFoundError) as exc_info:
        service.get_movie_by_id(999999)

    assert exc_info.value.status_code == 404


# ============================================================================
# MovieService.search_movies Tests
# ============================================================================


def test_search_movies_uses_injected_client() -> None:
    """Test search_movies calls injected client with correct parameters."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Mock client
    mock_client = Mock(spec=["search_movies"])

    movie = create_tmdb_movie(1, "Test Movie", "2023-01-01", 8.0, poster_path="/test.jpg")
    mock_api_response = create_mock_paginated_response(movies=[movie], page=1, total_pages=1)
    mock_client.search_movies.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call search_movies
    from apps.movie.services.api_boundary import SearchServiceParams

    result = service.search_movies(page=2, params=SearchServiceParams(query="test"))

    # Assert: Injected client was called with correct params
    mock_client.search_movies.assert_called_once_with(
        query="test", page=2, include_adult=False, language="en-US"
    )
    assert isinstance(result, MovieListResponseSchema)
    assert len(result.results) == 1


def test_search_movies_filters_soundtrack_results() -> None:
    """Test search_movies filters out soundtrack/score entries."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Mock response with soundtrack entry
    mock_client = Mock(spec=["search_movies"])

    movies = [
        create_tmdb_movie(1, "Real Movie", "2023-01-01", 8.0, poster_path="/real.jpg"),
        create_tmdb_movie(2, "Movie Soundtrack", "2023-01-01", 7.0, poster_path="/soundtrack.jpg"),
        create_tmdb_movie(
            3, "Original Motion Picture Score", "2023-01-01", 6.0, poster_path="/score.jpg"
        ),
    ]
    mock_api_response = create_mock_paginated_response(movies=movies, page=1, total_pages=1)
    mock_client.search_movies.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call search_movies
    from apps.movie.services.api_boundary import SearchServiceParams

    result = service.search_movies(page=1, params=SearchServiceParams(query="test"))

    # Assert: Only real movie returned (soundtracks filtered)
    assert len(result.results) == 1
    assert result.results[0].title == "Real Movie"


def test_search_movies_returns_empty_for_short_query() -> None:
    """Test search_movies returns empty response for short/empty query."""
    from apps.movie.services.api_boundary import SearchServiceParams
    from apps.movie.services.movie_service import MovieService

    # Arrange: Mock client
    mock_client = Mock(spec=["search_movies"])
    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.search_movies(page=2, params=SearchServiceParams(query=""))

    # Assert
    assert result.page == 1
    assert result.total_pages == 0
    assert result.total_results == 0
    assert result.results == []
    mock_client.search_movies.assert_not_called()


# ============================================================================
# MovieService.discover_movies Tests
# ============================================================================


def test_discover_movies_uses_injected_client() -> None:
    """Test discover_movies calls injected client with mapped parameters."""
    from apps.movie.services.movie_service import MovieService

    # Arrange: Mock client
    mock_client = Mock(spec=["get"])

    discover_response: TMDBMovieResponse = {
        "results": [],
        "page": 1,
        "total_pages": 1,
        "total_results": 0,
    }
    mock_api_response = ApiResponse(status_code=200, data=discover_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act: Call discover with BrowseServiceParams
    from apps.movie.services.api_boundary import BrowseServiceParams

    params = BrowseServiceParams(
        genres="28,12",  # Should map to with_genres
        year=2023,
        vote_average_gte=7.5,  # Underscore notation for Pydantic field
    )
    service.discover_movies(page=2, params=params)

    # Assert: Client called with TMDB parameter names
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    endpoint = call_args[0][0]
    params = call_args[0][1]

    assert endpoint == "discover/movie"
    assert params["page"] == 2
    assert params["with_genres"] == "28,12"
    assert params["year"] == 2023
    assert params["vote_average.gte"] == 7.5


def test_discover_movies_sets_default_parameters() -> None:
    """Test discover_movies includes default TMDB parameters."""
    from apps.movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=["get"])
    discover_response: TMDBMovieResponse = {
        "results": [],
        "page": 1,
        "total_pages": 1,
        "total_results": 0,
    }
    mock_api_response = ApiResponse(status_code=200, data=discover_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    service.discover_movies(page=1)

    # Assert: Default parameters set
    call_args = mock_client.get.call_args
    params = call_args[0][1]

    assert params["include_adult"] is False
    assert params["include_video"] is False
    assert params["language"] == "en-US"
    assert params["sort_by"] == "popularity.desc"


# ============================================================================
# MovieService.get_now_playing_movies Tests
# ============================================================================


def test_get_now_playing_movies_uses_injected_client() -> None:
    """Test get_now_playing_movies calls discover endpoint with date presets."""
    from apps.movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=["get"])

    movie = create_tmdb_movie(1, "Now Playing", "2023-01-01", 8.0, poster_path="/now.jpg")
    mock_api_response = create_mock_paginated_response(movies=[movie], page=1, total_pages=1)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.get_now_playing_movies(page=2)

    # Assert: Service calls discover/movie with date preset
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    endpoint = call_args[0][0]
    params = call_args[0][1]

    assert endpoint == "discover/movie"
    assert params["page"] == 2
    # Date range preset applied (mapped to TMDB parameter names)
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    assert params["with_release_type"] == "2|3"
    assert isinstance(result, MovieListResponseSchema)
    # Result now passes backend filtering (complete mock data with genre_ids, vote_count)
    assert len(result.results) == 1


# ============================================================================
# MovieService.get_upcoming_movies Tests
# ============================================================================


def test_get_upcoming_movies_uses_injected_client() -> None:
    """Test get_upcoming_movies calls injected client with date range."""
    from apps.movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=["get"])

    movie = create_tmdb_movie(1, "Upcoming", "2024-01-01", 8.0, poster_path="/upcoming.jpg")
    mock_api_response = create_mock_paginated_response(movies=[movie], page=1, total_pages=1)
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
    assert "primary_release_date.gte" in params
    assert "primary_release_date.lte" in params
    assert isinstance(result, MovieListResponseSchema)


# ============================================================================
# Factory Function Tests
# ============================================================================


def test_get_movie_service_factory_creates_service_with_default_client() -> None:
    """Test get_movie_service() factory creates service with default client."""
    from apps.movie.services.service_factory import get_movie_service

    # Act
    service = get_movie_service()

    # Assert: Service has proper client (access protected attr for testing)
    assert service is not None
    assert hasattr(service, "_tmdb_client")
    assert service._tmdb_client is not None  # pyright: ignore[reportPrivateUsage]


def test_get_movie_service_factory_returns_movie_service_instance() -> None:
    """Test factory returns MovieService instance."""
    from apps.movie.services.movie_service import MovieService
    from apps.movie.services.service_factory import get_movie_service

    # Act
    service = get_movie_service()

    # Assert
    assert isinstance(service, MovieService)


# ============================================================================
# Supporting Methods Tests
# ============================================================================


def test_get_movie_genres_uses_injected_client() -> None:
    """Test get_movie_genres calls injected client."""
    from apps.movie.services.movie_service import MovieService

    # Arrange
    mock_client = Mock(spec=["get"])

    genres_response: TMDBGenreListResponse = {
        "genres": [{"id": 1, "name": "Action"}, {"id": 2, "name": "Comedy"}]
    }
    mock_api_response = ApiResponse(status_code=200, data=genres_response)
    mock_client.get.return_value = mock_api_response

    service = MovieService(tmdb_client=mock_client)

    # Act
    result = service.get_movie_genres()

    # Assert
    mock_client.get.assert_called_once_with("genre/movie/list")
    assert len(result) == 2
    assert result[0].name == "Action"
