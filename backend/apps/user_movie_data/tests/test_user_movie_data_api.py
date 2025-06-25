"""
Tests for the user movie data API.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpResponse
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APIClient

from core.models import UserMovieData
from user_movie_data.serializers import UserMovieDataSerializer, UserMovieDataDetailSerializer

import tmdbsimple as tmdb
tmdb.API_KEY = settings.TMDB_API_KEY


USER_MOVIE_DATA_URL: str = reverse('user_movie_data:user-movie-data-list')


def detail_url(user_movie_data_id) -> str:
    """ Creates and returns a user movie data detail URL. """

    return reverse('user_movie_data:user-movie-data-detail', args=[user_movie_data_id])


def create_user_movie_data(user, **params) -> UserMovieData:
    """ Creates and returns a sample UserMovieData object for testing. """

    # use default (78 = Blade Runner) if none specified
    tmdb_movie_id: int = getattr(params, 'tmdb_id', 78)
    tmdb_movie = tmdb.Movies(tmdb_movie_id)
    tmdb_movie.info()
    tmdb_movie_title = tmdb_movie.title  # type: ignore

    defaults = {
        'tmdb_id': tmdb_movie.id,
        'title': tmdb_movie_title,
        'user_watched': True,
        'user_on_watchlist': True,
        'user_liked': True,
        'user_rating': 10,
        'user_review': f'This is a sample review for {tmdb_movie_title}',
    }
    defaults.update(params)

    user_movie_data: UserMovieData = UserMovieData.objects.create(user=user, **defaults)
    return user_movie_data


def create_user(**params) -> AbstractUser:
    """ Creates and returns a new user for testing. """

    return get_user_model().objects.create_user(**params)


class PublicUserMovieDataAPITests(TestCase):
    """ Tests for the public features of the user movie data API (no auth required). """

    def setUp(self) -> None:
        self.client = APIClient()

    def test_auth_required(self) -> None:
        """ Tests that auth is required to call the API. """

        res: HttpResponse = self.client.get(USER_MOVIE_DATA_URL)

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class PrivateUserMovieDataAPITests(TestCase):
    """ Tests for the private features of the user movie data API (auth required). """

    def setUp(self) -> None:
        self.client = APIClient()
        self.user: AbstractUser = create_user(
            username='testUser',
            email='testUser@example.com',
            password='testPass123'
        )
        self.client.force_authenticate(self.user)

    def test_retrieve_all_user_movie_data(self) -> None:
        """ Tests retrieving all of a user's UserMovieData objects. """

        create_user_movie_data(user=self.user)
        create_user_movie_data(user=self.user)

        res: HttpResponse = self.client.get(USER_MOVIE_DATA_URL)

        # order list by most recent
        all_user_movie_data = UserMovieData.objects.all().order_by('-id')
        serializer = UserMovieDataSerializer(all_user_movie_data, many=True)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, serializer.data)  # type: ignore

    def test_all_user_movie_data_limited_to_user(self) -> None:
        """ Tests that the retrieved list is limited to the authenticated user's data only. """

        other_user: AbstractUser = create_user(
            username='otherUser',
            email='otherUser@example.com',
            password='testPass123'
        )

        create_user_movie_data(user=other_user)
        create_user_movie_data(user=self.user)

        res: HttpResponse = self.client.get(USER_MOVIE_DATA_URL)

        # filter list to only authenticated user
        all_user_movie_data = UserMovieData.objects.filter(user=self.user)
        serializer = UserMovieDataSerializer(all_user_movie_data, many=True)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, serializer.data)  # type: ignore

    def test_get_user_movie_data_detail(self) -> None:
        """ Tests retrieving the details of a specific UserMovieData object of the user's. """

        user_movie_data: UserMovieData = create_user_movie_data(user=self.user)

        url: str = detail_url(user_movie_data.id)  # type: ignore
        res: HttpResponse = self.client.get(url)

        serializer = UserMovieDataDetailSerializer(user_movie_data)
        self.assertEqual(res.data, serializer.data)  # type: ignore

    def test_create_user_movie_data(self) -> None:
        """ Tests creating user movie data. """

        tmdb_movie_id = 829  # Chinatown
        tmdb_movie = tmdb.Movies(tmdb_movie_id)
        tmdb_movie.info()
        tmdb_movie_title = tmdb_movie.title  # type: ignore

        payload = {
            'tmdb_id': tmdb_movie_id,
            'title': tmdb_movie_title,
            'user_watched': True,
            'user_on_watchlist': False,
            'user_liked': True,
            'user_rating': 9,
            'user_review': f'{tmdb_movie_title} is one of my all-time favorites.',
        }

        # POST: /api/user-movie-data/user-movie-data
        res: HttpResponse = self.client.post(USER_MOVIE_DATA_URL, payload)

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user_movie_data = UserMovieData.objects.get(id=res.data['id'])  # type: ignore
        self.assertEqual(user_movie_data.title, 'Chinatown')
        for key, value in payload.items():
            self.assertEqual(getattr(user_movie_data, key), value)
        self.assertEqual(user_movie_data.user, self.user)

    def test_partial_update(self) -> None:
        """ Tests a partial update (PATCH) of a UserMovieData object. """

        original_user_rating = 10

        tmdb_movie_id = 829  # Chinatown
        tmdb_movie = tmdb.Movies(tmdb_movie_id)
        tmdb_movie.info()
        tmdb_movie_title: str = tmdb_movie.title  # type: ignore

        user_movie_data: UserMovieData = create_user_movie_data(
            user=self.user,
            tmdb_id=829,
            title=tmdb_movie_title,
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=original_user_rating
        )

        # change user_liked field *only*
        payload: dict[str, bool] = {'user_liked': False}
        url: str = detail_url(user_movie_data.id)  # type: ignore
        res: HttpResponse = self.client.patch(url, payload)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user_movie_data.refresh_from_db()
        self.assertEqual(user_movie_data.user_liked, payload['user_liked'])
        self.assertEqual(user_movie_data.user_rating, original_user_rating)
        self.assertEqual(user_movie_data.user, self.user)

    def test_full_update(self) -> None:
        """ Tests a full update (PUT) of a UserMovieData object. """

        tmdb_movie_id = 829  # Chinatown
        tmdb_movie = tmdb.Movies(tmdb_movie_id)
        tmdb_movie.info()
        tmdb_movie_title: str = tmdb_movie.title  # type: ignore

        user_movie_data: UserMovieData = create_user_movie_data(
            user=self.user,
            tmdb_id=829,
            title=tmdb_movie_title,
            user_watched=True,
            user_on_watchlist=False,
            user_liked=True,
            user_rating=8,
            user_review='Great movie!'
        )

        new_tmdb_movie_id = 78  # Blade Runner
        new_tmdb_movie = tmdb.Movies(new_tmdb_movie_id)
        new_tmdb_movie.info()
        new_tmdb_movie_title: str = new_tmdb_movie.title  # type: ignore

        # change ALL fields (rating, review will default to False and empty str)
        payload = {
            'tmdb_id': new_tmdb_movie_id,
            'title': new_tmdb_movie_title,
            'user_watched': False,
            'user_on_watchlist': True,
            'user_liked': False
        }

        url: str = detail_url(user_movie_data.id)  # type: ignore
        res: HttpResponse = self.client.put(url, payload)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user_movie_data.refresh_from_db()
        for key, value in payload.items():
            self.assertEqual(getattr(user_movie_data, key), value)
        self.assertEqual(user_movie_data.user, self.user)

    def test_update_user_returns_error(self):
        """ Tests that changing the UserMovieData's user field results in an error. """

        new_user: AbstractUser = create_user(
            username='testUser2',
            email='testUser2@example.com',
            password='testPass123'
        )
        user_movie_data: UserMovieData = create_user_movie_data(user=self.user)

        payload: dict[str, int] = {'user': new_user.id}  # type: ignore
        url: str = detail_url(user_movie_data.id)  # type: ignore
        self.client.patch(url, payload)

        user_movie_data.refresh_from_db()
        self.assertEqual(user_movie_data.user, self.user)

    def test_delete_user_movie_data(self) -> None:
        """ Tests deleting a UserMovieData object. """

        user_movie_data: UserMovieData = create_user_movie_data(self.user)

        url: str = detail_url(user_movie_data.id)  # type: ignore
        res: HttpResponse = self.client.delete(url)

        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserMovieData.objects.filter(
            id=user_movie_data.id).exists())  # type: ignore

    def test_delete_other_users_user_movie_data_error(self) -> None:
        """ Tests that trying to delete another user's UserMovieData object yields an error. """

        new_user: AbstractUser = create_user(
            username='testUser2',
            email='testUser2@example.com',
            password='testPass123'
        )
        user_movie_data: UserMovieData = create_user_movie_data(user=new_user)

        url: str = detail_url(user_movie_data.id)  # type: ignore
        res: HttpResponse = self.client.delete(url)

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserMovieData.objects.filter(
            id=user_movie_data.id).exists())  # type: ignore
