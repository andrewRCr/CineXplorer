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


@pytest.fixture
def staging_proxy_settings() -> dict[str, int]:
    """Use proxy counts read from the real deployed configuration."""
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": "staging", "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["NINJA_NUM_PROXIES", "ALLAUTH_TRUSTED_PROXY_COUNT"],
    )
    assert all(isinstance(value, int) for value in values.values())
    return {name: value for name, value in values.items() if isinstance(value, int)}


@pytest.mark.parametrize(
    "environment,expected",
    [
        ("staging", {"NINJA_NUM_PROXIES": 1, "ALLAUTH_TRUSTED_PROXY_COUNT": 1}),
        ("production", {"NINJA_NUM_PROXIES": 1, "ALLAUTH_TRUSTED_PROXY_COUNT": 1}),
        ("development", {}),
    ],
)
def test_proxy_counts_match_environment(environment: str, expected: dict[str, int]) -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["NINJA_NUM_PROXIES", "ALLAUTH_TRUSTED_PROXY_COUNT"],
    )
    assert values == expected


def test_allauth_uses_last_forwarded_address(staging_proxy_settings: dict[str, int]) -> None:
    from allauth.account.adapter import get_adapter
    from django.test import RequestFactory

    request = RequestFactory().get(
        "/", HTTP_X_FORWARDED_FOR="198.51.100.7, 203.0.113.9", REMOTE_ADDR="172.16.0.2"
    )
    with override_settings(**staging_proxy_settings):
        assert get_adapter().get_client_ip(request) == "203.0.113.9"


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(TESTING=False, ZEPTOMAIL_API_KEY="")
@pytest.mark.parametrize("same_client", [True, False])
def test_forwarded_clients_share_only_their_own_login_limit(
    api_client: Client,
    verified_user: User,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
    staging_proxy_settings: dict[str, int],
    same_client: bool,
) -> None:
    payload = {"login": verified_user.username, "password": "testpass123"}
    with override_settings(**staging_proxy_settings):
        for _ in range(5):
            assert (
                api_client.post(
                    "/api/token/",
                    payload,
                    content_type="application/json",
                    HTTP_X_FORWARDED_FOR="198.51.100.7, 203.0.113.9",
                ).status_code
                == 200
            )
        header = "192.0.2.4, 203.0.113.9" if same_client else "192.0.2.4, 203.0.113.10"
        assert api_client.post(
            "/api/token/",
            payload,
            content_type="application/json",
            HTTP_X_FORWARDED_FOR=header,
        ).status_code == (429 if same_client else 200)
        if not same_client:
            assert (
                api_client.post(
                    "/api/token/",
                    payload,
                    content_type="application/json",
                    HTTP_X_FORWARDED_FOR="198.51.100.7, 203.0.113.9",
                ).status_code
                == 429
            )


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(TESTING=False, ZEPTOMAIL_API_KEY="")
def test_frontend_logs_throttle_without_writing_rejected_report(
    api_client: Client,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    from unittest import TestCase

    payload = {"level": "INFO", "message": "Throttle test", "timestamp": "2026-11-01T00:00:00Z"}
    with TestCase().assertLogs("frontend", level="INFO") as captured:
        for _ in range(30):
            assert (
                api_client.post("/api/logs/", payload, content_type="application/json").status_code
                == 201
            )
        response = api_client.post("/api/logs/", payload, content_type="application/json")
    assert response.status_code == 429
    assert len(captured.records) == 30


@pytest.mark.enable_throttling
@pytest.mark.django_db
@override_settings(TESTING=False, ZEPTOMAIL_API_KEY="")
def test_frontend_logs_do_not_consume_login_limit(
    api_client: Client,
    verified_user: User,
    clear_throttle_cache: Iterator[None],
    enable_throttling_for_test: Iterator[None],
) -> None:
    payload = {"level": "INFO", "message": "Throttle test", "timestamp": "2026-11-01T00:00:00Z"}
    for _ in range(30):
        assert (
            api_client.post("/api/logs/", payload, content_type="application/json").status_code
            == 201
        )
    for _ in range(5):
        assert (
            api_client.post(
                "/api/token/",
                {"login": verified_user.username, "password": "testpass123"},
                content_type="application/json",
            ).status_code
            == 200
        )
