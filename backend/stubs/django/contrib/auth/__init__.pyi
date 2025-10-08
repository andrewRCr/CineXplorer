"""
Type stub file for django.contrib.auth module.

Provides type annotations for Django authentication functions that are
missing or incomplete in django-stubs.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: Django 5.2.x + django-stubs 5.2.x (as of 2025-10-08)
Last verified: 2025-10-08

When upgrading Django:
1. Check Django release notes for auth API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify signatures match Django's actual implementation
4. Update "Last verified" date above

Trade-off: Supplements django-stubs gaps for authenticate() and get_user_model().
Eliminates scattered type: ignore comments for common auth operations.
"""
from __future__ import annotations

from typing import Any, TypeVar

from django.contrib.auth.models import AbstractBaseUser
from django.http import HttpRequest

_UserModel = TypeVar('_UserModel', bound=AbstractBaseUser)


def authenticate(
    request: HttpRequest | None = None,
    **credentials: Any
) -> AbstractBaseUser | None:
    """
    Authenticate user with the given credentials.

    Returns the user instance if credentials are valid, None otherwise.
    Commonly used with username/email and password.

    Args:
        request: Optional HTTP request object
        **credentials: Authentication credentials (e.g., username, password)

    Returns:
        User instance if authenticated, None if authentication fails
    """
    ...


def get_user_model() -> type[AbstractBaseUser]:
    """
    Return the User model that is active in this project.

    Returns the custom user model if AUTH_USER_MODEL is set,
    otherwise returns django.contrib.auth.models.User.

    Returns:
        The active User model class
    """
    ...
