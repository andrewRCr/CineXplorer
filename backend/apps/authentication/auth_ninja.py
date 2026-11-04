"""Django Ninja authentication adapter for CineXplorer.

This module provides native Django Ninja authentication integration with:
- OpenAPI security schema documentation
- Proper error handling and logging
- Native dependency injection patterns
- Hybrid JWT authentication (Authorization header OR cookie)

Hybrid Authentication:
- Priority 1: Authorization header (Bearer token from localStorage)
- Priority 2: HTTP-only cookie (backward compatibility)
- Supports both frontend localStorage and cookie-based clients
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
logger = logging.getLogger("cinexplorer.auth")


def get_jwt_cookie_name() -> str:
    """Get the JWT access token cookie name from Django settings.

    Centralizes the settings lookup to avoid duplication across the module.

    Returns:
        The configured cookie name, defaulting to 'access_token'.
    """
    jwt_settings = cast(dict[str, Any], getattr(settings, "SIMPLE_JWT", {}))
    return cast(str, jwt_settings.get("ACCESS_TOKEN_NAME", "access_token"))


def get_token_from_request(request: HttpRequest) -> tuple[str | None, str]:
    """Extract JWT token from request (Authorization header or cookie).

    Hybrid Authentication Priority:
    1. Authorization header (Bearer token from localStorage)
    2. HTTP-only cookie (backward compatibility)

    Args:
        request: The HTTP request object

    Returns:
        Tuple of (token, source) where source is 'header' or 'cookie'
    """
    # Priority 1: Check Authorization header for Bearer token
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()  # Remove 'Bearer ' prefix
        if token:
            logger.debug("Token found in Authorization header")
            return token, "header"

    # Priority 2: Check HTTP-only cookie (backward compatibility)
    cookie_name = get_jwt_cookie_name()
    token = request.COOKIES.get(cookie_name)
    if token:
        logger.debug("Token found in cookie")
        return token, "cookie"

    logger.debug("No token found in header or cookie")
    return None, "none"


class JWTCookieAuth(APIKeyCookie):
    """Django Ninja native security scheme for hybrid JWT authentication.

    This extends Django Ninja's APIKeyCookie to provide:
    - OpenAPI security schema documentation
    - Native dependency injection integration
    - Proper error handling and logging
    - Hybrid JWT authentication (Authorization header OR cookie)

    Authentication Priority:
    1. Authorization header (Bearer token) - for localStorage-based clients
    2. HTTP-only cookie - for backward compatibility
    """

    # Set the cookie name as a class attribute (Django Ninja pattern)
    param_name: str = get_jwt_cookie_name()

    def __init__(self) -> None:
        """Initialize the JWT cookie authentication scheme."""
        # CSRF Architecture (django-ninja 1.5.x):
        #
        # - NinjaAPI(): No csrf parameter (removed in 1.5.0)
        # - THIS AUTH CLASS: csrf=False (disables Ninja's cookie-auth CSRF)
        # - CSRF protection: Custom CsrfHeaderMiddleware with path-based exemptions
        #
        # Why csrf=False here:
        # Django Ninja auto-enables CSRF for APIKeyCookie subclasses by default.
        # This conflicts with our custom middleware and causes bug #1464 symptoms
        # (valid CSRF tokens rejected with "CSRF check Failed").
        #
        # By passing csrf=False to the parent APIKeyCookie class, we completely
        # bypass Django Ninja's CSRF and rely on our custom CsrfHeaderMiddleware
        # which provides header-based CSRF validation (X-CSRFToken) with
        # path-based exemptions for public endpoints.
        #
        # CSRF protection IS ACTIVE via custom middleware - this just prevents
        # Django Ninja from interfering with our validation strategy.
        #
        # See: https://github.com/vitalik/django-ninja/issues/1464
        super().__init__(csrf=False)

        logger.debug(f"Initialized JWT cookie auth with cookie name: {self.param_name}")

    def authenticate(self, request: HttpRequest, key: str | None) -> AbstractUser | None:
        """Authenticate user from JWT token or Django session.

        Two-Pattern Authentication Priority:
        1. Authorization header (Bearer token from localStorage - email/password users)
        2. HTTP-only JWT cookie (email/password users)
        3. Django session (OAuth users via django-allauth)

        This method is called by Django Ninja's security system and provides
        native integration with the framework.

        Args:
            request: The HTTP request object
            key: The JWT token from the cookie (provided by APIKeyCookie, may be None)

        Returns:
            The authenticated user or None if authentication fails
        """
        # Priority 1-2: Check for JWT token (header or cookie)
        token, source = get_token_from_request(request)

        if token:
            # Get user model outside try block for exception handler scope
            User = get_user_model()  # noqa: N806

            try:
                # Validate token using AccessToken class (django-ninja-jwt)
                validated_token = AccessToken(token)

                # Get user from token payload
                user_id = validated_token.payload[api_settings.USER_ID_CLAIM]
                user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})

                if user and hasattr(user, "id"):
                    username = getattr(cast(object, user), "username", "unknown")
                    logger.debug(f"Successfully authenticated user {username} (via JWT {source})")
                    return cast(AbstractUser, user)

                logger.warning("JWT token validated but no valid user found")
            except InvalidToken as e:
                logger.debug(f"Invalid JWT token from {source}: {e}")
            except TokenError as e:
                logger.warning(f"JWT token error from {source}: {e}")
            except User.DoesNotExist:
                logger.warning(f"JWT token from {source} valid but user not found in database")
            except Exception as e:
                logger.error(
                    "Unexpected JWT authentication failure | error_type=%s",
                    type(e).__name__,
                    extra={"error_type": type(e).__name__},
                )

        # Priority 3: Check Django session (OAuth users)
        # SessionMiddleware sets request.user to either authenticated User or AnonymousUser
        # Cast request.user to AbstractUser for type safety
        user = cast(AbstractUser, request.user)  # pyright: ignore[reportUnknownMemberType]
        if user.is_authenticated:
            username = getattr(cast(object, user), "username", "unknown")
            logger.debug(f"Successfully authenticated user {username} (via Django session)")
            return user

        logger.debug("No valid JWT token or session found")
        return None


# Global instance for use in endpoints and API configuration
jwt_cookie_auth = JWTCookieAuth()


# Enhanced dependency injection functions with proper error handling
def get_current_user(request: HttpRequest) -> AbstractUser:
    """Django Ninja dependency function to get the authenticated user.

    Hybrid Authentication: Checks Authorization header first, then cookie.

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
        # Use hybrid authentication (header OR cookie)
        # Note: jwt_cookie_auth.authenticate() internally calls get_token_from_request()
        user = jwt_cookie_auth.authenticate(request, None)

        if not user:
            logger.info(f"Authentication failed for request to {request.path}")
            raise HttpError(401, "Authentication required")

        username = getattr(cast(object, user), "username", "unknown")
        logger.debug(f"User {username} authenticated for {request.path}")
        return user
    except HttpError:
        # Re-raise HttpErrors as-is
        raise
    except Exception as e:
        logger.error(
            "Unexpected current-user authentication failure | error_type=%s",
            type(e).__name__,
            extra={"error_type": type(e).__name__},
        )
        raise HttpError(500, "Internal authentication error") from e


def get_current_user_optional(request: HttpRequest) -> AbstractUser | None:
    """Django Ninja dependency function to optionally get the authenticated user.

    Hybrid Authentication: Checks Authorization header first, then cookie.

    This function allows endpoints to work with both authenticated and
    unauthenticated users. It provides proper error handling and logging
    without raising exceptions for unauthenticated requests.

    Args:
        request: The HTTP request object

    Returns:
        The authenticated user or None if not authenticated
    """
    try:
        # Use hybrid authentication (header OR cookie)
        # Note: jwt_cookie_auth.authenticate() internally calls get_token_from_request()
        user = jwt_cookie_auth.authenticate(request, None)

        if user:
            username = getattr(cast(object, user), "username", "unknown")
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
    """Get standardized error response schemas for OpenAPI documentation.

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
                        "type": "authentication_error",
                    }
                }
            },
        },
        500: {
            "description": "Internal authentication error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Internal authentication error",
                        "error_code": "AUTH_INTERNAL_ERROR",
                        "type": "server_error",
                    }
                }
            },
        },
    }
