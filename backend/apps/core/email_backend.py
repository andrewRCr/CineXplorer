"""Custom ZeptoMail email backend with proper HTML support.

The django-zoho-zeptomail package (v0.0.3) has a bug where it concatenates
plaintext and HTML content into a single htmlbody field instead of sending
them as separate textbody and htmlbody fields.

This backend fixes that by properly setting both fields, enabling email
clients to display the HTML version while providing plaintext fallback.

Bug status: Confirmed via external research - no upstream fix exists.
See: https://github.com/zohomail/zoho_zeptomail-django (minimal maintenance)

IMPORTANT: This module uses lazy imports to avoid triggering zoho_zeptomail's
class-level initialization at import time, which would break tests that use
the locmem email backend.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol, cast

from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage, EmailMultiAlternatives


class ZeptoMailMessageProtocol(Protocol):
    """Protocol for ZeptoMailEmailMessage - documents expected interface."""

    def __init__(self, email_message: EmailMessage) -> None:
        """Initialize with a Django EmailMessage."""
        ...

    def send(self) -> int:
        """Send the email message. Returns 1 on success, 0 on failure."""
        ...


# Type alias for the internal email_data dict used by ZeptoMail
# ZeptoMail API expects: textbody (plain text) and htmlbody (HTML) as separate fields
ZeptoMailData = dict[str, object]


# Lazy-loaded class reference to avoid import-time side effects
# The zoho_zeptomail library creates API clients at class definition time
_zeptomail_message_cls: type[ZeptoMailMessageProtocol] | None = None


def _get_zeptomail_message_class() -> type[ZeptoMailMessageProtocol]:
    """Lazily import ZeptoMailEmailMessage on first use.

    This avoids triggering class-level API client initialization when
    the module is imported but not used (e.g., in tests with locmem backend).
    """
    global _zeptomail_message_cls

    if _zeptomail_message_cls is None:
        # No type stubs exist for zoho_zeptomail - using Protocol + cast for type safety
        from zoho_zeptomail.backend.message import ZeptoMailEmailMessage  # noqa: I001  # pyright: ignore[reportMissingImports,reportUnknownVariableType]

        # Cast the untyped class to our Protocol type
        _zeptomail_message_cls = cast(
            type[ZeptoMailMessageProtocol],
            ZeptoMailEmailMessage,  # pyright: ignore[reportUnknownArgumentType]
        )

    # At this point, _zeptomail_message_cls is definitely not None
    assert _zeptomail_message_cls is not None
    return _zeptomail_message_cls


class FixedZohoZeptoMailEmailBackend(BaseEmailBackend):
    """ZeptoMail backend with fixed multipart email handling.

    Fixes django-zoho-zeptomail bug by properly setting textbody and htmlbody
    as separate fields instead of concatenating them into a single htmlbody.

    Uses lazy imports to avoid class-level initialization side effects that
    would break tests using Django's locmem email backend.
    """

    def send_messages(
        self, email_messages: Iterable[EmailMessage]
    ) -> int:
        """Send emails with proper multipart support.

        Args:
            email_messages: Iterable of Django EmailMessage objects to send.

        Returns:
            Number of emails successfully sent.
        """
        zeptomail_cls = _get_zeptomail_message_class()
        count = 0

        for email in email_messages:
            try:
                # Create ZeptoMail message wrapper
                msg = zeptomail_cls(email)

                # Fix the body fields to properly separate text and HTML
                self._fix_body_fields(msg, email)

                # Send and track success
                count += msg.send()
            except Exception:
                if not self.fail_silently:
                    raise

        return count

    def _fix_body_fields(
        self,
        msg: ZeptoMailMessageProtocol,
        email: EmailMessage,
    ) -> None:
        """Fix ZeptoMail message to properly set textbody and htmlbody.

        The original ZeptoMailEmailMessage.__set_body() concatenates text and
        HTML into a single htmlbody field. This method fixes that by setting
        them as separate fields per the ZeptoMail API specification.

        Args:
            msg: ZeptoMailEmailMessage wrapper (contains internal __email_data dict)
            email: Original Django EmailMessage with content to extract
        """
        # Access the internal email_data dict (name-mangled in ZeptoMailEmailMessage)
        # This dict is sent to the ZeptoMail API
        attr_name = "_ZeptoMailEmailMessage__email_data"
        email_data = getattr(msg, attr_name, None)

        # Ensure email_data is a dict - create and assign back if missing or wrong type
        if not isinstance(email_data, dict):
            email_data = {}
            setattr(msg, attr_name, email_data)

        # Now email_data is guaranteed to be a dict attached to msg
        email_data = cast(ZeptoMailData, email_data)

        # Set body based on content subtype
        if email.content_subtype == "plain":
            email_data["textbody"] = email.body
        elif email.content_subtype == "html":
            email_data["htmlbody"] = email.body

        # Handle alternatives (EmailMultiAlternatives adds HTML as alternative)
        if isinstance(email, EmailMultiAlternatives):
            for content, mime_type in email.alternatives:
                if mime_type == "text/html":
                    email_data["htmlbody"] = content
                elif mime_type == "text/plain":
                    email_data["textbody"] = content
