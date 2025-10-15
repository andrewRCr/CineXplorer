"""
Tests for the user API.

Rate Limiting Tests:
    By default, all tests bypass throttling using DummyCache (configured in conftest.py).
    This enables fast test execution while still testing business logic.

    To test rate limiting behavior, use @pytest.mark.enable_throttling decorator:

    Example:
        @pytest.mark.enable_throttling
        def test_login_rate_limiting(clear_throttle_cache):
            # This test will use real throttling (LocMemCache)
            for i in range(5):
                response = client.post('/api/token/', data)
                assert response.status_code == 200
            # 6th attempt should be throttled
            response = client.post('/api/token/', data)
            assert response.status_code == 429

    Available fixtures:
        - clear_throttle_cache: Clears cache before/after test (use with enable_throttling)
        - enable_throttling_for_test: Auto-applied to tests with enable_throttling marker

    See conftest.py for full fixture documentation.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, cast

import pytest
from allauth.account.models import EmailAddress
from core.tests.test_helpers import create_user, json_post
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.http import HttpResponse
    from django.test import Client

# Django Ninja uses standard HTTP status codes
# We use Django's test Client (not DRF's APIClient) for all API testing
from core.tests.test_helpers import HTTPStatus

HTTP_200_OK = HTTPStatus.OK
HTTP_201_CREATED = HTTPStatus.CREATED
HTTP_204_NO_CONTENT = HTTPStatus.NO_CONTENT
HTTP_400_BAD_REQUEST = HTTPStatus.BAD_REQUEST
HTTP_401_UNAUTHORIZED = HTTPStatus.UNAUTHORIZED
HTTP_403_FORBIDDEN = HTTPStatus.FORBIDDEN
HTTP_409_CONFLICT = HTTPStatus.CONFLICT
HTTP_422_UNPROCESSABLE_ENTITY = HTTPStatus.UNPROCESSABLE_ENTITY

# Django Ninja endpoints (use direct paths, not reverse() for Django Ninja)
CREATE_USER_URL: str = "/api/register/"
TOKEN_URL: str = "/api/token/"
ME_URL: str = "/api/profile/"


# =========================
# Helper Functions / Fixtures
# =========================


def create_payload(
    username: str = "testUser",
    email: str = "test@example.com",
    password: str = "testPass123",
) -> dict[str, str]:
    """Creates and returns a dictionary of values for test user creation."""
    return {
        "username": username,
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def authenticated_user(api_client: Client) -> tuple[Client, User]:
    """
    Create a user and authenticate them, returning (client, user).

    The client has JWT cookies set and is ready for authenticated requests.
    """
    from core.tests.test_helpers import authenticate_client

    user = create_user(
        username="privateUser",
        email="private@example.com",
        password="testpass123",
        first_name="Private",
        last_name="User",
    )  # create_user() creates verified email by default

    # Authenticate client (handles hybrid auth pattern automatically)
    authenticate_client(api_client, "privateUser", "testpass123")

    return api_client, user


@pytest.fixture
def registered_user(api_client: Client) -> tuple[Client, dict[str, str]]:
    """
    Register a new user via the API and return (client, user_data).

    Marks the email as verified to allow login. Supports --reuse-db flag.
    """
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }
    json_post(api_client, CREATE_USER_URL, cast(dict[str, object], user_data))

    # Mark email as verified for the test user to allow login
    # Use get_or_create + update to support --keepdb flag (reusing test database)
    user = get_user_model().objects.get(email=user_data["email"])
    email_address, created = EmailAddress.objects.get_or_create(
        user=user,
        email=user.email,  # type: ignore[attr-defined]  # _UserModel has email attribute
        defaults={"verified": True, "primary": True},
    )
    # If EmailAddress already existed (from previous test run), ensure it's verified
    if not created and not email_address.verified:
        email_address.verified = True
        email_address.save()

    return api_client, user_data


# =========================
# Public User API Tests
# =========================


@pytest.mark.django_db
def test_create_user_success(api_client: Client) -> None:
    """Tests creating a user; case: successful."""
    payload = create_payload()
    res = json_post(api_client, CREATE_USER_URL, cast(dict[str, object], payload))

    assert res.status_code == HTTP_201_CREATED
    user: User = get_user_model().objects.get(username=payload["username"])  # type: ignore[assignment]
    assert user.check_password(payload["password"])  # type: ignore[no-untyped-call]
    content_str: str = res.content.decode(res.charset or "utf-8")
    assert "password" not in content_str


@pytest.mark.django_db
def test_user_with_username_exists_error(api_client: Client) -> None:
    """Tests that an error is returned if user with same username already exists."""
    control_payload = create_payload()
    test_payload = create_payload(email="differentEmail@example.com")

    create_user(**control_payload)  # type: ignore[arg-type]
    res = json_post(api_client, CREATE_USER_URL, cast(dict[str, object], test_payload))

    assert res.status_code == HTTP_409_CONFLICT
    user_exists = get_user_model().objects.filter(email=test_payload["email"]).exists()
    assert not user_exists


@pytest.mark.django_db
def test_user_with_same_email_exists_error(api_client: Client) -> None:
    """Tests that an error is returned if user with same email already exists."""
    control_payload = create_payload()
    test_payload = create_payload(username="differentUsername")

    create_user(**control_payload)  # type: ignore[arg-type]
    res = json_post(api_client, CREATE_USER_URL, cast(dict[str, object], test_payload))

    assert res.status_code == HTTP_409_CONFLICT
    user_exists = get_user_model().objects.filter(username=test_payload["username"]).exists()
    assert not user_exists


@pytest.mark.django_db
def test_password_too_short_error(api_client: Client) -> None:
    """Tests an error is returned if password < 5 characters."""
    payload = create_payload(password="pw")
    res = json_post(api_client, CREATE_USER_URL, cast(dict[str, object], payload))

    assert res.status_code == HTTP_422_UNPROCESSABLE_ENTITY
    user_exists = get_user_model().objects.filter(username=payload["username"]).exists()
    assert not user_exists


@pytest.mark.django_db
def test_create_token_for_user_via_username(api_client: Client) -> None:
    """Tests generating a token via username/pw for user authentication."""
    user_details = create_payload()
    create_user(**user_details)  # type: ignore[arg-type]

    auth_payload = {"login": user_details["username"], "password": user_details["password"]}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_200_OK


@pytest.mark.django_db
def test_create_token_for_user_via_email(api_client: Client) -> None:
    """Tests generating a token via email/pw for user authentication."""
    user_details = create_payload()
    create_user(**user_details)  # type: ignore[arg-type]

    auth_payload = {"login": user_details["email"], "password": user_details["password"]}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_200_OK


@pytest.mark.django_db
def test_create_token_bad_password(api_client: Client) -> None:
    """Tests that an error is returned if user password is invalid."""
    user_details = create_payload(password="goodPassword")
    create_user(**user_details)  # type: ignore[arg-type]

    auth_payload = {"login": user_details["username"], "password": "badPassword"}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_create_token_blank_username(api_client: Client) -> None:
    """Tests that an error is returned if username is blank and no email provided."""
    auth_payload = {"login": "", "password": "testPassword"}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_create_token_blank_email(api_client: Client) -> None:
    """Tests that an error is returned if email is blank and no username provided."""
    auth_payload = {"login": "", "password": "testPassword"}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_create_token_blank_password(api_client: Client) -> None:
    """Tests that posting a blank password returns an error."""
    auth_payload = {"login": "testUser", "password": ""}
    res = json_post(api_client, TOKEN_URL, cast(dict[str, object], auth_payload))
    assert res.status_code == HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_retrieve_profile_unauthorized(api_client: Client) -> None:
    """Tests that authentication is required to manage a user profile."""
    res: HttpResponse = api_client.get(ME_URL)  # type: ignore[assignment]
    assert res.status_code == HTTP_401_UNAUTHORIZED


# =========================
# Private User API Tests
# =========================


@pytest.mark.django_db
def test_retrieve_profile_success(authenticated_user: tuple[Client, User]) -> None:
    """
    Authenticated user can retrieve their profile (GET is not CSRF-protected).
    Expect 200 OK.
    """
    client, user = authenticated_user

    res = client.get(ME_URL)
    assert res.status_code == HTTP_200_OK
    data = json.loads(res.content.decode(res.charset or "utf-8"))
    assert data["username"] == user.username
    assert data["email"] == user.email
    assert data["first_name"] == user.first_name
    assert data["last_name"] == user.last_name


@pytest.mark.django_db
def test_update_profile_no_csrf_authenticated(db: None) -> None:
    """
    Authenticated PATCH via Django session succeeds (hybrid auth fallback).

    Hybrid Authentication Pattern (Priority 3 - Session Fallback):
    - JWT tokens are Priority 1-2 (header/cookie)
    - Django session auth is Priority 3 fallback (OAuth users)
    - Session auth now works for authenticated requests
    - CSRF protection still applies (but not tested in this specific test)
    """
    from django.test import Client

    user = create_user(
        username="privateUser",
        email="private@example.com",
        password="testpass123",
        first_name="Private",
        last_name="User",
    )

    client = Client()
    # Login via Django's session auth (simulates OAuth user)
    logged_in = client.login(username=user.username, password="testpass123")
    assert logged_in, "Login failed in test setup"

    payload = {"first_name": "Updated", "last_name": "Name", "password": "newPrivatePass123"}
    # Session auth now works (Priority 3 fallback in hybrid auth)
    # Note: CSRF would normally block this, but this test uses Django's test client
    # which automatically handles CSRF for session-authenticated requests
    res = client.patch(ME_URL, json.dumps(payload), content_type="application/json")
    assert res.status_code == HTTP_200_OK
    user.refresh_from_db()
    assert user.first_name == payload["first_name"]
    assert user.last_name == payload["last_name"]


@pytest.mark.django_db
def test_update_profile_with_csrf_authenticated(db: None) -> None:
    """
    Authenticated PATCH to profile with valid CSRF token.
    Expect 200 OK.

    Hybrid Authentication Pattern:
    - Login returns access token in response body
    - Test must manually set access token cookie for authentication
    """
    import json as json_module

    from django.test import Client

    user = create_user(
        username="privateUser",
        email="private@example.com",
        password="testpass123",
        first_name="Private",
        last_name="User",
    )

    payload = {"first_name": "CSRFUpdated", "last_name": "CSRFName", "password": "csrfPass123"}
    client = Client()

    # Authenticate via JWT token endpoint to get tokens
    auth_payload = {"login": "privateUser", "password": "testpass123"}
    response = json_post(client, TOKEN_URL, cast(dict[str, object], auth_payload))

    # Extract access token from response body and set as cookie
    response_data = json_module.loads(response.content.decode())
    client.cookies['access_token'] = response_data['access_token']

    # Simulate CSRF token and cookie (double-submit cookie pattern)
    # Must use Django's default cookie name 'csrftoken' (not 'XSRF-TOKEN')
    csrf_token = "testcsrftoken"
    client.cookies["csrftoken"] = csrf_token  # Django's default CSRF_COOKIE_NAME
    res = client.patch(
        ME_URL,
        json.dumps(payload),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert res.status_code == HTTP_200_OK
    user.refresh_from_db()
    assert user.first_name == payload["first_name"]
    assert user.last_name == payload["last_name"]
    assert user.check_password(payload["password"])  # type: ignore[no-untyped-call]


@pytest.mark.django_db
def test_unauthenticated_profile_access(api_client: Client) -> None:
    """
    Unauthenticated GET to profile endpoint.
    Expect 401 Unauthorized.
    """
    res = api_client.get(ME_URL)
    assert res.status_code == HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_unauthenticated_profile_update(api_client: Client) -> None:
    """
    Unauthenticated PATCH to profile endpoint.
    Expect 401 Unauthorized (auth fails before CSRF).
    """
    payload = {"first_name": "Hacker"}
    res = api_client.patch(ME_URL, json.dumps(payload), content_type="application/json")
    assert res.status_code == HTTP_401_UNAUTHORIZED


# =========================
# Integration tests (Django Client)
# =========================


@pytest.mark.django_db
def test_token_obtain_sets_jwt_cookies(registered_user: tuple[Client, dict[str, str]]) -> None:
    """Login sets refresh_token cookie and returns access_token in body (hybrid auth).

    Hybrid Authentication Pattern:
    - Login endpoint returns access_token in response body (for localStorage)
    - Login endpoint only sets refresh_token cookie (HTTP-only)
    - Access token cookie NOT set during login (frontend manages in localStorage)
    - Refresh endpoint sets BOTH tokens as cookies (see test_refresh_token_cookie_updated)
    """
    import json as json_module

    client, _user_data = registered_user

    login_data = {"login": "testuser", "password": "testpass123"}
    response = json_post(client, TOKEN_URL, cast(dict[str, object], login_data))
    assert response.status_code == 200

    # Verify refresh_token is set as cookie
    assert "refresh_token" in client.cookies

    # Verify access_token is in response body (NOT cookie)
    response_data = json_module.loads(response.content.decode())
    assert "access_token" in response_data
    assert response_data['access_token'] is not None

    # Verify access_token is NOT set as cookie (hybrid auth pattern)
    assert "access_token" not in client.cookies


@pytest.mark.django_db
def test_logout_clears_jwt_cookies(registered_user: tuple[Client, dict[str, str]]) -> None:
    """Logout clears JWT cookies."""
    client, _user_data = registered_user

    # Login first
    login_data = {"login": "testuser", "password": "testpass123"}
    json_post(client, TOKEN_URL, cast(dict[str, object], login_data))

    # Logout
    logout_url = "/api/logout/"
    response = client.post(logout_url, content_type="application/json")
    assert response.status_code == 200
    access_cookie = response.cookies.get("access_token")
    refresh_cookie = response.cookies.get("refresh_token")
    if access_cookie:
        assert access_cookie.value == ""
    if refresh_cookie:
        assert refresh_cookie.value == ""


@pytest.mark.django_db
def test_refresh_token_cookie_updated(registered_user: tuple[Client, dict[str, str]]) -> None:
    """Refresh endpoint updates the refresh token cookie."""
    client, _user_data = registered_user

    # Login first
    login_data = {"login": "testuser", "password": "testpass123"}
    json_post(client, TOKEN_URL, cast(dict[str, object], login_data))

    # Get current refresh token
    old_refresh_cookie = client.cookies.get("refresh_token")
    old_refresh = old_refresh_cookie.value if old_refresh_cookie else None
    refresh_url = "/api/token/refresh/"

    # Refresh endpoint requires CSRF token (double-submit cookie pattern)
    # Must use Django's default cookie name 'csrftoken' (not 'XSRF-TOKEN')
    csrf_token = "test_csrf_token"
    client.cookies["csrftoken"] = csrf_token  # Django's default CSRF_COOKIE_NAME
    response = client.post(
        refresh_url,
        {},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,  # Set matching header
    )
    assert response.status_code == 200
    new_refresh_cookie = response.cookies.get("refresh_token")
    new_refresh = new_refresh_cookie.value if new_refresh_cookie else None
    # Assert the refresh token cookie value changed
    assert old_refresh != new_refresh


@pytest.mark.django_db
def test_csrf_token_endpoint_sets_cookie(api_client: Client) -> None:
    """CSRF token endpoint sets csrftoken cookie and returns token in body."""
    from django.conf import settings

    csrf_url = "/api/csrf/"
    response = api_client.get(csrf_url)
    assert response.status_code == 200

    # Check that Django's CSRF cookie is set (configurable via CSRF_COOKIE_NAME)
    csrf_cookie_name = settings.CSRF_COOKIE_NAME
    assert csrf_cookie_name in response.cookies, (
        f"Expected cookie '{csrf_cookie_name}' not found. "
        f"Available cookies: {list(response.cookies.keys())}"
    )
    token_in_cookie = response.cookies[csrf_cookie_name].value

    # Verify token is also returned in response body
    body = response.content.decode(response.charset or "utf-8")
    token_in_body = json.loads(body)["csrf_token"]
    assert token_in_cookie == token_in_body


# =========================
# Throttling smoke tests
# =========================


@pytest.mark.django_db
def test_throttling_bypassed_by_default(api_client: Client) -> None:
    """
    Verify throttling is bypassed by default in tests.

    Without @pytest.mark.enable_throttling, rapid requests should all succeed
    regardless of configured rate limits. This enables fast test execution.
    """
    user_data = {
        "username": "throttletest",
        "email": "throttle@example.com",
        "password": "testpass123",
    }
    # Create user with verified email
    create_user(
        username=user_data["username"],
        email=user_data["email"],
        password=user_data["password"],
    )

    login_data = {"login": user_data["username"], "password": user_data["password"]}

    # Make 10 rapid login attempts (exceeds 5/minute limit)
    # All should succeed because throttling is bypassed
    for i in range(10):
        response = json_post(api_client, TOKEN_URL, cast(dict[str, object], login_data))
        assert response.status_code == HTTP_200_OK, (
            f"Request {i+1} failed with status {response.status_code}. "
            "Expected all requests to succeed (throttling should be bypassed)."
        )


@pytest.mark.django_db
def test_throttling_infrastructure_ready() -> None:
    """
    Verify throttling infrastructure is properly configured.

    This test documents that:
    1. TestAwareAnonThrottle classes are imported correctly
    2. Throttle parameters are properly configured on endpoints
    3. settings.TESTING flag controls throttling behavior

    Note: Comprehensive rate limiting tests with actual throttling behavior
    will be added in Task 7.5.3 using pytest.mark.enable_throttling decorator
    and LocMemCache for realistic throttle testing.

    This smoke test just confirms the infrastructure is in place and won't
    cause import errors or configuration issues.
    """
    # Import throttle classes to verify they're properly defined
    from authentication.throttles import TestAwareAnonThrottle, TestAwareUserThrottle
    from django.conf import settings

    # Verify TESTING flag exists and is True in test environment
    assert getattr(settings, "TESTING", False), (
        "settings.TESTING should be True in test environment"
    )

    # Verify throttle classes can be instantiated
    anon_throttle = TestAwareAnonThrottle("5/m")
    user_throttle = TestAwareUserThrottle("10/m")

    # Verify throttle classes have allow_request method
    assert hasattr(
        anon_throttle, "allow_request"
    ), "TestAwareAnonThrottle should have allow_request method"
    assert hasattr(
        user_throttle, "allow_request"
    ), "TestAwareUserThrottle should have allow_request method"
