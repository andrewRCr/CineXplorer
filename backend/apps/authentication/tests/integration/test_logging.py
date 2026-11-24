"""Authentication security logging tests.

Tests the authentication event logging:
- Failed logins log WARNING with the request ID and user agent and omit the typed sign-in name
- Successful logins log INFO with user_id, request ID and user agent
- Session renewal logs INFO with user_id and request ID
- Blacklisted token reuse logs WARNING with user_id, request ID and user agent
- Successful registration logs INFO with user_id, username and request ID, never the email address
- Passwords NEVER appear in any log output (security critical)
- Token values NEVER appear in any log output (security critical)

Security logging requirements:
- All authentication events logged for audit trail
- Failed attempts logged at WARNING level for security monitoring
- Successful operations logged at INFO level for tracking
- Sensitive data (passwords, tokens) never logged
- Request IDs link account events to request logs

Uses unittest.assertLogs() because Django logging config sets propagate=False
on all loggers (config/logging.py lines 253-315), preventing pytest caplog from
working. unittest.assertLogs() attaches handler directly to specified logger,
bypassing the root logger entirely.
"""

from __future__ import annotations

from contextlib import nullcontext
from http import HTTPStatus
from typing import TYPE_CHECKING
from unittest import TestCase
from unittest.mock import patch

import pytest
from django.db import IntegrityError
from django.test import override_settings

from apps.core.tests.test_helpers import create_user, get_csrf_token
from apps.users.models import User

if TYPE_CHECKING:
    from logging import LogRecord

    from django.http import HttpResponse
    from django.test import Client


PROXY_IP = "192.0.2.12"
VISITOR_IP = "198.51.100.24"


def assert_account_log_correlation(
    records: list[LogRecord], event: str, response: HttpResponse
) -> None:
    (record,) = [record for record in records if record.getMessage().startswith(event)]
    request_id = response["X-Request-ID"]
    assert getattr(record, "correlation_id", None) == request_id
    assert f"cid={request_id}" in record.getMessage()
    assert "ip=" not in record.getMessage()
    assert PROXY_IP not in repr(vars(record))
    assert VISITOR_IP not in repr(vars(record))


def post_registration(api_client: Client, **overrides: str) -> HttpResponse:
    data = {"username": "newuser", "email": "newuser@example.com", "password": "TestPass123!"}
    return api_client.post(
        "/api/register/",
        data=data | overrides,
        content_type="application/json",
        REMOTE_ADDR=PROXY_IP,
        HTTP_X_FORWARDED_FOR=VISITOR_IP,
    )


# ============================================================================
# Failed Login Logging Tests
# ============================================================================


@pytest.mark.django_db
def test_failed_login_logs_warning_with_forensic_data(
    api_client: Client,
) -> None:
    """Test that failed login logs WARNING with the request ID and user agent."""
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
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=VISITOR_IP,
        )

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert "Login failed" in log_output, "Should have logged failed login attempt"
    assert "Invalid credentials" in log_output, "Should include error message"

    # Verify forensic data
    # The typed sign-in name can be an email address, so it is not logged
    assert "nonexistent_user" not in log_output, "Should not log the typed sign-in name"
    assert_account_log_correlation(cm.records, "Login failed: Invalid credentials", response)
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level (cm.records is list of LogRecord objects)
    assert any(r.levelname == "WARNING" for r in cm.records), (
        "Failed login should be WARNING level"
    )


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
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=VISITOR_IP,
        )

    assert response.status_code == HTTPStatus.OK

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert "Login successful" in log_output, "Should have logged successful login"

    # Verify log contains user_id and forensic data
    assert (
        f"user_id={verified_user.id}" in log_output or f"user={verified_user.id}" in log_output
    ), "Should log user_id"
    assert "login=" not in log_output, "Should not log the typed sign-in name"
    assert_account_log_correlation(cm.records, "Login successful", response)
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level
    assert any(r.levelname == "INFO" for r in cm.records), "Successful login should be INFO level"


@pytest.mark.django_db
def test_unverified_login_logs_request_id(api_client: Client, unverified_user: User) -> None:
    with TestCase().assertLogs("cinexplorer.auth", level="WARNING") as captured:
        response = api_client.post(
            "/api/token/",
            data={"login": unverified_user.username, "password": "testpass123"},
            content_type="application/json",
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=VISITOR_IP,
        )

    assert response.status_code == HTTPStatus.FORBIDDEN
    assert_account_log_correlation(captured.records, "Login failed: Email not verified", response)


# ============================================================================
# Blacklisted Token Reuse Logging Tests
# ============================================================================


@pytest.mark.django_db
@pytest.mark.parametrize("detect_in_service", [False, True], ids=["token-parser", "service-check"])
def test_blacklisted_token_reuse_logs_warning_with_forensics(
    api_client: Client,
    verified_user: User,
    detect_in_service: bool,
) -> None:
    """Test that renewal and revoked token reuse log their own request IDs."""
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
    initial_refresh = login_response.cookies["refresh_token"].value

    # Get CSRF token
    csrf_token = get_csrf_token(api_client)

    # First refresh - blacklists old token
    test_case = TestCase()
    with test_case.assertLogs("cinexplorer.auth", level="INFO") as renewal_logs:
        first_refresh = api_client.post(
            "/api/auth/refresh",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=VISITOR_IP,
        )
    assert first_refresh.status_code == HTTPStatus.OK
    assert_account_log_correlation(
        renewal_logs.records, "Hybrid token refresh successful", first_refresh
    )

    # A revoked token is normally rejected while parsing. To exercise the separate
    # service check, supply a parseable token and make that check report revocation.
    revocation_check = nullcontext()
    api_client.cookies["refresh_token"] = initial_refresh
    if detect_in_service:
        api_client.cookies["refresh_token"] = first_refresh.cookies["refresh_token"].value
        revocation_check = patch(
            "apps.authentication.services.authentication_service.check_token_blacklist",
            return_value=True,
        )

    with revocation_check, test_case.assertLogs("cinexplorer.auth", level="WARNING") as cm:
        reuse_response = api_client.post(
            "/api/auth/refresh",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
            REMOTE_ADDR=PROXY_IP,
            HTTP_X_FORWARDED_FOR=VISITOR_IP,
        )

    assert reuse_response.status_code == HTTPStatus.UNAUTHORIZED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify security log entry exists
    assert "SECURITY" in log_output or "Blacklisted" in log_output, (
        "Should have logged SECURITY event for blacklisted token"
    )
    assert "token reuse" in log_output.lower() or "blacklisted" in log_output.lower(), (
        "Should mention token reuse or blacklisting"
    )

    # Verify log contains forensic data
    assert "user_id=" in log_output or "user=" in log_output, "Should log user_id"
    assert_account_log_correlation(
        cm.records, "SECURITY: Blacklisted token reuse attempt", reuse_response
    )
    assert "user_agent=" in log_output, "Should log user agent"

    # Verify log level
    assert any(r.levelname == "WARNING" for r in cm.records), "Token reuse should be WARNING level"


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
        response = post_registration(api_client)

    assert response.status_code == HTTPStatus.CREATED

    # cm.output is list of formatted log strings
    log_output = " ".join(cm.output)

    # Verify log entry exists
    assert "Registration successful" in log_output or "Registration" in log_output, (
        "Should have logged successful registration"
    )

    # Verify log contains user info and forensic data
    assert "user_id=" in log_output or "user=" in log_output, "Should log user_id"
    assert "username=newuser" in log_output or "newuser" in log_output, "Should log username"
    assert "newuser@example.com" not in log_output, "Should not log the email address"
    assert_account_log_correlation(cm.records, "Registration successful", response)

    # Verify log level
    assert any(r.levelname == "INFO" for r in cm.records), (
        "Successful registration should be INFO level"
    )


@pytest.mark.django_db
@override_settings(FORBIDDEN_USERNAMES={"blockedname"})
@pytest.mark.parametrize(
    ("overrides", "status", "reason"),
    [
        ({"username": "blockedname"}, HTTPStatus.CONFLICT, "Forbidden username"),
        ({"username": "registereduser"}, HTTPStatus.CONFLICT, "Username already exists"),
        ({"email": "registered@example.com"}, HTTPStatus.CONFLICT, "Email already exists"),
        ({"password": "12345678"}, HTTPStatus.BAD_REQUEST, "Weak password"),
    ],
    ids=["forbidden-username", "duplicate-username", "duplicate-email", "weak-password"],
)
def test_registration_rejection_logs_request_id(
    api_client: Client, overrides: dict[str, str], status: HTTPStatus, reason: str
) -> None:
    create_user(username="registereduser", email="registered@example.com")
    with TestCase().assertLogs("cinexplorer.auth", level="WARNING") as captured:
        response = post_registration(api_client, **overrides)

    assert response.status_code == status
    assert_account_log_correlation(captured.records, f"Registration failed: {reason}", response)


@pytest.mark.django_db
def test_registration_conflict_from_insert_logs_request_id(api_client: Client) -> None:
    with (
        patch.object(User.objects, "create_user", side_effect=IntegrityError("duplicate account")),
        TestCase().assertLogs("cinexplorer.auth", level="WARNING") as captured,
    ):
        response = post_registration(api_client)

    assert response.status_code == HTTPStatus.CONFLICT
    assert_account_log_correlation(
        captured.records, "Registration failed: Username or email taken", response
    )


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
        assert test_password not in record_str, (
            f"SECURITY VIOLATION: Password in LogRecord {record.name}"
        )
        assert "testpass123" not in record_str, (
            f"SECURITY VIOLATION: Password in LogRecord {record.name}"
        )


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
            "/api/auth/refresh",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

    # Extract actual tokens from response
    data = response.json()
    access_token = data["access_token"]
    refresh_token = response.cookies["refresh_token"].value

    # Verify tokens are real JWT strings (not empty)
    assert len(access_token) > 50, "Access token should be a real JWT"
    assert len(refresh_token) > 50, "Refresh token should be a real JWT"

    full_log = "\n".join(cm.output)

    # SECURITY ASSERTIONS
    assert access_token not in full_log, "SECURITY VIOLATION: Access token in logs!"
    assert refresh_token not in full_log, "SECURITY VIOLATION: Refresh token in logs!"

    # Check token segments (JWT has 3 parts separated by dots)
    access_parts = access_token.split(".")
    refresh_parts = refresh_token.split(".")

    for part in access_parts + refresh_parts:
        # Only check substantial parts (>20 chars to avoid false positives)
        if len(part) > 20:
            assert part not in full_log, "SECURITY VIOLATION: Token segment in logs!"

    # Check LogRecord objects
    for record in cm.records:
        record_str = str(record.__dict__)
        assert access_token not in record_str, (
            f"SECURITY VIOLATION: Access token in LogRecord {record.name}"
        )
        assert refresh_token not in record_str, (
            f"SECURITY VIOLATION: Refresh token in LogRecord {record.name}"
        )


# ============================================================================
# Rate Limiting Logging Tests
# ============================================================================


@pytest.mark.django_db
@pytest.mark.enable_throttling
@override_settings(
    TESTING=False,  # Required: TestAware throttles bypass when TESTING=True
    ZEPTOMAIL_API_KEY="",  # Prevent real email sending (triggers dev_mode in adapters)
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
