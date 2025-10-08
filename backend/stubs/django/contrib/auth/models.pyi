"""
Type stub file for django.contrib.auth.models.

This file provides explicit type annotations for Django's built-in User/AbstractUser model,
enabling perfect type inference in Pyright/Pylance.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: Django 5.1.x + django-stubs 5.1.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading Django:
1. Check Django release notes for auth model changes (rare in minor versions)
2. Run tests - if runtime errors occur, check this stub file first
3. Verify field types and method signatures match Django's actual model
4. Update "Last verified" date above

Trade-off: This supplements django-stubs to fill gaps (UserManager.create_user,
AbstractBaseUser methods). Eliminates 5+ type: ignore comments for common Django
operations, but adds ~80 lines of code to maintain.

Why we need this: django-stubs has incomplete coverage for UserManager methods and
AbstractBaseUser attributes. Rather than scatter type: ignore throughout code, we
centralize the "trust me, Django has these" declarations here.

Note: This is a supplement to django-stubs. We only define what's missing from our needs.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar, Protocol

from django.db import models
from django.db.models import Manager

# Simple protocol for related managers (groups, user_permissions)
# We only care about .count() method for our use case
class _RelatedManagerProtocol(Protocol):
    """Protocol for Django RelatedManager with count() method."""
    def count(self) -> int: ...
    def all(self) -> Any: ...
    def filter(self, **kwargs: Any) -> Any: ...

# User Manager
class UserManager(Manager[AbstractUser]):
    """Manager for User/AbstractUser with custom methods."""

    def create_user(
        self,
        username: str,
        email: str = "",
        password: str | None = None,
        **extra_fields: Any
    ) -> AbstractUser:
        """Create and save a regular user with the given username, email, and password."""
        ...

    def create_superuser(
        self,
        username: str,
        email: str = "",
        password: str | None = None,
        **extra_fields: Any
    ) -> AbstractUser:
        """Create and save a superuser with the given username, email, and password."""
        ...

# Dummy base classes for stub file - extend models.Model for proper type variance
class AbstractBaseUser(models.Model):
    """Base user with authentication support."""
    id: int  # Primary key
    is_authenticated: bool  # Property that returns True for authenticated users
    is_anonymous: bool  # Property that returns False for authenticated users

    def set_password(self, raw_password: str | None) -> None:
        """Set the user's password to the given raw string (hashed)."""
        ...

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Save the model instance."""
        ...

class PermissionsMixin(models.Model): ...

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

    # Manager (UserManager with create_user method)
    objects: ClassVar[UserManager]  # pyright: ignore[reportIncompatibleVariableOverride]

    # Methods
    def get_full_name(self) -> str: ...
    def get_short_name(self) -> str: ...
    def email_user(self, subject: str, message: str, from_email: str | None = None, **kwargs: Any) -> None: ...

class User(AbstractUser):  # type: ignore[django-manager-missing]
    """
    Type stub for Django's concrete User model.
    Inherits all fields from AbstractUser.
    """

    # Manager (UserManager with create_user method)
    objects: ClassVar[UserManager]  # pyright: ignore[reportIncompatibleVariableOverride]
