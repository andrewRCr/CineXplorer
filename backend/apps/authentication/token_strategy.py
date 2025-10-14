"""
Django-allauth Token Strategy for JWT generation.

This module implements the official Token Strategy API pattern for django-allauth
headless mode, replacing the previous signal/middleware approach with a cleaner,
more maintainable solution.

Token Strategy API is the recommended pattern for custom token generation in
django-allauth v64+, providing a centralized extension point for OAuth and
email/password authentication flows.

Hybrid Authentication Architecture:
    - Access token: Returned in response body (frontend stores in localStorage)
    - Refresh token: Set as HTTP-only cookie only (XSS-proof, not in response)
    - Benefits: Instant auth detection + secure long-term refresh token

References:
    - Token Strategy API: https://docs.allauth.org/en/dev/headless/tokens.html
    - External Research Audit: 2025-10-08 authentication security audit
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from allauth.headless.internal import sessionkit
from allauth.headless.tokens.base import AbstractTokenStrategy
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.sessions.backends.base import SessionBase
from django.http import HttpRequest
from ninja_jwt.tokens import RefreshToken


class JWTTokenStrategy(AbstractTokenStrategy):
    """
    Token strategy that generates JWT tokens for authenticated users.

    This is the official django-allauth extension point for custom token generation.
    It replaces the signal-based approach with a cleaner, more maintainable solution
    that works for all authentication flows (OAuth, email/password, MFA).

    Hybrid Authentication Architecture:
    - Session token: Django session key (required for OAuth callbacks)
    - Access token: Returned in response body for localStorage (5-min lifetime)
    - Refresh token: Set as HTTP-only cookie only (14-day lifetime, XSS-proof)

    Security Model:
    - Short-lived access token in localStorage: XSS-vulnerable but 5-min damage window
    - Long-lived refresh token in HTTP-only cookie: Cannot be stolen by XSS
    - Industry standard pattern (Auth0, Firebase, AWS Amplify)

    Tokens are generated using django-ninja-jwt with lifetimes from SIMPLE_JWT settings.
    """

    # ========== Session Token Methods (Required by AbstractTokenStrategy) ==========

    def create_session_token(self, request: HttpRequest) -> str:
        """
        Create session token for OAuth flow and headless authentication.

        This is required by django-allauth for managing authentication state during
        OAuth callbacks. Returns the Django session key.

        Args:
            request: HTTP request with active session

        Returns:
            Session key string
        """
        if not request.session.session_key:
            request.session.save()
        key = request.session.session_key
        # Session was saved, key must exist
        assert isinstance(key, str)
        return key

    def lookup_session(self, session_token: str) -> SessionBase | None:
        """
        Lookup Django session by session token.

        Used by django-allauth to validate session tokens during authentication flows.

        Args:
            session_token: Session key to lookup

        Returns:
            SessionBase instance if session exists, None otherwise
        """
        session_key = session_token
        if sessionkit.session_store().exists(session_key):
            return sessionkit.session_store(session_key)
        return None

    # ========== JWT Access Token Methods (Optional, for API authentication) ==========

    def create_access_token(self, request: HttpRequest) -> str | None:
        """
        Create JWT access token for authenticated user.

        Returns just the token string. Override create_access_token_payload() to
        add additional metadata (lifetime, refresh token, etc.).

        Args:
            request: HTTP request with authenticated user

        Returns:
            JWT access token string, or None if user not authenticated
        """
        # Type assertion: django-allauth only calls this with authenticated users
        assert isinstance(request.user, AbstractBaseUser)  # pyright: ignore[reportUnknownMemberType]

        # Generate JWT tokens using ninja-jwt
        refresh = RefreshToken.for_user(request.user)
        access_token = str(refresh.access_token)

        return access_token

    def create_access_token_payload(
        self, request: HttpRequest
    ) -> dict[str, str | int] | None:
        """
        Create access token response payload for hybrid authentication.

        Hybrid Architecture Implementation:
        - Access token: Returned in response body (frontend stores in localStorage)
        - Refresh token: NOT in response (django-allauth sets as HTTP-only cookie)
        - Metadata: expires_in and issued_at for frontend token management

        Called by django-allauth to build the authentication response. The response
        payload is returned to the frontend, while refresh token is automatically
        set as HTTP-only cookie by django-allauth headless mode.

        Args:
            request: HTTP request with authenticated user

        Returns:
            Dict with access_token and expiration metadata (refresh token NOT included)
        """
        access_token = self.create_access_token(request)
        if not access_token:
            return None

        # Get token lifetime from settings
        jwt_settings: dict[str, object] = settings.SIMPLE_JWT
        access_lifetime = jwt_settings.get("ACCESS_TOKEN_LIFETIME")
        assert isinstance(access_lifetime, timedelta)

        # Calculate issued_at timestamp (UTC, ISO 8601 format)
        issued_at = datetime.now(UTC)

        # Return access token in response body for localStorage
        # Note: Refresh token is automatically set as HTTP-only cookie by django-allauth,
        # so we do NOT include it in response payload (hybrid architecture principle)
        return {
            "access_token": access_token,
            "expires_in": int(access_lifetime.total_seconds()),
            "issued_at": issued_at.isoformat(),
        }
