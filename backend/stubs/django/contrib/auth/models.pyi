"""Type stub file for django.contrib.auth.models.

This file SUPPLEMENTS django-types to provide explicit type annotations that django-types
cannot infer, specifically the `id` field on AbstractBaseUser and AbstractUser.

Maintenance Contract:
Synchronized with: Django 5.1.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading Django or django-types:
1. Check Django release notes for auth model changes (rare in minor versions)
2. Check django-types release notes for coverage improvements
3. Run tests - if runtime errors occur, check this stub file first
4. Verify field types and method signatures match Django's actual model
5. Update "Last verified" date above

Trade-off: This supplements django-types to fill a critical gap (explicit `id` field).
django-types provides comprehensive coverage but doesn't explicitly declare `id` on
AbstractUser (inherited from models.Model), causing Pyright reportAttributeAccessIssue
errors. This stub eliminates 2+ errors on `user.id` access, at cost of ~130 lines to maintain.

Why we need this (Task 7.1 discovery):
- django-types: Comprehensive auth model coverage, BUT no explicit `id` declaration
- Without this stub: `user.id` triggers reportAttributeAccessIssue (2 errors in api.py)
- With this stub: `user.id` properly typed (0 errors)
- Root cause: Pyright can't infer inherited `id` field without explicit declaration

Note: This is a SUPPLEMENT to django-types. We define what django-types cannot infer.
If future django-types versions add explicit `id` field, this stub may become redundant.
"""

from __future__ import annotations

from datetime import datetime
from typing import ClassVar, Protocol

from django.db import models
from django.db.models import Manager

# Simple protocol for related managers (groups, user_permissions)
# We only care about .count() method for our use case
class _RelatedManagerProtocol(Protocol):
    """Protocol for Django RelatedManager with count() method."""
    def count(self) -> int: ...
    def all(self) -> object: ...
    def filter(self, **kwargs: object) -> object: ...

# User Manager
class UserManager(Manager[AbstractUser]):
    """Manager for User/AbstractUser with custom methods."""

    def create_user(
        self, username: str, email: str = "", password: str | None = None, **extra_fields: object
    ) -> AbstractUser:
        """Create and save a regular user with the given username, email, and password."""

    def create_superuser(
        self, username: str, email: str = "", password: str | None = None, **extra_fields: object
    ) -> AbstractUser:
        """Create and save a superuser with the given username, email, and password."""

# Dummy base classes for stub file - extend models.Model for proper type variance
class AbstractBaseUser(models.Model):
    """Base user with authentication support."""

    id: int  # Primary key
    is_authenticated: bool  # Property that returns True for authenticated users
    is_anonymous: bool  # Property that returns False for authenticated users

    def save(self, *args: object, **kwargs: object) -> None:
        """Save the model instance."""

    def set_password(self, raw_password: str | None) -> None:
        """Set the user's password to the given raw string (hashed)."""

class PermissionsMixin(models.Model): ...

class AbstractUser(AbstractBaseUser, PermissionsMixin):
    """Type stub for Django's AbstractUser model with explicit field types.

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

    # Manager (UserManager with create_user method)
    objects: ClassVar[UserManager]  # pyright: ignore[reportIncompatibleVariableOverride]

    # Methods
    def get_full_name(self) -> str: ...
    def get_short_name(self) -> str: ...
    def email_user(
        self, subject: str, message: str, from_email: str | None = None, **kwargs: object
    ) -> None: ...

class User(AbstractUser):  # type: ignore[django-manager-missing]
    """Type stub for Django's concrete User model.

    Inherits all fields from AbstractUser.
    """

    # Manager (UserManager with create_user method)
    objects: ClassVar[UserManager]  # pyright: ignore[reportIncompatibleVariableOverride]
