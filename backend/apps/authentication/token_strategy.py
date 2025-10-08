"""
Django-allauth Token Strategy for JWT generation.

This module implements the official Token Strategy API pattern for django-allauth
headless mode, replacing the previous signal/middleware approach with a cleaner,
more maintainable solution.

Token Strategy API is the recommended pattern for custom token generation in
django-allauth v64+, providing a centralized extension point for OAuth and
email/password authentication flows.

References:
    - Token Strategy API: https://docs.allauth.org/en/dev/headless/tokens.html
    - External Research Audit: 2025-10-08 authentication security audit
"""
from __future__ import annotations

from datetime import timedelta

from allauth.headless.tokens import AbstractTokenStrategy
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.http import HttpRequest
from ninja_jwt.tokens import RefreshToken


class JWTTokenStrategy(AbstractTokenStrategy):
    """
    Token strategy that generates JWT tokens for authenticated users.

    This is the official django-allauth extension point for custom token generation.
    It replaces the signal-based approach with a cleaner, more maintainable solution
    that works for all authentication flows (OAuth, email/password, MFA).

    The strategy generates both access and refresh tokens using django-ninja-jwt,
    with lifetimes configured in SIMPLE_JWT settings.
    """

    def create_access_token(self, request: HttpRequest) -> tuple[str, int]:
        """
        Create JWT access token for authenticated user.

        Called by django-allauth after successful authentication (email/password,
        OAuth, etc.). The token is returned to the client for API access.

        Args:
            request: HTTP request with authenticated user

        Returns:
            Tuple of (token_string, lifetime_seconds)
        """
        # Type assertion: django-allauth only calls this with authenticated users
        assert isinstance(request.user, AbstractBaseUser)

        # Generate JWT tokens using ninja-jwt
        refresh = RefreshToken.for_user(request.user)
        access_token = str(refresh.access_token)  # type: ignore[attr-defined]

        # Get token lifetime from settings
        jwt_settings: dict[str, object] = settings.SIMPLE_JWT
        access_lifetime = jwt_settings.get("ACCESS_TOKEN_LIFETIME")
        assert isinstance(access_lifetime, timedelta)
        lifetime_seconds = int(access_lifetime.total_seconds())

        return access_token, lifetime_seconds

    def create_refresh_token(self, request: HttpRequest) -> tuple[str, int]:
        """
        Create JWT refresh token for authenticated user.

        Called by django-allauth after successful authentication. The refresh
        token is used to obtain new access tokens without re-authentication.

        Args:
            request: HTTP request with authenticated user

        Returns:
            Tuple of (token_string, lifetime_seconds)
        """
        # Type assertion: django-allauth only calls this with authenticated users
        assert isinstance(request.user, AbstractBaseUser)

        # Generate refresh token using ninja-jwt
        refresh = RefreshToken.for_user(request.user)
        refresh_token = str(refresh)

        # Get token lifetime from settings
        jwt_settings: dict[str, object] = settings.SIMPLE_JWT
        refresh_lifetime = jwt_settings.get("REFRESH_TOKEN_LIFETIME")
        assert isinstance(refresh_lifetime, timedelta)
        lifetime_seconds = int(refresh_lifetime.total_seconds())

        return refresh_token, lifetime_seconds
