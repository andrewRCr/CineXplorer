"""Shared test utilities for Django Ninja API testing.

**Location in Test Hierarchy:** Tier 1 - Core Shared Helpers

This module provides reusable helpers for testing Django Ninja endpoints
with proper JSON encoding and type safety. Used by ALL Django apps for
cross-cutting test utilities.

**Test Infrastructure Hierarchy:**
    1. **Core Shared Helpers**: This file (`core/tests/test_helpers.py`)
       - HTTP helpers (json_post, json_patch, json_put, get_csrf_token)
       - User creation (create_user)
       - Auth helpers (login_and_get_tokens, authenticate_client, create_fresh_client)
       - Types (HTTPStatus, UserParams)
    2. **Root Fixtures**: `apps/conftest.py`
       - api_client, user, auth_client
    3. **Domain Fixtures**: `{app}/tests/conftest.py` (pytest fixtures per app)
    4. **Domain Factories**: `{app}/tests/fixtures.py` (factory functions for test data)

See: `.arc/reference/strategies/strategy-testing-methodology.md` for full architecture.

**Exported Helpers:**
- HTTP: json_post(), json_patch(), json_put()
- CSRF: get_csrf_token()
- Auth: login_and_get_tokens(), authenticate_client(), create_fresh_client()
- User: create_user()
- Types: HTTPStatus (stdlib enum), UserParams (TypedDict)

HTTP Status Codes
-----------------
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
from http import HTTPStatus
from typing import TYPE_CHECKING, TypedDict, Unpack, cast

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import Client

if TYPE_CHECKING:
    from django.contrib.auth.models import User as UserType

# Re-export HTTPStatus for convenience in test files
__all__ = [
    "HTTPStatus",
    "UserParams",
    "authenticate_client",
    "create_fresh_client",
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
    """
    Authenticate a test client using JWT tokens (hybrid auth pattern).

    This helper encapsulates the hybrid authentication pattern where:
    - Login endpoint only sets refresh_token as HTTP-only cookie
    - Access token is returned in response body for localStorage
    - Tests must manually extract and set access_token cookie

    Args:
        client: Django test client instance
        username: Username for authentication
        password: Password for authentication

    Example:
        from core.tests.test_helpers import create_user, authenticate_client

        user = create_user(username='testuser', password='testpass123')
        authenticate_client(api_client, 'testuser', 'testpass123')
        # Client now has both refresh_token (auto) and access_token (manual) cookies

    Note:
        This function modifies the client in-place by setting the access_token cookie.
        If the auth pattern changes in the future, update this ONE function.
    """
    token_url = "/api/token/"
    auth_payload: dict[str, object] = {"login": username, "password": password}
    response = json_post(client, token_url, auth_payload)

    # Extract access_token from response and set as cookie (hybrid auth pattern)
    response_data: dict[str, str] = json.loads(response.content.decode())
    client.cookies['access_token'] = response_data['access_token']


def login_and_get_tokens(
    client: Client,
    username: str,
    password: str
) -> tuple[str, str]:
    """
    Login and return access and refresh tokens (hybrid auth pattern).

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
        from core.tests.test_helpers import create_user, login_and_get_tokens

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
    return response_data['access_token'], response_data['refresh_token']


def create_fresh_client(refresh_token: str | None = None) -> Client:
    """
    Create a fresh Django test client without session authentication.

    This is useful for JWT token refresh tests where you need to ensure
    there's NO Django session fallback, only pure JWT authentication.

    Args:
        refresh_token: Optional refresh token to set as cookie

    Returns:
        Fresh Client instance (no session, optional refresh token cookie)

    Example:
        from core.tests.test_helpers import create_fresh_client
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
    """
    Retrieve a valid CSRF token from /api/csrf/ endpoint.

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
    csrf_res = client.get('/api/csrf/')
    csrf_data: dict[str, str] = json.loads(csrf_res.content.decode())
    return csrf_data['csrf_token']


def json_post(
    client: Client,
    url: str,
    data: dict[str, object],
    **kwargs: object
) -> HttpResponse:
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
    return client.post(  # type: ignore[return-value]
        url,
        json.dumps(data),
        content_type='application/json',
        **kwargs  # type: ignore[arg-type]
    )


def json_patch(
    client: Client,
    url: str,
    data: dict[str, object],
    **kwargs: object
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
        response = json_patch(self.client, '/api/profile/', {
            'first_name': 'Updated'
        }, HTTP_X_CSRFTOKEN='token123')
    """
    # Django test client returns _MonkeyPatchedWSGIResponse
    return client.patch(  # type: ignore[return-value]
        url,
        json.dumps(data),
        content_type='application/json',
        **kwargs  # type: ignore[arg-type]
    )


def json_put(
    client: Client,
    url: str,
    data: dict[str, object],
    **kwargs: object
) -> HttpResponse:
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
    return client.put(  # type: ignore[return-value]
        url,
        json.dumps(data),
        content_type='application/json',
        **kwargs  # type: ignore[arg-type]
    )


def create_user(
    email_verified: bool = True,
    **params: Unpack[UserParams]
) -> "UserType":
    """
    Create and return a new user for testing.

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
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'testpass123',
        'first_name': 'Test',
        'last_name': 'User'
    }

    # django-types limitation - UserManager.create_user type not inferred
    user = cast(
        "UserType",
        User.objects.create_user(**{**defaults, **params})  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
    )

    # Mark email as verified if requested using allauth EmailAddress API
    # Use get_or_create to support --keepdb flag (reusing test database)
    if email_verified:
        EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )

    return user


def create_user_and_auth_payload(
    **params: Unpack[UserParams]
) -> tuple["UserType", dict[str, str]]:
    """
    Create a user and return both the user instance and authentication payload.

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
        from core.tests.test_helpers import create_user_and_auth_payload, json_post

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
    password = params.get('password', 'testpass123')

    # Create user (email_verified=True by default in create_user)
    user = create_user(**params)

    # Build auth payload for token endpoint
    auth_payload = {
        "login": user.username,
        "password": password
    }

    return user, auth_payload
