"""
Tests for core models.
"""

from django.contrib.auth.models import AbstractUser
from django.test import TestCase
from django.contrib.auth import get_user_model

from core import models
from user_movie_data.models import UserMovieData


class ModelTests(TestCase):
    """ Test core models. """

    def test_create_user_with_username_and_email_successful(self) -> None:
        """ Tests creating a user with both a username and email; case: success. """

        username: str = 'testUser'
        email: str = 'test@example.com'
        password: str = 'testpass123'

        user: AbstractUser = get_user_model().objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        self.assertEqual(user.username, username)
        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))

    def test_new_user_email_normalized(self) -> None:
        """ Tests newly created user's email is normalized. """

        sample_emails: list[list[str]] = [
            ['test1@EXAMPLE.com', 'test1@example.com'],
            ['Test2@Example.com', 'Test2@example.com'],
            ['TEST3@EXAMPLE.com', 'TEST3@example.com'],
            ['test4@example.COM', 'test4@example.com']
        ]

        i = 0
        for email, expected in sample_emails:
            user: AbstractUser = get_user_model(
            ).objects.create_user(f'testUser{i}', email)
            self.assertEqual(user.email, expected)
            i += 1

    def test_new_user_without_username_raises_error(self) -> None:
        """ Tests that creating a user without a username raises a ValueError. """

        with self.assertRaises(ValueError):
            get_user_model().objects.create_user('', 'testUser@example.com')

    def test_django_user_model_allows_empty_email_at_model_level(self) -> None:
        """Tests Django's default User model allows empty email at model layer.

        Note: Application policy enforces email requirement via allauth
        ACCOUNT_SIGNUP_FIELDS configuration. This test verifies model-level
        behavior only. Serializer/form-level validation is tested separately.
        """

        # Django's default User model allows empty email at model level
        user: AbstractUser = get_user_model().objects.create_user('testUser', '')
        self.assertIsNotNone(user.pk)  # Verify user was persisted
        self.assertEqual(user.username, 'testUser')
        self.assertEqual(user.email, '')  # Model layer allows empty email

    def test_create_superuser(self) -> None:
        """ Tests creating a new superuser. """

        user: AbstractUser = get_user_model().objects.create_superuser(
            'testUser',
            'testUser@example.com',
            'testPass123'
        )

        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)

    def test_create_default_user_movie_data(self) -> None:
        """ Tests that creating a default UserMovieData object for a user is successful. """

        user: AbstractUser = get_user_model().objects.create_user(
            'testUser',
            'testUser@example.com',
            'testPass123'
        )

        movie = models.Movie.objects.create(
            tmdb_id=78,
            title='Blade Runner',
            # ...other movie fields...
        )
        user_movie_data: UserMovieData = UserMovieData.objects.create(
            user=user,
            movie=movie,
            # ...other UserMovieData fields...
        )

        self.assertEqual(user_movie_data.user, user)
        self.assertEqual(user_movie_data.movie.tmdb_id, 78)
        self.assertEqual(str(user_movie_data), f'{user.username} - {movie.title}')

    def test_create_nondefault_user_movie_data(self) -> None:
        """ Tests that creating a non-default UserMovieData object for a user is successful. """

        user: AbstractUser = get_user_model().objects.create_user(
            'testUser',
            'testUser@example.com',
            'testPass123'
        )

        movie_review_str = 'Blade Runner is one of the greatest films of all time.'
        movie = models.Movie.objects.create(
            tmdb_id=78,
            title='Blade Runner',
            # ...other movie fields...
        )
        user_movie_data: UserMovieData = UserMovieData.objects.create(
            user=user,
            movie=movie,
            user_watched=True,
            user_on_watchlist=True,
            user_liked=True,
            user_rating=10,
            user_review=movie_review_str
        )

        self.assertTrue(user_movie_data.user_watched)
        self.assertTrue(user_movie_data.user_on_watchlist)
        self.assertTrue(user_movie_data.user_liked)
        self.assertEqual(user_movie_data.user_rating, 10)
        self.assertEqual(user_movie_data.user_review, movie_review_str)
