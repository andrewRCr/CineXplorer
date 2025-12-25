# Stub for allauth.account.internal.flows.email_verification
# Library: django-allauth >= 65.11.2, < 66.0
# Last verified: 2025-12-21

from allauth.account.models import EmailAddress
from django.http import HttpRequest

def send_verification_email_to_address(
    request: HttpRequest,
    address: EmailAddress,
    signup: bool = False,
    process: object | None = None,
    skip_enumeration_mails: bool = False,
) -> bool: ...
