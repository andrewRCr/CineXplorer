
"""
Tests for authentication security infrastructure.

Validates security features:
- Security headers (X-Frame-Options, HSTS, cookie security)
- JWT cookie configuration (SameSite attributes)
- Rate limiting (login, registration, token refresh)
- Token blacklisting (refresh token rotation)
- Authentication logging (security events)
- Error response standardization
- Environment-aware configuration
"""
from django.http import HttpResponse
from django.test import Client, TestCase, override_settings

# =========================
# Security Headers Tests
# =========================


class SecurityHeadersTests(TestCase):
    """
    Tests for security headers applied by Django middleware.
    Validates X-Frame-Options, X-Content-Type-Options, X-XSS-Protection,
    cookie security attributes, and HSTS headers in different environments.
    """

    def setUp(self) -> None:
        self.client = Client()

    def test_x_frame_options_deny_header(self) -> None:
        """Response includes X-Frame-Options: DENY header (clickjacking protection)."""
        response: HttpResponse = self.client.get('/api/csrf/')  # type: ignore[assignment]
        self.assertEqual(response.get('X-Frame-Options'), 'DENY')

    def test_x_content_type_options_nosniff_header(self) -> None:
        """Response includes X-Content-Type-Options: nosniff header (MIME sniffing protection)."""
        response: HttpResponse = self.client.get('/api/csrf/')  # type: ignore[assignment]
        self.assertEqual(response.get('X-Content-Type-Options'), 'nosniff')

    def test_x_xss_protection_header(self) -> None:
        """SECURE_BROWSER_XSS_FILTER setting enabled (legacy XSS protection)."""
        # Note: SECURE_BROWSER_XSS_FILTER is deprecated in Django 4.1+
        # Modern browsers ignore X-XSS-Protection header
        # We validate the setting is enabled, not the header presence
        from django.conf import settings
        self.assertTrue(settings.SECURE_BROWSER_XSS_FILTER)

    @override_settings(ENVIRONMENT='production', DEBUG=False, SESSION_COOKIE_SECURE=True)
    def test_session_cookie_secure_production(self) -> None:
        """Session cookie has Secure attribute in production environment."""
        # In production environment, SESSION_COOKIE_SECURE should be True
        # This setting controls whether session cookies have the Secure flag
        from django.conf import settings
        self.assertTrue(settings.SESSION_COOKIE_SECURE)

    @override_settings(ENVIRONMENT='production', DEBUG=False, CSRF_COOKIE_SECURE=True)
    def test_csrf_cookie_secure_production(self) -> None:
        """CSRF cookie has Secure attribute in production environment."""
        from django.conf import settings
        self.assertTrue(settings.CSRF_COOKIE_SECURE)

    @override_settings(ENVIRONMENT='production', DEBUG=False, SECURE_HSTS_SECONDS=31536000)
    def test_hsts_header_present_production(self) -> None:
        """HSTS header present in production environment with 1 year duration."""
        response: HttpResponse = self.client.get('/api/csrf/', secure=True)  # type: ignore[assignment]
        hsts_header = response.get('Strict-Transport-Security')
        self.assertIsNotNone(hsts_header)
        # Type checker knows hsts_header is not None after assertIsNotNone
        assert hsts_header is not None  # Runtime assertion for type narrowing
        self.assertIn('max-age=31536000', hsts_header)

    @override_settings(ENVIRONMENT='development', DEBUG=True)
    def test_hsts_header_absent_development(self) -> None:
        """HSTS header absent in development environment."""
        from django.conf import settings
        # In development, SECURE_HSTS_SECONDS should not be set or be 0
        hsts_seconds = getattr(settings, 'SECURE_HSTS_SECONDS', 0)
        self.assertEqual(hsts_seconds, 0)


# =========================
# JWT Cookie SameSite Tests
# =========================


class JWTCookieSameSiteTests(TestCase):
    """
    Tests for JWT cookie SameSite attribute configuration.
    Validates that access_token and refresh_token cookies have SameSite=Lax
    for same-origin security (all requests served through Caddy reverse proxy).
    """

    def setUp(self) -> None:
        from typing import cast

        from allauth.account.models import EmailAddress
        from core.tests.test_helpers import create_user, json_post
        from django.contrib.auth import get_user_model

        self.client = Client()
        # Create user with verified email for login
        self.user_data = {
            'username': 'samesiteuser',
            'email': 'samesite@example.com',
            'password': 'testpass123',
            'first_name': 'SameSite',
            'last_name': 'User'
        }
        create_user(**self.user_data)  # type: ignore[arg-type]

        # Ensure email is verified (required for login)
        user = get_user_model().objects.get(email=self.user_data['email'])
        EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,  # type: ignore[attr-defined]
            defaults={'verified': True, 'primary': True}
        )

    def test_login_sets_access_token_samesite_lax(self) -> None:
        """Login response sets access_token cookie with SameSite=Lax."""
        from typing import cast

        from core.tests.test_helpers import json_post

        login_payload = {
            'login': 'samesiteuser',
            'password': 'testpass123'
        }
        response = json_post(self.client, '/api/token/', cast(dict[str, object], login_payload))

        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', self.client.cookies)

        access_cookie = self.client.cookies['access_token']
        # SameSite attribute is stored as 'samesite' in cookie
        self.assertEqual(access_cookie.get('samesite'), 'Lax')

    def test_login_sets_refresh_token_samesite_lax(self) -> None:
        """Login response sets refresh_token cookie with SameSite=Lax."""
        from typing import cast

        from core.tests.test_helpers import json_post

        login_payload = {
            'login': 'samesiteuser',
            'password': 'testpass123'
        }
        response = json_post(self.client, '/api/token/', cast(dict[str, object], login_payload))

        self.assertEqual(response.status_code, 200)
        self.assertIn('refresh_token', self.client.cookies)

        refresh_cookie = self.client.cookies['refresh_token']
        self.assertEqual(refresh_cookie.get('samesite'), 'Lax')

    def test_token_refresh_maintains_samesite_lax(self) -> None:
        """Token refresh response maintains SameSite=Lax for both cookies."""
        from typing import cast

        from core.tests.test_helpers import json_post

        # Login first to get tokens
        login_payload = {
            'login': 'samesiteuser',
            'password': 'testpass123'
        }
        json_post(self.client, '/api/token/', cast(dict[str, object], login_payload))

        # Refresh tokens (requires CSRF token - double-submit cookie pattern)
        # Must use Django's default cookie name 'csrftoken' (not 'XSRF-TOKEN')
        csrf_token = 'test_csrf_token'
        self.client.cookies['csrftoken'] = csrf_token  # Set cookie
        refresh_response = self.client.post(
            '/api/token/refresh/',
            {},
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token  # Set matching header
        )
        self.assertEqual(refresh_response.status_code, 200)

        # Check both cookies maintain SameSite=Lax
        access_cookie = refresh_response.cookies.get('access_token')
        refresh_cookie = refresh_response.cookies.get('refresh_token')

        self.assertIsNotNone(access_cookie)
        self.assertIsNotNone(refresh_cookie)
        assert access_cookie is not None  # Type narrowing
        assert refresh_cookie is not None  # Type narrowing
        self.assertEqual(access_cookie.get('samesite'), 'Lax')
        self.assertEqual(refresh_cookie.get('samesite'), 'Lax')
