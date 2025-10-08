"""
Type stub file for django-allauth account models.

Provides explicit type annotations for allauth's EmailAddress and EmailConfirmation
models, enabling type-safe usage without type: ignore comments.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: django-allauth 0.63.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading django-allauth:
1. Check release notes for EmailAddress/EmailConfirmation API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify these method signatures match actual runtime behavior
4. Update "Last verified" date above

Trade-off: This stub provides excellent IDE support and eliminates 17+ type: ignore
comments, but requires manual verification on allauth upgrades. For a mature, stable
library like allauth, this is usually a good trade (updates are infrequent).

Purpose: Eliminates 17+ type: ignore[attr-defined] comments in authentication code
Pattern: Custom stubs for third-party libraries without complete type information
"""
from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.http import HttpRequest

if TYPE_CHECKING:
    from django.db.models.manager import Manager

class EmailAddress(models.Model):  # type: ignore[django-manager-missing]
    """
    Type stub for allauth's EmailAddress model.

    Represents an email address associated with a user account,
    including verification status and primary email designation.

    Note: DoesNotExist exception is inherited from Model and available at runtime
    """

    # Fields
    user: AbstractBaseUser
    email: str
    verified: bool
    primary: bool

    # Manager with custom methods (override acceptable in stub files)
    objects: ClassVar[EmailAddressManager]  # pyright: ignore[reportIncompatibleVariableOverride]

    # Reverse relation from EmailConfirmation.email_address
    emailconfirmation_set: ClassVar[Manager[EmailConfirmation]]

    # Instance methods
    def send_confirmation(self, request: HttpRequest | None = None, signup: bool = False) -> None:
        """Send email confirmation to this email address."""


class EmailAddressManager(Manager[EmailAddress]):
    """Custom manager for EmailAddress model with allauth-specific methods."""

    def add_email(
        self,
        request: HttpRequest | None,
        user: AbstractBaseUser,
        email: str,
        confirm: bool = False,
        signup: bool = False
    ) -> EmailAddress:
        """
        Add email address for user and optionally send confirmation.

        Args:
            request: HTTP request context
            user: User to associate email with
            email: Email address to add
            confirm: Whether to send confirmation email
            signup: Whether this is during signup

        Returns:
            EmailAddress instance
        """

    def get_primary(self, user: AbstractBaseUser) -> EmailAddress | None:
        """Get primary email address for user."""

    def get_verified(self, user: AbstractBaseUser) -> EmailAddress | None:
        """Get verified email address for user."""


class EmailConfirmation(models.Model):
    """
    Type stub for allauth's EmailConfirmation model.

    Represents an email confirmation key/token for verifying email addresses.

    Note: DoesNotExist exception is inherited from Model and available at runtime
    """

    # Fields
    key: str
    email_address: EmailAddress
    sent: object  # datetime field

    # Manager (override acceptable in stub files)
    objects: ClassVar[Manager[EmailConfirmation]]  # pyright: ignore[reportIncompatibleVariableOverride]

    # Instance methods
    def confirm(self, request: HttpRequest | None = None) -> EmailAddress:
        """
        Confirm the email address associated with this confirmation.

        Args:
            request: HTTP request context

        Returns:
            The confirmed EmailAddress instance
        """

    def key_expired(self) -> bool:
        """Check if confirmation key has expired."""
