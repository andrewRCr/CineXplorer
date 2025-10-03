"""
Type stub file for django.contrib.auth.models.

This file provides explicit type annotations for Django's built-in User/AbstractUser model,
enabling perfect type inference in Pyright/Pylance.

⚠️ MAINTENANCE: Update when Django version changes
This stub is based on Django 5.x AbstractUser/User model.
When upgrading Django major versions, verify these fields are still accurate.

Note: This is a supplement to django-stubs. We only define what's needed for our codebase.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from django.db.models import Manager

# Simple protocol for related managers (groups, user_permissions)
# We only care about .count() method for our use case
class _RelatedManagerProtocol(Protocol):
    """Protocol for Django RelatedManager with count() method."""
    def count(self) -> int: ...
    def all(self) -> Any: ...
    def filter(self, **kwargs: Any) -> Any: ...

# Dummy base classes for stub file
class AbstractBaseUser:
    """Base user with authentication support."""
    is_authenticated: bool  # Property that returns True for authenticated users
    is_anonymous: bool  # Property that returns False for authenticated users

class PermissionsMixin: ...

class AbstractUser(AbstractBaseUser, PermissionsMixin):
    """
    Type stub for Django's AbstractUser model with explicit field types.

    This provides complete type information for all standard User model fields,
    eliminating "unknown type" warnings in Pyright/Pylance.
    """

    # Primary key
    id: int

    # Core identity fields
    username: str
    first_name: str
    last_name: str
    email: str

    # Permission/status fields
    is_staff: bool
    is_active: bool
    is_superuser: bool

    # Timestamps
    date_joined: datetime
    last_login: datetime | None

    # Related managers (many-to-many)
    # Protocol-based typing - provides .count() method type safety
    groups: _RelatedManagerProtocol
    user_permissions: _RelatedManagerProtocol

    # Manager
    objects: Manager[AbstractUser]

    # Methods
    def get_full_name(self) -> str: ...
    def get_short_name(self) -> str: ...
    def email_user(self, subject: str, message: str, from_email: str | None = None, **kwargs: Any) -> None: ...

class User(AbstractUser):
    """
    Type stub for Django's concrete User model.
    Inherits all fields from AbstractUser.
    """

    # Manager (overridden to return User instances)
    objects: Manager[User]

    class Meta:
        verbose_name: str
        verbose_name_plural: str
        swappable: str
