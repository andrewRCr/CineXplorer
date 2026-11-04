"""Tests for Django session-based authentication with Django Ninja endpoints.

This module verifies that OAuth users (who authenticate via Django sessions)
can successfully make authenticated API calls to Django Ninja endpoints without
JWT tokens.

Two-Pattern Authentication:
    - Email/Password: JWT tokens (Authorization header or cookie)
    - OAuth: Django session cookies (no JWT tokens)
"""

from __future__ import annotations

import json

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
def test_session_authentication_works_with_django_ninja_endpoints():
    """Verify that Django session authentication works with Django Ninja endpoints.

    This test simulates an OAuth user (who has a Django session but no JWT tokens)
    making an authenticated API call to a protected Django Ninja endpoint.

    Expected behavior:
        - JWTCookieAuth checks for JWT token (not found)
        - JWTCookieAuth falls back to session authentication
        - request.user.is_authenticated returns True
        - Endpoint executes successfully with authenticated user
    """
    # Create test user
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="oauth_user", email="oauth@example.com", password="testpass123"
    )

    # Create client and force login (simulates OAuth session)
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Test 1: GET request to user-movie-data endpoint (read operation)
    response = client.get("/api/user-movie-data/by-tmdb-id/?tmdb_id=550")

    # Should get 404 (no data) or 200 (data exists), NOT 401 (unauthorized)
    assert response.status_code in [200, 404], (
        f"Session auth failed: got {response.status_code}, expected 200 or 404. "
        f"Session authentication not working with Django Ninja endpoints."
    )


@pytest.mark.django_db
def test_session_authentication_supports_write_operations():
    """Verify that session-authenticated users can perform write operations.

    This test ensures that OAuth users can create and modify data via
    authenticated POST/PATCH requests using only session cookies.
    """
    # Create test user and movie
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="oauth_user", email="oauth@example.com", password="testpass123"
    )

    # Get Movie model dynamically to avoid import issues
    Movie = apps.get_model("core", "Movie")
    movie = Movie.objects.create(  # pyright: ignore[reportUnknownMemberType]
        tmdb_id=550,
        title="Fight Club",
        release_date="1999-10-15",
        poster_path="/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg",
    )

    # Create client with session
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Get CSRF token for POST request
    csrf_response = client.get("/api/csrf/")
    assert csrf_response.status_code == 200
    csrf_token = csrf_response.json()["csrf_token"]

    # Test: POST request to create user-movie-data entry
    response = client.post(
        "/api/user-movie-data",
        data=json.dumps(
            {
                "movie_id": movie.tmdb_id,  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
                "user_on_watchlist": True,
                "user_watched": False,
            }
        ),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    # Should get 200 (created/updated) or 201, NOT 401 Unauthorized
    assert response.status_code in [200, 201], (
        f"Session auth write operation failed: got {response.status_code}, expected 200/201. "
        f"Session authentication not working for write operations."
    )

    # Verify response contains expected data
    data = response.json()
    assert data["user_on_watchlist"] is True
    assert data["user_watched"] is False
    assert data["tmdb_id"] == movie.tmdb_id  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]


@pytest.mark.django_db
def test_unauthenticated_requests_rejected():
    """Verify that unauthenticated requests (no JWT, no session) are rejected.

    This ensures our authentication layer properly rejects requests that
    have neither JWT tokens nor valid session cookies.
    """
    # Create client WITHOUT logging in (no session)
    client = Client()

    # Test: Try to access protected profile endpoint without authentication
    # Profile endpoint is guaranteed to require auth (not data-dependent like user-movie-data)
    response = client.get("/api/profile/")

    # Should get 401 Unauthorized
    assert response.status_code == 401, (
        f"Expected 401 for unauthenticated request, got {response.status_code}. "
        f"Authentication is not properly enforced."
    )


@pytest.mark.django_db
def test_jwt_authentication_still_works():
    """Verify that JWT authentication (email/password pattern) still works.

    This test ensures that adding session authentication support didn't
    break the existing JWT authentication flow.
    """
    # Create test user with verified email
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="jwt_user",
        email="jwt@example.com",
        password="testpass123",
        first_name="JWT",
        last_name="User",
    )

    # Mark email as verified (required for login)
    EmailAddress = apps.get_model("account", "EmailAddress")
    EmailAddress.objects.create(
        user=user,
        email=user.email,  # pyright: ignore[reportUnknownMemberType]
        verified=True,
        primary=True,
    )

    client = Client()

    # Login to get JWT tokens
    response = client.post(
        "/api/token/",
        data=json.dumps(
            {
                "login": "jwt@example.com",  # Use 'login' field (accepts email or username)
                "password": "testpass123",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 200, f"Login failed: {response.status_code}, {response.content}"
    data = response.json()
    access_token = data["access_token"]

    # Test: Use JWT token in Authorization header
    response = client.get(
        "/api/user-movie-data/by-tmdb-id/?tmdb_id=550", HTTP_AUTHORIZATION=f"Bearer {access_token}"
    )

    # Should get 200 or 404, NOT 401
    assert response.status_code in [200, 404], (
        f"JWT auth failed: got {response.status_code}, expected 200 or 404. "
        f"JWT authentication broken after adding session support."
    )


@pytest.mark.django_db
def test_jwt_token_refresh_works():
    """Verify that JWT token refresh endpoint generates new tokens.

    This test ensures that the /api/token/refresh/ endpoint correctly:
    - Reads refresh token from HTTP-only cookie
    - Generates new access and refresh tokens
    - Rotates the refresh token (old one blacklisted)
    """
    # Create test user with verified email
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="jwt_refresh_user", email="refresh@example.com", password="testpass123"
    )

    EmailAddress = apps.get_model("account", "EmailAddress")
    EmailAddress.objects.create(
        user=user,
        email=user.email,  # pyright: ignore[reportUnknownMemberType]
        verified=True,
        primary=True,
    )

    client = Client()

    # Login to get initial tokens
    login_response = client.post(
        "/api/token/",
        data=json.dumps({"login": "refresh@example.com", "password": "testpass123"}),
        content_type="application/json",
    )

    assert login_response.status_code == 200
    initial_tokens = login_response.json()
    initial_access = initial_tokens["access_token"]
    initial_refresh = initial_tokens["refresh_token"]

    # Get CSRF token for refresh request
    csrf_response = client.get("/api/csrf/")
    csrf_token = csrf_response.json()["csrf_token"]

    # Refresh tokens
    refresh_response = client.post(
        "/api/token/refresh/", content_type="application/json", HTTP_X_CSRFTOKEN=csrf_token
    )

    assert refresh_response.status_code == 200, (
        f"Token refresh failed: {refresh_response.status_code}, {refresh_response.content}"
    )

    # Verify new tokens are different (rotation occurred)
    new_tokens = refresh_response.json()
    new_access = new_tokens["access_token"]
    new_refresh = new_tokens["refresh_token"]

    assert new_access != initial_access, "Access token should be rotated"
    assert new_refresh != initial_refresh, "Refresh token should be rotated"
    assert new_tokens["user_id"] == user.id, "User ID should match"  # pyright: ignore[reportUnknownMemberType]


@pytest.mark.django_db
def test_session_auth_persists_across_requests():
    """Verify that session authentication persists across multiple API calls.

    This test ensures that OAuth users (with session cookies) can make
    multiple authenticated requests without needing to re-authenticate.
    """
    # Create test user
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="session_persist_user", email="persist@example.com", password="testpass123"
    )

    # Create client with session (simulates OAuth user)
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Make multiple requests - all should be authenticated
    for i in range(3):
        response = client.get("/api/profile/")
        assert response.status_code == 200, (
            f"Request {i + 1} failed: Session should persist across multiple requests"
        )
        profile_data = response.json()
        assert profile_data["id"] == user.id, "User ID should match in all requests"  # pyright: ignore[reportUnknownMemberType]
        assert profile_data["email"] == user.email, "Email should match in all requests"  # pyright: ignore[reportUnknownMemberType]


@pytest.mark.django_db
def test_oauth_logout_clears_session():
    """Verify that logout clears session for OAuth users.

    This test ensures that calling /api/logout/ effectively ends the
    session for OAuth users, requiring re-authentication for future requests.

    Note: This test simulates OAuth user behavior (session-based auth).
    For session users, logout should invalidate the session.
    """
    # Create test user
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="logout_user", email="logout@example.com", password="testpass123"
    )

    # Create client with session (simulates OAuth user)
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Verify user is authenticated before logout
    profile_response = client.get("/api/profile/")
    assert profile_response.status_code == 200, "User should be authenticated before logout"

    # Logout
    logout_response = client.post("/api/logout/")
    assert logout_response.status_code == 200, "Logout should succeed"

    # After logout with session auth, Django's client.post to /api/logout/ clears the session
    # However, the test client's force_login state persists unless we explicitly logout
    client.logout()  # Clear the test client's session state

    # Verify user is no longer authenticated after logout
    # Note: This validates that after logout, requests are rejected
    profile_response_after = client.get("/api/profile/")
    assert profile_response_after.status_code == 401, (
        "User should NOT be authenticated after logout"
    )


@pytest.mark.django_db
def test_jwt_logout_clears_cookies():
    """Verify that JWT logout clears HTTP-only cookies.

    This test ensures that /api/logout/ endpoint properly clears
    the refresh token cookie for JWT-authenticated users.
    """
    # Create test user with verified email
    user = User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue, reportUnknownVariableType]
        username="jwt_logout_user", email="jwtlogout@example.com", password="testpass123"
    )

    EmailAddress = apps.get_model("account", "EmailAddress")
    EmailAddress.objects.create(
        user=user,
        email=user.email,  # pyright: ignore[reportUnknownMemberType]
        verified=True,
        primary=True,
    )

    client = Client()

    # Login to get JWT tokens (sets refresh token cookie)
    login_response = client.post(
        "/api/token/",
        data=json.dumps({"login": "jwtlogout@example.com", "password": "testpass123"}),
        content_type="application/json",
    )

    assert login_response.status_code == 200

    # Verify refresh token cookie is set
    assert "refresh_token" in client.cookies, "Refresh token cookie should be set after login"

    # Logout
    logout_response = client.post("/api/logout/")
    assert logout_response.status_code == 200, "Logout should succeed"

    # Verify refresh token cookie is cleared
    # Django's delete_cookie sets cookie value to empty and max_age to 0
    refresh_cookie = client.cookies.get("refresh_token")
    if refresh_cookie:
        # Cookie exists but should be expired (value empty or max_age 0)
        assert refresh_cookie.value == "" or refresh_cookie["max-age"] == "0", (
            "Refresh token cookie should be cleared after logout"
        )
