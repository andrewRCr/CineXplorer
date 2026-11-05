"""Email utilities for sending transactional emails.

Uses Django's email API with the project's bounded ZeptoMail backend.
"""

from __future__ import annotations

import logging
from typing import Protocol

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class UserEmailProtocol(Protocol):
    """User interface required for sending emails."""

    id: int
    username: str
    email: str


def send_welcome_email(user: UserEmailProtocol) -> bool:
    """Send welcome email after successful email verification.

    Uses Django's email API (the project's ZeptoMail backend in production,
    locmem in tests) to send the welcome email.

    Args:
        user: User instance to send welcome email to

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = "Welcome to CineXplorer!"
        html_body = render_to_string(
            "emails/welcome.html",
            {
                "user": user,
                "frontend_url": getattr(settings, "FRONTEND_URL", ""),
            },
        )

        # Create plain text version from HTML (basic fallback)
        plain_text = f"""Welcome to CineXplorer!

Hello {user.username}!

Your email has been successfully verified! Welcome to CineXplorer -
your ultimate movie discovery and tracking companion.

Visit us at: {getattr(settings, "FRONTEND_URL", "")}

Happy exploring!
The CineXplorer Team
"""

        sent_count = send_mail(
            subject=subject,
            message=plain_text,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
            html_message=html_body,
            fail_silently=False,
        )
        if sent_count == 0:
            # The backend reports that it sent nothing, as when the provider declines the message.
            logger.error("Welcome email not sent", extra={"user_id": user.id})
            return False

        logger.info("Welcome email sent successfully", extra={"user_id": user.id})
        return True

    except Exception as e:
        # The exception's text can carry the address, so only its type is logged.
        logger.error(
            "Error sending welcome email | error_type=%s",
            type(e).__name__,
            extra={"user_id": user.id, "error_type": type(e).__name__},
        )
        return False


__all__ = ["send_welcome_email"]
