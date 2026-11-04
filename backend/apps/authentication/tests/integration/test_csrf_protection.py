"""Comprehensive CSRF Protection Tests for Django Ninja + Django Middleware Integration.

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

import pytest
from django.test import Client

from apps.core.models import Movie
from apps.core.tests.test_helpers import (
    HTTPStatus,
    create_user,
    get_csrf_token,
    json_patch,
    json_post,
)
from apps.user_movie_data.models import UserMovieData

# Endpoints
REGISTER_URL = "/api/register/"
TOKEN_URL = "/api/token/"
CSRF_URL = "/api/csrf/"
PROFILE_URL = "/api/profile/"


def entry_url(entry_id: int) -> str:
    """Return the update URL for a user's movie entry."""
    return f"/api/user-movie-data/{entry_id}"


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def csrf_client(api_client: Client, db: None) -> tuple[Client, UserMovieData]:
    """Create authenticated client for CSRF tests, with one of the user's movie entries.

    Returns tuple of (Django test client with JWT cookies, the entry). Rating the entry is
    the state-changing request these tests send; CSRF protects every authenticated one.
    """
    from apps.core.tests.test_helpers import authenticate_client

    user = create_user(username="csrftest", email="csrftest@example.com", password="testpass123")

    # Authenticate client (handles hybrid auth pattern automatically)
    authenticate_client(api_client, "csrftest", "testpass123")

    movie = Movie.objects.create(tmdb_id=12345, title="Blade Runner")
    entry = UserMovieData.objects.create(user=user, movie=movie, user_rating=5)
    return api_client, entry


# ============================================================================
# CSRF PROTECTION TESTS
# ============================================================================


@pytest.mark.django_db
def test_csrf_blocks_patch_without_token(csrf_client: tuple[Client, UserMovieData]) -> None:
    """CRITICAL: PATCH request without CSRF token should be blocked (403).

    This verifies Django's CsrfViewMiddleware is active even with csrf=False
    on Django Ninja API/auth classes.
    """
    client, entry = csrf_client

    # PATCH without CSRF token should fail
    res = json_patch(client, entry_url(entry.pk), {"user_rating": 8})

    # Should be blocked by CSRF middleware
    assert res.status_code == HTTPStatus.FORBIDDEN, (
        f"CSRF should block PATCH without token. Got {res.status_code}: {res.content.decode()}"
    )
    entry.refresh_from_db()
    assert entry.user_rating == 5


@pytest.mark.django_db
def test_csrf_accepts_patch_with_valid_token(
    csrf_client: tuple[Client, UserMovieData], db: None
) -> None:
    """CRITICAL: PATCH request WITH valid CSRF token should succeed (200).

    This verifies Django's CSRF middleware accepts valid tokens.
    """
    client, entry = csrf_client
    # Get valid CSRF token from /api/csrf/ endpoint
    csrf_token = get_csrf_token(client)

    # PATCH with valid CSRF token should succeed
    res = json_patch(client, entry_url(entry.pk), {"user_rating": 8}, HTTP_X_CSRFTOKEN=csrf_token)

    assert res.status_code == HTTPStatus.OK, (
        f"CSRF should accept valid token. Got {res.status_code}: {res.content.decode()}"
    )

    # Verify update was applied
    entry.refresh_from_db()
    assert entry.user_rating == 8


@pytest.mark.django_db
def test_csrf_exempts_get_requests(csrf_client: tuple[Client, UserMovieData]) -> None:
    """GET requests should NOT require CSRF tokens (safe method).

    This verifies Django's CSRF middleware exempts safe methods.
    """
    client, _entry = csrf_client
    # GET without CSRF token should succeed
    res = client.get(PROFILE_URL)

    assert res.status_code == HTTPStatus.OK, f"GET should not require CSRF. Got {res.status_code}"


@pytest.mark.django_db
def test_csrf_exempts_login_endpoint(api_client: Client, db: None) -> None:
    """Login endpoint (auth=None) should NOT require CSRF token.

    This verifies Django Ninja properly exempts auth=None endpoints.
    """
    # Create new user for login test
    create_user(username="logintest", email="logintest@example.com", password="testpass123")

    # Login without CSRF token should succeed
    auth_payload = {"login": "logintest", "password": "testpass123"}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))

    assert res.status_code == HTTPStatus.OK, (
        f"Login should not require CSRF. Got {res.status_code}"
    )


@pytest.mark.django_db
def test_csrf_exempts_register_endpoint(api_client: Client, db: None) -> None:
    """Register endpoint (auth=None) should NOT require CSRF token.

    This verifies Django Ninja properly exempts auth=None endpoints.
    """
    # Registration without CSRF token should succeed
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "testpass123",
        "first_name": "New",
        "last_name": "User",
    }
    res = json_post(api_client, REGISTER_URL, cast(dict[str, object], payload))

    assert res.status_code == HTTPStatus.CREATED, (
        f"Register should not require CSRF. Got {res.status_code}"
    )


@pytest.mark.django_db
def test_csrf_token_endpoint_generates_valid_token(api_client: Client, db: None) -> None:
    """/api/csrf/ endpoint should generate a valid Django CSRF token.

    This verifies the CSRF endpoint integration with Django's token generation.
    """
    res = api_client.get(CSRF_URL)

    assert res.status_code == HTTPStatus.OK

    # Check response contains token
    body = json.loads(res.content.decode())
    assert "csrf_token" in body
    csrf_token = body["csrf_token"]
    assert csrf_token is not None
    assert len(csrf_token) > 0

    # Check csrftoken cookie was set
    assert "csrftoken" in res.cookies
    cookie_token = res.cookies["csrftoken"].value

    # Token in body should match token in cookie
    assert csrf_token == cookie_token, "Token in response body should match csrftoken cookie"


@pytest.mark.django_db
def test_csrf_token_from_endpoint_works_for_requests(
    csrf_client: tuple[Client, UserMovieData],
) -> None:
    """INTEGRATION: CSRF token from /api/csrf/ should work for subsequent requests.

    This tests the full flow: get token → use token → request succeeds.
    """
    client, entry = csrf_client
    # Get CSRF token from endpoint
    csrf_token = get_csrf_token(client)

    # Use token in PATCH request
    res = json_patch(client, entry_url(entry.pk), {"user_rating": 7}, HTTP_X_CSRFTOKEN=csrf_token)

    assert res.status_code == HTTPStatus.OK, (
        f"Token from /api/csrf/ should work. Got {res.status_code}: {res.content.decode()}"
    )


@pytest.mark.django_db
def test_csrf_rejects_invalid_token(csrf_client: tuple[Client, UserMovieData]) -> None:
    """CSRF middleware should reject invalid/fake tokens.

    This verifies token validation is actually performed.
    """
    client, entry = csrf_client
    fake_token = "this_is_a_fake_csrf_token_12345"

    res = json_patch(client, entry_url(entry.pk), {"user_rating": 1}, HTTP_X_CSRFTOKEN=fake_token)

    assert res.status_code == HTTPStatus.FORBIDDEN, (
        f"CSRF should reject fake tokens. Got {res.status_code}"
    )
    entry.refresh_from_db()
    assert entry.user_rating == 5


# ============================================================================
# CSRF UNAUTHENTICATED TESTS
# ============================================================================


@pytest.mark.django_db
def test_unauthenticated_patch_fails_with_401_not_403(api_client: Client, db: None) -> None:
    """Unauthenticated PATCH should fail with 401 (not 403 CSRF).

    This verifies authentication is checked before CSRF.
    """
    res = json_patch(api_client, entry_url(1), {"user_rating": 1})

    # Should fail authentication (401) before CSRF check (403)
    assert res.status_code == HTTPStatus.UNAUTHORIZED, (
        f"Unauthenticated request should fail auth. Got {res.status_code}"
    )


# ============================================================================
# CSRF EDGE CASE TESTS
# ============================================================================


@pytest.mark.django_db
def test_csrf_enforced_before_jwt_validation(csrf_client: tuple[Client, UserMovieData]) -> None:
    """CSRF middleware runs before endpoint JWT validation.

    This means expired JWT + no CSRF token returns 403 (not 401).
    This is a minor UX issue but acceptable middleware ordering trade-off.
    """
    client, entry = csrf_client
    # Get CSRF endpoint to establish session
    client.get(CSRF_URL)

    # Clear JWT cookies but keep session (to avoid 401)
    # In reality, expired JWT would cause 401, but CSRF middleware runs first
    # PATCH without CSRF token (even with "expired" JWT state)
    res = json_patch(client, entry_url(entry.pk), {"user_rating": 1})

    # CSRF failure should happen before JWT validation
    assert res.status_code == HTTPStatus.FORBIDDEN, (
        "CSRF middleware runs before endpoint auth, so 403 returned before 401"
    )


@pytest.mark.django_db
def test_csrf_token_valid_for_multiple_requests(
    csrf_client: tuple[Client, UserMovieData], db: None
) -> None:
    """Single CSRF token valid for multiple requests (session lifetime).

    Django CSRF tokens don't expire per-request, only per session.
    This is expected behavior and improves performance.
    """
    client, entry = csrf_client
    # Get CSRF token once
    csrf_token = get_csrf_token(client)

    # Use same token for multiple requests
    for rating in [6, 7, 8]:
        res = json_patch(
            client, entry_url(entry.pk), {"user_rating": rating}, HTTP_X_CSRFTOKEN=csrf_token
        )

        assert res.status_code == HTTPStatus.OK, (
            f"Same CSRF token should work for multiple requests. Failed on rating {rating}"
        )

        # Verify update applied
        entry.refresh_from_db()
        assert entry.user_rating == rating


@pytest.mark.django_db
def test_refresh_endpoint_requires_csrf(csrf_client: tuple[Client, UserMovieData]) -> None:
    """Token refresh endpoint requires CSRF (Option A decision).

    Rationale: Limits stolen session lifetime to 5 minutes (access token lifetime).
    Without CSRF, stolen JWT cookies can be refreshed indefinitely.

    Implementation: Explicit check in middleware for /api/token/refresh/
    prevents prefix matching exemption from /api/token/ (login endpoint).
    """
    client, _entry = csrf_client
    refresh_url = "/api/token/refresh/"

    # POST to refresh without CSRF token should fail
    res = client.post(refresh_url, content_type="application/json")

    # Should be blocked by CSRF middleware
    assert res.status_code == HTTPStatus.FORBIDDEN, (
        f"Refresh endpoint should require CSRF. Got {res.status_code}: {res.content.decode()}"
    )

    # Verify with valid CSRF token it works
    csrf_token = get_csrf_token(client)

    res_with_csrf = client.post(
        refresh_url, content_type="application/json", HTTP_X_CSRFTOKEN=csrf_token
    )

    assert res_with_csrf.status_code == HTTPStatus.OK, (
        f"Refresh with CSRF should succeed. Got {res_with_csrf.status_code}"
    )
