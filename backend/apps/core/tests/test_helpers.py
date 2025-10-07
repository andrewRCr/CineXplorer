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
from typing import TypedDict, Unpack

from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpResponse
from django.test import Client

# Re-export HTTPStatus for convenience in test files
__all__ = ["HTTPStatus", "UserParams", "create_user", "json_patch", "json_post", "json_put"]


# Type definitions for fixture parameters
class UserParams(TypedDict, total=False):
    """Type for user creation parameters."""
    username: str
    email: str
    password: str
    first_name: str
    last_name: str


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
) -> AbstractUser:
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

    # Create user - Django UserManager.create_user is a dynamic method
    user = User.objects.create_user(**{**defaults, **params})  # type: ignore[attr-defined]

    # Mark email as verified if requested using allauth EmailAddress API
    # Use get_or_create to support --keepdb flag (reusing test database)
    if email_verified:
        EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )

    return user
