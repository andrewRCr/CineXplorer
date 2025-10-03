"""
Email service for sending transactional emails via Zeptomail.
"""
from __future__ import annotations

import logging

import requests
from authentication.email_verification import email_verification_service
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class ZeptomailService:
    """Service for sending emails via Zeptomail API."""

    def __init__(self) -> None:
        # Safely read settings with defaults to avoid AttributeError
        self.api_key: str = getattr(settings, "ZEPTOMAIL_API_KEY", "")
        self.base_url: str = getattr(
            settings, "ZEPTOMAIL_BASE_URL", "https://api.zeptomail.com/v1.1"
        )
        testing: bool = getattr(settings, "TESTING", False)
        # Development mode flag - enable when no API key or in testing
        self.dev_mode: bool = not self.api_key or testing

    def _get_headers(self) -> dict[str, str]:
        """Get headers for Zeptomail API requests."""
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Zoho-enczapikey {self.api_key}",
        }

    def send_verification_email(self, user: AbstractUser) -> bool:
        """
        Send email verification link to user.

        NOTE: This method is a temporary stub that will be replaced in API Layer
        Modernization Phase 2 when DRF endpoints are migrated to Django Ninja.
        Actual email verification is handled by allauth through the custom adapter
        (authentication.adapters.CustomAccountAdapter).

        Args:
            user: User instance to send verification email to

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        # TEMPORARY STUB: Auto-verify for development (replaced in API Layer Phase 2)
        logger.warning(
            "Email verification temporarily disabled during auth modernization",
            extra={
                "user_email": user.email,
                "message": "Will be integrated with django-allauth in Task 5.0",
            },
        )

        # Auto-verify for development during migration
        if self.dev_mode:
            try:
                email_verification_service.mark_email_verified(user)
                logger.info(
                    "DEV MODE: Email auto-verified during migration",
                    extra={"user_email": user.email},
                )
                return True
            except Exception as e:
                logger.error(
                    "DEV MODE: Failed to mark email as verified",
                    extra={"user_email": user.email, "error": str(e)},
                    exc_info=True,
                )
                return False

        return True

    def send_welcome_email(self, user: AbstractUser) -> bool:
        """
        Send welcome email after successful verification.

        Args:
            user: User instance to send welcome email to

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        # Development mode - log instead of sending
        if self.dev_mode:
            logger.info(
                "DEV MODE: Welcome email simulated",
                extra={"user_email": user.email},
            )
            return True

        try:
            subject = "Welcome to CineXplorer!"
            html_body = render_to_string(
                "emails/welcome.html",
                {"user": user, "frontend_url": settings.FRONTEND_URL},
            )

            payload = {
                "from": {
                    "address": settings.ZEPTOMAIL_SENDER_EMAIL,
                    "name": "CineXplorer",
                },
                "to": [
                    {
                        "email_address": {
                            "address": user.email,
                            "name": user.username,
                        }
                    }
                ],
                "subject": subject,
                "htmlbody": html_body,
                "track_clicks": True,
                "track_opens": True,
            }

            response = requests.post(
                f"{self.base_url}/email", json=payload, headers=self._get_headers()
            )

            if response.status_code == 201:
                logger.info(
                    "Welcome email sent successfully",
                    extra={"user_email": user.email, "status_code": response.status_code},
                )
                return True
            else:
                response_text = response.text[:200] if response.text else "No response body"
                logger.warning(
                    "Failed to send welcome email",
                    extra={
                        "user_email": user.email,
                        "status_code": response.status_code,
                        "response_preview": response_text,
                    },
                )
                return False

        except Exception as e:
            logger.error(
                "Error sending welcome email",
                extra={"user_email": user.email, "error": str(e)},
                exc_info=True,
            )
            return False


# Lazy service factory pattern (avoid import-time instantiation)
_email_service_instance: ZeptomailService | None = None


def get_email_service() -> ZeptomailService:
    """
    Get or create the email service instance.

    Lazy initialization ensures Django settings are ready before instantiation.
    This pattern also enables easier testing and dependency injection.

    Returns:
        ZeptomailService: Configured email service instance
    """
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = ZeptomailService()
    return _email_service_instance


# Backward compatibility: Provide email_service at module level
# This delegates to get_email_service() for lazy initialization
# NOTE: Proxy pattern will be evaluated in Backend Modernization (service refactoring)
class _EmailServiceProxy:
    """Proxy that delegates attribute access to the lazily-initialized service."""

    def __getattr__(self, name: str) -> object:
        return getattr(get_email_service(), name)


email_service = _EmailServiceProxy()
