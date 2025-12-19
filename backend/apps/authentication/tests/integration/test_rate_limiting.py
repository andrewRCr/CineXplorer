"""
Rate limiting tests for authentication endpoints.

Tests the throttling behavior:
- Login endpoint: 5 requests per minute (AnonRateThrottle)
- Registration endpoint: 3 requests per hour (AnonRateThrottle)
- Token refresh endpoint: 10 requests per minute (UserRateThrottle)

Uses test-aware throttle infrastructure with @pytest.mark.enable_throttling
marker for selective throttling in tests.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING

import pytest
from django.test import override_settings

from apps.core.tests.test_helpers import get_csrf_token

if TYPE_CHECKING:
    from collections.abc import Iterator

    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# Login Endpoint Rate Limiting (5/minute)
# ============================================================================


@pytest.mark.enable_throttling
@pytest.mark.django_db
def test_login_allows_5_rapid_attempts(
    api_client: Client,
    verified_user: User,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 5 rapid login attempts succeed within rate limit."""
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }

    # Make 5 rapid login attempts - all should succeed
    for attempt in range(1, 6):
        response = api_client.post(
            "/api/token/",
            data=login_data,
            content_type="application/json",
        )
        assert response.status_code == HTTPStatus.OK, (
            f"Attempt {attempt} failed: expected 200, got {response.status_code}"
        )
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY=''  # Prevent real email sending (triggers dev_mode in adapters)
)
def test_login_throttles_6th_attempt(
    api_client: Client,
    verified_user: User,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 6th login attempt within minute returns 429 Too Many Requests."""
    login_data = {
        "login": verified_user.username,
        "password": "testpass123",
    }

    # Make 5 successful attempts
    for _ in range(5):
        response = api_client.post(
            "/api/token/",
            data=login_data,
            content_type="application/json",
        )
        assert response.status_code == HTTPStatus.OK

    # 6th attempt should be throttled
    response = api_client.post(
        "/api/token/",
        data=login_data,
        content_type="application/json",
    )
    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS
    data = response.json()
    # Django Ninja throttle returns {'detail': 'Too many requests.'}
    assert "detail" in data
    assert "too many" in data["detail"].lower()


# ============================================================================
# Registration Endpoint Rate Limiting (3/hour)
# ============================================================================


@pytest.mark.enable_throttling
@pytest.mark.django_db
def test_registration_allows_3_attempts_in_hour(
    api_client: Client,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 3 registration attempts succeed within rate limit."""
    # Make 3 registration attempts with unique usernames
    for i in range(1, 4):
        register_data = {
            "username": f"newuser{i}",
            "email": f"newuser{i}@example.com",
            "password": "TestPass123!",
        }
        response = api_client.post(
            "/api/register/",
            data=register_data,
            content_type="application/json",
        )
        assert response.status_code == HTTPStatus.CREATED, (
            f"Registration {i} failed: expected 201, got {response.status_code}"
        )


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY=''  # Prevent real email sending (triggers dev_mode in adapters)
)
def test_registration_throttles_4th_attempt(
    api_client: Client,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 4th registration attempt within hour returns 429."""
    # Make 3 successful registrations
    for i in range(1, 4):
        register_data = {
            "username": f"newuser{i}",
            "email": f"newuser{i}@example.com",
            "password": "TestPass123!",
        }
        response = api_client.post(
            "/api/register/",
            data=register_data,
            content_type="application/json",
        )
        assert response.status_code == HTTPStatus.CREATED

    # 4th attempt should be throttled
    register_data = {
        "username": "newuser4",
        "email": "newuser4@example.com",
        "password": "TestPass123!",
    }
    response = api_client.post(
        "/api/register/",
        data=register_data,
        content_type="application/json",
    )
    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS
    data = response.json()
    # Django Ninja throttle returns {'detail': 'Too many requests.'}
    assert "detail" in data
    assert "too many" in data["detail"].lower()


# ============================================================================
# Token Refresh Endpoint Rate Limiting (10/minute)
# ============================================================================


@pytest.mark.enable_throttling
@pytest.mark.django_db
def test_token_refresh_allows_10_rapid_attempts(
    authenticated_client_with_throttling: Client,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 10 rapid token refresh attempts succeed within rate limit."""
    # Client is already authenticated with JWT tokens via fixture
    # Get CSRF token for refresh endpoint (required per Task 5)
    csrf_token = get_csrf_token(authenticated_client_with_throttling)

    # Now make 10 rapid refresh attempts - all should succeed
    # Note: We're testing throttling, not token rotation, so we expect
    # some failures from token blacklisting after rotation (that's correct behavior)
    # We just need to verify that throttling doesn't kick in before 10 attempts
    success_count = 0
    for attempt in range(1, 11):
        response = authenticated_client_with_throttling.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        # Either success (200) or blacklist error (401) is acceptable
        # as long as we're not throttled (429)
        assert response.status_code in (HTTPStatus.OK, HTTPStatus.UNAUTHORIZED), (
            f"Attempt {attempt}: expected 200 or 401, got {response.status_code}"
        )
        if response.status_code == HTTPStatus.OK:
            success_count += 1

    # At least the first refresh should succeed
    assert success_count >= 1, "Expected at least 1 successful refresh"


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY=''  # Prevent real email sending (triggers dev_mode in adapters)
)
def test_token_refresh_throttles_11th_attempt(
    authenticated_client_with_throttling: Client,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    """Test that 11th token refresh attempt within minute returns 429."""
    # Client is already authenticated with JWT tokens via fixture
    # Get CSRF token for refresh endpoint (required per Task 5)
    csrf_token = get_csrf_token(authenticated_client_with_throttling)

    # Make 10 refresh attempts (some may fail due to blacklist, that's OK)
    for _ in range(10):
        authenticated_client_with_throttling.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # 11th attempt should be throttled (regardless of token state)
    response = authenticated_client_with_throttling.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS
    data = response.json()
    # Django Ninja throttle returns {'detail': 'Too many requests.'}
    assert "detail" in data
    assert "too many" in data["detail"].lower()
