
"""
Tests for the user API.
"""
import json

from allauth.account.models import EmailAddress
from core.tests.test_helpers import create_user, json_post
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpResponse
from django.test import Client, TestCase

# Django Ninja uses standard HTTP status codes
# We use Django's test Client (not DRF's APIClient) for all API testing
HTTP_200_OK = 200
HTTP_201_CREATED = 201
HTTP_204_NO_CONTENT = 204
HTTP_400_BAD_REQUEST = 400
HTTP_401_UNAUTHORIZED = 401
HTTP_403_FORBIDDEN = 403
HTTP_409_CONFLICT = 409
HTTP_422_UNPROCESSABLE_ENTITY = 422

# Django Ninja endpoints (use direct paths, not reverse() for Django Ninja)
CREATE_USER_URL: str = '/api/register/'
TOKEN_URL: str = '/api/token/'
ME_URL: str = '/api/profile/'


class PublicUserApiTests(TestCase):
    """
    Tests for the public features of the user API (no authentication required).
    Uses Django's test Client to simulate API requests.
    Tests Django Ninja endpoint behavior (validation, authentication, responses).
    Cookie-specific behavior is tested separately in AuthCookieIntegrationTests.
    """

    def setUp(self) -> None:

        self.client = Client()

    def create_payload(
        self,
        username: str = 'testUser',
        email: str = 'test@example.com',
        password: str = 'testPass123'
    ) -> dict[str, str]:
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
        res = json_post(self.client, CREATE_USER_URL, payload)

        self.assertEqual(res.status_code, HTTP_201_CREATED)
        user: AbstractUser = get_user_model().objects.get(username=payload['username'])  # type: ignore[assignment]  # _UserModel is compatible with AbstractUser
        self.assertTrue(user.check_password(payload['password']))
        content_str: str = res.content.decode(res.charset or 'utf-8')
        self.assertNotIn('password', content_str)

    def test_user_with_username_exists_error(self) -> None:
        """ Tests that an error is returned if user with same username already exists. """

        control_payload: dict[str, str] = self.create_payload()
        test_payload: dict[str, str] = self.create_payload(
            email='differentEmail@example.com')

        create_user(**control_payload)  # type: ignore[arg-type]  # dict[str, str] matches UserParams structure
        res = json_post(self.client, CREATE_USER_URL, test_payload)

        self.assertEqual(res.status_code, HTTP_409_CONFLICT)
        user_exists: bool = get_user_model().objects.filter(
            email=test_payload['email']).exists()
        self.assertFalse(user_exists)

    def test_user_with_same_email_exists_error(self) -> None:
        """ Tests that an error is returned if user with same email already exists. """

        control_payload: dict[str, str] = self.create_payload()
        test_payload: dict[str, str] = self.create_payload(username='differentUsername')

        create_user(**control_payload)  # type: ignore[arg-type]  # dict[str, str] matches UserParams structure
        res = json_post(self.client, CREATE_USER_URL, test_payload)

        self.assertEqual(res.status_code, HTTP_409_CONFLICT)
        user_exists: bool = get_user_model().objects.filter(
            username=test_payload['username']).exists()
        self.assertFalse(user_exists)

    def test_password_too_short_error(self) -> None:
        """ Tests an error is returned if password < 5 characters. """

        payload: dict[str, str] = self.create_payload(password='pw')
        res = json_post(self.client, CREATE_USER_URL, payload)

        self.assertEqual(res.status_code, HTTP_422_UNPROCESSABLE_ENTITY)
        user_exists: bool = get_user_model().objects.filter(
            username=payload['username']).exists()
        self.assertFalse(user_exists)

    def test_create_token_for_user_via_username(self) -> None:
        """Tests generating a token via username/pw for user authentication."""

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)  # type: ignore[arg-type]  # dict[str, str] matches UserParams structure, creates verified email

        auth_payload: dict[str, str] = {
            'login': user_details['username'],
            'password': user_details['password']
        }
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_200_OK)

    def test_create_token_for_user_via_email(self) -> None:
        """Tests generating a token via email/pw for user authentication."""

        user_details: dict[str, str] = self.create_payload()
        create_user(**user_details)  # type: ignore[arg-type]  # dict[str, str] matches UserParams structure, creates verified email

        auth_payload: dict[str, str] = {
            'login': user_details['email'],
            'password': user_details['password']
        }
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_200_OK)

    def test_create_token_bad_password(self) -> None:
        """Tests that an error is returned if user password is invalid."""

        user_details: dict[str, str] = self.create_payload(password='goodPassword')
        create_user(**user_details)  # type: ignore[arg-type]  # dict[str, str] matches UserParams structure, creates verified email

        auth_payload: dict[str, str] = {
            'login': user_details['username'],
            'password': 'badPassword'
        }
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_401_UNAUTHORIZED)

    def test_create_token_blank_username(self) -> None:
        """Tests that an error is returned if username is blank and no email provided."""

        auth_payload: dict[str, str] = {'login': '', 'password': 'testPassword'}
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_400_BAD_REQUEST)

    def test_create_token_blank_email(self) -> None:
        """Tests that an error is returned if email is blank and no username provided."""

        auth_payload: dict[str, str] = {'login': '', 'password': 'testPassword'}
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_400_BAD_REQUEST)

    def test_create_token_blank_password(self) -> None:
        """Tests that posting a blank password returns an error."""

        auth_payload: dict[str, str] = {'login': 'testUser', 'password': ''}
        res = json_post(self.client, TOKEN_URL, auth_payload)
        self.assertEqual(res.status_code, HTTP_400_BAD_REQUEST)

    def test_retrieve_profile_unauthorized(self) -> None:
        """ Tests that authentication is required to manage a user profile. """

        res: HttpResponse = self.client.get(ME_URL)  # type: ignore[assignment]  # Django test client returns _MonkeyPatchedWSGIResponse

        self.assertEqual(res.status_code, HTTP_401_UNAUTHORIZED)


class PrivateUserApiTests(TestCase):
    """
    Unit tests for private user API endpoints.
    Uses Django's test Client for authenticated API requests.
    Tests JWT cookie authentication and CSRF protection for Django Ninja endpoints.
    Simulates browser-like behavior for realistic security flow testing.
    """

    def setUp(self):

        self.client = Client()
        self.user = create_user(
            username='privateUser',
            email='private@example.com',
            password='testpass123',  # Match login password in CSRF tests
            first_name='Private',
            last_name='User'
        )  # create_user() creates verified email by default

        # Authenticate via JWT token endpoint to set cookies
        auth_payload = {
            'login': 'privateUser',
            'password': 'testpass123'
        }
        json_post(self.client, TOKEN_URL, auth_payload)

    def test_retrieve_profile_success(self):
        """
        Authenticated user can retrieve their profile (GET is not CSRF-protected).
        Expect 200 OK.
        """

        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, HTTP_200_OK)
        data = json.loads(res.content.decode(res.charset or 'utf-8'))
        self.assertEqual(data['username'], self.user.username)
        self.assertEqual(data['email'], self.user.email)
        self.assertEqual(data['first_name'], self.user.first_name)
        self.assertEqual(data['last_name'], self.user.last_name)

    def test_update_profile_no_csrf_authenticated(self):
        """
        Authenticated PATCH via Django Client against a JWT-cookie API will
        result in 401 Unauthorized (missing JWT). Django's session
        authentication doesn't provide the JWT cookie needed by the API.
        """

        client = Client()
        # Login via Django's session auth (not JWT)
        logged_in = client.login(username=self.user.username, password='testpass123')
        assert logged_in, "Login failed in test setup"

        payload = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'password': 'newPrivatePass123'
        }
        # This will fail with 401 because Django session auth doesn't provide JWT cookie
        res = client.patch(ME_URL, json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, HTTP_401_UNAUTHORIZED)

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
        client = Client()

        # Authenticate via JWT token endpoint to set cookies
        auth_payload = {
            'login': 'privateUser',
            'password': 'testpass123'
        }
        json_post(client, TOKEN_URL, auth_payload)

        # Simulate CSRF token and cookie
        csrf_token = 'testcsrftoken'
        client.cookies['XSRF-TOKEN'] = csrf_token
        res = client.patch(
            ME_URL,
            json.dumps(payload),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token
        )
        self.assertEqual(res.status_code, HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, payload['first_name'])
        self.assertEqual(self.user.last_name, payload['last_name'])
        self.assertTrue(self.user.check_password(payload['password']))

    def test_unauthenticated_profile_access(self):
        """
        Unauthenticated GET to profile endpoint.
        Expect 401 Unauthorized.
        """

        client = Client()
        res = client.get(ME_URL)
        self.assertEqual(res.status_code, HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_profile_update(self):
        """
        Unauthenticated PATCH to profile endpoint.
        Expect 401 Unauthorized (auth fails before CSRF).
        """

        client = Client()
        payload = {'first_name': 'Hacker'}
        res = client.patch(ME_URL, json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, HTTP_401_UNAUTHORIZED)

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
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        json_post(self.client, CREATE_USER_URL, self.user_data)

        # Mark email as verified for the test user to allow login
        # Use get_or_create + update to support --keepdb flag (reusing test database)
        user = get_user_model().objects.get(email=self.user_data['email'])
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,  # type: ignore[attr-defined]  # _UserModel has email attribute at runtime
            defaults={'verified': True, 'primary': True}
        )
        # If EmailAddress already existed (from previous test run), ensure it's verified
        if not created and not email_address.verified:
            email_address.verified = True
            email_address.save()

    def test_token_obtain_sets_jwt_cookies(self):
        """Login sets JWT cookies (access and refresh)."""

        login_data = {
            'login': 'testuser',
            'password': 'testpass123'
        }
        response = json_post(self.client, TOKEN_URL, login_data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', self.client.cookies)
        self.assertIn('refresh_token', self.client.cookies)

    def test_logout_clears_jwt_cookies(self):
        """Logout clears JWT cookies."""

        # Login first
        login_data = {
            'login': 'testuser',
            'password': 'testpass123'
        }
        json_post(self.client, TOKEN_URL, login_data)
        # Logout
        logout_url = '/api/logout/'
        response = self.client.post(logout_url, content_type='application/json')
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
            'login': 'testuser',
            'password': 'testpass123'
        }
        json_post(self.client, TOKEN_URL, login_data)
        # Get current refresh token
        old_refresh_cookie = self.client.cookies.get('refresh_token')
        old_refresh = old_refresh_cookie.value if old_refresh_cookie else None
        refresh_url = '/api/token/refresh/'
        # Rely on HttpOnly refresh cookie only - no body needed
        response = self.client.post(refresh_url, {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        new_refresh_cookie = response.cookies.get('refresh_token')
        new_refresh = new_refresh_cookie.value if new_refresh_cookie else None
        # Assert the refresh token cookie value changed
        self.assertNotEqual(old_refresh, new_refresh)

    def test_csrf_token_endpoint_sets_cookie(self):
        """CSRF token endpoint sets XSRF-TOKEN cookie and returns token in body."""

        csrf_url = '/api/csrf/'
        response = self.client.get(csrf_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('XSRF-TOKEN', response.cookies)
        token_in_cookie = response.cookies['XSRF-TOKEN'].value

        body = response.content.decode(response.charset or 'utf-8')
        token_in_body = json.loads(body)['csrf_token']
        self.assertEqual(token_in_cookie, token_in_body)
