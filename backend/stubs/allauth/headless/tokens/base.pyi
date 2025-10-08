"""
Type stubs for django-allauth AbstractTokenStrategy.

Synchronized with: django-allauth v65.12.0
Last verified: 2025-10-08
Upgrade checklist:
  - Check allauth.headless.tokens.base.AbstractTokenStrategy for signature changes
  - Verify abstract methods still required
  - Test token_strategy.py still works

NOTE: Uses typing.Any in create_access_token_payload return type to match
official library interface. This is acceptable per type-safety.md as it's
a third-party library contract we don't control.

This stub file exists because django-allauth has no official type stubs.
See: .arc/reference/strategies/strategy-type-safety.md
"""

import abc
from typing import Any

from django.contrib.sessions.backends.base import SessionBase
from django.http import HttpRequest

class AbstractTokenStrategy(abc.ABC):
    """
    Base class for token strategies in django-allauth headless mode.

    Subclasses must implement:
    - create_session_token() - Required for OAuth flow state management
    - lookup_session() - Required for session validation

    Optional overrides:
    - create_access_token() - Return custom access tokens (JWT, etc.)
    - create_access_token_payload() - Add metadata to token response
    - get_session_token() - Custom session token extraction
    """

    def get_session_token(self, request: HttpRequest) -> str | None:
        """
        Extract session token from request headers.

        Default implementation: Returns 'x-session-token' header value.
        """
        ...

    def create_access_token_payload(
        self, request: HttpRequest
    ) -> dict[str, Any] | None:
        """
        Create access token response payload.

        Called by django-allauth after authentication. Default implementation
        calls create_access_token() and wraps in {"access_token": token}.

        Override to add refresh tokens, expiration times, etc.

        Args:
            request: HTTP request with authenticated user

        Returns:
            Dict with access token and optional metadata, or None if no token
        """
        ...

    def create_access_token(self, request: HttpRequest) -> str | None:
        """
        Create access token for authenticated user.

        Optional method - default returns None (session-only auth).
        Override to provide JWT or other stateless tokens for API access.

        Args:
            request: HTTP request with authenticated user

        Returns:
            Access token string, or None for session-only authentication
        """
        ...

    @abc.abstractmethod
    def create_session_token(self, request: HttpRequest) -> str:
        """
        Create session token for authentication flow.

        Required by django-allauth for OAuth callback state management.
        Typically returns request.session.session_key.

        Args:
            request: HTTP request with active session

        Returns:
            Session token string (usually Django session key)
        """
        ...

    @abc.abstractmethod
    def lookup_session(self, session_token: str) -> SessionBase | None:
        """
        Lookup Django session by session token.

        Required by django-allauth to validate session tokens during auth flows.

        Args:
            session_token: Session key to lookup

        Returns:
            SessionBase instance if valid, None if session doesn't exist
        """
        ...
