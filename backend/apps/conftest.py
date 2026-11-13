"""Root-level pytest configuration for CineXplorer backend tests.

Provides common fixtures that can be used across all Django apps.
App-specific fixtures should be defined in their respective conftest.py files.

**Test Infrastructure Hierarchy:**
    1. **Core Shared Helpers**: `core/tests/test_helpers.py`
       - HTTP helpers (json_post, json_patch, json_put, get_csrf_token)
       - User creation (create_user)
       - Auth helpers (login_and_get_tokens, authenticate_client, create_fresh_client)
       - Types (HTTPStatus, UserParams)
    2. **Root Fixtures**: This file (api_client, user, auth_client)
    3. **Domain Fixtures**: `{app}/tests/conftest.py` (app-specific fixtures)
    4. **Domain Factories**: `{app}/tests/fixtures.py` (factory functions for test data)

Fixtures:
    - api_client: Django test client for API requests
    - user: Test user instance with standard credentials
    - auth_client: Authenticated Django test client
    - transactional_api_client: Client with transactional DB for session persistence

Note on `client` vs `api_client`:
    pytest-django provides a built-in `client` fixture that returns `Client()`.
    Our `api_client` fixture is identical but explicitly defined for clarity.
    Some fixtures (like `transactional_api_client`) use the built-in `client`
    to avoid circular dependencies while achieving the same result.

Type Safety:
    All fixtures include full type annotations for Pyright strict mode.
    Uses django-stubs for complete Django type coverage.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

import pytest
from freezegun import configure

if TYPE_CHECKING:
    from django.test import Client

    from apps.users.models import User


# Pytest measures setup/call/teardown here; keep its clock real across frozen fixtures.
configure(extend_ignore_list=["_pytest.timing"])


@pytest.fixture
def api_client() -> Client:
    """Provide Django test client for API requests.

    This is the base client fixture without authentication.
    Use for testing public endpoints or when you need to
    explicitly handle authentication in the test.

    Returns:
        Django test client instance

    Example:
        def test_public_endpoint(api_client):
            response = api_client.get('/api/health-check/')
            assert response.status_code == 200
    """
    from django.test import Client

    return Client()


@pytest.fixture
def user(db: None) -> User:
    """Create and return a test user with standard credentials.

    Requires database access (uses db fixture from pytest-django).
    Creates a user with predictable credentials for testing.

    Args:
        db: pytest-django database fixture (ensures DB access)

    Returns:
        Created User instance

    Example:
        def test_user_profile(user, api_client):
            # user is already created and saved to DB
            assert user.email == "testuser@example.com"
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()  # noqa: N806 - Django model naming convention

    # django-types limitation - UserManager.create_user type not inferred
    return cast(
        "User",
        User.objects.create_user(  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
            email="testuser@example.com",
            password="testpass123",
            username="testuser",
        ),
    )


@pytest.fixture
def auth_client(api_client: Client, user: User) -> Client:
    """Provide authenticated Django test client.

    Combines api_client and user fixtures to provide a client
    that's already authenticated with the test user. Useful for
    testing protected endpoints without repetitive login code.

    Args:
        api_client: Base Django test client
        user: Test user instance

    Returns:
        Authenticated Django test client (same instance as api_client)

    Example:
        def test_protected_endpoint(auth_client):
            response = auth_client.get('/api/me/')
            assert response.status_code == 200
    """
    # Force login with the test user
    api_client.force_login(user)  # pyright: ignore[reportArgumentType]  # Django test client accepts AbstractBaseUser
    return api_client


@pytest.fixture
def transactional_api_client(client: Client, transactional_db: None) -> Client:
    """Provide Django test client with transactional database access.

    Use this fixture when tests require session persistence across multiple
    requests (e.g., cross-page deduplication tests). The transactional_db
    fixture ensures database writes are committed between requests, allowing
    SessionMiddleware to load sessions created in previous requests.

    Without this fixture, sessions created via `request.session.create()` in
    one request won't be visible to subsequent requests because pytest-django
    wraps tests in transactions that aren't committed until test completion.

    Args:
        client: Django test client (built-in pytest-django fixture)
        transactional_db: pytest-django fixture ensuring real transactions

    Returns:
        Django test client with transactional DB support

    Example:
        def test_session_persists(transactional_api_client):
            response1 = transactional_api_client.get('/api/movies/?page=1')
            # Session created and committed to DB

            response2 = transactional_api_client.get('/api/movies/?page=2')
            # SessionMiddleware loads session from previous request
            # Cross-page deduplication now works correctly
    """
    return client
