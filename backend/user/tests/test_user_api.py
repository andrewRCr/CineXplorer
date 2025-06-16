"""
Tests for the user API.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpResponse
from django.test import TestCase
from django.urls import reverse

from rest_framework.test import APIClient
from rest_framework import status


CREATE_USER_URL: str = reverse('user:create')
TOKEN_URL: str = reverse('user:token')
ME_URL: str = reverse('user:me')


def create_user(**params) -> AbstractUser:
    """ Creates and returns a new user for testing purposes. """

    return get_user_model().objects.create_user(**params)


class PublicUserApiTests(TestCase):
    """ Tests for the public features of the user API (no auth required). """

    def setUp(self) -> None:

        self.client = APIClient()

    def create_payload(self,
                       username='testUser',
                       email='test@example.com',
                       password='testPass123') -> dict[str, str]:
        """ Creates and returns a dictionary of values for test user creation. """

        return {
            'username': username,
            'email': email,
            'password': password,
            'first_name': 'Test',
            'last_name': 'User'
        }

    def test_create_user_success(self) -> None:
        """ Tests creating a user; case: successful. """

        payload: dict[str, str] = self.create_payload()
        res: HttpResponse = self.client.post(CREATE_USER_URL, payload)

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user: AbstractUser = get_user_model().objects.get(username=payload['username'])
        self.assertTrue(user.check_password(payload['password']))
        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('password', contentStr)

    def test_user_with_username_exists_error(self) -> None:
        """ Tests that an error is returned if user with same username already exists. """

        controlPayload: dict[str, str] = self.create_payload()
        testPayload: dict[str, str] = self.create_payload(
            email='differentEmail@example.com')

        create_user(**controlPayload)
        res: HttpResponse = self.client.post(CREATE_USER_URL, testPayload)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user_exists: bool = get_user_model().objects.filter(
            email=testPayload['email']).exists()
        self.assertFalse(user_exists)

    def test_user_with_same_email_exists_error(self) -> None:
        """ Tests that an error is returned if user with same email already exists. """

        controlPayload: dict[str, str] = self.create_payload()
        testPayload: dict[str, str] = self.create_payload(username='differentUsername')

        create_user(**controlPayload)
        res: HttpResponse = self.client.post(CREATE_USER_URL, testPayload)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user_exists: bool = get_user_model().objects.filter(
            username=testPayload['username']).exists()
        self.assertFalse(user_exists)

    def test_password_too_short_error(self) -> None:
        """ Tests an error is returned if password < 5 characters. """

        payload: dict[str, str] = self.create_payload(password='pw')
        res: HttpResponse = self.client.post(CREATE_USER_URL, payload)

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user_exists: bool = get_user_model().objects.filter(
            username=payload['username']).exists()
        self.assertFalse(user_exists)

    def test_create_token_for_user_via_username(self) -> None:
        """ Tests generating a token via username/pw for user authentication. """

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'usernameOrEmail': user_details['username'],
            'password': user_details['password']
        }
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_token_for_user_via_email(self) -> None:
        """ Tests generating a token via email/pw for user authentication. """

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'usernameOrEmail': user_details['email'],
            'password': user_details['password']
        }
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_token_bad_password(self) -> None:
        """ Tests that an error is returned if user password is invalid. """

        user_details: dict[str, str] = self.create_payload(
            password='goodPassword')
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'username': user_details['username'],
            'password': 'badPassword'
        }
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_token_blank_username(self) -> None:
        """ Tests that an error is returned if username is blank and no email provided. """

        # not actually creating user; irrelevant to test
        authPayload: dict[str, str] = {'username': '', 'password': 'testPassword'}
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_token_blank_email(self) -> None:
        """ Tests that an error is returned if email is blank and no username provided. """

        # not actually creating user; irrelevant to test
        authPayload: dict[str, str] = {'email': '', 'password': 'testPassword'}
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_token_blank_password(self) -> None:
        """ Tests that posting a blank password returns an error. """

        # not actually creating user; irrelevant to test
        authPayload: dict[str, str] = {'username': 'testUser', 'password': ''}
        res: HttpResponse = self.client.post(TOKEN_URL, authPayload)

        contentStr: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('token', contentStr)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_profile_unauthorized(self) -> None:
        """ Tests that authentication is required to manage a user profile. """

        res: HttpResponse = self.client.get(ME_URL)

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class PrivateUserApiTests(TestCase):
    """ Tests for the private features of the user API (authentication required). """

    def setUp(self) -> None:

        self.user: AbstractUser = create_user(
            username='testUser',
            email='testPassword123',
            first_name='Test',
            last_name='User'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_retrieve_profile_success(self) -> None:
        """ Tests that retrieving a user profile when authenticated as that user is successful. """

        res: HttpResponse = self.client.get(ME_URL)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {  # type: ignore
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        })

    def test_post_me_not_allowed(self) -> None:
        """ Tests that POST is not allowed for the ME endpoint. """

        res: HttpResponse = self.client.post(ME_URL, {})

        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_update_user_profile(self) -> None:
        """ Test updating the user profile for the authenticated user. """

        payload: dict[str, str] = {
            'first_name': 'UpdatedFirstName',
            'password': 'newPassword123'
        }
        res: HttpResponse = self.client.patch(ME_URL, payload)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, payload['first_name'])
        self.assertTrue(self.user.check_password(payload['password']))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
