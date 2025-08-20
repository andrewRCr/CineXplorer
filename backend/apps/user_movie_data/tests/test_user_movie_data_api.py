"""
Tests for the user movie data API.

This module contains tests for the UserMovieData API endpoints, including authentication,
CRUD operations, and user-specific data filtering. All tests use static movie data for reliability.
"""


import random

from user_movie_data.serializers import UserMovieDataSerializer, UserMovieDataDetailSerializer
from core.models import UserMovieData
from core.models import User
from core.models import Movie
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status


# ======================================================================
# Constants & Helper Functions
# ======================================================================


USER_MOVIE_DATA_URL = reverse('user_movie_data:user-movie-data-list')


def find_by_movie_url(tmdb_id):
    """
    Returns the URL for finding UserMovieData by movie tmdb_id.
    """
    return reverse('user_movie_data:user-movie-data-find-by-movie-detail', args=[tmdb_id])


def detail_url(user_movie_data_id):
    """
    Returns the detail URL for a specific UserMovieData object.
    Args:
        user_movie_data_id (int): The ID of the UserMovieData object.
    Returns:
        str: The URL for the object's detail endpoint.
    """
    return reverse('user_movie_data:user-movie-data-detail', args=[user_movie_data_id])


def create_user_movie_data(user, **params):
    """
    Helper to create and return a sample UserMovieData object for testing.
    Uses static movie data for reliability and repeatability.
    Args:
        user (User): The user to associate with the data.
        **params: Optional fields to override defaults.
    Returns:
        UserMovieData: The created object.
    """
    # Create a Movie object for association
    # Ensure tmdb_id is unique for each test instance
    movie_defaults = {
        'title': params.get('title', 'Blade Runner'),
        'tmdb_id': params.get('tmdb_id', random.randint(10000, 99999)),
        # Add other required fields for Movie if needed
    }
    movie, _ = Movie.objects.get_or_create(**movie_defaults)

    user_movie_data_defaults = {
        'user_watched': params.get('user_watched', True),
        'user_on_watchlist': params.get('user_on_watchlist', True),
        'user_liked': params.get('user_liked', True),
        'user_rating': params.get('user_rating', 10),
        'user_review': params.get('user_review', 'This is a sample review.'),
        'movie': movie,
    }
    user_movie_data = UserMovieData.objects.create(user=user, **user_movie_data_defaults)
    return user_movie_data


def create_user(**params):
    """
    Helper to create and return a new user for testing.
    Args:
        **params: Fields for the user (username, email, password, etc).
    Returns:
        User: The created user object.
    """
    return User.objects.create_user(
        username=params.get('username'),
        email=params.get('email'),
        password=params.get('password'),
        first_name=params.get('first_name', ''),
        last_name=params.get('last_name', ''),
    )


# ======================================================================
# Test Classes
# ======================================================================


class PublicUserMovieDataAPITests(TestCase):
    """
    Tests for the public (unauthenticated) features of the user movie data API.
    Ensures endpoints are protected and require authentication.
    """

    def setUp(self):
        """
        Set up the test client for unauthenticated requests.
        """
        self.client = APIClient()

    def test_unauthenticated_cannot_access_list(self):
        """
        Test that unauthenticated requests to list user movie data are denied.
        """
        res = self.client.get(USER_MOVIE_DATA_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_create(self):
        """
        Test that unauthenticated requests to create user movie data are denied.
        """
        movie = Movie.objects.create(title='Chinatown', tmdb_id=829)
        payload = {
            'movie': movie.tmdb_id,
            'user_watched': True,
            'user_on_watchlist': False,
            'user_liked': True,
            'user_rating': 9,
            'user_review': 'Chinatown is one of my all-time favorites.',
        }
        res = self.client.post(USER_MOVIE_DATA_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_access_detail(self):
        """
        Test that unauthenticated requests to retrieve user movie data detail are denied.
        """
        user = create_user(username='otherUser',
                           email='otherUser@example.com', password='testPass123')
        user_movie_data = create_user_movie_data(user=user)
        url = detail_url(user_movie_data.id)
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_update(self):
        """
        Test that unauthenticated requests to update user movie data are denied.
        """
        user = create_user(username='otherUser',
                           email='otherUser@example.com', password='testPass123')
        user_movie_data = create_user_movie_data(user=user)
        url = detail_url(user_movie_data.id)
        payload = {'user_liked': False}
        res = self.client.patch(url, payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_cannot_delete(self):
        """
        Test that unauthenticated requests to delete user movie data are denied.
        """
        user = create_user(username='otherUser',
                           email='otherUser@example.com', password='testPass123')
        user_movie_data = create_user_movie_data(user=user)
        url = detail_url(user_movie_data.id)
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class PrivateUserMovieDataAPITests(TestCase):
    """
    Tests for the private (authenticated) features of the user movie data API.
    Ensures endpoints are accessible only to authenticated users.
    """

    def setUp(self):
        """
        Set up the test client for authenticated requests.
        """
        self.client = APIClient()
        self.user = create_user(username='testUser',
                                email='testUser@example.com', password='testPass123')
        self.client.force_authenticate(user=self.user)

    def test_full_update(self):
        movie = Movie.objects.create(title='Chinatown', tmdb_id=12346)
        user_movie_data = UserMovieData.objects.create(
            user=self.user,
            movie=movie,
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=8,
            user_review='Great movie!'
        )
        payload = {
            'user_watched': False,
            'user_on_watchlist': True,
            'user_liked': False,
            'user_rating': 5,
            'user_review': 'Updated review.'
        }
        url = detail_url(user_movie_data.id)
        res = self.client.put(url, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user_movie_data.refresh_from_db()
        self.assertEqual(user_movie_data.movie.tmdb_id, movie.tmdb_id)
        self.assertEqual(user_movie_data.user_watched, payload['user_watched'])
        self.assertEqual(user_movie_data.user_on_watchlist, payload['user_on_watchlist'])
        self.assertEqual(user_movie_data.user_liked, payload['user_liked'])
        self.assertEqual(user_movie_data.user_rating, payload['user_rating'])
        self.assertEqual(user_movie_data.user_review, payload['user_review'])

    def test_all_user_movie_data_limited_to_user(self):
        other_user = create_user(
            username='otherUser',
            email='otherUser@example.com',
            password='testPass123'
        )
        create_user_movie_data(user=other_user, tmdb_id=12347, title='Chinatown_12347')
        create_user_movie_data(user=self.user, tmdb_id=12348, title='Blade_Runner_12348')
        res = self.client.get(USER_MOVIE_DATA_URL)
        all_user_movie_data = UserMovieData.objects.filter(user=self.user)
        serializer = UserMovieDataSerializer(all_user_movie_data, many=True)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, serializer.data)

    def test_get_user_movie_data_detail(self):
        user_movie_data = create_user_movie_data(
            user=self.user, tmdb_id=12349, title='Chinatown_12349')
        url = detail_url(user_movie_data.id)
        res = self.client.get(url)
        serializer = UserMovieDataDetailSerializer(user_movie_data)
        self.assertEqual(res.data, serializer.data)

    def test_create_user_movie_data(self):
        # NOTE: In production, creation is via API and tmdb_id;
        # here we use ORM for direct DB linkage.
        movie = Movie.objects.create(title='Chinatown_12350', tmdb_id=12350)
        user_movie_data = UserMovieData.objects.create(
            user=self.user,
            movie=movie,
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=9,
            user_review='Chinatown is one of my all-time favorites.',
        )
        self.assertEqual(user_movie_data.movie.tmdb_id, movie.tmdb_id)
        self.assertEqual(user_movie_data.user_watched, True)
        self.assertEqual(user_movie_data.user_on_watchlist, False)
        self.assertEqual(user_movie_data.user_liked, True)
        self.assertEqual(user_movie_data.user_rating, 9)
        self.assertEqual(user_movie_data.user_review,
                         'Chinatown is one of my all-time favorites.')
        self.assertEqual(user_movie_data.user, self.user)

    def test_partial_update(self):
        user_movie_data = create_user_movie_data(
            user=self.user,
            tmdb_id=12351,
            title='Chinatown_12351',
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=10
        )
        payload = {'user_liked': False}
        url = detail_url(user_movie_data.id)
        res = self.client.patch(url, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user_movie_data.refresh_from_db()
        self.assertEqual(user_movie_data.user_liked, payload['user_liked'])
        self.assertEqual(user_movie_data.user_rating, 10)
        self.assertEqual(user_movie_data.user, self.user)

    def test_delete_other_users_user_movie_data_error(self):
        new_user = create_user(
            username='testUser2',
            email='testUser2@example.com',
            password='testPass123'
        )
        user_movie_data = create_user_movie_data(user=new_user)
        url = detail_url(user_movie_data.id)
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserMovieData.objects.filter(id=user_movie_data.id).exists())

    def test_update_movie_field_is_ignored(self):
        """
        Test that attempting to change the movie field on a UserMovieData object fails.
        The movie association should remain unchanged.
        """
        movie1 = Movie.objects.create(title='Chinatown_12352', tmdb_id=12352)
        user_movie_data = UserMovieData.objects.create(
            user=self.user,
            movie=movie1,
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=8,
            user_review='Great movie!'
        )
        movie2 = Movie.objects.create(title='Blade_Runner_12353', tmdb_id=12353)
        payload = {
            'movie': movie2.tmdb_id,
            'user_watched': False,
            'user_on_watchlist': True,
            'user_liked': False
        }
        url = detail_url(user_movie_data.id)
        res = self.client.put(url, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        user_movie_data.refresh_from_db()
        # Movie association should not be updatable by user; assert it remains unchanged
        self.assertEqual(user_movie_data.movie.tmdb_id, movie1.tmdb_id)
        self.assertEqual(user_movie_data.user_watched, payload['user_watched'])
        self.assertEqual(user_movie_data.user_on_watchlist,
                         payload['user_on_watchlist'])
        self.assertEqual(user_movie_data.user_liked, payload['user_liked'])
        self.assertEqual(user_movie_data.user, self.user)

    def test_update_user_returns_error(self):
        """
        Test that attempting to change the user field on a UserMovieData object fails.
        The user association should remain unchanged.
        """
        new_user = create_user(
            username='testUser2',
            email='testUser2@example.com',
            password='testPass123'
        )
        user_movie_data = create_user_movie_data(user=self.user)
        payload = {'user': new_user.id}
        url = detail_url(user_movie_data.id)
        self.client.patch(url, payload)
        user_movie_data.refresh_from_db()
        self.assertEqual(user_movie_data.user, self.user)

    def test_delete_user_movie_data(self):
        """
        Test deleting a UserMovieData object for the authenticated user.
        The object should be removed from the database.
        """
        user_movie_data = create_user_movie_data(user=self.user)
        url = detail_url(user_movie_data.id)
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserMovieData.objects.filter(id=user_movie_data.id).exists())

    def test_find_by_movie_tmdb_id(self):
        """
        Test retrieving UserMovieData by the movie's tmdb_id.
        """
        # Create a movie and associated user movie data
        movie1_tmdb_id = 9876
        movie1 = Movie.objects.create(title='Correct Movie', tmdb_id=movie1_tmdb_id)
        user_movie_data1 = UserMovieData.objects.create(
            user=self.user,
            movie=movie1,
            user_rating=9
        )

        # Create another movie and data that should NOT be found
        movie2_tmdb_id = 5432
        movie2 = Movie.objects.create(title='Wrong Movie', tmdb_id=movie2_tmdb_id)
        UserMovieData.objects.create(
            user=self.user,
            movie=movie2,
            user_rating=5
        )

        # Test finding the correct data
        url = find_by_movie_url(movie1_tmdb_id)
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        serializer = UserMovieDataDetailSerializer(user_movie_data1)
        self.assertEqual(res.data, serializer.data)

        # Test that a non-existent tmdb_id returns 404
        non_existent_tmdb_id = 1111
        url = find_by_movie_url(non_existent_tmdb_id)
        res = self.client.get(url)
