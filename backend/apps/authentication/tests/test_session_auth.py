"""
Tests for Django session-based authentication with Django Ninja endpoints.

This module verifies that OAuth users (who authenticate via Django sessions)
can successfully make authenticated API calls to Django Ninja endpoints without
JWT tokens.

Two-Pattern Authentication:
    - Email/Password: JWT tokens (Authorization header or cookie)
    - OAuth: Django session cookies (no JWT tokens)
"""
from __future__ import annotations

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
def test_session_authentication_works_with_django_ninja_endpoints():
    """
    Verify that Django session authentication works with Django Ninja endpoints.

    This test simulates an OAuth user (who has a Django session but no JWT tokens)
    making an authenticated API call to a protected Django Ninja endpoint.

    Expected behavior:
        - JWTCookieAuth checks for JWT token (not found)
        - JWTCookieAuth falls back to session authentication
        - request.user.is_authenticated returns True
        - Endpoint executes successfully with authenticated user
    """
    # Create test user
    user = User.objects.create_user(
        username='oauth_user',
        email='oauth@example.com',
        password='testpass123'
    )

    # Create client and force login (simulates OAuth session)
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Test 1: GET request to user-movie-data endpoint (read operation)
    response = client.get('/api/user-movie-data/by-tmdb-id/?tmdb_id=550')

    # Should get 404 (no data) or 200 (data exists), NOT 401 (unauthorized)
    assert response.status_code in [200, 404], (
        f"Session auth failed: got {response.status_code}, expected 200 or 404. "
        f"Session authentication not working with Django Ninja endpoints."
    )


@pytest.mark.django_db
def test_session_authentication_supports_write_operations():
    """
    Verify that session-authenticated users can perform write operations.

    This test ensures that OAuth users can create and modify data via
    authenticated POST/PATCH requests using only session cookies.
    """
    # Create test user and movie
    user = User.objects.create_user(
        username='oauth_user',
        email='oauth@example.com',
        password='testpass123'
    )

    # Get Movie model dynamically to avoid import issues
    Movie = apps.get_model('core', 'Movie')  # noqa: N806
    movie = Movie.objects.create(
        tmdb_id=550,
        title='Fight Club',
        release_date='1999-10-15',
        poster_path='/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg'
    )

    # Create client with session
    client = Client()
    client.force_login(user)  # type: ignore[arg-type]

    # Get CSRF token for POST request
    csrf_response = client.get('/api/csrf/')
    assert csrf_response.status_code == 200
    csrf_token = csrf_response.json()['csrf_token']

    # Test: POST request to create user-movie-data entry
    import json
    response = client.post(
        '/api/user-movie-data',
        data=json.dumps({
            'movie_id': movie.tmdb_id,
            'user_on_watchlist': True,
            'user_watched': False,
        }),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token
    )

    # Should get 200 (created/updated) or 201, NOT 401 Unauthorized
    assert response.status_code in [200, 201], (
        f"Session auth write operation failed: got {response.status_code}, expected 200/201. "
        f"Session authentication not working for write operations."
    )

    # Verify response contains expected data
    data = response.json()
    assert data['user_on_watchlist'] is True
    assert data['user_watched'] is False
    assert data['tmdb_id'] == movie.tmdb_id


@pytest.mark.django_db
def test_unauthenticated_requests_rejected():
    """
    Verify that unauthenticated requests (no JWT, no session) are rejected.

    This ensures our authentication layer properly rejects requests that
    have neither JWT tokens nor valid session cookies.
    """
    # Create client WITHOUT logging in (no session)
    client = Client()

    # Test: Try to access protected profile endpoint without authentication
    # Profile endpoint is guaranteed to require auth (not data-dependent like user-movie-data)
    response = client.get('/api/profile/')

    # Should get 401 Unauthorized
    assert response.status_code == 401, (
        f"Expected 401 for unauthenticated request, got {response.status_code}. "
        f"Authentication is not properly enforced."
    )


@pytest.mark.django_db
def test_jwt_authentication_still_works():
    """
    Verify that JWT authentication (email/password pattern) still works.

    This test ensures that adding session authentication support didn't
    break the existing JWT authentication flow.
    """
    # Create test user with verified email
    user = User.objects.create_user(
        username='jwt_user',
        email='jwt@example.com',
        password='testpass123',
        first_name='JWT',
        last_name='User'
    )

    # Mark email as verified (required for login)
    EmailAddress = apps.get_model('account', 'EmailAddress')  # noqa: N806
    EmailAddress.objects.create(
        user=user,
        email=user.email,
        verified=True,
        primary=True
    )

    client = Client()

    # Login to get JWT tokens
    import json
    response = client.post(
        '/api/token/',
        data=json.dumps({
            'login': 'jwt@example.com',  # Use 'login' field (accepts email or username)
            'password': 'testpass123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 200, f"Login failed: {response.status_code}, {response.content}"
    data = response.json()
    access_token = data['access_token']

    # Test: Use JWT token in Authorization header
    response = client.get(
        '/api/user-movie-data/by-tmdb-id/?tmdb_id=550',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )

    # Should get 200 or 404, NOT 401
    assert response.status_code in [200, 404], (
        f"JWT auth failed: got {response.status_code}, expected 200 or 404. "
        f"JWT authentication broken after adding session support."
    )
