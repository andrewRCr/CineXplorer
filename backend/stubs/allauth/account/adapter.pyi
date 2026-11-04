"""Type stubs for allauth.account.adapter module.

Maintenance Contract:
Synchronized with: django-allauth 65.12.0
Last verified: 2025-10-09

When upgrading django-allauth:
1. Check DefaultAccountAdapter method signatures for changes
2. Verify render_mail and send_mail context types still match
3. Update "Last verified" date above

Purpose: Provides type information for DefaultAccountAdapter to eliminate
reportMissingTypeStubs errors in custom adapter implementations.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.http import HttpRequest

if TYPE_CHECKING:
    from allauth.account.models import EmailConfirmation

class DefaultAccountAdapter:
    """Base adapter class for django-allauth account functionality.

    Custom adapters should inherit from this class and override specific methods.
    """

    def __init__(self, request: HttpRequest | None = None) -> None: ...
    def get_client_ip(self, request: HttpRequest) -> str: ...
    def render_mail(
        self,
        template_prefix: str,
        email: str,
        context: dict[str, Any],  # Allauth's template context - external library contract
        headers: dict[str, str] | None = None,
    ) -> Any:  # Returns django.core.mail.EmailMessage or EmailMultiAlternatives (external library)
        """Render email from template."""

    def send_mail(
        self,
        template_prefix: str,
        email: str,
        context: dict[str, Any],  # Allauth's template context - external library contract
    ) -> None:
        """Send email using Django's email backend."""

    def get_email_confirmation_url(
        self, request: HttpRequest | None, emailconfirmation: EmailConfirmation
    ) -> str:
        """Construct the email confirmation (activation) URL."""

def get_adapter(request: HttpRequest | None = None) -> DefaultAccountAdapter: ...
