"""
Root-level pytest configuration for CineXplorer backend tests.

Provides common fixtures that can be used across all Django apps.
App-specific fixtures should be defined in their respective conftest.py files.

Fixtures:
    - api_client: Django test client for API requests
    - user: Test user instance with standard credentials
    - auth_client: Authenticated Django test client

Type Safety:
    All fixtures include full type annotations for Pyright strict mode.
    Uses django-stubs for complete Django type coverage.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from django.test import Client

    from apps.authentication.models import User


@pytest.fixture
def api_client() -> Client:
    """
    Provide Django test client for API requests.

    This is the base client fixture without authentication.
    Use for testing public endpoints or when you need to
    explicitly handle authentication in the test.

    Returns:
        Django test client instance

    Example:
        def test_public_endpoint(api_client):
            response = api_client.get('/api/health/')
            assert response.status_code == 200
    """
    from django.test import Client

    return Client()


@pytest.fixture
def user(db: None) -> User:
    """
    Create and return a test user with standard credentials.

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
    from apps.authentication.models import User

    return User.objects.create_user(
        email="testuser@example.com",
        password="testpass123",
        username="testuser",
    )


@pytest.fixture
def auth_client(api_client: Client, user: User) -> Client:
    """
    Provide authenticated Django test client.

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
    api_client.force_login(user)  # type: ignore[arg-type]  # Django test client accepts AbstractBaseUser
    return api_client
