"""
Type stub file for django-allauth account models.

Provides explicit type annotations for allauth's EmailAddress and EmailConfirmation
models. NO official type stubs exist for django-allauth.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: django-allauth 0.63.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading django-allauth or django-types:
1. Check allauth release notes for EmailAddress/EmailConfirmation API changes
2. Check for official allauth type stubs (none exist as of 0.63.x)
3. Run tests - if runtime errors occur, check this stub file first
4. Verify these method signatures match actual runtime behavior
5. Update "Last verified" date above

Trade-off: This stub provides excellent IDE support and eliminates 17+ type: ignore
comments, but requires manual verification on allauth upgrades (~120 lines to maintain).
For a mature, stable library like allauth, this is a good trade (API updates are infrequent).

Purpose: Eliminates 17+ type: ignore[attr-defined] comments in authentication code
Pattern: Custom stubs for third-party libraries without complete type information
Status: NO official allauth stubs exist - this is REQUIRED (not a supplement)
"""

from __future__ import annotations

from datetime import datetime
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
        signup: bool = False,
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
    sent: datetime | None  # DateTimeField(null=True)

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

class EmailConfirmationHMAC:
    """
    Type stub for allauth's EmailConfirmationHMAC.

    HMAC-based email confirmation that doesn't require database storage.
    Used for generating and validating email confirmation keys.
    """

    # Attributes
    email_address: EmailAddress
    key: str

    def __init__(self, email_address: EmailAddress) -> None:
        """
        Create HMAC confirmation for email address.

        Args:
            email_address: EmailAddress to create confirmation for
        """

    @classmethod
    def from_key(cls, key: str) -> EmailConfirmationHMAC | None:
        """
        Validate and load EmailConfirmationHMAC from key.

        Args:
            key: HMAC confirmation key to validate

        Returns:
            EmailConfirmationHMAC if key is valid, None otherwise
        """

    def confirm(self, request: HttpRequest | None = None) -> EmailAddress:
        """
        Confirm the email address associated with this HMAC confirmation.

        Args:
            request: HTTP request context

        Returns:
            The confirmed EmailAddress instance
        """
