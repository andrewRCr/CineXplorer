"""
Type stubs for zoho_zeptomail.backend.message module.

⚠️ MAINTENANCE CONTRACT
------------------------
Synchronized with: django-zoho-zeptomail 0.0.3
Last verified: 2025-12-25

This module provides the ZeptoMailEmailMessage class which wraps Django's
EmailMessage for sending through the ZeptoMail API.

When upgrading:
1. Check if send() return type has changed
2. Check if __init__ signature has changed
3. Update "Last verified" date above
"""

from django.core.mail.message import EmailMessage

class ZeptoMailEmailMessage:
    """Wrapper class for Django email messages to send through ZeptoMail API.

    Wraps a Django EmailMessage and converts it to ZeptoMail's API format.
    """

    def __init__(self, email_message: EmailMessage) -> None:
        """Initialize with a Django EmailMessage.

        Args:
            email_message: The Django email message to send.
        """

    def send(self) -> int:
        """Send the email through ZeptoMail API.

        Returns:
            1 if successful, 0 if failed.
        """
