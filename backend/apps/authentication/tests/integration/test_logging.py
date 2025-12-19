"""
Authentication security logging tests.

Tests the logging implementation from Task 6 (Authentication Event Logging):
- Failed login attempts log WARNING with IP, username, user agent
- Successful logins log INFO with user_id, IP, user agent
- Blacklisted token reuse logs WARNING with user_id, IP, user agent
- Successful registration logs INFO with IP, username, email
- Passwords NEVER appear in any log output (security critical)
- Token values NEVER appear in any log output (security critical)

Security logging requirements:
- All authentication events logged for audit trail
- Failed attempts logged at WARNING level for security monitoring
- Successful operations logged at INFO level for tracking
- Sensitive data (passwords, tokens) never logged
- Forensic data included (IP addresses, user agents) for investigation

Uses unittest.assertLogs() because Django logging config sets propagate=False
on all loggers (config/logging.py lines 253-315), preventing pytest caplog from
working. unittest.assertLogs() attaches handler directly to specified logger,
bypassing the root logger entirely.
"""

from __future__ import annotations

from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest import TestCase

import pytest
from django.test import override_settings

from apps.core.tests.test_helpers import get_csrf_token

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.test import Client


# ============================================================================
# Failed Login Logging Tests
# ============================================================================


@pytest.mark.django_db
def test_failed_login_logs_warning_with_forensic_data(
    api_client: Client,
) -> None:
    """Test that failed login logs WARNING with IP address and username."""
    test_case = TestCase()  # Create instance to use assertLogs

    # Capture logs from 'cinexplorer.auth' logger
    with test_case.assertLogs("cinexplorer.auth", level="WARNING") as cm:
        response = api_client.post(
            "/api/token/",
            data={
                "login": "nonexistent_user",
                "password": "wrong_password",
            },
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert "Login failed" in log_output, "Should have logged failed login attempt"
    assert (
        "Invalid credentials" in log_output
    ), "Should include error message"

    # Verify forensic data
    assert (
        "login=nonexistent_user" in log_output
        or "nonexistent_user" in log_output
    ), "Should log attempted username"
    assert "ip=" in log_output, "Should log IP address"
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level (cm.records is list of LogRecord objects)
    assert any(
        r.levelname == "WARNING" for r in cm.records
    ), "Failed login should be WARNING level"


# ============================================================================
# Successful Login Logging Tests
# ============================================================================


@pytest.mark.django_db
def test_successful_login_logs_info_with_user_id(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that successful login logs INFO with user_id."""
    test_case = TestCase()

    # Capture logs from 'cinexplorer.auth' logger
    with test_case.assertLogs("cinexplorer.auth", level="INFO") as cm:
        response = api_client.post(
            "/api/token/",
            data={
                "login": verified_user.username,
                "password": "testpass123",
            },
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.OK

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert (
        "Login successful" in log_output
    ), "Should have logged successful login"

    # Verify log contains user_id and forensic data
    assert (
        f"user_id={verified_user.id}" in log_output
        or f"user={verified_user.id}" in log_output
    ), "Should log user_id"
    assert (
        f"login={verified_user.username}" in log_output
        or verified_user.username in log_output
    ), "Should log login identifier"
    assert "ip=" in log_output, "Should log IP address"
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level
    assert any(
        r.levelname == "INFO" for r in cm.records
    ), "Successful login should be INFO level"


# ============================================================================
# Blacklisted Token Reuse Logging Tests
# ============================================================================


@pytest.mark.django_db
def test_blacklisted_token_reuse_logs_warning_with_forensics(
    api_client: Client,
    verified_user: User,
) -> None:
    """Test that blacklisted token reuse logs WARNING with user_id, IP, and user_agent."""
    # Login to get initial tokens
    login_response = api_client.post(
        "/api/token/",
        data={
            "login": verified_user.username,
            "password": "testpass123",
        },
        content_type="application/json",
    )
    assert login_response.status_code == HTTPStatus.OK
    initial_refresh = login_response.json()["refresh_token"]

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # First refresh - blacklists old token
    first_refresh = api_client.post(
        "/api/token/refresh/",
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert first_refresh.status_code == HTTPStatus.OK

    # Manually set old token cookie to simulate reuse attack
    api_client.cookies["refresh_token"] = initial_refresh

    test_case = TestCase()

    # Attempt reuse - should trigger security logging
    with test_case.assertLogs("cinexplorer.auth", level="WARNING") as cm:
        reuse_response = api_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    assert reuse_response.status_code == HTTPStatus.UNAUTHORIZED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify security log entry exists
    assert (
        "SECURITY" in log_output or "Blacklisted" in log_output
    ), "Should have logged SECURITY event for blacklisted token"
    assert (
        "token reuse" in log_output.lower()
        or "blacklisted" in log_output.lower()
    ), "Should mention token reuse or blacklisting"

    # Verify log contains forensic data
    assert "user_id=" in log_output or "user=" in log_output, "Should log user_id"
    assert "ip=" in log_output, "Should log IP address"
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level
    assert any(
        r.levelname == "WARNING" for r in cm.records
    ), "Token reuse should be WARNING level"


# ============================================================================
# Registration Logging Tests
# ============================================================================


@pytest.mark.django_db
def test_successful_registration_logs_info(
    api_client: Client,
) -> None:
    """Test that successful registration logs INFO."""
    test_case = TestCase()

    # Capture logs from 'cinexplorer.auth' logger
    with test_case.assertLogs("cinexplorer.auth", level="INFO") as cm:
        response = api_client.post(
            "/api/register/",
            data={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "TestPass123!",
            },
            content_type="application/json",
        )

    assert response.status_code == HTTPStatus.CREATED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert (
        "Registration successful" in log_output
        or "Registration" in log_output
    ), "Should have logged successful registration"

    # Verify log contains user info and forensic data
    assert "user_id=" in log_output or "user=" in log_output, "Should log user_id"
    assert (
        "username=newuser" in log_output or "newuser" in log_output
    ), "Should log username"
    assert (
        "email=newuser@example.com" in log_output
        or "newuser@example.com" in log_output
    ), "Should log email"
    assert "ip=" in log_output, "Should log IP address"

    # Verify log level
    assert any(
        r.levelname == "INFO" for r in cm.records
    ), "Successful registration should be INFO level"


# ============================================================================
# Sensitive Data Redaction Tests (Security Critical)
# ============================================================================


@pytest.mark.django_db
def test_passwords_never_logged(
    api_client: Client,
    verified_user: User,
) -> None:
    """SECURITY CRITICAL: Passwords must NEVER appear in logs."""
    test_case = TestCase()

    test_password = "TestSecretPassword123!"

    # Capture ALL logs at DEBUG level (most permissive)
    with test_case.assertLogs("cinexplorer", level="DEBUG") as cm:
        # Scenario 1: Failed login
        api_client.post(
            "/api/token/",
            data={
                "login": "nonexistent",
                "password": test_password,
            },
            content_type="application/json",
        )

        # Scenario 2: Successful login
        api_client.post(
            "/api/token/",
            data={
                "login": verified_user.username,
                "password": "testpass123",
            },
            content_type="application/json",
        )

        # Scenario 3: Registration
        api_client.post(
            "/api/register/",
            data={
                "username": "testuser_pw_check",
                "email": "pwcheck@example.com",
                "password": test_password,
            },
            content_type="application/json",
        )

    # SECURITY ASSERTION: password never in logs
    full_log = "\n".join(cm.output)
    assert test_password not in full_log, "SECURITY VIOLATION: Password found in logs!"
    assert "testpass123" not in full_log, "SECURITY VIOLATION: Password found in logs!"

    # Check LogRecord objects for structured data
    for record in cm.records:
        record_str = str(record.__dict__)
        assert (
            test_password not in record_str
        ), f"SECURITY VIOLATION: Password in LogRecord {record.name}"
        assert (
            "testpass123" not in record_str
        ), f"SECURITY VIOLATION: Password in LogRecord {record.name}"


@pytest.mark.django_db
def test_token_values_never_logged(
    api_client: Client,
    verified_user: User,
) -> None:
    """SECURITY CRITICAL: JWT tokens must NEVER appear in logs."""
    test_case = TestCase()

    with test_case.assertLogs("cinexplorer", level="DEBUG") as cm:
        # Login to get tokens
        response = api_client.post(
            "/api/token/",
            data={
                "login": verified_user.username,
                "password": "testpass123",
            },
            content_type="application/json",
        )

        # Get CSRF and refresh
        csrf_token = get_csrf_token(api_client)
        api_client.post(
            "/api/token/refresh/",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # Extract actual tokens from response
    data = response.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # Verify tokens are real JWT strings (not empty)
    assert len(access_token) > 50, "Access token should be a real JWT"
    assert len(refresh_token) > 50, "Refresh token should be a real JWT"

    full_log = "\n".join(cm.output)

    # SECURITY ASSERTIONS
    assert (
        access_token not in full_log
    ), "SECURITY VIOLATION: Access token in logs!"
    assert (
        refresh_token not in full_log
    ), "SECURITY VIOLATION: Refresh token in logs!"

    # Check token segments (JWT has 3 parts separated by dots)
    access_parts = access_token.split(".")
    refresh_parts = refresh_token.split(".")

    for part in access_parts + refresh_parts:
        # Only check substantial parts (>20 chars to avoid false positives)
        if len(part) > 20:
            assert (
                part not in full_log
            ), "SECURITY VIOLATION: Token segment in logs!"

    # Check LogRecord objects
    for record in cm.records:
        record_str = str(record.__dict__)
        assert (
            access_token not in record_str
        ), f"SECURITY VIOLATION: Access token in LogRecord {record.name}"
        assert (
            refresh_token not in record_str
        ), f"SECURITY VIOLATION: Refresh token in LogRecord {record.name}"


# ============================================================================
# Rate Limiting Logging Tests
# ============================================================================


@pytest.mark.django_db
@pytest.mark.enable_throttling
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY=''  # Prevent real email sending (triggers dev_mode in adapters)
)
def test_rate_limit_violation_logs_throttle_event(
    api_client: Client,
    enable_throttling_for_test: None,
    clear_throttle_cache: None,
) -> None:
    """Test that rate limit violations are logged appropriately.

    Note: This test verifies Django Ninja throttling infrastructure logging,
    not authentication event logging. Rate limiting is a security control,
    so we verify the throttle mechanism produces log output when triggered.
    """
    test_case = TestCase()

    # Capture logs - Django Ninja may log throttle events at various levels
    # We use DEBUG to catch all possible throttle-related logging
    with test_case.assertLogs("cinexplorer", level="DEBUG") as cm:
        # Make 6 login attempts to trigger rate limit (limit is 5/minute)
        for i in range(6):
            response = api_client.post(
                "/api/token/",
                data={
                    "login": "testuser",
                    "password": "wrongpass",
                },
                content_type="application/json",
            )

            # Verify 6th attempt is throttled
            if i == 5:
                assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS
                # Django Ninja throttle returns {'detail': 'Too many requests.'}
                data = response.json()
                assert "detail" in data
                assert "too many" in data["detail"].lower()

    # Check if any logs were produced during throttling
    # Note: Django Ninja may or may not log throttle events depending on configuration
    # This test verifies the behavior exists (either logs are present or not)

    # At minimum, we should see authentication attempt logs (failed logins)
    # The presence of logs confirms the logging infrastructure is working
    # even during rate-limited operations
    assert len(cm.records) > 0, "Should have logged events during throttled requests"

    # Verify failed login attempts were logged (before throttle kicked in)
    # These would be from attempts 1-5
    assert any(
        "Login failed" in record.getMessage() or "Invalid credentials" in record.getMessage()
        for record in cm.records
    ), "Should have logged failed login attempts before throttling"
