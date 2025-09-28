"""
Tests for paginated movie API views.

These tests verify the API contract for endpoints that return paginated lists of movies,
such as 'Now Playing' and 'Upcoming'. They ensure that the responses have the correct
structure, including pagination details and the expected movie data fields,
which is crucial for the frontend to function correctly.

These tests mock the external `requests.get` call to ensure they are fast,
reliable, and consistent with other integration tests in the application.
"""
from django.test import TestCase, Client
from rest_framework import status
from unittest.mock import patch, MagicMock

from core.types.api_types import TMDBResponseData

# Django Ninja API URLs for the paginated movie endpoints
NOW_PLAYING_URL = '/api/movies/now-playing'
UPCOMING_URL = '/api/movies/upcoming'


class PaginatedMovieApiTests(TestCase):
    """Test the paginated movie API endpoints."""

    def setUp(self):
        """Set up the Django test client."""
        self.client = Client()

    def _create_mock_tmdb_response(self, total_pages: int) -> TMDBResponseData:
        """
        Creates a mock TMDB API JSON response for paginated endpoints.
        """
        fake_tmdb_results: list[dict[str, object]] = []
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

    @patch('movie.services.movie_service.tmdb_client.get_now_playing_movies')
    def test_now_playing_endpoint_returns_correct_structure(
        self, mock_get_now_playing: MagicMock
    ) -> None:
        """
        Verify the /now-playing/ endpoint returns the expected paginated structure
        and movie data, including pass-through fields.
        """
        # Arrange: Mock the TMDB client call to return a predictable TMDB response
        from core.services.api_response import ApiResponse
        mock_data: TMDBResponseData = self._create_mock_tmdb_response(total_pages=5)
        mock_response = ApiResponse(
            status_code=200,
            data=mock_data
        )
        mock_get_now_playing.return_value = mock_response

        # Act: Call the API endpoint
        res = self.client.get(NOW_PLAYING_URL, {'page': 1})

        # Assert: Check the response status and structure
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('results', data)
        self.assertIn('page', data)
        self.assertIn('total_pages', data)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['total_pages'], 5)

        # Assert: Check the structure of the movie data within the results
        results = data['results']
        self.assertEqual(len(results), 3)
        first_movie = results[0]
        self.assertEqual(first_movie['tmdb_id'], 100)
        self.assertEqual(first_movie['title'], 'Movie 0')
        self.assertIn('poster_path', first_movie)
        self.assertIn('release_date', first_movie)

        # Assert: Crucially, check for the pass-through field
        self.assertIn('vote_average', first_movie)
        self.assertEqual(first_movie['vote_average'], 8.0)

    @patch('movie.services.movie_service.tmdb_client.get')
    def test_upcoming_endpoint_returns_correct_structure(
        self, mock_tmdb_get: MagicMock
    ) -> None:
        """
        Verify the /upcoming/ endpoint returns the expected paginated structure
        and movie data.
        """
        # Arrange
        from core.services.api_response import ApiResponse
        mock_data: TMDBResponseData = self._create_mock_tmdb_response(total_pages=3)
        mock_response = ApiResponse(
            status_code=200,
            data=mock_data
        )
        mock_tmdb_get.return_value = mock_response

        # Act
        res = self.client.get(UPCOMING_URL, {'page': 1})

        # Assert
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('results', data)
        self.assertIn('page', data)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['total_pages'], 3)
        self.assertEqual(len(data['results']), 3)
        self.assertIn('vote_average', data['results'][0])
