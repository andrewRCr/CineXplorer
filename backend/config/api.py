"""
Main Django Ninja API configuration for CineXplorer.

This module creates the central NinjaAPI instance with:
- Native JWT cookie authentication integration
- OpenAPI security schema documentation
- Global error handling and logging
- Type-safe endpoint registration
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest
from ninja import NinjaAPI

# Import our native JWT authentication scheme
from authentication.auth_ninja import jwt_cookie_auth
from movie.api import movies_router, genres_router, keywords_router, people_router

# Create the main NinjaAPI instance with native authentication
api = NinjaAPI(
    title="CineXplorer API",
    version="1.0.0",
    description=(
        "A modern, type-safe API for the CineXplorer movie discovery application. "
        "Authentication is handled via JWT tokens in HTTP-only cookies."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
    auth=jwt_cookie_auth  # Global authentication scheme
)


@api.get("/health", auth=None)  # Public endpoint - no auth required
def health_check() -> dict[str, str]:
    """
    Health check endpoint to verify Django Ninja setup.

    This endpoint is publicly accessible and does not require authentication.
    It's used for monitoring and ensuring the API is operational.

    Returns:
        Simple status response indicating the API is working.
    """
    return {"status": "ok", "message": "Django Ninja API is working!"}


@api.get("/health/auth")
def health_check_auth(request: HttpRequest) -> dict[str, str]:
    """
    Authenticated health check endpoint to verify JWT cookie authentication.

    This endpoint demonstrates native Django Ninja security integration with:
    - Automatic OpenAPI security schema documentation
    - Native authentication via the global auth scheme
    - Proper error response documentation

    The endpoint will automatically require JWT authentication via the configured
    HTTP-only cookie and return appropriate error responses if authentication fails.

    Returns:
        Status response with authentication confirmation.
    Raises:
        HttpError: 401 if authentication fails
        HttpError: 500 if internal authentication error occurs
    """
    # Django Ninja automatically handles authentication via the global auth scheme
    # No manual authentication needed - the user is guaranteed to be authenticated
    return {
        "status": "ok",
        "message": "Authenticated endpoint working!",
        "auth_method": "JWT Cookie (Native)"
    }


@api.get("/health/user", auth=None)
def health_check_user(request: HttpRequest) -> dict[str, str | int | list[str]]:
    """
    Health check using enhanced dependency injection patterns.

    This endpoint demonstrates the enhanced dependency injection approach with:
    - Manual authentication control (bypassing global auth)
    - Comprehensive error handling and logging
    - Structured error responses
    - Type-safe user access

    Args:
        request: HTTP request object

    Returns:
        Status response with authenticated user information.
    Raises:
        HttpError: 401 if authentication fails with structured error
        HttpError: 500 if internal authentication error occurs
    """
    # Import here to avoid circular import
    from authentication.auth_ninja import get_current_user

    # Use enhanced dependency injection with proper error handling
    user = get_current_user(request)

    # Type narrowing: get_current_user guarantees non-None user or raises HttpError
    assert isinstance(user, AbstractUser)
    return {
        "status": "ok",
        "message": f"Hello, {user.username}!",  # type: ignore[attr-defined]
        "user_id": user.id,  # type: ignore[attr-defined]  # Django user models have id field
        "auth_method": "Enhanced Dependency Injection",
        "features": [
            "Structured error responses",
            "Comprehensive logging",
            "Type-safe user access"
        ]
    }


@api.get("/test/auth")
def test_authentication(
    request: HttpRequest
) -> dict[str, str | int | bool | dict[str, str | bool] | None]:
    """
    Comprehensive authentication test endpoint.

    This endpoint verifies that the JWT cookie authentication scheme:
    1. Correctly protects routes (requires valid JWT token)
    2. Properly identifies and provides access to the authenticated user
    3. Integrates seamlessly with Django Ninja's global auth system
    4. Generates proper OpenAPI documentation

    The endpoint will automatically enforce authentication via the global
    auth scheme and return detailed information about the authenticated user.

    Returns:
        Comprehensive authentication test response with user details.

    Raises:
        HttpError: 401 if JWT token is missing, invalid, or expired
        HttpError: 500 if internal authentication error occurs
    """
    # Django Ninja's global auth system guarantees this user is authenticated
    # The user is available through Django's standard request.user
    user = request.user

    # Comprehensive user information for testing
    return {
        "status": "authenticated",
        "message": "Authentication test successful!",
        "auth_scheme": "JWT Cookie (Global)",
        "user_id": user.id,  # type: ignore[attr-defined]
        "username": user.username,  # type: ignore[attr-defined]
        "email": getattr(user, 'email', ''),
        "is_staff": getattr(user, 'is_staff', False),
        "is_superuser": getattr(user, 'is_superuser', False),
        "is_active": getattr(user, 'is_active', True),
        "date_joined": str(getattr(user, 'date_joined', ''))[:19],
        "last_login": (
            str(getattr(user, 'last_login', ''))[:19]
            if getattr(user, 'last_login', None) else None
        ),
        "groups_count": (
            user.groups.count() if hasattr(user, 'groups') else 0  # type: ignore[attr-defined]
        ),
        "permissions_count": (
            user.user_permissions.count()  # type: ignore[attr-defined]
            if hasattr(user, 'user_permissions') else 0
        ),
        "auth_verification": {
            "scheme_active": True,
            "token_valid": True,
            "user_authenticated": user.is_authenticated,  # type: ignore[attr-defined]
            "session_info": "JWT Cookie based authentication"
        }
    }


@api.get("/test/auth-status", auth=None)
def test_auth_status(request: HttpRequest) -> dict[str, str | bool | dict[str, str] | None]:
    """
    Authentication status test endpoint (no authentication required).

    This endpoint demonstrates the authentication system's behavior by:
    1. Bypassing global authentication (auth=None)
    2. Manually checking for JWT token presence and validity
    3. Showing the difference between authenticated and unauthenticated requests
    4. Providing debugging information for authentication testing

    This is useful for:
    - Testing the authentication system without requiring valid credentials
    - Debugging authentication issues
    - Understanding the authentication flow

    Returns:
        Authentication status information and guidance.
    """
    # Import here to avoid circular import
    from authentication.auth_ninja import get_current_user_optional

    # Check if user is authenticated (without raising errors)
    user = get_current_user_optional(request)
    if user:
        return {
            "auth_status": "authenticated",
            "message": (
                f"User '{user.username}' is authenticated via JWT cookie"  # type: ignore[attr-defined]  # noqa: E501
            ),
            "user_id": user.id,  # type: ignore[attr-defined]
            "has_valid_token": True,
            "guidance": {
                "next_step": "Try the /api/test/auth endpoint for comprehensive user info",
                "note": "This endpoint bypasses global auth to show status"
            }
        }
    else:
        return {
            "auth_status": "unauthenticated",
            "message": (
                "No valid JWT token found - authentication required for protected endpoints"
            ),
            "user_id": None,
            "has_valid_token": False,
            "guidance": {
                "next_step": (
                    "Obtain a valid JWT token and set it in the access_token cookie"
                ),
                "protected_endpoint": "/api/test/auth will require authentication",
                "public_endpoints": (
                    "This endpoint (/api/test/auth-status) and /api/health are public"
                )
            }
        }


# Add app routers
# Register movie-related routers with clean URL structure
api.add_router("/movies", movies_router)
api.add_router("/genres", genres_router)
api.add_router("/keywords", keywords_router)
api.add_router("/people", people_router)
