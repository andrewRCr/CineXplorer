"""
Type stub file for django.contrib.auth module.

This file SUPPLEMENTS django-types for authentication functions. django-types 0.22.0
provides complete coverage, but this stub provides additional type safety and
documentation value.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: Django 5.2.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading Django or django-types:
1. Check Django release notes for auth API changes
2. Check django-types release notes for coverage improvements
3. Run tests - if runtime errors occur, check this stub file first
4. Verify signatures match Django's actual implementation
5. Update "Last verified" date above

Trade-off: django-types provides equivalent coverage for authenticate() and get_user_model().
This stub provides the same signatures as django-types, maintained for consistency with our
custom models.pyi. Consider removing if maintenance burden increases.

Note: This is a SUPPLEMENT to django-types. If redundancy is confirmed, may be removed.
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
