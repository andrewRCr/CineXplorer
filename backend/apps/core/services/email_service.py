"""
Email service for sending transactional emails via Zeptomail.
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

import requests
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from accounts.models import EmailVerificationToken, User

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

    def send_verification_email(self, user: User) -> bool:
        """
        Send email verification link to user.

        Args:
            user: User instance to send verification email to

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        # Development mode - generate real token but log instead of sending
        if self.dev_mode:
            try:
                # Generate real verification token for local testing
                token, created = EmailVerificationToken.objects.get_or_create(
                    user=user,
                    defaults={
                        "token": secrets.token_urlsafe(32),
                        "expires_at": timezone.now()
                        + getattr(
                            settings,
                            "EMAIL_VERIFICATION_TOKEN_EXPIRY",
                            timedelta(days=1),
                        ),
                    },
                )

                # If token exists but is expired, regenerate it
                if not created and token.is_expired:
                    token.token = secrets.token_urlsafe(32)
                    token.expires_at = timezone.now() + getattr(
                        settings, "EMAIL_VERIFICATION_TOKEN_EXPIRY", timedelta(days=1)
                    )
                    token.save()

                # Generate real verification URL for testing
                verification_url = f"{settings.FRONTEND_URL}/verify-email/{token.token}"

                logger.info(
                    "DEV MODE: Verification email simulated",
                    extra={
                        "user_email": user.email,
                        "verification_url": verification_url,
                        "token_expires": token.expires_at.isoformat(),
                    },
                )
                return True

            except Exception as e:
                logger.error(
                    "DEV MODE: Failed to generate verification token",
                    extra={"user_email": user.email, "error": str(e)},
                    exc_info=True,
                )
                return False

        try:
            # Generate or get existing verification token
            token, created = EmailVerificationToken.objects.get_or_create(
                user=user,
                defaults={
                    "token": secrets.token_urlsafe(32),
                    "expires_at": timezone.now()
                    + settings.EMAIL_VERIFICATION_TOKEN_EXPIRY,
                },
            )

            # If token exists but is expired, update it
            if not created and token.is_expired:
                token.token = secrets.token_urlsafe(32)
                token.expires_at = (
                    timezone.now() + settings.EMAIL_VERIFICATION_TOKEN_EXPIRY
                )
                token.save()

            # Generate verification URL
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{token.token}"

            # Prepare email content
            subject = "Verify Your CineXplorer Account"
            html_body = render_to_string(
                "emails/verify_email.html",
                {
                    "user": user,
                    "verification_url": verification_url,
                    "frontend_url": settings.FRONTEND_URL,
                },
            )

            # Zeptomail API payload
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

            # Send email via Zeptomail
            response = requests.post(
                f"{self.base_url}/email", json=payload, headers=self._get_headers()
            )

            if response.status_code == 201:
                logger.info(
                    "Verification email sent successfully",
                    extra={"user_email": user.email, "status_code": response.status_code},
                )
                return True
            else:
                # Redact potentially sensitive response details
                response_text = response.text[:200] if response.text else "No response body"
                logger.error(
                    "Failed to send verification email",
                    extra={
                        "user_email": user.email,
                        "status_code": response.status_code,
                        "response_preview": response_text,
                    },
                )

                # Log detailed error for debugging (debug level to avoid production spam)
                logger.debug(
                    "Verification email error details",
                    extra={
                        "request_url": response.request.url,
                        "response_headers": dict(response.headers),
                        "full_response": response.text,
                    },
                )

                return False

        except Exception as e:
            logger.error(
                "Error sending verification email",
                extra={"user_email": user.email, "error": str(e)},
                exc_info=True,
            )
            return False

    def send_welcome_email(self, user: User) -> bool:
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
# TODO: Update all callers to use get_email_service() directly, then remove this
class _EmailServiceProxy:
    """Proxy that delegates attribute access to the lazily-initialized service."""

    def __getattr__(self, name: str):
        return getattr(get_email_service(), name)


email_service = _EmailServiceProxy()