"""
Integration tests for the movie API endpoints.

These tests verify the behavior of the movie API, which relies on external
calls to the The Movie Database (TMDB) API. The external calls are mocked
to ensure tests are fast, reliable, and independent of the external service.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, Mock

from core.models import User, Movie, UserMovieData

# =========================
# URLs
# =========================
NOW_PLAYING_URL = reverse('movie:now-playing')
UPCOMING_URL = reverse('movie:upcoming')
SEARCH_URL = reverse('movie:search')


def movie_detail_url(tmdb_id):
    """Return the detail URL for a movie by TMDB ID."""
    return reverse('movie:movie-detail', args=[tmdb_id])


# =========================
# Test Setup Helper Methods
# =========================


def create_user(**params):
    """Create and return a new user for testing."""
    return User.objects.create_user(**params)


def create_movie_stub(**params):
    """
    Create and return a new Movie stub object.
    This mimics the behavior of the service layer, which creates a local stub
    for a movie fetched from the TMDB API.
    """
    tmdb_id = params.pop('tmdb_id')  # tmdb_id is required
    defaults = {
        'title': 'Default Movie Title',
        'poster_path': '/default.jpg',
        'release_date': '2025-01-01',
    }
    defaults.update(params)
    return Movie.objects.create(tmdb_id=tmdb_id, **defaults)


def attach_pass_through_data(movie_instance, **extra_data):
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
    """Tests for the movie API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass123'
        )

    def _test_paginated_endpoint_contract(self, mock_requests_get, url, params=None):
        """
        Generic helper to test the contract of any paginated movie endpoint.
        It mocks the external `requests.get` call and verifies the response structure.
        """
        # Arrange: Define a standard mock TMDB API response
        tmdb_payload = {
            'results': [{'id': 101, 'title': 'Test Movie'}],
            'page': 1,
            'total_pages': 5,
            'total_results': 1
        }
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = tmdb_payload
        mock_requests_get.return_value = mock_response

        # Act: Call the internal API endpoint
        if params is None:
            params = {}
        res = self.client.get(url, params)

        # Assert: Check the response status and overall structure
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('page', res.data)
        self.assertIn('total_pages', res.data)
        self.assertEqual(res.data['page'], 1)
        self.assertEqual(res.data['total_pages'], 5)
        self.assertEqual(len(res.data['results']), 1)

    @patch('requests.get')
    def test_now_playing_api_contract(self, mock_requests_get):
        """Verify the /now-playing/ endpoint returns the correct paginated structure."""
        self._test_paginated_endpoint_contract(mock_requests_get, NOW_PLAYING_URL)

    @patch('requests.get')
    def test_upcoming_api_contract(self, mock_requests_get):
        """Verify the /upcoming/ endpoint returns the correct paginated structure."""
        self._test_paginated_endpoint_contract(mock_requests_get, UPCOMING_URL)

    @patch('requests.get')
    def test_search_api_contract(self, mock_requests_get):
        """Verify the /search/ endpoint returns the correct paginated structure."""
        self._test_paginated_endpoint_contract(
            mock_requests_get, SEARCH_URL, {'query': 'test'}
        )

    @patch('requests.get')
    def test_get_movie_detail_authenticated(self, mock_requests_get):
        """
        Test retrieving movie details with user_movie_data for an authenticated user.
        """
        # Arrange: Create the local movie stub and user data
        movie_stub = create_movie_stub(tmdb_id=78, title='Blade Runner')
        UserMovieData.objects.create(
            user=self.user,
            movie=movie_stub,
            user_rating=9,
            user_review='Great movie!'
        )

        # Arrange: Mock the external API responses for movie info and credits
        mock_info_response = Mock()
        mock_info_response.status_code = 200
        mock_info_response.json.return_value = {
            'id': 78, 'title': 'Blade Runner', 'overview': 'A classic.',
            'poster_path': '/br.jpg', 'release_date': '1982-06-25',
            'vote_average': 8.1, 'genres': [], 'production_companies': []
        }

        mock_credits_response = Mock()
        mock_credits_response.status_code = 200
        mock_credits_response.json.return_value = {'crew': [], 'cast': []}

        # Set the side_effect to return different responses for each call
        mock_requests_get.side_effect = [mock_info_response, mock_credits_response]

        # Act
        self.client.force_authenticate(self.user)
        url = movie_detail_url(movie_stub.tmdb_id)
        res = self.client.get(url)

        # Assert
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['tmdb_id'], movie_stub.tmdb_id)
        self.assertIn('title', res.data)
        self.assertIn('user_movie_data', res.data)
        user_data = res.data['user_movie_data']
        self.assertIsNotNone(user_data)
        self.assertEqual(user_data['user_rating'], 9)
        self.assertEqual(user_data['user_review'], 'Great movie!')

    @patch('requests.get')
    def test_get_movie_detail_unauthenticated(self, mock_requests_get):
        """
        Test retrieving movie details without user_movie_data for an unauthenticated user.
        """
        # Arrange
        tmdb_id = 78
        create_movie_stub(tmdb_id=tmdb_id, title='Blade Runner')

        mock_info_response = Mock()
        mock_info_response.status_code = 200
        mock_info_response.json.return_value = {
            'id': tmdb_id, 'title': 'Blade Runner', 'overview': 'A classic.',
            'poster_path': '/br.jpg', 'release_date': '1982-06-25',
            'vote_average': 8.1, 'genres': [], 'production_companies': []
        }
        mock_credits_response = Mock()
        mock_credits_response.status_code = 200
        mock_credits_response.json.return_value = {'crew': [], 'cast': []}
        mock_requests_get.side_effect = [mock_info_response, mock_credits_response]

        # Act
        url = movie_detail_url(tmdb_id)
        res = self.client.get(url)

        # Assert
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['tmdb_id'], tmdb_id)
        self.assertIn('user_movie_data', res.data)
        self.assertIsNone(res.data['user_movie_data'])
