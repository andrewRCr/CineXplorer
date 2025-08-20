"""
Tests for paginated movie API views.

These tests verify the API contract for endpoints that return paginated lists of movies,
such as 'Now Playing' and 'Upcoming'. They ensure that the responses have the correct
structure, including pagination details and the expected movie data fields,
which is crucial for the frontend to function correctly.

These tests mock the external `requests.get` call to ensure they are fast,
reliable, and consistent with other integration tests in the application.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, Mock

# URLs for the paginated movie API endpoints
NOW_PLAYING_URL = reverse('movie:now-playing')
UPCOMING_URL = reverse('movie:upcoming')


class PaginatedMovieApiTests(TestCase):
    """Test the paginated movie API endpoints."""

    def setUp(self):
        """Set up the test client."""
        self.client = APIClient()

    def _create_mock_tmdb_response(self, total_pages):
        """
        Creates a mock TMDB API JSON response for paginated endpoints.
        """
        fake_tmdb_results = []
        for i in range(3):
            fake_tmdb_results.append({
                'id': 100 + i,
                'title': f'Movie {i}',
                'poster_path': f'/path{i}.jpg',
                'release_date': '2025-01-01',
                'vote_average': 8.0 + i / 10,
                'overview': f'Overview for movie {i}.'
            })

        return {
            'results': fake_tmdb_results,
            'page': 1,
            'total_pages': total_pages,
            'total_results': len(fake_tmdb_results)
        }

    @patch('requests.get')
    def test_now_playing_endpoint_returns_correct_structure(self, mock_requests_get):
        """
        Verify the /now-playing/ endpoint returns the expected paginated structure
        and movie data, including pass-through fields.
        """
        # Arrange: Mock the requests.get call to return a predictable TMDB response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self._create_mock_tmdb_response(total_pages=5)
        mock_requests_get.return_value = mock_response

        # Act: Call the API endpoint
        res = self.client.get(NOW_PLAYING_URL, {'page': 1})

        # Assert: Check the response status and structure
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('page', res.data)
        self.assertIn('total_pages', res.data)
        self.assertEqual(res.data['page'], 1)
        self.assertEqual(res.data['total_pages'], 5)

        # Assert: Check the structure of the movie data within the results
        results = res.data['results']
        self.assertEqual(len(results), 3)
        first_movie = results[0]
        self.assertEqual(first_movie['tmdb_id'], 100)
        self.assertEqual(first_movie['title'], 'Movie 0')
        self.assertIn('poster_path', first_movie)
        self.assertIn('release_date', first_movie)

        # Assert: Crucially, check for the pass-through field
        self.assertIn('vote_average', first_movie)
        self.assertEqual(first_movie['vote_average'], 8.0)

    @patch('requests.get')
    def test_upcoming_endpoint_returns_correct_structure(self, mock_requests_get):
        """
        Verify the /upcoming/ endpoint returns the expected paginated structure
        and movie data.
        """
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self._create_mock_tmdb_response(total_pages=3)
        mock_requests_get.return_value = mock_response

        # Act
        res = self.client.get(UPCOMING_URL, {'page': 1})

        # Assert
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('page', res.data)
        self.assertEqual(res.data['page'], 1)
        self.assertEqual(res.data['total_pages'], 3)
        self.assertEqual(len(res.data['results']), 3)
        self.assertIn('vote_average', res.data['results'][0])
