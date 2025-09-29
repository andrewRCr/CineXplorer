"""
Unit tests for movie_service.py business logic.

These tests focus on the service layer independently from API endpoints,
testing parameter mapping, error handling, and data transformation logic
that wasn't covered by integration tests.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from ninja.errors import HttpError

from core.services.api_response import ApiResponse
from core.types.api_types import TMDBResponseData
from movie.services import movie_service
from movie.schemas import (
    MovieBaseSchema,
    MovieDetailSchema,
    PaginatedMovieResponseSchema,
    GenreSchema,
)


class MovieServiceParameterMappingTests(TestCase):
    """Test parameter mapping and transformation logic."""

    @patch('movie.services.movie_service.tmdb_client.get')
    def test_discover_movies_basic_parameter_passing(self, mock_tmdb_get: MagicMock) -> None:
        """Test that discover_movies correctly passes parameters to TMDB client."""
        # Arrange: Mock successful TMDB response
        tmdb_response: TMDBResponseData = {
            'results': [{'id': 1, 'title': 'Test', 'poster_path': '/test.jpg',
                        'release_date': '2023-01-01', 'vote_average': 8.0}],
            'page': 1, 'total_pages': 1, 'total_results': 1
        }
        mock_api_response = ApiResponse(status_code=200, data=tmdb_response)
        mock_tmdb_get.return_value = mock_api_response

        # Act: Call discover with parameters (service layer maps friendly names to TMDB format)
        result = movie_service.discover_movies(
            page=2,
            sort_by='popularity.desc',
            genres='28,12',  # Service layer maps this to with_genres
            year='2023',
            vote_average_gte='7.5',
            release_date_gte='2023-01-01'
        )

        # Assert: Verify TMDB client called with exact parameters passed in
        mock_tmdb_get.assert_called_once()
        call_args = mock_tmdb_get.call_args
        endpoint = call_args[0][0]
        params = call_args[0][1]

        self.assertEqual(endpoint, "discover/movie")
        self.assertEqual(params['page'], 2)
        self.assertEqual(params['sort_by'], 'popularity.desc')
        self.assertEqual(params['with_genres'], '28,12')
        self.assertEqual(params['year'], '2023')
        self.assertEqual(params['vote_average.gte'], '7.5')
        self.assertEqual(params['primary_release_date.gte'], '2023-01-01')

        # Assert: Verify result is proper PaginatedMovieResponseSchema
        self.assertIsInstance(result, PaginatedMovieResponseSchema)
        self.assertEqual(result.page, 1)

    @patch('movie.services.movie_service.tmdb_client.get')
    def test_discover_movies_default_parameters(self, mock_tmdb_get: MagicMock) -> None:
        """Test that discover_movies sets default parameters correctly."""
        # Arrange
        tmdb_response: TMDBResponseData = {
            'results': [], 'page': 1, 'total_pages': 1, 'total_results': 0
        }
        mock_api_response = ApiResponse(status_code=200, data=tmdb_response)
        mock_tmdb_get.return_value = mock_api_response

        # Act: Call with minimal parameters
        movie_service.discover_movies(page=1)

        # Assert: Verify default parameters are set
        call_args = mock_tmdb_get.call_args
        assert call_args is not None
        params = call_args[0][1]
        self.assertEqual(params['include_adult'], False)
        self.assertEqual(params['include_video'], False)
        self.assertEqual(params['language'], 'en-US')
        self.assertEqual(params['region'], 'US')
        self.assertEqual(params['sort_by'], 'popularity.desc')  # Default sort


class MovieServiceErrorHandlingTests(TestCase):
    """Test error handling and edge cases in movie service."""

    @patch('movie.services.movie_service.tmdb_client.get_movie_details')
    def test_get_movie_by_id_api_error(self, mock_get_details: MagicMock) -> None:
        """Test error handling when TMDB API returns error for movie details."""
        # Arrange: Mock API error response
        mock_api_response = ApiResponse(
            status_code=404, data={'status_message': 'Movie not found'}
        )
        mock_get_details.return_value = mock_api_response

        # Act & Assert: Should raise HttpError
        with self.assertRaises(HttpError):
            movie_service.get_movie_by_id(999999)

        # Verify error handling was called
        mock_get_details.assert_called_once_with(999999)

    @patch('movie.services.movie_service.tmdb_client.get')
    @patch('movie.services.movie_service.tmdb_client.get_movie_details')
    def test_get_movie_by_id_credits_error(
        self, mock_get_details: MagicMock, mock_get_credits: MagicMock
    ) -> None:
        """Test error handling when credits API call fails."""
        # Arrange: Movie details succeed, credits fail
        movie_data: TMDBResponseData = {
            'id': 123, 'title': 'Test Movie', 'overview': 'Test overview',
            'poster_path': '/test.jpg', 'release_date': '2023-01-01',
            'vote_average': 8.0, 'genres': [], 'production_companies': []
        }
        mock_get_details.return_value = ApiResponse(status_code=200, data=movie_data)
        mock_get_credits.return_value = ApiResponse(
            status_code=500, data={'error': 'Server error'}
        )

        # Act & Assert: Should raise HttpError for credits failure
        with self.assertRaises(HttpError):
            movie_service.get_movie_by_id(123)

        mock_get_details.assert_called_once_with(123)
        mock_get_credits.assert_called_once_with("movie/123/credits")

    @patch('movie.services.movie_service.tmdb_client.get_now_playing_movies')
    def test_get_now_playing_movies_api_error(self, mock_get_now_playing: MagicMock) -> None:
        """Test error handling for now playing movies API failure."""
        # Arrange: Mock API error
        mock_api_response = ApiResponse(
            status_code=500, data={'error': 'Internal server error'}
        )
        mock_get_now_playing.return_value = mock_api_response

        # Act & Assert
        with self.assertRaises(HttpError):
            movie_service.get_now_playing_movies(page=1)

    @patch('movie.services.movie_service.tmdb_client.search_movies')
    def test_search_movies_with_valid_query(self, mock_search: MagicMock) -> None:
        """Test that search_movies correctly passes parameters to TMDB client."""
        # Arrange: Mock successful search response
        tmdb_response: TMDBResponseData = {
            'results': [{'id': 1, 'title': 'Test Movie', 'poster_path': '/test.jpg',
                        'release_date': '2023-01-01', 'vote_average': 8.0}],
            'page': 1, 'total_pages': 1, 'total_results': 1
        }
        mock_api_response = ApiResponse(status_code=200, data=tmdb_response)
        mock_search.return_value = mock_api_response

        # Act: Search with valid query
        result = movie_service.search_movies(query="action", page=2)

        # Assert: Verify TMDB client called with correct parameters
        mock_search.assert_called_once_with(
            query="action",
            page=2,
            include_adult="false",
            language="en-US",
            region="US"
        )
        self.assertIsInstance(result, PaginatedMovieResponseSchema)


class MovieServiceDataTransformationTests(TestCase):
    """Test data transformation and schema creation logic."""

    def test_create_movie_base_from_tmdb_minimal_data(self):
        """Test movie base creation with minimal required TMDB data."""
        # Arrange: Minimal TMDB data
        tmdb_data: TMDBResponseData = {
            'id': 123,
            'title': 'Test Movie',
            'poster_path': '/test.jpg',
            'release_date': '2023-01-01',
            'vote_average': 8.0
        }

        # Act
        result = movie_service.create_movie_base_from_tmdb(tmdb_data)

        # Assert
        self.assertIsInstance(result, MovieBaseSchema)
        self.assertEqual(result.tmdb_id, 123)
        self.assertEqual(result.title, 'Test Movie')
        self.assertEqual(result.poster_path, '/test.jpg')
        self.assertEqual(str(result.release_date), '2023-01-01')
        self.assertEqual(result.vote_average, 8.0)

    def test_create_movie_base_from_tmdb_missing_optional_fields(self):
        """Test movie base creation handles missing optional fields gracefully."""
        # Arrange: Data with missing optional fields
        tmdb_data: TMDBResponseData = {
            'id': 123,
            'title': 'Test Movie',
            'poster_path': None,  # Missing poster
            'release_date': None,  # Missing release date (None instead of empty string)
            'vote_average': 0     # Zero rating
        }

        # Act
        result = movie_service.create_movie_base_from_tmdb(tmdb_data)

        # Assert: Should handle missing/empty fields gracefully
        self.assertIsInstance(result, MovieBaseSchema)
        self.assertEqual(result.tmdb_id, 123)
        self.assertEqual(result.title, 'Test Movie')

    def test_create_movie_detail_from_tmdb_with_credits(self):
        """Test movie detail creation with full credits data."""
        # Arrange: Full movie data with credits
        movie_data: TMDBResponseData = {
            'id': 123, 'title': 'Test Movie', 'overview': 'Test overview',
            'poster_path': '/test.jpg', 'release_date': '2023-01-01',
            'vote_average': 8.0, 'genres': [{'id': 28, 'name': 'Action'}],
            'production_companies': [{'id': 1, 'name': 'Test Studios'}]
        }
        credits_data: TMDBResponseData = {
            'cast': [{'id': 1, 'name': 'Actor One', 'character': 'Hero'}],
            'crew': [{'id': 2, 'name': 'Director One', 'job': 'Director'}]
        }

        # Act
        result = movie_service.create_movie_detail_from_tmdb(
            movie_data, credits_data
        )

        # Assert
        self.assertIsInstance(result, MovieDetailSchema)
        self.assertEqual(result.tmdb_id, 123)
        self.assertEqual(len(result.genres), 1)
        self.assertEqual(result.genres[0].name, 'Action')
        self.assertEqual(len(result.cast), 1)
        self.assertEqual(result.cast[0].name, 'Actor One')

    def test_create_genre_list_from_tmdb_empty_response(self):
        """Test genre list creation with empty TMDB response."""
        # Arrange: Empty genres response
        tmdb_response: TMDBResponseData = {'genres': []}

        # Act
        result = movie_service.create_genre_list_from_tmdb(tmdb_response)

        # Assert
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0)

    def test_create_genre_list_from_tmdb_valid_data(self):
        """Test genre list creation with valid TMDB data."""
        # Arrange: Valid genres response
        tmdb_response: TMDBResponseData = {
            'genres': [
                {'id': 28, 'name': 'Action'},
                {'id': 35, 'name': 'Comedy'}
            ]
        }

        # Act
        result = movie_service.create_genre_list_from_tmdb(tmdb_response)

        # Assert
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        self.assertIsInstance(result[0], GenreSchema)
        self.assertEqual(result[0].id, 28)
        self.assertEqual(result[0].name, 'Action')


class MovieServiceBusinessLogicTests(TestCase):
    """Test business logic and complex operations."""

    @patch('movie.services.movie_service.tmdb_client.get')
    def test_get_upcoming_movies_date_range_logic(self, mock_tmdb_get: MagicMock) -> None:
        """Test that upcoming movies uses correct date range calculation."""
        # Arrange
        tmdb_response: TMDBResponseData = {
            'results': [], 'page': 1, 'total_pages': 1, 'total_results': 0
        }
        mock_api_response = ApiResponse(status_code=200, data=tmdb_response)
        mock_tmdb_get.return_value = mock_api_response

        # Act
        movie_service.get_upcoming_movies(page=1)

        # Assert: Verify date range logic
        call_args = mock_tmdb_get.call_args
        assert call_args is not None
        params = call_args[0][1]

        # Should have date range parameters
        self.assertIn('primary_release_date.gte', params)
        self.assertIn('primary_release_date.lte', params)

        # Date should be today or later
        import datetime
        today = datetime.datetime.today().strftime("%Y-%m-%d")
        self.assertGreaterEqual(params['primary_release_date.gte'], today)

    def test_fetch_movie_runtimes_empty_list(self):
        """Test runtime fetching with empty movie ID list."""
        # Act
        result = movie_service.fetch_movie_runtimes([])

        # Assert
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), 0)

    @patch('movie.services.movie_service.tmdb_client.get')
    def test_search_keywords_query_processing(self, mock_tmdb_get: MagicMock) -> None:
        """Test keyword search query processing and parameter mapping."""
        # Arrange
        tmdb_response: TMDBResponseData = {
            'results': [], 'page': 1, 'total_pages': 1, 'total_results': 0
        }
        mock_api_response = ApiResponse(status_code=200, data=tmdb_response)
        mock_tmdb_get.return_value = mock_api_response

        # Act
        movie_service.search_keywords("action movies")

        # Assert: Verify query passed correctly
        call_args = mock_tmdb_get.call_args
        assert call_args is not None
        params = call_args[0][1]
        self.assertEqual(params['query'], "action movies")
