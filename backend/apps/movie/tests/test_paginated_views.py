"""
Tests for paginated movie API views.

These tests verify the API contract for endpoints that return paginated lists of movies,
such as 'Now Playing' and 'Upcoming'. They ensure that the responses have the correct
structure, including pagination details and the expected movie data fields,
which is crucial for the frontend to function correctly.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from core.models import Movie

# URLs for the paginated movie API endpoints
NOW_PLAYING_URL = reverse('movie:now-playing')
UPCOMING_URL = reverse('movie:upcoming')


class PaginatedMovieApiTests(TestCase):
    """Test the paginated movie API endpoints."""

    def setUp(self):
        """Set up the test client."""
        self.client = APIClient()

    def _create_mock_movie_list(self):
        """
        Creates a list of mock Movie objects with extra pass-through attributes.
        This simulates the data returned by the movie service layer.
        """
        movies = []
        for i in range(3):
            tmdb_id = 100 + i
            # Create a database stub, as the service layer would
            movie_stub = Movie.objects.create(
                tmdb_id=tmdb_id,
                title=f'Movie {i}',
                poster_path=f'/path{i}.jpg',
                release_date='2025-01-01'
            )
            # Attach the pass-through fields that the serializer expects
            setattr(movie_stub, 'vote_average', 8.0 + i / 10)
            setattr(movie_stub, 'overview', f'Overview for movie {i}.')
            movies.append(movie_stub)
        return movies

    @patch('apps.movie.views.get_nowPlaying_movies')
    def test_now_playing_endpoint_returns_correct_structure(self, mock_get_now_playing):
        """
        Verify the /now-playing/ endpoint returns the expected paginated structure
        and movie data, including pass-through fields.
        """
        # Arrange: Mock the service layer to return a predictable response
        mock_movies = self._create_mock_movie_list()
        mock_get_now_playing.return_value = {
            'results': mock_movies,
            'page': 1,
            'total_pages': 5,
            'total_results': len(mock_movies)
        }

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
        self.assertEqual(len(results), len(mock_movies))
        first_movie = results[0]
        self.assertEqual(first_movie['tmdb_id'], mock_movies[0].tmdb_id)
        self.assertEqual(first_movie['title'], mock_movies[0].title)
        self.assertIn('poster_path', first_movie)
        self.assertIn('release_date', first_movie)

        # Assert: Crucially, check for the pass-through field
        self.assertIn('vote_average', first_movie)
        self.assertEqual(first_movie['vote_average'], 8.0)

    @patch('apps.movie.views.get_upcoming_movies')
    def test_upcoming_endpoint_returns_correct_structure(self, mock_get_upcoming):
        """
        Verify the /upcoming/ endpoint returns the expected paginated structure
        and movie data.
        """
        # Arrange
        mock_movies = self._create_mock_movie_list()
        mock_get_upcoming.return_value = {
            'results': mock_movies,
            'page': 1,
            'total_pages': 3,
            'total_results': len(mock_movies)
        }

        # Act
        res = self.client.get(UPCOMING_URL, {'page': 1})

        # Assert
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIn('page', res.data)
        self.assertEqual(res.data['page'], 1)
        self.assertEqual(res.data['total_pages'], 3)
        self.assertEqual(len(res.data['results']), len(mock_movies))
        self.assertIn('vote_average', res.data['results'][0])
