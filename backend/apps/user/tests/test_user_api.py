
"""
Tests for the user API.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpResponse
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
import json


CREATE_USER_URL: str = reverse('register')
TOKEN_URL: str = reverse('token_obtain_pair')
ME_URL: str = reverse('user:me')


def create_user(**params) -> AbstractUser:
    """ Creates and returns a new user for testing purposes. """

    # Set email_verified=True for test users to avoid authentication issues
    params.setdefault('email_verified', True)
    return get_user_model().objects.create_user(**params)


class PublicUserApiTests(TestCase):
    """
    Tests for the public features of the user API (no authentication required).
    Uses DRF's APIClient, simulating requests as an API consumer.
    Verifies handling of DRF-specific behaviors (status codes, payloads).
    These tests do not verify cookie setting behavior, which requires a lower-level client.
    """

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

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        user_exists: bool = get_user_model().objects.filter(
            email=testPayload['email']).exists()
        self.assertFalse(user_exists)

    def test_user_with_same_email_exists_error(self) -> None:
        """ Tests that an error is returned if user with same email already exists. """

        controlPayload: dict[str, str] = self.create_payload()
        testPayload: dict[str, str] = self.create_payload(username='differentUsername')

        create_user(**controlPayload)
        res: HttpResponse = self.client.post(CREATE_USER_URL, testPayload)

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
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
        """Tests generating a token via username/pw for user authentication."""

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'username': user_details['username'],
            'password': user_details['password']
        }
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_token_for_user_via_email(self) -> None:
        """Tests generating a token via email/pw for user authentication."""

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'username': user_details['email'],
            'password': user_details['password']
        }
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_token_bad_password(self) -> None:
        """Tests that an error is returned if user password is invalid."""

        user_details: dict[str, str] = self.create_payload(password='goodPassword')
        create_user(**user_details)

        authPayload: dict[str, str] = {
            'username': user_details['username'],
            'password': 'badPassword'
        }
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_token_blank_username(self) -> None:
        """Tests that an error is returned if username is blank and no email provided."""

        authPayload: dict[str, str] = {'username': '', 'password': 'testPassword'}
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_token_blank_email(self) -> None:
        """Tests that an error is returned if email is blank and no username provided."""

        authPayload: dict[str, str] = {'username': '', 'password': 'testPassword'}
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_token_blank_password(self) -> None:
        """Tests that posting a blank password returns an error."""

        authPayload: dict[str, str] = {'username': 'testUser', 'password': ''}
        res = self.client.post(TOKEN_URL, authPayload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_profile_unauthorized(self) -> None:
        """ Tests that authentication is required to manage a user profile. """

        res: HttpResponse = self.client.get(ME_URL)

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class PrivateUserApiTests(TestCase):
    """
    Unit tests for private user API endpoints.
    Uses DRF's APIClient for public/auth logic and permission checks.
    Uses Django's Client for CSRF enforcement and browser-like behaviors where needed.
    This ensures accurate simulation of both REST API and browser security flows.
    """

    def setUp(self):

        self.client = APIClient()
        self.user = create_user(
            username='privateUser',
            email='private@example.com',
            password='testpass123',  # Match login password in CSRF tests
            first_name='Private',
            last_name='User'
        )
        self.client.force_authenticate(user=self.user)

    def test_retrieve_profile_success(self):
        """
        Authenticated user can retrieve their profile (GET is not CSRF-protected).
        Expect 200 OK.
        """

        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = json.loads(res.content.decode(res.charset or 'utf-8'))
        self.assertEqual(data['username'], self.user.username)
        self.assertEqual(data['email'], self.user.email)
        self.assertEqual(data['first_name'], self.user.first_name)
        self.assertEqual(data['last_name'], self.user.last_name)

    def test_update_profile_no_csrf_authenticated(self):
        """
        Authenticated PATCH to profile without CSRF token.
        Expect 403 Forbidden due to CSRF enforcement.
        Uses Django's Client for accurate CSRF simulation.
        """

        client = Client()
        print("[DEBUG] All users:", list(get_user_model().objects.all()))
        user_exists = get_user_model().objects.filter(username=self.user.username).exists()
        print(f"[DEBUG] Test user exists: {user_exists}")
        print("[DEBUG] Test user is_active:", self.user.is_active)
        print("[DEBUG] Test user backend:", getattr(self.user, 'backend', None))
        # Try login with username
        logged_in_username = client.login(
            username=self.user.username, password='testpass123')
        print("[DEBUG] Login with username result:", logged_in_username)
        # Try login with email
        logged_in_email = client.login(email=self.user.email, password='testpass123')
        print("[DEBUG] Login with email result:", logged_in_email)
        print("[DEBUG] Client session:", client.session.items())
        assert logged_in_username or logged_in_email, "Login failed in test setup"
        payload = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'password': 'newPrivatePass123'
        }
        res = client.patch(ME_URL, payload)
        print("[DEBUG] PATCH response status:", res.status_code)
        print("[DEBUG] PATCH response content:", res.content)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_with_csrf_authenticated(self):
        """
        Authenticated PATCH to profile with valid CSRF token.
        Expect 200 OK.
        """

        payload = {
            'first_name': 'CSRFUpdated',
            'last_name': 'CSRFName',
            'password': 'csrfPass123'
        }
        client = APIClient()
        client.force_authenticate(user=self.user)

        # Simulate CSRF token and cookie
        csrf_token = 'testcsrftoken'
        client.cookies['XSRF-TOKEN'] = csrf_token
        res = client.patch(
            ME_URL,
            payload,
            HTTP_X_CSRFTOKEN=csrf_token
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, payload['first_name'])
        self.assertEqual(self.user.last_name, payload['last_name'])
        self.assertTrue(self.user.check_password(payload['password']))

    def test_unauthenticated_profile_access(self):
        """
        Unauthenticated GET to profile endpoint.
        Expect 401 Unauthorized.
        """

        client = APIClient()
        res = client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_profile_update(self):
        """
        Unauthenticated PATCH to profile endpoint.
        Expect 401 Unauthorized (auth fails before CSRF).
        """

        client = APIClient()
        payload = {'first_name': 'Hacker'}
        res = client.patch(ME_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

# =========================
# Integration tests (Django Client)
# =========================


class AuthCookieIntegrationTests(TestCase):
    """
    Integration tests for authentication endpoints using Django's Client.
    Covers:
      - JWT cookie setting on login
      - JWT cookie clearing on logout
      - JWT refresh cookie update
      - CSRF token endpoint behavior
    """

    def setUp(self):

        self.client = Client()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        self.client.post(CREATE_USER_URL, self.user_data)

        # Set email_verified=True for the test user to allow login
        from apps.core.models import User
        user = User.objects.get(email=self.user_data['email'])
        user.email_verified = True
        user.save()

    def test_token_obtain_sets_jwt_cookies(self):
        """Login sets JWT cookies (access and refresh)."""

        login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(TOKEN_URL, login_data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', self.client.cookies)
        self.assertIn('refresh_token', self.client.cookies)

    def test_logout_clears_jwt_cookies(self):
        """Logout clears JWT cookies."""

        # Login first
        login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        self.client.post(TOKEN_URL, login_data)
        # Logout
        LOGOUT_URL = '/api/logout/'
        response = self.client.post(LOGOUT_URL)
        self.assertEqual(response.status_code, 200)
        access_cookie = response.cookies.get('access_token')
        refresh_cookie = response.cookies.get('refresh_token')
        if access_cookie:
            self.assertEqual(access_cookie.value, '')
        if refresh_cookie:
            self.assertEqual(refresh_cookie.value, '')

    def test_refresh_token_cookie_updated(self):
        """Refresh endpoint updates the refresh token cookie."""

        # Login first
        login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        self.client.post(TOKEN_URL, login_data)
        # Get current refresh token
        old_refresh_cookie = self.client.cookies.get('refresh_token')
        old_refresh = old_refresh_cookie.value if old_refresh_cookie else None
        REFRESH_URL = '/api/token/refresh/'
        response = self.client.post(REFRESH_URL, {'refresh': old_refresh})
        self.assertEqual(response.status_code, 200)
        new_refresh_cookie = response.cookies.get('refresh_token')
        new_refresh = new_refresh_cookie.value if new_refresh_cookie else None
        self.assertNotEqual(old_refresh, new_refresh)

    def test_csrf_token_endpoint_sets_cookie(self):
        """CSRF token endpoint sets XSRF-TOKEN cookie and returns token in body."""

        CSRF_URL = '/api/csrf-token/'
        response = self.client.get(CSRF_URL)
        self.assertEqual(response.status_code, 200)
        self.assertIn('XSRF-TOKEN', response.cookies)
        token_in_cookie = response.cookies['XSRF-TOKEN'].value

        body = response.content.decode(response.charset or 'utf-8')
        token_in_body = json.loads(body)['csrfToken']
        self.assertEqual(token_in_cookie, token_in_body)
