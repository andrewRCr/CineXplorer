"""
Custom django-allauth adapter for CineXplorer.

Integrates allauth's email sending with ZeptoMail transactional email service.
"""
from __future__ import annotations

import logging
from typing import Any

from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
from django.http import HttpRequest

import requests

logger = logging.getLogger(__name__)


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom allauth adapter that uses ZeptoMail for transactional emails.

    Overrides allauth's default email sending to integrate with our
    ZeptoMail service for email verification, password reset, and other
    account-related emails.
    """

    def __init__(self, request: HttpRequest | None = None) -> None:
        super().__init__(request)
        # ZeptoMail configuration
        self.api_key: str = getattr(settings, "ZEPTOMAIL_API_KEY", "")
        self.base_url: str = getattr(
            settings, "ZEPTOMAIL_BASE_URL", "https://api.zeptomail.com/v1.1"
        )
        self.sender_email: str = getattr(settings, "ZEPTOMAIL_SENDER_EMAIL", "")
        testing: bool = getattr(settings, "TESTING", False)
        # Development mode flag - enable when no API key or in testing
        self.dev_mode: bool = not self.api_key or testing

    def _get_headers(self) -> dict[str, str]:
        """Get headers for ZeptoMail API requests."""
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Zoho-enczapikey {self.api_key}",
        }

    def send_mail(
        self,
        template_prefix: str,
        email: str,
        context: dict[str, Any],
    ) -> None:
        """
        Send email using ZeptoMail service.

        Overrides allauth's default send_mail to use ZeptoMail instead of
        Django's email backend.

        Args:
            template_prefix: Template path prefix (e.g., 'account/email/email_confirmation')
            email: Recipient email address
            context: Template context dict
        """
        # Development mode - log instead of sending
        if self.dev_mode:
            logger.info(
                "DEV MODE: Email simulated",
                extra={
                    "recipient": email,
                    "template": template_prefix,
                    "subject": context.get("subject", "N/A"),
                },
            )
            return

        try:
            # Render email subject and body from allauth templates
            msg = self.render_mail(template_prefix, email, context)
            subject = msg.subject
            # Get HTML body (allauth uses EmailMultiAlternatives with 'alternatives' attribute)
            html_body = msg.body if hasattr(msg, 'body') else ""
            if hasattr(msg, 'alternatives') and msg.alternatives:  # type: ignore[attr-defined]
                # Use HTML alternative if available (django-stubs doesn't type EmailMultiAlternatives.alternatives)
                html_body = msg.alternatives[0][0]  # type: ignore[attr-defined]

            # ZeptoMail API payload
            # Extract user info from context (user is a User object, not a dict)
            user = context.get("user")
            recipient_name = user.username if user and hasattr(user, 'username') else email

            payload = {
                "from": {
                    "address": self.sender_email,
                    "name": "CineXplorer",
                },
                "to": [
                    {
                        "email_address": {
                            "address": email,
                            "name": recipient_name,
                        }
                    }
                ],
                "subject": subject,
                "htmlbody": html_body,
                "track_clicks": True,
                "track_opens": True,
            }

            response = requests.post(
                f"{self.base_url}/email",
                json=payload,
                headers=self._get_headers(),
                timeout=10,
            )

            if response.status_code == 201:
                logger.info(
                    "Email sent successfully via ZeptoMail",
                    extra={
                        "recipient": email,
                        "template": template_prefix,
                        "status_code": response.status_code,
                    },
                )
            else:
                response_text = response.text[:200] if response.text else "No response body"
                logger.warning(
                    "Failed to send email via ZeptoMail",
                    extra={
                        "recipient": email,
                        "template": template_prefix,
                        "status_code": response.status_code,
                        "response_preview": response_text,
                    },
                )

        except Exception as e:
            logger.error(
                "Error sending email via ZeptoMail",
                extra={
                    "recipient": email,
                    "template": template_prefix,
                    "error": str(e),
                },
                exc_info=True,
            )
            # Re-raise to let allauth handle the error
            raise

    def get_email_confirmation_url(
        self, request: HttpRequest | None, emailconfirmation: Any
    ) -> str:
        """
        Construct the email confirmation URL.

        Overrides to ensure frontend URL is used for email verification links.

        Args:
            request: HTTP request object (may be None)
            emailconfirmation: EmailConfirmation instance

        Returns:
            str: Full URL for email confirmation
        """
        # Use FRONTEND_URL from settings for the email confirmation link
        frontend_url = getattr(settings, "FRONTEND_URL", "https://localhost:8444")
        key = emailconfirmation.key
        # Frontend will handle the verification and call backend API
        return f"{frontend_url}/verify-email/{key}"
