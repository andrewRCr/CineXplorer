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


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom allauth adapter for frontend URL customization.

    This adapter only overrides get_email_confirmation_url() to ensure
    verification links point to the frontend application. All other
    functionality (including email sending) uses allauth defaults.

    Email delivery is handled by Django's email backend configured in
    settings.py (ZohoZeptoMailEmailBackend for production, locmem for tests).
    """

    def get_email_confirmation_url(
        self, request: HttpRequest | None, emailconfirmation: EmailConfirmation
    ) -> str:
        """
        Construct the email confirmation URL for the frontend.

        Overrides default to use FRONTEND_URL instead of backend URL,
        allowing the React frontend to handle email verification flow.

        Args:
            request: HTTP request object (may be None)
            emailconfirmation: EmailConfirmation instance with verification key

        Returns:
            Full URL for email confirmation (e.g., https://localhost:5173/verify-email/{key})
        """
        frontend_url = getattr(settings, "FRONTEND_URL", "https://localhost:8444").rstrip("/")
        key = emailconfirmation.key
        return f"{frontend_url}/verify-email/{key}"
