"""Shared test utilities for Django Ninja API testing.

**Location in Test Hierarchy:** Tier 1 - Core Shared Helpers

This module provides reusable helpers for testing Django Ninja endpoints
with proper JSON encoding and type safety. Used by ALL Django apps for
cross-cutting test utilities.

**Test Infrastructure Hierarchy:**
    1. **Core Shared Helpers**: This file (`core/tests/test_helpers.py`)
       - HTTP helpers (json_post, json_patch, json_put, get_csrf_token)
       - User creation (create_user for integration tests, create_mock_user for unit tests)
       - Auth helpers (login_and_get_tokens, authenticate_client, create_fresh_client)
       - Types (HTTPStatus, UserParams)
    2. **Root Fixtures**: `apps/conftest.py`
       - api_client, user, auth_client
    3. **Domain Fixtures**: `{app}/tests/conftest.py` (pytest fixtures per app)
    4. **Domain Helpers**: `{app}/tests/test_helpers.py` (domain-specific mock builders)

**Related Helper Files (Domain-Specific):**
    - `movie/tests/test_helpers.py` - TMDB ApiResponse mocks, MovieSchema builders
    - `movie/tests/tmdb_test_builders.py` - Pydantic TMDB model builders
    - `user_movie_data/tests/test_helpers.py` - UserMovieData mocks, pagination helpers

**Exported Helpers:**
- HTTP: json_post(), json_patch(), json_put()
- CSRF: get_csrf_token()
- Auth: login_and_get_tokens(), authenticate_client(), create_fresh_client()
- User (integration): create_user() - creates REAL Django User in database
- User (unit): create_mock_user() - creates Mock object for unit tests
- Types: HTTPStatus (stdlib enum), UserParams (TypedDict)

HTTP Status Codes:
We use Python's stdlib `http.HTTPStatus` enum instead of DRF's status module:
- Zero dependencies (part of Python stdlib)
- Type-safe (IntEnum with full mypy/pyright support)
- Framework-agnostic (works with any Python web framework)
- Comprehensive (62 status codes covering all IANA-registered codes)
- Actively maintained by Python core team

Example:
    from http import HTTPStatus

    assert response.status_code == HTTPStatus.OK
    assert response.status_code == HTTPStatus.CREATED
    assert response.status_code == HTTPStatus.UNAUTHORIZED
"""

import json
import os
import socket
import subprocess
import sys
import uuid
from http import HTTPStatus
from pathlib import Path
from typing import TYPE_CHECKING, TypedDict, Unpack, cast
from unittest.mock import Mock

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import Client

if TYPE_CHECKING:
    from apps.users.models import User as UserType

# Re-export HTTPStatus for convenience in test files
__all__ = [
    "HTTPStatus",
    "UserParams",
    "authenticate_client",
    "closed_local_port",
    "create_fresh_client",
    "create_mock_user",
    "create_user",
    "create_user_and_auth_payload",
    "get_csrf_token",
    "json_patch",
    "json_post",
    "json_put",
    "login_and_get_tokens",
]


# Type definitions for fixture parameters
class UserParams(TypedDict, total=False):
    """Type for user creation parameters."""

    username: str
    email: str
    password: str
    first_name: str
    last_name: str


def authenticate_client(client: Client, username: str, password: str) -> None:
    """Authenticate a test client using JWT tokens (hybrid auth pattern).

    This helper encapsulates the hybrid authentication pattern where:
    - Login endpoint only sets refresh_token as HTTP-only cookie
    - Access token is returned in response body for localStorage
    - Tests send the access token in the Authorization Bearer header

    Args:
        client: Django test client instance
        username: Username for authentication
        password: Password for authentication

    Example:
        from apps.core.tests.test_helpers import create_user, authenticate_client

        user = create_user(username='testuser', password='testpass123')
        authenticate_client(api_client, 'testuser', 'testpass123')
        # Client now sends a Bearer header and the refresh-token cookie

    Note:
        This function installs a default Authorization header on the client.
        If the auth pattern changes in the future, update this ONE function.
    """
    token_url = "/api/token/"
    auth_payload: dict[str, object] = {"login": username, "password": password}
    response = json_post(client, token_url, auth_payload)

    # Send the access token as the browser does, retaining the refresh cookie.
    response_data: dict[str, str] = json.loads(response.content.decode())
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {response_data['access_token']}"


def login_and_get_tokens(client: Client, username: str, password: str) -> tuple[str, str]:
    """Login and return access and refresh tokens (hybrid auth pattern).

    Unlike authenticate_client(), this function returns tokens as strings
    without modifying the client. Useful for tests that need explicit
    token manipulation (e.g., testing token expiration).

    Args:
        client: Django test client instance
        username: Username for authentication
        password: Password for authentication

    Returns:
        Tuple of (access_token, refresh_token) as strings

    Example:
        from apps.core.tests.test_helpers import create_user, login_and_get_tokens

        user = create_user(username='testuser', password='testpass123')
        access_token, refresh_token = login_and_get_tokens(
            api_client, 'testuser', 'testpass123'
        )
        # Manual token manipulation for testing
        response = client.get('/api/profile/', HTTP_AUTHORIZATION=f'Bearer {access_token}')

    Note:
        The refresh token is ALSO automatically set as HTTP-only cookie by the backend.
        This function returns it for tests that need to manipulate it manually.
    """
    token_url = "/api/token/"
    auth_payload: dict[str, object] = {"login": username, "password": password}
    response = json_post(client, token_url, auth_payload)

    response_data: dict[str, str] = json.loads(response.content.decode())
    return response_data["access_token"], response.cookies["refresh_token"].value


def create_fresh_client(refresh_token: str | None = None) -> Client:
    """Create a fresh Django test client without session authentication.

    This is useful for JWT token refresh tests where you need to ensure
    there's NO Django session fallback, only pure JWT authentication.

    Args:
        refresh_token: Optional refresh token to set as cookie

    Returns:
        Fresh Client instance (no session, optional refresh token cookie)

    Example:
        from apps.core.tests.test_helpers import create_fresh_client
        from ninja_jwt.tokens import RefreshToken

        # Create tokens manually
        refresh = RefreshToken.for_user(user)
        access_token_str = str(refresh.access_token)

        # Create fresh client with refresh token cookie
        fresh_client = create_fresh_client(refresh_token=str(refresh))

        # Test JWT auth without session fallback
        response = fresh_client.get(
            '/api/profile/',
            HTTP_AUTHORIZATION=f'Bearer {access_token_str}'
        )

    Note:
        Regular api_client fixture may have Django session authentication.
        This function creates a client that ONLY authenticates via JWT.
    """
    fresh_client = Client()
    if refresh_token:
        fresh_client.cookies["refresh_token"] = refresh_token
    return fresh_client


def get_csrf_token(client: Client) -> str:
    """Retrieve a valid CSRF token from /api/csrf/ endpoint.

    This helper is used by tests that need to make authenticated POST/PATCH/DELETE
    requests to Django Ninja endpoints protected by CSRF middleware.

    Args:
        client: Django test client instance (authenticated or unauthenticated)

    Returns:
        CSRF token string for use in HTTP_X_CSRFTOKEN headers

    Example:
        csrf_token = get_csrf_token(client)
        response = client.post(
            '/api/user-movie-data',
            data={'movie_id': 123},
            content_type='application/json',
            HTTP_X_CSRFTOKEN=csrf_token
        )
    """
    csrf_res = client.get("/api/csrf/")
    csrf_data: dict[str, str] = json.loads(csrf_res.content.decode())
    return csrf_data["csrf_token"]


def json_post(client: Client, url: str, data: dict[str, object], **kwargs: object) -> HttpResponse:
    """POST JSON data to a Django Ninja endpoint.

    Args:
        client: Django test client instance
        url: API endpoint URL
        data: Dictionary to be JSON-encoded
        **kwargs: Additional keyword arguments passed to client.post()

    Returns:
        HTTP response from the endpoint

    Example:
        response = json_post(self.client, '/api/register/', {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        })
    """
    # Django test client returns _MonkeyPatchedWSGIResponse
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **kwargs,  # pyright: ignore[reportArgumentType]
    )


def json_patch(
    client: Client, url: str, data: dict[str, object], **kwargs: object
) -> HttpResponse:
    """PATCH JSON data to a Django Ninja endpoint.

    Args:
        client: Django test client instance
        url: API endpoint URL
        data: Dictionary to be JSON-encoded
        **kwargs: Additional keyword arguments (e.g., HTTP_X_CSRFTOKEN)

    Returns:
        HTTP response from the endpoint

    Example:
        response = json_patch(self.client, '/api/user-movie-data/1', {
            'user_rating': 8
        }, HTTP_X_CSRFTOKEN='token123')
    """
    # Django test client returns _MonkeyPatchedWSGIResponse
    return client.patch(
        url,
        json.dumps(data),
        content_type="application/json",
        **kwargs,  # pyright: ignore[reportArgumentType]
    )


def json_put(client: Client, url: str, data: dict[str, object], **kwargs: object) -> HttpResponse:
    """PUT JSON data to a Django Ninja endpoint.

    Args:
        client: Django test client instance
        url: API endpoint URL
        data: Dictionary to be JSON-encoded
        **kwargs: Additional keyword arguments passed to client.put()

    Returns:
        HTTP response from the endpoint

    Example:
        response = json_put(self.client, '/api/resource/1/', {
            'field1': 'value1',
            'field2': 'value2'
        })
    """
    # Django test client returns _MonkeyPatchedWSGIResponse
    return client.put(
        url,
        json.dumps(data),
        content_type="application/json",
        **kwargs,  # pyright: ignore[reportArgumentType]
    )


def create_user(email_verified: bool = True, **params: Unpack[UserParams]) -> "UserType":
    """Create and return a new user for testing.

    Args:
        email_verified: Whether to mark the user's email as verified (default: True)
        **params: Additional user parameters (username, email, password, etc.)

    Returns:
        Created user instance

    Example:
        user = create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    """
    User = get_user_model()  # noqa: N806 - Django model naming convention

    # Set defaults
    defaults: dict[str, str] = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }

    # Distinct users within one test still need distinct default email addresses.
    if "email" not in params:
        unique_suffix = str(uuid.uuid4())[:8]
        defaults["email"] = f"testuser_{unique_suffix}@example.com"

    user_data = {**defaults, **params}

    user = cast(
        "UserType",
        User.objects.create_user(**user_data),  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType]
    )

    if email_verified:
        EmailAddress.objects.create(
            user=user,
            email=str(user.email),
            verified=True,
            primary=True,
        )

    return user


def create_user_and_auth_payload(
    **params: Unpack[UserParams],
) -> tuple["UserType", dict[str, str]]:
    """Create a user and return both the user instance and authentication payload.

    Combines user creation with auth payload generation for login/token tests.
    This eliminates the common 3-line pattern of creating user details,
    creating the user, then building the auth payload.

    Args:
        **params: User parameters (username, email, password, etc.)
                  If password not provided, defaults to 'testpass123'

    Returns:
        Tuple of (user, auth_payload) where:
        - user: Created user instance
        - auth_payload: Dict with {"login": username, "password": password}
                       ready for json_post to /api/token/ endpoint

    Example:
        from apps.core.tests.test_helpers import create_user_and_auth_payload, json_post

        # Old 3-line pattern:
        user_details = {"username": "testuser", "password": "testpass123"}
        user = create_user(**user_details)
        auth_payload = {"login": user_details["username"], "password": user_details["password"]}

        # New 1-line pattern:
        user, auth_payload = create_user_and_auth_payload(
            username="testuser",
            password="testpass123"
        )

        # Use in tests:
        res = json_post(api_client, "/api/token/", auth_payload)
        assert res.status_code == HTTPStatus.OK
    """
    # Extract password before creating user (need it for auth payload)
    password = params.get("password", "testpass123")

    # Create user (email_verified=True by default in create_user)
    user = create_user(**params)

    # Build auth payload for token endpoint
    auth_payload = {"login": user.username, "password": password}

    return user, auth_payload


# =============================================================================
# Unit Test Mocks (no database)
# =============================================================================


def create_mock_user(
    user_id: int = 1,
    username: str = "testuser",
    email: str = "testuser@example.com",
) -> Mock:
    """Create a mock User object for unit tests (no database).

    Use this for unit tests where you need a user-like object but don't want
    database access. For integration tests that need a real User in the
    database, use create_user() instead.

    Args:
        user_id: Mock user ID (default: 1)
        username: Mock username (default: "testuser")
        email: Mock email (default: "testuser@example.com")

    Returns:
        Mock object with id, username, and email attributes

    Example:
        from apps.core.tests.test_helpers import create_mock_user

        # Unit test with mocked user
        mock_user = create_mock_user(user_id=42, username="alice")
        result = service.get_user_data(mock_user)

        # Verify user was passed correctly
        mock_repo.get_by_user.assert_called_once_with(mock_user)

    See Also:
        - create_user(): Creates REAL Django User in database (integration tests)
        - user_movie_data/tests/test_helpers.py: Domain-specific mock helpers
    """
    mock = Mock()
    mock.id = user_id
    mock.pk = user_id  # Django uses pk as alias for id
    mock.username = username
    mock.email = email
    return mock


def load_settings(
    environment: dict[str, str | None],
    names: list[str],
    *,
    before_import: str = "",
    setup: bool = False,
) -> dict[str, object]:
    """Read real settings in an isolated interpreter, or return its configuration error.

    The child sees this process's environment with the given changes (None
    removes a variable) and does not re-read config/.env, so a removed variable
    stays removed. Dotted names resolve through imports; bare names resolve on
    settings, then the pre-import namespace. Missing settings are omitted from
    the result.
    """
    child_env = os.environ.copy()
    for name in (
        "EMAIL_BACKEND",
        "DJANGO_CONSOLE_LOG_LEVEL",
        "DJANGO_LOG_LEVEL",
        "TESTING",
        "CI",
        "GITHUB_ACTIONS",
        "CONTINUOUS_INTEGRATION",
        "BUILD_NUMBER",
        "DJANGO_ALLOWED_HOSTS",
        "CSRF_TRUSTED_ORIGINS",
        "CORS_ALLOWED_ORIGINS",
    ):
        child_env.pop(name, None)
    for name, value in environment.items():
        if value is None:
            child_env.pop(name, None)
        else:
            child_env[name] = value
    child_env["DJANGO_SETTINGS_MODULE"] = "config.settings"
    code = (
        """
import importlib
import json
import sys

import environ
from django.core.exceptions import ImproperlyConfigured

environ.Env.read_env = lambda *args, **kwargs: None
request = json.loads(sys.argv[1])
"""
        + before_import
        + "\n"
        + """
try:
    settings = importlib.import_module("config.settings")
    if request["setup"]:
        import django
        django.setup()
    values = {}
    for name in request["names"]:
        if "." not in name:
            if hasattr(settings, name):
                values[name] = getattr(settings, name)
            elif name in globals():
                values[name] = globals()[name]
        else:
            parts = name.split(".")
            for end in range(len(parts) - 1, 0, -1):
                try:
                    value = importlib.import_module(".".join(parts[:end]))
                except ModuleNotFoundError:
                    continue
                for part in parts[end:]:
                    value = getattr(value, part)
                values[name] = value
                break
except ImproperlyConfigured as exc:
    values = {"error": str(exc)}
print("SETTINGS_RESULT=" + json.dumps(values, default=str))
"""
    )
    result = subprocess.run(
        [sys.executable, "-c", code, json.dumps({"names": names, "setup": setup})],
        cwd=Path(__file__).resolve().parents[3],
        env=child_env,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(f"Settings interpreter exited {result.returncode}:\n{result.stderr}")
    payload = next(
        line.removeprefix("SETTINGS_RESULT=")
        for line in result.stdout.splitlines()
        if line.startswith("SETTINGS_RESULT=")
    )
    return cast(dict[str, object], json.loads(payload))


def closed_local_port() -> int:
    """Return a local port with nothing listening on it, so connecting to it fails."""
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]
