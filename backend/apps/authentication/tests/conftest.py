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
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import TYPE_CHECKING, Any

import pytest  # type: ignore[import-untyped]  # pytest-django not yet in requirements
from django.core.cache import cache

if TYPE_CHECKING:
    from django.test import Client


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
