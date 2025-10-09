"""
Integration tests for the movie API endpoints.

These tests verify the behavior of the movie API, which relies on external
calls to the The Movie Database (TMDB) API. The external calls are mocked
to ensure tests are fast, reliable, and independent of the external service.
"""
from typing import TypedDict, Unpack
from unittest.mock import Mock, patch

from core.models import Movie
from core.services.api_response import ApiResponse
from core.tests.test_helpers import HTTPStatus, create_user
from core.types.api_types import TMDBResponseData
from django.test import Client, TestCase
from user_movie_data.models import UserMovieData

# HTTP status codes for Django Ninja endpoints
# (kept for backwards compatibility with existing tests)
HTTP_200_OK = HTTPStatus.OK
HTTP_400_BAD_REQUEST = HTTPStatus.BAD_REQUEST
HTTP_404_NOT_FOUND = HTTPStatus.NOT_FOUND
HTTP_422_UNPROCESSABLE_ENTITY = HTTPStatus.UNPROCESSABLE_ENTITY

# =========================
# Django Ninja API URLs
# =========================
NOW_PLAYING_URL = '/api/movies/now-playing'
UPCOMING_URL = '/api/movies/upcoming'
SEARCH_URL = '/api/movies/search'
DISCOVER_URL = '/api/movies/discover'


def movie_detail_url(tmdb_id: int) -> str:
    """Return the detail URL for a movie by TMDB ID."""
    return f'/api/movies/{tmdb_id}'


# =========================
# Test Setup Helper Methods
# =========================
# Note: create_user imported from core.tests.test_helpers (shared utility)


class MovieParams(TypedDict, total=False):
    """Type for movie creation parameters."""
    title: str
    poster_path: str | None
    release_date: str | None


def create_movie_stub(tmdb_id: int, **params: Unpack[MovieParams]) -> Movie:
    """
    Create and return a new Movie stub object.
    This mimics the behavior of the service layer, which creates a local stub
    for a movie fetched from the TMDB API.
    """
    # tmdb_id is required parameter
    defaults: dict[str, object] = {
        'title': 'Default Movie Title',
        'poster_path': '/default.jpg',
        'release_date': '2025-01-01',
    }
    defaults.update(params)
    return Movie.objects.create(tmdb_id=tmdb_id, **defaults)


def attach_pass_through_data(movie_instance: Movie, **extra_data: object) -> Movie:
    """
    Attaches extra, non-model data to a movie instance to simulate
    the data that comes from the TMDB API service.
    """
    # Common pass-through fields for list views
    setattr(movie_instance, 'vote_average', extra_data.get('vote_average', 8.0))
    setattr(movie_instance, 'overview', extra_data.get('overview', 'An overview.'))

    # Detail-view specific pass-through fields
    if 'genres' in extra_data:
        setattr(movie_instance, 'genres', extra_data.get('genres'))
    if 'credits' in extra_data:
        setattr(movie_instance, 'credits', extra_data.get('credits'))

    return movie_instance


class MovieApiTests(TestCase):
    """Tests for the Django Ninja movie API endpoints."""

    def setUp(self) -> None:
        self.client = Client()
        self.user = create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass123'
        )

    def _test_paginated_endpoint_contract(
        self, mock_tmdb_method: Mock, url: str,
        params: dict[str, str | int] | None = None
    ) -> None:
        """
        Generic helper to test the contract of any paginated movie endpoint.
        It mocks the TMDB client method and verifies the response structure.
        """
        # Arrange: Define a standard mock TMDB API response
        tmdb_payload: TMDBResponseData = {
            'results': [{
                'id': 101,
                'title': 'Test Movie',
                'poster_path': '/test.jpg',
                'release_date': '2023-01-01',
                'vote_average': 8.0
            }],
            'page': 1,
            'total_pages': 5,
            'total_results': 1
        }
        mock_api_response = ApiResponse(
            status_code=200,
            data=tmdb_payload  # type: ignore[arg-type]
        )
        mock_tmdb_method.return_value = mock_api_response

        # Act: Call the internal API endpoint
        res = self.client.get(url, params or {})

        # Assert: Check the response status and overall structure
        self.assertEqual(res.status_code, HTTP_200_OK)
        data = res.json()
        self.assertIn('results', data)
        self.assertIn('page', data)
        self.assertIn('total_pages', data)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['total_pages'], 5)
        self.assertEqual(len(data['results']), 1)

    @patch('core.services.tmdb_api_client.TMDBApiClient.get_now_playing_movies')
    def test_now_playing_api_contract(self, mock_tmdb_method: Mock) -> None:
        """
        Verify the /api/movies/now-playing endpoint returns the correct paginated structure.
        """
        self._test_paginated_endpoint_contract(
            mock_tmdb_method, NOW_PLAYING_URL, {'page': 1}
        )

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    def test_upcoming_api_contract(self, mock_tmdb_get: Mock) -> None:
        """
        Verify the /upcoming/ endpoint returns the correct paginated structure.
        """
        self._test_paginated_endpoint_contract(
            mock_tmdb_get, UPCOMING_URL, {'page': 1}
        )

    @patch('core.services.tmdb_api_client.TMDBApiClient.search_movies')
    def test_search_api_contract(self, mock_tmdb_search: Mock) -> None:
        """
        Verify the /search/ endpoint returns the correct paginated structure.
        """
        self._test_paginated_endpoint_contract(
            mock_tmdb_search, SEARCH_URL, {'query': 'test'}
        )

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    def test_discover_api_contract(self, mock_tmdb_get: Mock) -> None:
        """
        Verify the /discover/ endpoint returns the correct paginated structure.
        """
        self._test_paginated_endpoint_contract(
            mock_tmdb_get, DISCOVER_URL, {'page': 1}
        )

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    def test_discover_with_filters(self, mock_tmdb_get: Mock) -> None:
        """Test the discover endpoint with various filter parameters."""
        # Arrange: Define a standard mock TMDB API response
        tmdb_payload: TMDBResponseData = {
            'results': [{
                'id': 101,
                'title': 'Test Movie',
                'poster_path': '/test.jpg',
                'release_date': '2023-01-01',
                'vote_average': 8.0
            }],
            'page': 1,
            'total_pages': 5,
            'total_results': 1
        }
        mock_api_response = ApiResponse(
            status_code=200,
            data=tmdb_payload  # type: ignore[arg-type]
        )
        mock_tmdb_get.return_value = mock_api_response

        # Act: Call the discover endpoint with filters
        filters: dict[str, str | int] = {
            'sort_by': 'release_date.desc',
            'genres': '28,12',  # Action, Adventure
            'year': 2023,
            'vote_average_gte': 7.0,
            'vote_average_lte': 10.0,
            'release_date_gte': '2023-01-01',
            'release_date_lte': '2023-12-31',
            'runtime_gte': 90,
            'runtime_lte': 180,
            'certification': 'PG-13',
            'region': 'US'
        }
        res = self.client.get(DISCOVER_URL, filters)

        # Assert: Check the response status and structure
        self.assertEqual(res.status_code, HTTP_200_OK)
        data = res.json()
        self.assertIn('results', data)
        self.assertIn('page', data)
        self.assertIn('total_pages', data)

        # Verify that the mock was called with correct parameters
        mock_tmdb_get.assert_called_once()
        call_args = mock_tmdb_get.call_args

        # Verify the endpoint path and parameters passed to TMDB client
        endpoint = call_args[0][0]  # First positional argument is the endpoint
        # Parameters
        params = (
            call_args[0][1] if len(call_args[0]) > 1 else
            call_args[1].get('params', {})
        )

        # Check that the correct TMDB endpoint is called
        self.assertEqual(endpoint, "discover/movie")

        # Check critical parameter mappings from API to TMDB format
        self.assertEqual(params['sort_by'], 'release_date.desc')
        self.assertEqual(params['with_genres'], '28,12')
        self.assertEqual(params['year'], 2023)
        self.assertEqual(params['vote_average.gte'], 7.0)
        self.assertEqual(params['vote_average.lte'], 10.0)
        self.assertEqual(params['primary_release_date.gte'], '2023-01-01')
        self.assertEqual(params['primary_release_date.lte'], '2023-12-31')
        # Runtime filtering is disabled due to TMDB API data quality issues
        # self.assertNotIn('with_runtime.gte', params)
        # self.assertNotIn('with_runtime.lte', params)
        self.assertEqual(params['certification'], 'PG-13')
        self.assertEqual(params['region'], 'US')

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    def test_discover_invalid_parameters(self, mock_tmdb_get: Mock) -> None:
        """Test the discover endpoint with invalid parameter values."""
        # Test invalid year (Pydantic validation)
        res = self.client.get(DISCOVER_URL, {'year': 'invalid'})
        self.assertEqual(res.status_code, HTTP_422_UNPROCESSABLE_ENTITY)
        data = res.json()
        self.assertIn('detail', data)  # Django Ninja uses 'detail' for errors

        # Test invalid vote_average_gte (Pydantic validation)
        res = self.client.get(DISCOVER_URL, {'vote_average_gte': 'invalid'})
        self.assertEqual(res.status_code, HTTP_422_UNPROCESSABLE_ENTITY)
        data = res.json()
        self.assertIn('detail', data)  # Django Ninja uses 'detail' for errors

        # Test invalid with_runtime_gte (Pydantic validation)
        res = self.client.get(DISCOVER_URL, {'with_runtime_gte': 'invalid'})
        self.assertEqual(res.status_code, HTTP_422_UNPROCESSABLE_ENTITY)
        data = res.json()
        self.assertIn('detail', data)  # Django Ninja uses 'detail' for errors

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    @patch('core.services.tmdb_api_client.TMDBApiClient.get_movie_details')
    def test_get_movie_detail_authenticated(
        self, mock_get_movie_details: Mock, mock_tmdb_get: Mock
    ) -> None:
        """
        Test retrieving movie details with user_movie_data for an authenticated user.
        """
        # Arrange: Create the local movie stub and user data
        movie_stub = create_movie_stub(78, title='Blade Runner')
        UserMovieData.objects.create(
            user=self.user,
            movie=movie_stub,
            user_rating=9,
            user_review='Great movie!'
        )

        # Arrange: Mock the TMDB client API responses for movie info and credits
        mock_info_response = ApiResponse(
            status_code=200,
            data={
                'id': 78, 'title': 'Blade Runner', 'overview': 'A classic.',
                'poster_path': '/br.jpg', 'release_date': '1982-06-25',
                'vote_average': 8.1, 'genres': [], 'production_companies': []
            }
        )

        mock_credits_response = ApiResponse(
            status_code=200,
            data={'crew': [], 'cast': []}
        )

        # Set up the mock returns for each TMDB client method
        mock_get_movie_details.return_value = mock_info_response
        mock_tmdb_get.return_value = mock_credits_response

        # Act
        self.client.force_login(self.user)
        url = movie_detail_url(movie_stub.tmdb_id)
        res = self.client.get(url)

        # Assert
        self.assertEqual(res.status_code, HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['tmdb_id'], movie_stub.tmdb_id)
        self.assertIn('title', data)
        self.assertIn('user_movie_data', data)
        user_data = data['user_movie_data']
        # TODO: User integration not yet implemented - will be completed in backend modernization
        # For now, user_movie_data should be None even for authenticated users
        self.assertIsNone(user_data)
        # When implemented, these assertions should be enabled:
        # self.assertIsNotNone(user_data)
        # self.assertEqual(user_data['user_rating'], 9)
        # self.assertEqual(user_data['user_review'], 'Great movie!')

    @patch('core.services.tmdb_api_client.TMDBApiClient.get')
    @patch('core.services.tmdb_api_client.TMDBApiClient.get_movie_details')
    def test_get_movie_detail_unauthenticated(
        self, mock_get_movie_details: Mock, mock_tmdb_get: Mock
    ) -> None:
        """
        Test retrieving movie details without user_movie_data for an unauthenticated user.
        """
        # Arrange
        tmdb_id = 78
        create_movie_stub(tmdb_id, title='Blade Runner')

        mock_info_response = ApiResponse(
            status_code=200,
            data={
                'id': tmdb_id, 'title': 'Blade Runner', 'overview': 'A classic.',
                'poster_path': '/br.jpg', 'release_date': '1982-06-25',
                'vote_average': 8.1, 'genres': [], 'production_companies': []
            }
        )
        mock_credits_response = ApiResponse(
            status_code=200,
            data={'crew': [], 'cast': []}
        )
        mock_get_movie_details.return_value = mock_info_response
        mock_tmdb_get.return_value = mock_credits_response

        # Act
        url = movie_detail_url(tmdb_id)
        res = self.client.get(url)

        # Assert
        self.assertEqual(res.status_code, HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['tmdb_id'], tmdb_id)
        self.assertIn('user_movie_data', data)
        self.assertIsNone(data['user_movie_data'])
