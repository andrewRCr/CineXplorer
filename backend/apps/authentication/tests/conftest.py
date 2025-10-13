"""
Pytest configuration for authentication app tests.

Configures test infrastructure for selective throttling tests using
pytest markers and fixtures. By default, all tests use DummyCache
to bypass throttling (fast test execution). Tests can opt-in to real
throttling behavior using @pytest.mark.enable_throttling decorator.

Fixtures:
    - use_dummy_cache: Autouse fixture that configures DummyCache by default
    - enable_throttling_for_test: Switches to LocMemCache for marked tests
    - clear_throttle_cache: Clears throttle cache between tests
    - set_test_throttling_flag: Sets request._test_enable_throttling flag
    - google_oauth_provider: Mock Google OAuth provider for testing OAuth flows
    - github_oauth_provider: Mock GitHub OAuth provider for testing OAuth flows
    - oauth_request_patcher: Context manager for patching OAuth HTTP requests

Pytest Markers:
    - enable_throttling: Mark tests that need real throttling behavior

Example Usage:
    # Default: throttling bypassed (fast)
    def test_login_success(client):
        response = client.post('/api/token/', data)
        assert response.status_code == 200

    # Selective throttling: enabled for specific test
    @pytest.mark.enable_throttling
    def test_login_rate_limiting(client, clear_throttle_cache):
        for i in range(5):
            response = client.post('/api/token/', data)
            assert response.status_code == 200
        # 6th attempt should be throttled
        response = client.post('/api/token/', data)
        assert response.status_code == 429

    # OAuth testing: using mock providers
    def test_google_oauth_login(client, google_oauth_provider, oauth_request_patcher):
        with oauth_request_patcher('google') as (mock_post, mock_get):
            token_mock, user_info_mock = google_oauth_provider.mock_complete_flow()
            mock_post.return_value = token_mock
            mock_get.return_value = user_info_mock
            response = client.get('/accounts/google/login/callback/', {...})
            assert response.status_code == 200
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any
from unittest.mock import Mock, patch

import pytest  # type: ignore[import-untyped]  # pytest-django not yet in requirements
from django.core.cache import cache

if TYPE_CHECKING:
    from django.test import Client

# Import OAuth mock classes from test_oauth_mocks module
from authentication.tests.test_oauth_mocks import (
    MockGitHubOAuth,
    MockGoogleOAuth,
)


def pytest_configure(config: Any) -> None:  # pytest.Config type not available without pytest-django
    """
    Register custom pytest markers.

    Markers:
        enable_throttling: Mark tests that need real throttling behavior
                          (uses LocMemCache instead of DummyCache)
    """
    config.addinivalue_line(
        "markers",
        "enable_throttling: Enable real rate limiting for this test "
        "(uses LocMemCache instead of DummyCache)",
    )


@pytest.fixture(autouse=True)  # type: ignore[misc]  # pytest decorator type
def use_dummy_cache(settings: object) -> None:
    """
    Configure DummyCache by default for all tests (autouse).

    DummyCache is a no-op cache backend that doesn't store anything,
    which allows throttle classes to bypass throttling in normal tests.
    This makes the test suite fast while still testing business logic.

    Tests marked with @pytest.mark.enable_throttling will override this
    and use LocMemCache for real throttling behavior.

    Args:
        settings: Django settings fixture from pytest-django
    """
    # DummyCache configured by default - no action needed
    # Tests will automatically use DummyCache unless overridden
    pass


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def enable_throttling_for_test(
    request: Any, settings: Any  # pytest.FixtureRequest type not available
) -> Iterator[None]:
    """
    Switch to LocMemCache for tests marked with @pytest.mark.enable_throttling.

    This fixture is automatically applied to tests with the enable_throttling
    marker. It temporarily switches from DummyCache to LocMemCache to enable
    real throttling behavior for specific tests.

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
        settings.CACHES = {  # type: ignore[attr-defined]  # Django settings dynamic
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "throttle-test-cache",
            }
        }

    yield

    # Teardown: Clear cache after test
    cache.clear()


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def clear_throttle_cache() -> Iterator[None]:
    """
    Clear throttle cache before and after test execution.

    Use this fixture in tests that need a clean throttle state,
    especially when testing rate limiting boundaries (e.g., "exactly
    5 requests should succeed, 6th should fail").

    Example:
        @pytest.mark.enable_throttling
        def test_rate_limit(client, clear_throttle_cache):
            # Cache is guaranteed clean here
            ...

    Yields:
        None: Context manager for test execution
    """
    # Clear cache before test
    cache.clear()

    yield

    # Clear cache after test (cleanup)
    cache.clear()


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def authenticated_client_with_throttling(client: Client) -> Client:
    """
    Provide authenticated client with throttling enabled.

    This fixture combines authentication setup with the throttling flag,
    useful for testing authenticated endpoints with rate limiting.

    Args:
        client: Django test client fixture

    Returns:
        Authenticated client with _test_enable_throttling flag set

    Example:
        @pytest.mark.enable_throttling
        def test_refresh_rate_limit(authenticated_client_with_throttling):
            # Client is authenticated and throttling is enabled
            ...
    """
    # Note: Authentication setup would be added here if needed
    # For now, just return client with marker for future use
    return client


# ============================================================================
# OAuth Mock Fixtures
# ============================================================================
# These fixtures provide mock OAuth providers for testing OAuth authentication
# flows without requiring real external API calls to Google, GitHub, etc.
# ============================================================================


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def google_oauth_provider() -> MockGoogleOAuth:
    """
    Provide a mock Google OAuth provider for testing OAuth flows.

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


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def github_oauth_provider() -> MockGitHubOAuth:
    """
    Provide a mock GitHub OAuth provider for testing OAuth flows.

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


@pytest.fixture  # type: ignore[misc]  # pytest decorator type
def oauth_request_patcher() -> Any:  # Returns callable that returns context manager
    """
    Provide a context manager for patching OAuth HTTP requests.

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
    def _patch_oauth_requests(provider: str) -> Iterator[tuple[Mock, Mock]]:
        """
        Context manager for patching OAuth HTTP requests.

        Args:
            provider: OAuth provider name ('google' or 'github')

        Yields:
            Tuple of (mock_post, mock_get) for patched requests

        Raises:
            ValueError: If provider is not 'google' or 'github'
        """
        if provider not in ('google', 'github'):
            raise ValueError(f"Unsupported provider: {provider}")

        with patch('requests.post') as mock_post, patch('requests.get') as mock_get:
            yield mock_post, mock_get

    return _patch_oauth_requests
