"""
Custom django-allauth adapter for CineXplorer.

Customizes email confirmation URLs to point to the frontend application.
Email sending is handled by Django's email backend (django-zoho-zeptomail).
JWT token generation is handled by HEADLESS_TOKEN_STRATEGY setting.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
from django.http import HttpRequest

if TYPE_CHECKING:
    from allauth.account.models import EmailConfirmation


class EmailDeliveryError(Exception):
    """Raised when email delivery fails."""


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom allauth adapter for frontend URL customization and email verification.

    Overrides:
    - get_email_confirmation_url(): Points verification links to frontend
    - send_mail(): Verifies email was actually sent, raises on failure

    Email delivery is handled by Django's email backend configured in
    settings.py (ZohoZeptoMailEmailBackend for production, locmem for tests).
    """

    def send_mail(self, template_prefix: str, email: str, context: dict[str, object]) -> None:
        """
        Send email and verify delivery.

        Overrides default to check msg.send() return value and raise
        EmailDeliveryError if the email backend reports failure.

        Also injects expiry_days into context for email templates that display
        the verification link expiration period.

        Raises:
            EmailDeliveryError: If email backend returns 0 (not sent)
        """
        # Inject expiry_days for templates that display verification expiration
        context["expiry_days"] = getattr(settings, "EMAIL_VERIFICATION_EXPIRY_DAYS", 3)

        msg = self.render_mail(template_prefix, email, context)
        sent_count = msg.send()
        if sent_count == 0:
            raise EmailDeliveryError(
                f"Email delivery failed for {email} (template: {template_prefix})"
            )

    def get_email_confirmation_url(
        self, request: HttpRequest | None, emailconfirmation: EmailConfirmation
    ) -> str:
        """
        Construct the email confirmation URL for the frontend.

        Overrides default to use FRONTEND_URL instead of backend URL,
        allowing the React frontend to handle email verification flow.

        Uses /login?verify=TOKEN pattern instead of dedicated /verify-email/:token route.
        This consolidates verification into the login page and uses a button safeguard
        to prevent email client link scanning from consuming single-use tokens.

        Args:
            request: HTTP request object (may be None)
            emailconfirmation: EmailConfirmation instance with verification key

        Returns:
            Full URL for email confirmation (e.g., https://localhost:8444/login?verify={key})
        """
        frontend_url = getattr(settings, "FRONTEND_URL", "https://localhost:8444").rstrip("/")
        key = emailconfirmation.key
        return f"{frontend_url}/login?verify={key}"
