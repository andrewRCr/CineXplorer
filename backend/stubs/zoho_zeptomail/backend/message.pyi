"""The pinned converter's Django input and external API payload."""

from typing import Any

from django.core.mail import EmailMessage

class ZeptoMailEmailMessage:
    # Any is confined to the external API payload: nested fields depend on the message.
    _ZeptoMailEmailMessage__email_data: dict[str, Any]

    def __init__(self, email_message: EmailMessage) -> None: ...
