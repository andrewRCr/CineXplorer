"""Authentication domain utilities for JWT token handling.

This module provides helper functions for JWT settings retrieval,
token management, cookie setting, and token blacklisting operations.
"""

import contextlib
import logging
from datetime import timedelta
from typing import Literal

from django.conf import settings
from django.http import HttpResponse
from ninja_jwt.tokens import RefreshToken

logger = logging.getLogger(__name__)


class JWTSettings:
    """Encapsulates JWT settings retrieval with typed access.

    Provides type-safe access to JWT configuration from Django settings
    with caching to avoid repeated dictionary lookups.
    """

    def __init__(self) -> None:
        """Initialize JWT settings from Django SIMPLE_JWT configuration."""
        jwt_config = settings.SIMPLE_JWT  # type: ignore[misc]  # Django settings are dynamic
        self.refresh_token_name: str = str(jwt_config['REFRESH_TOKEN_NAME'])
        self.access_token_name: str = str(jwt_config['ACCESS_TOKEN_NAME'])
        # Django settings dynamic types
        self.refresh_lifetime: timedelta = jwt_config['REFRESH_TOKEN_LIFETIME']  # type: ignore[assignment]
        self.access_lifetime: timedelta = jwt_config['ACCESS_TOKEN_LIFETIME']  # type: ignore[assignment]
        self.samesite: Literal['Lax', 'Strict', 'None'] = (
            jwt_config.get('JWT_COOKIE_SAMESITE', 'Lax')  # type: ignore[assignment]
        )


def get_jwt_settings() -> JWTSettings:
    """Get typed JWT settings from Django configuration.

    Returns:
        JWTSettings instance with typed access to JWT configuration

    Example:
        >>> jwt_settings = get_jwt_settings()
        >>> print(jwt_settings.refresh_token_name)  # 'refresh_token'
        >>> print(jwt_settings.access_lifetime)  # timedelta(minutes=5)
    """
    return JWTSettings()


def set_auth_cookie(
    response: HttpResponse,
    token_name: str,
    token_value: str,
    lifetime: timedelta,
    samesite: Literal['Lax', 'Strict', 'None'] = 'Lax',
) -> None:
    """Set authentication token as HTTP-only secure cookie.

    Args:
        response: HTTP response object to set cookie on
        token_name: Cookie name (e.g., 'refresh_token', 'access_token')
        token_value: JWT token string
        lifetime: Token lifetime (timedelta)
        samesite: SameSite cookie attribute ('Lax', 'Strict', or 'None')

    Example:
        >>> from authentication.utils import set_auth_cookie, get_jwt_settings
        >>> jwt_settings = get_jwt_settings()
        >>> set_auth_cookie(
        ...     response,
        ...     jwt_settings.refresh_token_name,
        ...     refresh_token,
        ...     jwt_settings.refresh_lifetime,
        ...     jwt_settings.samesite
        ... )
    """
    response.set_cookie(
        token_name,
        token_value,
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=True,
        samesite=samesite,
    )


def extract_user_id_from_token(token_value: str) -> str | int:
    """Extract user_id from JWT token payload without signature verification.

    Useful for logging and attribution when handling blacklisted or
    invalid tokens. Does not validate token authenticity.

    Args:
        token_value: JWT token string

    Returns:
        User ID from token payload, or 'unknown' if extraction fails

    Example:
        >>> token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        >>> user_id = extract_user_id_from_token(token)
        >>> logger.warning(f"Invalid token from user_id={user_id}")
    """
    try:
        import jwt
        payload = jwt.decode(
            token_value,
            options={"verify_signature": False}
        )
        return payload.get('user_id', 'unknown')
    except Exception:
        return 'unknown'


def blacklist_token(token: RefreshToken) -> None:
    """Blacklist a refresh token with error suppression.

    Attempts to blacklist the token and logs warnings if blacklisting
    fails (e.g., blacklist app not installed or token already blacklisted).

    Args:
        token: RefreshToken instance to blacklist

    Example:
        >>> old_refresh = RefreshToken(old_token_value)
        >>> blacklist_token(old_refresh)  # Blacklists with error handling
    """
    try:
        token.blacklist()  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
    except AttributeError:
        # blacklist() method not available - library might not support it
        logger.warning(
            "Token blacklist not available - check ninja_jwt.token_blacklist in INSTALLED_APPS"
        )
    except Exception as e:
        # Token might already be blacklisted or blacklist table not available
        logger.warning(f"Failed to blacklist refresh token: {e!s}")


def check_token_blacklist(token: RefreshToken) -> None:
    """Check if token is blacklisted (manual check with error suppression).

    Attempts to check blacklist status. Suppresses AttributeError if
    blacklist functionality is not available.

    Args:
        token: RefreshToken instance to check

    Raises:
        TokenError: If token is blacklisted (raised by ninja-jwt)

    Example:
        >>> refresh = RefreshToken(token_value)
        >>> check_token_blacklist(refresh)  # Raises if blacklisted
    """
    with contextlib.suppress(AttributeError):
        # check_blacklist() not available in type stubs
        token.check_blacklist()  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
