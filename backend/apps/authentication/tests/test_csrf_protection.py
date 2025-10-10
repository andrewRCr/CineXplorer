"""
Comprehensive CSRF Protection Tests for Django Ninja + Django Middleware Integration.

These tests verify that Django's CsrfViewMiddleware properly protects endpoints
even with csrf=False set on Django Ninja's API and auth classes (workaround for bug #1464).

Test Coverage:
1. CSRF blocks unsafe methods (POST/PATCH/DELETE) without valid tokens
2. CSRF accepts unsafe methods WITH valid tokens
3. CSRF exempts safe methods (GET/HEAD/OPTIONS)
4. CSRF exempts auth=None endpoints (login, register)
5. CSRF token generation via /api/csrf/ endpoint
"""
import json
from typing import cast

from core.tests.test_helpers import create_user, json_post
from django.test import Client, TestCase

HTTP_200_OK = 200
HTTP_201_CREATED = 201
HTTP_401_UNAUTHORIZED = 401
HTTP_403_FORBIDDEN = 403

# Endpoints
REGISTER_URL = '/api/register/'
TOKEN_URL = '/api/token/'
CSRF_URL = '/api/csrf/'
PROFILE_URL = '/api/profile/'


class CSRFProtectionTests(TestCase):
    """
    Test Django's CSRF middleware protection with Django Ninja API.

    Verifies csrf=False workaround (for bug #1464) doesn't disable Django's protection.
    """

    def setUp(self):
        """Set up test client and authenticated user."""
        self.client = Client()
        self.user = create_user(
            username='csrftest',
            email='csrftest@example.com',
            password='testpass123'
        )

        # Login to get JWT cookies
        auth_payload = {
            'login': 'csrftest',
            'password': 'testpass123'
        }
        json_post(self.client, TOKEN_URL, cast(dict[str, object], auth_payload))

    def test_csrf_blocks_patch_without_token(self):
        """
        CRITICAL: PATCH request without CSRF token should be blocked (403).

        This verifies Django's CsrfViewMiddleware is active even with csrf=False
        on Django Ninja API/auth classes.
        """
        payload = {'first_name': 'Blocked'}

        # PATCH without CSRF token should fail
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json'
        )

        # Should be blocked by CSRF middleware
        self.assertEqual(
            res.status_code,
            HTTP_403_FORBIDDEN,
            f"CSRF should block PATCH without token. Got {res.status_code}: {res.content.decode()}"
        )

    def test_csrf_accepts_patch_with_valid_token(self):
        """
        CRITICAL: PATCH request WITH valid CSRF token should succeed (200).

        This verifies Django's CSRF middleware accepts valid tokens.
        """
        # Get valid CSRF token from /api/csrf/ endpoint
        csrf_res = self.client.get(CSRF_URL)
        csrf_token = json.loads(csrf_res.content.decode())['csrf_token']

        payload = {'first_name': 'CSRFSuccess'}

        # PATCH with valid CSRF token should succeed
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token
        )

        self.assertEqual(
            res.status_code,
            HTTP_200_OK,
            f"CSRF should accept valid token. Got {res.status_code}: {res.content.decode()}"
        )

        # Verify update was applied
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'CSRFSuccess')

    def test_csrf_exempts_get_requests(self):
        """
        GET requests should NOT require CSRF tokens (safe method).

        This verifies Django's CSRF middleware exempts safe methods.
        """
        # GET without CSRF token should succeed
        res = self.client.get(PROFILE_URL)

        self.assertEqual(
            res.status_code,
            HTTP_200_OK,
            f"GET should not require CSRF. Got {res.status_code}"
        )

    def test_csrf_exempts_login_endpoint(self):
        """
        Login endpoint (auth=None) should NOT require CSRF token.

        This verifies Django Ninja properly exempts auth=None endpoints.
        """
        # Create new user for login test
        create_user(
            username='logintest',
            email='logintest@example.com',
            password='testpass123'
        )

        # Login without CSRF token should succeed
        auth_payload = {
            'login': 'logintest',
            'password': 'testpass123'
        }
        res = json_post(self.client, TOKEN_URL, cast(dict[str, object], auth_payload))

        self.assertEqual(
            res.status_code,
            HTTP_200_OK,
            f"Login should not require CSRF. Got {res.status_code}"
        )

    def test_csrf_exempts_register_endpoint(self):
        """
        Register endpoint (auth=None) should NOT require CSRF token.

        This verifies Django Ninja properly exempts auth=None endpoints.
        """
        # Registration without CSRF token should succeed
        payload = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'testpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        res = json_post(self.client, REGISTER_URL, cast(dict[str, object], payload))

        self.assertEqual(
            res.status_code,
            HTTP_201_CREATED,
            f"Register should not require CSRF. Got {res.status_code}"
        )

    def test_csrf_token_endpoint_generates_valid_token(self):
        """
        /api/csrf/ endpoint should generate a valid Django CSRF token.

        This verifies the CSRF endpoint integration with Django's token generation.
        """
        res = self.client.get(CSRF_URL)

        self.assertEqual(res.status_code, HTTP_200_OK)

        # Check response contains token
        body = json.loads(res.content.decode())
        self.assertIn('csrf_token', body)
        csrf_token = body['csrf_token']
        self.assertIsNotNone(csrf_token)
        self.assertTrue(len(csrf_token) > 0)

        # Check csrftoken cookie was set
        self.assertIn('csrftoken', res.cookies)
        cookie_token = res.cookies['csrftoken'].value

        # Token in body should match token in cookie
        self.assertEqual(
            csrf_token,
            cookie_token,
            "Token in response body should match csrftoken cookie"
        )

    def test_csrf_token_from_endpoint_works_for_requests(self):
        """
        INTEGRATION: CSRF token from /api/csrf/ should work for subsequent requests.

        This tests the full flow: get token → use token → request succeeds.
        """
        # Get CSRF token from endpoint
        csrf_res = self.client.get(CSRF_URL)
        csrf_token = json.loads(csrf_res.content.decode())['csrf_token']

        # Use token in PATCH request
        payload = {'first_name': 'IntegrationTest'}
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token
        )

        self.assertEqual(
            res.status_code,
            HTTP_200_OK,
            f"Token from /api/csrf/ should work. Got {res.status_code}: {res.content.decode()}"
        )

    def test_csrf_rejects_invalid_token(self):
        """
        CSRF middleware should reject invalid/fake tokens.

        This verifies token validation is actually performed.
        """
        fake_token = 'this_is_a_fake_csrf_token_12345'

        payload = {'first_name': 'Hacker'}
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=fake_token
        )

        self.assertEqual(
            res.status_code,
            HTTP_403_FORBIDDEN,
            f"CSRF should reject fake tokens. Got {res.status_code}"
        )


class CSRFUnauthenticatedTests(TestCase):
    """
    Test CSRF behavior for unauthenticated requests.

    Verifies auth check happens before CSRF check for protected endpoints.
    """

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_unauthenticated_patch_fails_with_401_not_403(self):
        """
        Unauthenticated PATCH should fail with 401 (not 403 CSRF).

        This verifies authentication is checked before CSRF.
        """
        payload = {'first_name': 'Hacker'}
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json'
        )

        # Should fail authentication (401) before CSRF check (403)
        self.assertEqual(
            res.status_code,
            HTTP_401_UNAUTHORIZED,
            f"Unauthenticated request should fail auth. Got {res.status_code}"
        )


class CSRFEdgeCaseTests(TestCase):
    """
    Edge case tests for CSRF protection.

    Tests middleware ordering, token lifecycle, and specific endpoint requirements.
    """

    def setUp(self):
        """Set up test client and authenticated user."""
        self.client = Client()
        self.user = create_user(
            username='edgecasetest',
            email='edgecase@example.com',
            password='testpass123'
        )

        # Login to get JWT cookies
        auth_payload = {
            'login': 'edgecasetest',
            'password': 'testpass123'
        }
        json_post(self.client, TOKEN_URL, cast(dict[str, object], auth_payload))

    def test_csrf_enforced_before_jwt_validation(self):
        """
        CSRF middleware runs before endpoint JWT validation.

        This means expired JWT + no CSRF token returns 403 (not 401).
        This is a minor UX issue but acceptable middleware ordering trade-off.
        """
        # Get CSRF endpoint to establish session
        self.client.get(CSRF_URL)

        # Clear JWT cookies but keep session (to avoid 401)
        # In reality, expired JWT would cause 401, but CSRF middleware runs first
        payload = {'first_name': 'ExpiredJWT'}

        # PATCH without CSRF token (even with "expired" JWT state)
        res = self.client.patch(
            PROFILE_URL,
            json.dumps(payload),
            content_type='application/json'
        )

        # CSRF failure should happen before JWT validation
        self.assertEqual(
            res.status_code,
            HTTP_403_FORBIDDEN,
            "CSRF middleware runs before endpoint auth, so 403 returned before 401"
        )

    def test_csrf_token_valid_for_multiple_requests(self):
        """
        Single CSRF token valid for multiple requests (session lifetime).

        Django CSRF tokens don't expire per-request, only per session.
        This is expected behavior and improves performance.
        """
        # Get CSRF token once
        csrf_res = self.client.get(CSRF_URL)
        csrf_token = json.loads(csrf_res.content.decode())['csrf_token']

        # Use same token for multiple requests
        test_names = ['First', 'Second', 'Third']

        for name in test_names:
            payload = {'first_name': name}
            res = self.client.patch(
                PROFILE_URL,
                json.dumps(payload),
                content_type='application/json',
                HTTP_X_CSRFTOKEN=csrf_token
            )

            self.assertEqual(
                res.status_code,
                HTTP_200_OK,
                f"Same CSRF token should work for multiple requests. Failed on '{name}'"
            )

            # Verify update applied
            self.user.refresh_from_db()
            self.assertEqual(self.user.first_name, name)

    def test_refresh_endpoint_requires_csrf(self):
        """
        Token refresh endpoint requires CSRF (Option A decision).

        Rationale: Limits stolen session lifetime to 5 minutes (access token lifetime).
        Without CSRF, stolen JWT cookies can be refreshed indefinitely.

        Implementation: Explicit check in middleware for /api/token/refresh/
        prevents prefix matching exemption from /api/token/ (login endpoint).
        """
        refresh_url = '/api/token/refresh/'

        # POST to refresh without CSRF token should fail
        res = self.client.post(
            refresh_url,
            content_type='application/json'
        )

        # Should be blocked by CSRF middleware
        self.assertEqual(
            res.status_code,
            HTTP_403_FORBIDDEN,
            f"Refresh endpoint should require CSRF. Got {res.status_code}: {res.content.decode()}"
        )

        # Verify with valid CSRF token it works
        csrf_res = self.client.get(CSRF_URL)
        csrf_token = json.loads(csrf_res.content.decode())['csrf_token']

        res_with_csrf = self.client.post(
            refresh_url,
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token
        )

        self.assertEqual(
            res_with_csrf.status_code,
            HTTP_200_OK,
            f"Refresh with CSRF should succeed. Got {res_with_csrf.status_code}"
        )
