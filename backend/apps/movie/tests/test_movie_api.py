

"""
Tests for the movie API endpoints (detail, now playing, upcoming, search).
"""


from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, Mock

from core.models import User, Movie, UserMovieData

# =========================
# Helper Methods for Test Setup
# =========================


def movie_detail_url(tmdb_id):
    """Return the detail URL for a movie by TMDB ID."""
    return reverse('movie:movie-detail', args=[tmdb_id])


def create_user(**params):
    """Create a new user for testing."""
    return User.objects.create_user(**params)


def create_movie(**params):
    """Create a new movie for testing."""
    defaults = {
        'tmdb_id': params.get('tmdb_id', 78),  # Always provide tmdb_id
        'title': params.get('title', 'Blade Runner'),
        'release_date': params.get('release_date', None),
        'runtime': params.get('runtime', None),
        'original_language': params.get('original_language', 'en'),
        'overview': params.get('overview', ''),
        'poster_path': params.get('poster_path', ''),
    }
    defaults.update(params)
    return Movie.objects.create(**defaults)


def create_user_movie_data(user, movie, **params):
    """Create a UserMovieData object for testing."""
    defaults = {
        'user_watched': params.get('user_watched', True),
        'user_on_watchlist': params.get('user_on_watchlist', True),
        'user_liked': params.get('user_liked', True),
        'user_rating': params.get('user_rating', 10),
        'user_review': params.get('user_review', 'Sample review.'),
    }
    defaults.update(params)
    return UserMovieData.objects.create(user=user, movie=movie, **defaults)


NOW_PLAYING_URL = reverse('movie:now-playing')
UPCOMING_URL = reverse('movie:upcoming')
SEARCH_URL = reverse('movie:search')


class MovieApiTests(TestCase):
    """Tests for the movie API endpoints, including user_movie_data coverage."""

    def setUp(self):
        self.client = APIClient()
        self.user = create_user(
            username='testuser',
            email='testuser@example.com',
            password='testpass123'
        )
        # Movie objects are only created in tests, never in production.
        # Always provide a unique tmdb_id for test isolation and to satisfy DB constraints.
        self.movie = create_movie(tmdb_id=78, title='Blade Runner')
        self.user_movie_data = create_user_movie_data(
            user=self.user,
            movie=self.movie,
            user_watched=True,
            user_on_watchlist=True,
            user_liked=True,
            user_rating=9,
            user_review='Great movie!'
        )

    @patch('requests.get')
    def test_get_movie_detail_authenticated(self, mock_get):
        """
        Test retrieving movie details by TMDB ID with user_movie_data for authenticated user.
        """
        # Mock TMDB info response
        mock_info_response = Mock()
        mock_info_response.status_code = 200
        mock_info_response.json.return_value = {
            'id': self.movie.id,
            'title': self.movie.title,
            'release_date': self.movie.release_date,
            'runtime': self.movie.runtime,
            'original_language': self.movie.original_language,
            'overview': self.movie.overview,
            'poster_path': self.movie.poster_path,
            'genres': [],
            'production_companies': []
        }
        # Mock TMDB credits response
        mock_credits_response = Mock()
        mock_credits_response.status_code = 200
        mock_credits_response.json.return_value = {
            'crew': [],
            'cast': []
        }
        # Set side effects for requests.get
        mock_get.side_effect = [mock_info_response, mock_credits_response]

        self.client.force_authenticate(self.user)
        url = movie_detail_url(self.movie.id)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], self.movie.id)
        self.assertIn('title', res.data)
        self.assertIn('user_movie_data', res.data)
        user_data = res.data['user_movie_data']
        self.assertIsNotNone(user_data)
        self.assertEqual(user_data['user_rating'], 9)
        self.assertEqual(user_data['user_review'], 'Great movie!')

    @patch('requests.get')
    def test_get_movie_detail_unauthenticated(self, mock_get):
        """
        Test retrieving movie details by TMDB ID without user_movie_data for unauthenticated user.
        """
        # Mock TMDB info response
        mock_info_response = Mock()
        mock_info_response.status_code = 200
        mock_info_response.json.return_value = {
            'id': self.movie.id,
            'title': self.movie.title,
            'release_date': self.movie.release_date,
            'runtime': self.movie.runtime,
            'original_language': self.movie.original_language,
            'overview': self.movie.overview,
            'poster_path': self.movie.poster_path,
            'genres': [],
            'production_companies': []
        }
        # Mock TMDB credits response
        mock_credits_response = Mock()
        mock_credits_response.status_code = 200
        mock_credits_response.json.return_value = {
            'crew': [],
            'cast': []
        }
        # Set side effects for requests.get
        mock_get.side_effect = [mock_info_response, mock_credits_response]

        url = movie_detail_url(self.movie.id)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['id'], self.movie.id)
        self.assertIn('title', res.data)
        self.assertIn('user_movie_data', res.data)
        self.assertIsNone(res.data['user_movie_data'])

    def test_get_now_playing_movies_authenticated(self):
        """
        Test retrieving now playing movies (paginated) with user_movie_data for authenticated user.
        """
        self.client.force_authenticate(self.user)
        res = self.client.get(NOW_PLAYING_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            if movie['id'] == self.movie.id:
                self.assertIsNotNone(movie['user_movie_data'])
                self.assertEqual(movie['user_movie_data']['user_rating'], 9)
            else:
                pass

    def test_get_now_playing_movies_unauthenticated(self):
        """
        Test retrieving now playing movies (paginated) without user_movie_data for
        unauthenticated user.
        """
        res = self.client.get(NOW_PLAYING_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            self.assertIsNone(movie['user_movie_data'])

    def test_get_upcoming_movies_authenticated(self):
        """
        Test retrieving upcoming movies (paginated) with user_movie_data for authenticated user.
        """
        self.client.force_authenticate(self.user)
        res = self.client.get(UPCOMING_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            if movie['id'] == self.movie.id:
                self.assertIsNotNone(movie['user_movie_data'])
            else:
                pass

    def test_get_upcoming_movies_unauthenticated(self):
        """
        Test retrieving upcoming movies (paginated) without user_movie_data for
        unauthenticated user.
        """
        res = self.client.get(UPCOMING_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            self.assertIsNone(movie['user_movie_data'])

    def test_search_movies_authenticated(self):
        """
        Test searching for movies by query string (paginated) with user_movie_data for
        authenticated user.
        """
        self.client.force_authenticate(self.user)
        params = {'query': 'Blade Runner'}
        res = self.client.get(SEARCH_URL, params)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            if movie['id'] == self.movie.id:
                self.assertIsNotNone(movie['user_movie_data'])
            else:
                pass

    def test_search_movies_unauthenticated(self):
        """
        Test searching for movies by query string (paginated) without user_movie_data for
        unauthenticated user.
        """
        params = {'query': 'Blade Runner'}
        res = self.client.get(SEARCH_URL, params)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('results', res.data)
        self.assertIsInstance(res.data['results'], list)
        for movie in res.data['results']:
            self.assertIn('user_movie_data', movie)
            self.assertIsNone(movie['user_movie_data'])
