"""Bounded ZeptoMail delivery using the pinned package's message conversion."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import TYPE_CHECKING, cast

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from zoho_zeptomail.emails import SendEmail

if TYPE_CHECKING:
    from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def _response_identifiers(response: requests.Response) -> tuple[str | None, str | None]:
    try:
        raw: object = response.json()
    except ValueError:
        return None, None
    if not isinstance(raw, dict):
        return None, None
    payload = cast(dict[str, object], raw)
    error = payload.get("error")
    source = cast(dict[str, object], error) if isinstance(error, dict) else payload
    request_id = source.get("request_id", payload.get("request_id"))
    code = source.get("code")
    return (
        request_id if isinstance(request_id, str) else None,
        code if isinstance(code, str) else None,
    )


class ZeptoMailEmailBackend(BaseEmailBackend):
    """Count accepted messages and report delivery failures without exposing mail data."""

    def send_messages(self, email_messages: Iterable[EmailMessage]) -> int:
        messages = list(email_messages)
        if not messages:
            return 0
        key = getattr(settings, "ZOHO_ZEPTOMAIL_API_KEY_TOKEN", "")
        if not key:
            logger.warning("ZeptoMail delivery unavailable: API key is not configured")
            return 0
        try:
            region = getattr(settings, "ZOHO_ZEPTOMAIL_HOSTED_REGION", None)
            client = SendEmail(key, region) if region else SendEmail(key)
            # The package initializes a client in this class's body, so import only
            # once a key exists. Its converter has no public payload accessor.
            from zoho_zeptomail.backend.message import ZeptoMailEmailMessage
        except Exception as exc:
            # Conversion/configuration errors can contain mail data; log only the type.
            logger.warning("ZeptoMail delivery failed exception=%s", type(exc).__name__)
            return 0

        sent = 0
        for message in messages:
            try:
                converted = ZeptoMailEmailMessage(message)
                payload: object = converted._ZeptoMailEmailMessage__email_data
                response = requests.post(
                    client.get_sendmail_url(client.zeptomail_domain),
                    headers=client.headers_default,
                    json=payload,
                    timeout=(10, 10),
                )
                request_id, code = _response_identifiers(response)
                accepted = 200 <= response.status_code < 300
                logger.log(
                    logging.INFO if accepted else logging.WARNING,
                    "ZeptoMail %s status=%s request_id=%s code=%s",
                    "accepted" if accepted else "refused",
                    response.status_code,
                    request_id,
                    code,
                )
                sent += int(accepted)
            except Exception as exc:
                # Mail conversion and transport failures degrade to unsent. Their text
                # can quote recipients, headers or content, so never attach a traceback.
                logger.warning("ZeptoMail delivery failed exception=%s", type(exc).__name__)
        return sent
