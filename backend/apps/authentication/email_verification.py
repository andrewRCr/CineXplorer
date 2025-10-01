"""
Email verification compatibility layer for django-allauth migration.

**TEMPORARY MIGRATION BRIDGE - TO BE REMOVED**

This service provides email_verified semantics by wrapping django-allauth's
EmailAddress model, allowing gradual migration from custom User.email_verified
to allauth's email verification system.

**Lifecycle:**
1. Create this service (Task 2.2)
2. Use it to update views/serializers/backends (Task 2.3)
3. Complete allauth integration (Tasks 3.0-5.0)
4. Replace all service calls with direct allauth API usage
5. DELETE this file once migration is complete

**Removal Checklist (Post-Migration):**
- [ ] All views use allauth EmailAddress directly
- [ ] All serializers use allauth EmailAddress directly
- [ ] All backends use allauth EmailAddress directly
- [ ] No references to email_verification_service remain
- [ ] Delete this file

Type Checking Notes:
====================
This module uses django-allauth's EmailAddress model which may have limited
type information. Type ignore comments are used for allauth-specific operations
where type stubs are incomplete.
"""

from __future__ import annotations
import logging
from typing import TYPE_CHECKING
from django.conf import settings
from django.contrib.auth.models import User

if TYPE_CHECKING:
    from allauth.account.models import EmailAddress  # type: ignore[import-untyped]  # noqa: F401

logger = logging.getLogger(__name__)


class EmailVerificationService:
    """
    Service to manage email verification using django-allauth's EmailAddress model.

    This provides backward-compatible email_verified semantics for the migration
    from custom User.email_verified field to django-allauth's EmailAddress records.
    """

    @staticmethod
    def is_email_verified(user: User) -> bool:
        """
        Check if a user's email is verified via django-allauth EmailAddress.

        Args:
            user: Django User instance

        Returns:
            True if user has a verified EmailAddress record, False otherwise
        """
        try:
            # Import here to avoid circular dependency and graceful degradation
            from allauth.account.models import (  # type: ignore[import-untyped]  # noqa: F811
                EmailAddress
            )

            # Check if user has a verified email address
            return EmailAddress.objects.filter(
                user=user,
                email__iexact=user.email,
                verified=True
            ).exists()
        except ImportError:
            # If allauth not installed yet, return False
            return False
        except Exception as e:
            # Handle any database/model errors gracefully
            logger.exception(
                "Failed checking email verification for user %s: %s",
                getattr(user, "pk", None),
                str(e)
            )
            return False

    @staticmethod
    def mark_email_verified(user: User) -> None:
        """
        Mark a user's email as verified in django-allauth EmailAddress.

        Creates an EmailAddress record if it doesn't exist, or updates existing
        record to verified=True.

        Args:
            user: Django User instance
        """
        try:
            from allauth.account.models import (  # type: ignore[import-untyped]  # noqa: F811
                EmailAddress
            )

            # Find existing EmailAddress record (case-insensitive)
            email_address = EmailAddress.objects.filter(
                user=user,
                email__iexact=user.email
            ).first()

            if email_address:
                # Update existing record if not already verified
                if not email_address.verified:
                    email_address.verified = True
                    email_address.save(update_fields=['verified'])
                # Ensure it's set as primary (handles constraint properly)
                if not email_address.primary:
                    email_address.set_as_primary()
            else:
                # Create new EmailAddress record using allauth's method
                # This properly handles the unique primary constraint
                EmailAddress.objects.add_email(  # type: ignore[attr-defined]
                    request=None,
                    user=user,
                    email=user.email,
                    confirm=False,  # Skip confirmation since we're marking as verified
                    signup=False
                )
                # Mark as verified and set as primary
                email_address = EmailAddress.objects.get(user=user, email__iexact=user.email)
                email_address.verified = True
                email_address.save(update_fields=['verified'])
                email_address.set_as_primary()

        except ImportError:
            # If allauth not installed yet, silently pass
            pass
        except Exception as e:
            # Log errors but don't break the application
            from core.services.metrics import record_error, increment

            user_id = getattr(user, "pk", None)
            user_email = getattr(user, "email", "unknown")

            # Increment failure metric for monitoring
            is_debug = getattr(settings, "DEBUG", True)
            environment = "development" if is_debug else "production"

            increment(
                "email_verification_mark_failed_total",
                labels={
                    "service": "authentication",
                    "environment": environment,
                    "user_id": str(user_id) if user_id else "none",
                }
            )

            # Record error event for alerting
            record_error(
                "email_verification_failure",
                f"Failed to mark email as verified for user {user_id}",
                context={
                    "user_id": user_id,
                    "email": user_email,
                    "error_type": type(e).__name__,
                },
                exception=e
            )

            # Original logging for backward compatibility
            logger.exception(
                "Failed marking email verified for user %s: %s",
                user_id,
                str(e)
            )

    @staticmethod
    def get_user_email_addresses(user: User) -> list[object]:
        """
        Get all EmailAddress records for a user.

        Args:
            user: Django User instance

        Returns:
            List of EmailAddress objects, or empty list if allauth not available
        """
        try:
            from allauth.account.models import (  # type: ignore[import-untyped]  # noqa: F811
                EmailAddress
            )

            return list(
                EmailAddress.objects.filter(user=user)
            )  # type: ignore[no-any-return]
        except ImportError:
            return []
        except Exception as e:
            logger.exception(
                "Failed getting email addresses for user %s: %s",
                getattr(user, "pk", None),
                str(e)
            )
            return []

    @staticmethod
    def get_primary_email_address(user: User) -> object | None:
        """
        Get the primary EmailAddress record for a user.

        Args:
            user: Django User instance

        Returns:
            Primary EmailAddress object, or None if not found or allauth unavailable
        """
        try:
            from allauth.account.models import (  # type: ignore[import-untyped]  # noqa: F811
                EmailAddress
            )

            return EmailAddress.objects.filter(  # type: ignore[no-any-return]
                user=user,
                primary=True
            ).first()
        except ImportError:
            return None
        except Exception as e:
            logger.exception(
                "Failed getting primary email address for user %s: %s",
                getattr(user, "pk", None),
                str(e)
            )
            return None


# Convenience instance for module-level import
email_verification_service = EmailVerificationService()
