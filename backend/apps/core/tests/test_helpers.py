"""Shared test utilities for Django Ninja API testing.

This module provides reusable helpers for testing Django Ninja endpoints
with proper JSON encoding and type safety.

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
    "create_user",
    "get_csrf_token",
    "json_patch",
    "json_post",
    "json_put",
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
