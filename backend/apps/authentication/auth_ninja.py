"""Django Ninja authentication with Bearer JWTs or Django provider sessions."""

from __future__ import annotations

import logging
from typing import Any, cast

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest
from ninja.errors import HttpError
from ninja.security.http import HttpAuthBase
from ninja_jwt.exceptions import InvalidToken, TokenError
from ninja_jwt.settings import api_settings
from ninja_jwt.tokens import AccessToken

# Get logger for authentication events
logger = logging.getLogger("cinexplorer.auth")


class InvalidBearerTokenError(HttpError):
    """A supplied Bearer credential could not authenticate the request."""

    def __init__(self) -> None:
        super().__init__(401, "Invalid authentication credentials")


def get_token_from_request(request: HttpRequest) -> tuple[str | None, str]:
    """Extract a Bearer token and retain whether the scheme was supplied."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    scheme, _, value = auth_header.partition(" ")
    if scheme.lower() == "bearer":
        token = value.strip()
        logger.debug("Bearer authentication header supplied")
        return token or None, "header"

    logger.debug("No Bearer token found in Authorization header")
    return None, "none"


class JWTSessionAuth(HttpAuthBase):
    """Authenticate a Bearer access token, falling back to the Django session.

    CsrfProtectionMiddleware owns CSRF validation for unsafe requests,
    including session-authenticated API operations.
    """

    openapi_scheme = "bearer"

    def __call__(self, request: HttpRequest) -> AbstractUser | None:
        # Unlike HttpBearer, the session path also runs without an Authorization header.
        return self.authenticate(request)

    def authenticate(self, request: HttpRequest) -> AbstractUser | None:
        """Authenticate user from JWT token or Django session.

        Two-Pattern Authentication Priority:
        1. Authorization header (Bearer token from localStorage - email/password users)
        2. Django session (OAuth users via django-allauth)

        This method is called by Django Ninja's security system and provides
        native integration with the framework.

        Args:
            request: The HTTP request object

        Returns:
            The authenticated user or None if authentication fails
        """
        # Check the Bearer access token before the provider session
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

        # Fall back to Django session (OAuth users)
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
jwt_session_auth = JWTSessionAuth()


# Enhanced dependency injection functions with proper error handling
def get_current_user(request: HttpRequest) -> AbstractUser:
    """Django Ninja dependency function to get the authenticated user.

    Checks the Bearer header first, then the Django session.

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
        # Authenticate the Bearer token or provider session
        # Note: jwt_session_auth.authenticate() internally calls get_token_from_request()
        user = jwt_session_auth.authenticate(request)

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

    Checks the Bearer header first, then the Django session.

    Anonymous reads remain public when no Bearer credential was supplied.
    A supplied credential must authenticate through JWT or the provider session,
    otherwise a 401 lets the client renew rather than silently lose user data.
    """
    try:
        user = jwt_session_auth.authenticate(request)
    except Exception as error:
        # Authentication failures may quote credentials; log only the exception type.
        logger.error(
            "Optional authentication failed | error_type=%s",
            type(error).__name__,
            extra={"error_type": type(error).__name__},
        )
        user = None

    if user:
        username = getattr(cast(object, user), "username", "unknown")
        logger.debug(f"Optional auth: User {username} authenticated")
    else:
        _, source = get_token_from_request(request)
        if source == "header":
            raise InvalidBearerTokenError
        logger.debug("Optional auth: No authenticated user (this is okay)")
    return user


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
