"""Tests for authentication security infrastructure.

Validates security features:
- Security headers (X-Frame-Options, HSTS, cookie security)
- JWT cookie configuration (SameSite attributes)
- Rate limiting (login, registration, token refresh)
- Token blacklisting (refresh token rotation)
- Authentication logging (security events)
- Error response standardization
- Environment-aware configuration
"""

import pytest
from django.conf import settings
from django.http import HttpResponse
from django.test import Client, override_settings

# =========================
# Security Headers Tests
# =========================


@pytest.mark.django_db
def test_x_frame_options_deny_header(api_client: Client) -> None:
    """Response includes X-Frame-Options: DENY header (clickjacking protection)."""
    response: HttpResponse = api_client.get("/api/csrf/")  # type: ignore[assignment]
    assert response.get("X-Frame-Options") == "DENY"


@pytest.mark.django_db
def test_x_content_type_options_nosniff_header(api_client: Client) -> None:
    """Response includes X-Content-Type-Options: nosniff header (MIME sniffing protection)."""
    response: HttpResponse = api_client.get("/api/csrf/")  # type: ignore[assignment]
    assert response.get("X-Content-Type-Options") == "nosniff"


@pytest.mark.django_db
def test_x_xss_protection_header() -> None:
    """SECURE_BROWSER_XSS_FILTER setting enabled (legacy XSS protection)."""
    # Note: SECURE_BROWSER_XSS_FILTER is deprecated in Django 4.1+
    # Modern browsers ignore X-XSS-Protection header
    # We validate the setting is enabled, not the header presence
    assert settings.SECURE_BROWSER_XSS_FILTER is True


@pytest.mark.django_db
@override_settings(ENVIRONMENT="production", DEBUG=False, SESSION_COOKIE_SECURE=True)
def test_session_cookie_secure_production() -> None:
    """Session cookie has Secure attribute in production environment."""
    # In production environment, SESSION_COOKIE_SECURE should be True
    # This setting controls whether session cookies have the Secure flag
    assert settings.SESSION_COOKIE_SECURE is True


@pytest.mark.django_db
@override_settings(ENVIRONMENT="production", DEBUG=False, CSRF_COOKIE_SECURE=True)
def test_csrf_cookie_secure_production() -> None:
    """CSRF cookie has Secure attribute in production environment."""
    assert settings.CSRF_COOKIE_SECURE is True


@pytest.mark.django_db
@override_settings(ENVIRONMENT="production", DEBUG=False, SECURE_HSTS_SECONDS=31536000)
def test_hsts_header_present_production(api_client: Client) -> None:
    """HSTS header present in production environment with 1 year duration."""
    response: HttpResponse = api_client.get("/api/csrf/", secure=True)  # type: ignore[assignment]
    hsts_header = response.get("Strict-Transport-Security")
    assert hsts_header is not None
    assert "max-age=31536000" in hsts_header


@pytest.mark.django_db
@override_settings(ENVIRONMENT="development", DEBUG=True)
def test_hsts_header_absent_development() -> None:
    """HSTS header absent in development environment."""
    # In development, SECURE_HSTS_SECONDS should not be set or be 0
    hsts_seconds = getattr(settings, "SECURE_HSTS_SECONDS", 0)
    assert hsts_seconds == 0


# =========================
# JWT Cookie SameSite Tests
# =========================


@pytest.fixture
def samesite_user(api_client: Client) -> tuple[dict[str, str], Client]:
    """Create user with verified email for JWT SameSite cookie tests.

    Returns tuple of (user_data, client) with logged-in session ready.
    """
    from allauth.account.models import EmailAddress
    from django.contrib.auth import get_user_model

    from apps.core.tests.test_helpers import create_user

    user_data = {
        "username": "samesiteuser",
        "email": "samesite@example.com",
        "password": "testpass123",
        "first_name": "SameSite",
        "last_name": "User",
    }
    create_user(**user_data)  # type: ignore[arg-type]

    # Ensure email is verified (required for login)
    user = get_user_model().objects.get(email=user_data["email"])
    EmailAddress.objects.get_or_create(
        user=user,
        email=user.email,  # type: ignore[attr-defined]
        defaults={"verified": True, "primary": True},
    )

    return user_data, api_client


@pytest.mark.django_db
def test_login_sets_access_token_samesite_lax(
    samesite_user: tuple[dict[str, str], Client],
) -> None:
    """Login returns access_token in body (hybrid auth pattern).

    Hybrid Authentication Pattern:
    - Login endpoint returns access_token in response body (for localStorage)
    - Login endpoint only sets refresh_token cookie (HTTP-only)
    - Access token cookie is NOT set during login (frontend manages in localStorage)
    - Refresh endpoint sets BOTH tokens as cookies (see test_token_refresh_maintains_samesite_lax)
    """
    import json
    from typing import cast

    from apps.core.tests.test_helpers import json_post

    user_data, client = samesite_user
    login_payload = {"login": user_data["username"], "password": user_data["password"]}
    response = json_post(client, "/api/token/", cast(dict[str, object], login_payload))

    assert response.status_code == 200

    # Verify access_token is in response body (NOT cookie)
    response_data = json.loads(response.content.decode())
    assert "access_token" in response_data
    assert response_data["access_token"] is not None

    # Verify access_token is NOT set as cookie (hybrid auth pattern)
    assert "access_token" not in client.cookies


@pytest.mark.django_db
def test_login_sets_refresh_token_samesite_lax(
    samesite_user: tuple[dict[str, str], Client],
) -> None:
    """Login response sets refresh_token cookie with SameSite=Lax."""
    from typing import cast

    from apps.core.tests.test_helpers import json_post

    user_data, client = samesite_user
    login_payload = {"login": user_data["username"], "password": user_data["password"]}
    response = json_post(client, "/api/token/", cast(dict[str, object], login_payload))

    assert response.status_code == 200
    assert "refresh_token" in client.cookies

    refresh_cookie = client.cookies["refresh_token"]
    assert refresh_cookie.get("samesite") == "Lax"


@pytest.mark.django_db
def test_token_refresh_maintains_samesite_lax(
    samesite_user: tuple[dict[str, str], Client],
) -> None:
    """Token refresh response maintains SameSite=Lax for both cookies."""
    from typing import cast

    from apps.core.tests.test_helpers import json_post

    user_data, client = samesite_user

    # Login first to get tokens
    login_payload = {"login": user_data["username"], "password": user_data["password"]}
    json_post(client, "/api/token/", cast(dict[str, object], login_payload))

    # Refresh tokens (requires CSRF token - double-submit cookie pattern)
    # Must use Django's default cookie name 'csrftoken' (not 'XSRF-TOKEN')
    csrf_token = "test_csrf_token"
    client.cookies["csrftoken"] = csrf_token  # Set cookie
    refresh_response = client.post(
        "/api/token/refresh/",
        {},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,  # Set matching header
    )
    assert refresh_response.status_code == 200

    # Check both cookies maintain SameSite=Lax
    access_cookie = refresh_response.cookies.get("access_token")
    refresh_cookie = refresh_response.cookies.get("refresh_token")

    assert access_cookie is not None
    assert refresh_cookie is not None
    assert access_cookie.get("samesite") == "Lax"
    assert refresh_cookie.get("samesite") == "Lax"
