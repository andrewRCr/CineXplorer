"""Type stub for email_service module.

Provides explicit type information for the email_service proxy pattern.
This enables type checkers to properly infer return types when calling
email_service methods.
"""
from __future__ import annotations

from django.contrib.auth.base_user import AbstractBaseUser

class ZeptomailService:
    """Service for sending emails via Zeptomail API."""

    api_key: str
    base_url: str
    dev_mode: bool

    def __init__(self) -> None: ...
    def _get_headers(self) -> dict[str, str]: ...
    def send_welcome_email(self, user: AbstractBaseUser) -> bool: ...
    def send_password_reset_email(self, user: AbstractBaseUser, reset_url: str) -> bool: ...

class _EmailServiceProxy:
    """Proxy that delegates to ZeptomailService."""

    def send_welcome_email(self, user: AbstractBaseUser) -> bool: ...
    def send_password_reset_email(self, user: AbstractBaseUser, reset_url: str) -> bool: ...

def get_email_service() -> ZeptomailService: ...

# Module-level email_service instance (proxy pattern)
email_service: _EmailServiceProxy
