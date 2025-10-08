"""
Type stubs for allauth.account.adapter module.

Last verified: 2025-01-08
Django-allauth version: 65.12.0

Purpose: Provides type information for DefaultAccountAdapter to eliminate
reportMissingTypeStubs errors in custom adapter implementations.
"""

from typing import Any

from django.http import HttpRequest, HttpResponse

class DefaultAccountAdapter:
    """
    Base adapter class for django-allauth account functionality.

    Custom adapters should inherit from this class and override specific methods.
    """

    def __init__(self, request: HttpRequest | None = None) -> None: ...

    def render_mail(
        self,
        template_prefix: str,
        email: str,
        context: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> Any:  # Returns EmailMessage or EmailMultiAlternatives
        """Render email from template."""
        ...

    def send_mail(
        self,
        template_prefix: str,
        email: str,
        context: dict[str, Any],
    ) -> None:
        """Send email using Django's email backend."""
        ...

    def get_email_confirmation_url(
        self, request: HttpRequest | None, emailconfirmation: Any
    ) -> str:
        """Construct the email confirmation (activation) URL."""
        ...
