"""Pytest configuration for authentication app tests.

Provides pytest fixtures for authentication testing. This module combines
throttling infrastructure, OAuth mocks, and convenience wrappers around
factory functions for common test data needs.

**Test Infrastructure Hierarchy:**
    1. **Core Shared Helpers**: `core/tests/test_helpers.py`
       - HTTP helpers (json_post, json_patch, json_put, get_csrf_token)
       - User creation (create_user)
       - Auth helpers (login_and_get_tokens, authenticate_client, create_fresh_client)
       - Types (HTTPStatus, UserParams)
    2. **Root Fixtures**: `apps/conftest.py`
       - api_client, user, auth_client
    3. **Domain Fixtures**: This file (authentication-specific fixtures)
    4. **Domain Factories**: `fixtures.py` (create_social_app, create_register_payload, etc.)

Fixture Architecture:
    This conftest.py provides pytest fixtures (dependency-injected, single instance).
    For tests needing multiple instances or custom parameters, use the factory
    functions in fixtures.py instead (e.g., create_user(), create_social_app()).

Available Fixtures:

    Throttling Infrastructure:
        - use_dummy_cache: Autouse settings lifetime; default cache is unchanged
        - enable_throttling_for_test: Switches to LocMemCache for marked tests
        - clear_throttle_cache: Clears throttle cache between tests
        - authenticated_client_with_throttling: Authenticated client with throttling

    OAuth Mocking:
        - google_oauth_provider: Mock Google OAuth provider
        - github_oauth_provider: Mock GitHub OAuth provider
        - oauth_request_patcher: Context manager for patching OAuth HTTP requests

    Test Data (convenience wrappers around fixtures.py factory functions):
        - verified_user: User with verified email (standard credentials)
        - unverified_user: User with unverified email
        - register_payload: Registration API payload dict
        - login_payload: Login API payload dict

Pytest Markers:
    - enable_throttling: Mark tests that need real throttling behavior

Example Usage:
    # Simple case: use fixtures (this file)
    def test_user_profile(verified_user):
        assert verified_user.emailaddress_set.filter(verified=True).exists()

    # Complex case: use factory functions (fixtures.py)
    def test_email_verification_states():
        user1 = create_user(email='user1@example.com', email_verified=True)
        user2 = create_user(email='user2@example.com', email_verified=False)
        assert user1.emailaddress_set.filter(verified=True).exists()
        assert not user2.emailaddress_set.filter(verified=True).exists()

    # Throttling test
    @pytest.mark.enable_throttling
    def test_login_rate_limiting(client, clear_throttle_cache):
        for i in range(5):
            response = client.post('/api/token/', data)
            assert response.status_code == 200
        response = client.post('/api/token/', data)  # 6th attempt
        assert response.status_code == 429

    # OAuth testing
    def test_google_oauth(client, google_oauth_provider, oauth_request_patcher):
        with oauth_request_patcher('google') as (mock_post, mock_get):
            token_mock, user_info_mock = google_oauth_provider.mock_complete_flow()
            mock_post.return_value = token_mock
            mock_get.return_value = user_info_mock
            response = client.get('/accounts/google/login/callback/', {...})
            assert response.status_code == 200
"""

from __future__ import annotations

from collections.abc import Generator, Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any
from unittest.mock import Mock, patch

import pytest  # pytest-django not yet in requirements
from django.core.cache import cache

if TYPE_CHECKING:
    from django.test import Client

# Import OAuth mock classes from oauth_mocks module
from apps.authentication.tests.oauth_mocks import (
    MockGitHubOAuth,
    MockGoogleOAuth,
)


@pytest.fixture(autouse=True)  # pytest decorator type
def use_dummy_cache(settings: object) -> None:
    """Keep the default cache while test-aware throttles bypass limits.

    Marked tests request enable_throttling_for_test to configure LocMemCache
    for real throttling. This fixture does not replace the default cache.

    Args:
        settings: Keep Django's settings fixture active for the test.
    """


@pytest.fixture  # pytest decorator type
def enable_throttling_for_test(
    request: Any,  # noqa: ANN401 - pytest.FixtureRequest not in stubs
    settings: Any,  # noqa: ANN401 - Django settings dynamic
) -> Iterator[None]:
    """Switch to LocMemCache for tests marked with @pytest.mark.enable_throttling.

    clear_throttle_cache depends on this fixture, so marked tests install
    LocMemCache before any cache clearing. Both fixtures finish their cleanup
    before the settings fixture restores the original cache configuration.

    Args:
        request: Pytest fixture request object (provides marker info)
        settings: Django settings fixture from pytest-django

    Yields:
        None: Context manager for test execution
    """
    # Check if test has enable_throttling marker
    if request.node.get_closest_marker("enable_throttling"):
        # Switch to LocMemCache for real throttling
        # LocMemCache is in-memory cache suitable for testing (no Redis needed)
        # Override CACHES setting for this test only
        settings.CACHES = {  # Django settings dynamic
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "throttle-test-cache",
            }
        }

    yield

    # Teardown: Clear cache after test
    cache.clear()


@pytest.fixture  # pytest decorator type
def clear_throttle_cache(enable_throttling_for_test: None) -> Iterator[None]:
    """Clear throttle cache before and after test execution.

    Use this fixture in tests that need a clean throttle state,
    especially when testing rate limiting boundaries (e.g., "exactly
    5 requests should succeed, 6th should fail").

    Example:
        @pytest.mark.enable_throttling
        def test_rate_limit(client, clear_throttle_cache):
            # Cache is guaranteed clean here
            ...

    Args:
        enable_throttling_for_test: Configure the marked test's cache before clearing.

    Yields:
        None: Context manager for test execution
    """
    # Clear cache before test
    cache.clear()

    yield

    # Clear cache after test (cleanup)
    cache.clear()


@pytest.fixture  # pytest decorator type
def authenticated_client_with_throttling(client: Client, verified_user: Any) -> Client:  # noqa: ANN401
    """Provide authenticated client with throttling enabled.

    This fixture combines authentication setup with the throttling flag,
    useful for testing authenticated endpoints with rate limiting.

    Uses the hybrid JWT authentication pattern (Bearer access token + refresh-token cookie)
    to authenticate the client with a verified user.

    Args:
        client: Django test client fixture
        verified_user: User fixture with verified email

    Returns:
        Authenticated client with Bearer header and refresh-token cookie

    Example:
        @pytest.mark.enable_throttling
        def test_refresh_rate_limit(authenticated_client_with_throttling):
            # Client is authenticated with JWT tokens, throttling enabled
            response = authenticated_client_with_throttling.post('/api/auth/refresh')
            assert response.status_code in (200, 429)

    Note:
        This fixture uses verified_user fixture internally, so the user
        has username 'testuser' and password 'testpass123' by default.
        See authentication.tests.fixtures.create_user() for details.
    """
    from apps.core.tests.test_helpers import authenticate_client

    # Authenticate using hybrid JWT pattern (sets Bearer access token + refresh-token cookie)
    authenticate_client(client, verified_user.username, "testpass123")

    # Set throttling flag for test-aware throttle classes
    client._test_enable_throttling = True  # pyright: ignore[reportAttributeAccessIssue]

    return client


# ============================================================================
# OAuth Mock Fixtures
# ============================================================================
# These fixtures provide mock OAuth providers for testing OAuth authentication
# flows without requiring real external API calls to Google, GitHub, etc.
# ============================================================================


@pytest.fixture  # pytest decorator type
def google_oauth_provider() -> MockGoogleOAuth:
    """Provide a mock Google OAuth provider for testing OAuth flows.

    Returns a fully configured MockGoogleOAuth instance that can simulate
    Google's OAuth 2.0 authentication flow. Use the provider's methods to
    create mock responses for token exchange and user info requests.

    Returns:
        Configured MockGoogleOAuth instance

    Example:
        def test_google_login(client, google_oauth_provider):
            # Create mock OAuth responses
            token_mock, user_info_mock = google_oauth_provider.mock_complete_flow(
                user_email='test@example.com',
                user_id='google_123'
            )

            # Use with oauth_request_patcher to test the full flow
            with oauth_request_patcher('google') as (mock_post, mock_get):
                mock_post.return_value = token_mock
                mock_get.return_value = user_info_mock
                response = client.get('/accounts/google/login/callback/', {
                    'code': 'test_code',
                    'state': 'test_state'
                })
                assert response.status_code == 302  # Redirect after successful login
    """
    return MockGoogleOAuth()


@pytest.fixture  # pytest decorator type
def github_oauth_provider() -> MockGitHubOAuth:
    """Provide a mock GitHub OAuth provider for testing OAuth flows.

    Returns a fully configured MockGitHubOAuth instance that can simulate
    GitHub's OAuth 2.0 authentication flow. GitHub requires an additional
    email verification endpoint, which is handled by the provider.

    Returns:
        Configured MockGitHubOAuth instance

    Example:
        def test_github_login(client, github_oauth_provider):
            # Create mock OAuth responses (includes email verification)
            token_mock, user_info_mock, email_mock = github_oauth_provider.mock_complete_flow(
                user_email='test@example.com',
                user_id='github_456'
            )

            # Use with oauth_request_patcher to test the full flow
            with oauth_request_patcher('github') as (mock_post, mock_get):
                mock_post.return_value = token_mock
                # GitHub needs two GET requests (user info + email)
                mock_get.side_effect = [user_info_mock, email_mock]
                response = client.get('/accounts/github/login/callback/', {
                    'code': 'test_code',
                    'state': 'test_state'
                })
                assert response.status_code == 302  # Redirect after successful login
    """
    return MockGitHubOAuth()


@pytest.fixture  # pytest decorator type
def oauth_request_patcher() -> Any:  # noqa: ANN401 - complex callable type
    """Provide a context manager for patching OAuth HTTP requests.

    This fixture returns a function that creates a context manager for patching
    the requests.post and requests.get calls made during OAuth flows. Use this
    to mock the external HTTP requests to OAuth providers.

    Returns:
        Function that takes provider name and returns context manager yielding
        (mock_post, mock_get) tuple

    Example:
        def test_oauth_flow(client, google_oauth_provider, oauth_request_patcher):
            token_mock, user_info_mock = google_oauth_provider.mock_complete_flow()

            with oauth_request_patcher('google') as (mock_post, mock_get):
                # Configure mocks for OAuth flow
                mock_post.return_value = token_mock
                mock_get.return_value = user_info_mock

                # Test OAuth callback
                response = client.get('/accounts/google/login/callback/', {
                    'code': 'auth_code',
                    'state': 'csrf_state'
                })

                # Verify mocks were called
                assert mock_post.called
                assert mock_get.called
                assert response.status_code == 302

    Note:
        Supported providers: 'google', 'github'
        Raises ValueError for unsupported provider names
    """

    @contextmanager
    def _patch_oauth_requests(provider: str) -> Generator[tuple[Mock, Mock]]:
        """Context manager for patching OAuth HTTP requests.

        Args:
            provider: OAuth provider name ('google' or 'github')

        Yields:
            Tuple of (mock_post, mock_get) for patched requests

        Raises:
            ValueError: If provider is not 'google' or 'github'
        """
        if provider not in ("google", "github"):
            raise ValueError(f"Unsupported provider: {provider}")

        with patch("requests.post") as mock_post, patch("requests.get") as mock_get:
            yield mock_post, mock_get

    return _patch_oauth_requests


# ============================================================================
# Test Data Convenience Fixtures
# ============================================================================
# These fixtures wrap factory functions from fixtures.py for common single-
# instance test data needs. For tests requiring multiple instances or custom
# parameters, import and call the factory functions directly.
# ============================================================================


@pytest.fixture  # pytest decorator type
def verified_user(db: None) -> Any:  # noqa: ANN401 - User type from fixtures module
    """Provide a user with verified email address.

    Wraps fixtures.create_user() with default parameters and email_verified=True.
    For single-instance tests that need a standard verified user.

    Args:
        db: pytest-django database fixture (ensures DB access)

    Returns:
        User instance with verified email

    Example:
        def test_user_can_login(verified_user, api_client):
            response = api_client.post('/api/token/', {
                'username': verified_user.username,
                'password': 'testpass123'
            })
            assert response.status_code == 200

    Note:
        For multiple users or custom parameters, use create_user() directly:
        user1 = create_user(username='first', email='custom1@example.com')
        user2 = create_user(username='second', email='custom2@example.com', email_verified=False)
    """
    from apps.core.tests.test_helpers import create_user

    return create_user(email_verified=True)


@pytest.fixture  # pytest decorator type
def unverified_user(db: None) -> Any:  # noqa: ANN401 - User type from fixtures module
    """Provide a user with unverified email address.

    Wraps fixtures.create_unverified_user() for single-instance tests
    that need a user without email verification.

    Args:
        db: pytest-django database fixture (ensures DB access)

    Returns:
        User instance with unverified email

    Example:
        def test_unverified_user_blocked(unverified_user, api_client):
            api_client.force_login(unverified_user)
            response = api_client.get('/api/protected/')
            assert response.status_code == 403
    """
    from apps.authentication.tests.fixtures import create_unverified_user

    return create_unverified_user()


@pytest.fixture  # pytest decorator type
def register_payload() -> Any:  # noqa: ANN401 - RegisterPayload type from fixtures
    """Provide a registration API payload with default values.

    Wraps fixtures.create_register_payload() for tests that need standard
    registration data without customization.

    Returns:
        Registration payload dict with standard test values

    Example:
        def test_user_registration(api_client, register_payload):
            response = api_client.post('/api/register/', register_payload)
            assert response.status_code == 201

    Note:
        For custom registration data, use create_register_payload() directly:
        payload = create_register_payload(
            username='customuser',
            email='custom@example.com'
        )
    """
    from apps.authentication.tests.fixtures import create_register_payload

    return create_register_payload()


@pytest.fixture  # pytest decorator type
def login_payload() -> Any:  # noqa: ANN401 - LoginPayload type from fixtures
    """Provide a login API payload with default values (username-based).

    Wraps fixtures.create_login_payload() for tests that need standard
    login credentials without customization.

    Returns:
        Login payload dict with username and password

    Example:
        def test_user_login(api_client, verified_user, login_payload):
            response = api_client.post('/api/token/', login_payload)
            assert response.status_code == 200

    Note:
        For email-based login or custom credentials, use create_login_payload():
        payload = create_login_payload(
            identifier='user@example.com',
            password='custom123',
            use_email=True
        )
    """
    from apps.authentication.tests.fixtures import create_login_payload

    return create_login_payload()


def pytest_configure(config: Any) -> None:  # noqa: ANN401 - pytest.Config not in stubs
    """Register custom pytest markers.

    Markers:
        enable_throttling: Mark tests that need real throttling behavior
                          (uses LocMemCache instead of DummyCache)
    """
    config.addinivalue_line(
        "markers",
        "enable_throttling: Enable real rate limiting for this test "
        "(uses LocMemCache instead of DummyCache)",
    )
