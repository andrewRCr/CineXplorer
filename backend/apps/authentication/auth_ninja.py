"""
Django Ninja authentication adapter for CineXplorer.

This module provides native Django Ninja authentication integration with:
- OpenAPI security schema documentation
- Proper error handling and logging
- Native dependency injection patterns
- JWT cookie-based authentication
"""
from __future__ import annotations

import logging
from typing import Any, cast

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest
from ninja.errors import HttpError
from ninja.security import APIKeyCookie
from ninja_jwt.exceptions import InvalidToken, TokenError
from ninja_jwt.settings import api_settings
from ninja_jwt.tokens import AccessToken

# Get logger for authentication events
logger = logging.getLogger('cinexplorer.auth')


def get_jwt_cookie_name() -> str:
    """
    Get the JWT access token cookie name from Django settings.

    Centralizes the settings lookup to avoid duplication across the module.

    Returns:
        The configured cookie name, defaulting to 'access_token'.
    """
    jwt_settings = cast(dict[str, Any], getattr(
        settings,
        'SIMPLE_JWT',
        {}
    ))
    return cast(str, jwt_settings.get('ACCESS_TOKEN_NAME', 'access_token'))


class JWTCookieAuth(APIKeyCookie):
    """
    Django Ninja native security scheme for JWT tokens from HTTP-only cookies.

    This extends Django Ninja's APIKeyCookie to provide:
    - OpenAPI security schema documentation
    - Native dependency injection integration
    - Proper error handling and logging
    - JWT cookie-based authentication
    """

    # Set the cookie name as a class attribute (Django Ninja pattern)
    param_name: str = get_jwt_cookie_name()

    def __init__(self) -> None:
        """Initialize the JWT cookie authentication scheme."""
        # CSRF Handling Strategy: Bypass Django Ninja's CSRF, use Django's middleware
        #
        # Configuration:
        # - THIS AUTH CLASS: csrf=False (no Django Ninja CSRF interference)
        # - NinjaAPI in api.py: csrf=False (no API-level Django Ninja CSRF)
        # - Django middleware: CsrfViewMiddleware ENABLED (handles all validation)
        #
        # Why csrf=False on BOTH levels:
        # Django Ninja's CSRF implementation conflicts with Django's CsrfViewMiddleware.
        # Both csrf=True (default) and explicit csrf=True cause Django Ninja bug #1464
        # where valid CSRF tokens are rejected with "CSRF check Failed".
        #
        # By setting csrf=False at both auth class and API levels, we completely
        # bypass Django Ninja's CSRF and rely solely on Django's battle-tested
        # CsrfViewMiddleware for protection.
        #
        # CSRF protection IS ACTIVE via Django's middleware - this just prevents
        # Django Ninja from interfering with Django's validation.
        #
        # See: https://github.com/vitalik/django-ninja/issues/1464
        super().__init__(csrf=False)

        logger.debug(f"Initialized JWT cookie auth with cookie name: {self.param_name}")

    def authenticate(self, request: HttpRequest, key: str | None) -> AbstractUser | None:
        """
        Authenticate user from JWT token in HTTP-only cookie.

        This method is called by Django Ninja's security system and provides
        native integration with the framework.

        Args:
            request: The HTTP request object
            key: The JWT token from the cookie (provided by APIKeyCookie)

        Returns:
            The authenticated user or None if authentication fails
        """
        if not key:
            logger.debug("No JWT token found in cookie")
            return None

        # Get user model outside try block for exception handler scope
        User = get_user_model()  # noqa: N806

        try:
            # Validate token using AccessToken class (django-ninja-jwt)
            token = AccessToken(key)

            # Get user from token payload
            user_id = token.payload[api_settings.USER_ID_CLAIM]
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})

            if user and hasattr(user, 'id'):
                username = getattr(cast(object, user), 'username', 'unknown')
                logger.debug(f"Successfully authenticated user: {username}")
                return cast(AbstractUser, user)

            logger.warning("JWT token validated but no valid user found")
            return None
        except InvalidToken as e:
            logger.debug(f"Invalid JWT token: {e}")
            return None
        except TokenError as e:
            logger.warning(f"JWT token error: {e}")
            return None
        except User.DoesNotExist:
            logger.warning("JWT token valid but user not found in database")
            return None
        except Exception as e:
            logger.error(f"Unexpected authentication error: {e}", exc_info=True)
            return None


# Global instance for use in endpoints and API configuration
jwt_cookie_auth = JWTCookieAuth()


# Enhanced dependency injection functions with proper error handling
def get_current_user(request: HttpRequest) -> AbstractUser:
    """
    Django Ninja dependency function to get the authenticated user.

    This function provides comprehensive error handling, logging, and integrates
    natively with Django Ninja's dependency injection system.

    Args:
        request: The HTTP request object

    Returns:
        The authenticated user

    Raises:
        HttpError: 401 if authentication fails or user is not authenticated
    """
    try:
        # Get JWT token from cookie
        cookie_name = get_jwt_cookie_name()

        token = request.COOKIES.get(cookie_name)
        user = jwt_cookie_auth.authenticate(request, token)

        if not user:
            logger.info(f"Authentication failed for request to {request.path}")
            raise HttpError(
                401,
                "Authentication required"
            )

        username = getattr(cast(object, user), 'username', 'unknown')
        logger.debug(f"User {username} authenticated for {request.path}")
        return user
    except HttpError:
        # Re-raise HttpErrors as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}", exc_info=True)
        raise HttpError(
            500,
            "Internal authentication error"
        ) from e


def get_current_user_optional(request: HttpRequest) -> AbstractUser | None:
    """
    Django Ninja dependency function to optionally get the authenticated user.

    This function allows endpoints to work with both authenticated and
    unauthenticated users. It provides proper error handling and logging
    without raising exceptions for unauthenticated requests.

    Args:
        request: The HTTP request object

    Returns:
        The authenticated user or None if not authenticated
    """
    try:
        # Get JWT token from cookie
        cookie_name = get_jwt_cookie_name()

        token = request.COOKIES.get(cookie_name)
        user = jwt_cookie_auth.authenticate(request, token)

        if user:
            username = getattr(cast(object, user), 'username', 'unknown')
            logger.debug(f"Optional auth: User {username} authenticated")
        else:
            logger.debug("Optional auth: No authenticated user (this is okay)")

        return user
    except Exception as e:
        # For optional auth, log the error but don't raise - return None instead
        logger.warning(f"Error in optional authentication: {e}")
        return None


# Native Django Ninja integration utilities
def get_auth_error_responses() -> dict[int, dict[str, Any]]:
    """
    Get standardized error response schemas for OpenAPI documentation.

    Returns:
        Dictionary mapping status codes to error response schemas
    """
    return {
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Authentication required",
                        "error_code": "AUTH_REQUIRED",
                        "type": "authentication_error"
                    }
                }
            }
        },
        500: {
            "description": "Internal authentication error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Internal authentication error",
                        "error_code": "AUTH_INTERNAL_ERROR",
                        "type": "server_error"
                    }
                }
            }
        }
    }
