"""
Main Django Ninja API configuration for CineXplorer.

This module creates the central NinjaAPI instance with:
- Native JWT cookie authentication integration
- OpenAPI security schema documentation
- Global error handling and logging
- Type-safe endpoint registration
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.http import HttpRequest
from ninja import NinjaAPI, Schema

# Import our native JWT authentication scheme
from authentication.auth_ninja import jwt_cookie_auth, get_auth_error_responses
from movie.api import movies_router, genres_router, keywords_router, people_router

# Get configured cookie name for JWT tokens
ACCESS_TOKEN_NAME = settings.SIMPLE_JWT.get('ACCESS_TOKEN_NAME', 'access_token')


# Response schemas for type-safe endpoints
class HealthResponse(Schema):
    """Health check response schema."""
    status: str
    message: str


class AuthHealthResponse(Schema):
    """Authenticated health check response schema."""
    status: str
    message: str
    auth_method: str


class UserHealthResponse(Schema):
    """User health check response with authentication details."""
    status: str
    message: str
    user_id: int
    auth_method: str
    features: list[str]


class AuthVerification(Schema):
    """Authentication verification details."""
    scheme_active: bool
    token_valid: bool
    user_authenticated: bool
    session_info: str


class AuthTestResponse(Schema):
    """Comprehensive authentication test response."""
    status: str
    message: str
    auth_scheme: str
    user_id: int
    username: str
    email: str
    is_staff: bool
    is_superuser: bool
    is_active: bool
    date_joined: str
    last_login: str | None
    groups_count: int
    permissions_count: int
    auth_verification: AuthVerification


class AuthGuidance(Schema):
    """Authentication guidance information."""
    next_step: str
    note: str | None = None
    protected_endpoint: str | None = None
    public_endpoints: str | None = None


class AuthStatusResponse(Schema):
    """Authentication status response schema."""
    auth_status: str
    message: str
    user_id: int | None
    has_valid_token: bool
    guidance: AuthGuidance

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


@api.get("/health", auth=None, response=HealthResponse)
def health_check(request: HttpRequest) -> HealthResponse:
    """
    Health check endpoint to verify Django Ninja setup.

    This endpoint is publicly accessible and does not require authentication.
    It's used for monitoring and ensuring the API is operational.

    Returns:
        Simple status response indicating the API is working.
    """
    return HealthResponse(status="ok", message="Django Ninja API is working!")


@api.get("/health/auth", response=AuthHealthResponse, responses=get_auth_error_responses())
def health_check_auth(request: HttpRequest) -> AuthHealthResponse:
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
    return AuthHealthResponse(
        status="ok",
        message="Authenticated endpoint working!",
        auth_method="JWT Cookie (Native)"
    )


@api.get("/health/user", auth=None, response=UserHealthResponse, responses=get_auth_error_responses())
def health_check_user(request: HttpRequest) -> UserHealthResponse:
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
    from ninja.errors import HttpError

    # Use enhanced dependency injection with proper error handling
    user = get_current_user(request)

    # Type narrowing: get_current_user guarantees non-None user or raises HttpError
    # Trust the guarantee instead of runtime assertions (disabled with -O flag)
    if not (hasattr(user, 'id') and hasattr(user, 'username')):
        raise HttpError(500, "Invalid user object returned from authentication")

    return UserHealthResponse(
        status="ok",
        message=f"Hello, {user.username}!",  # type: ignore[attr-defined]
        user_id=user.id,  # type: ignore[attr-defined]
        auth_method="Enhanced Dependency Injection",
        features=[
            "Structured error responses",
            "Comprehensive logging",
            "Type-safe user access"
        ]
    )


@api.get("/test/auth", response=AuthTestResponse, responses=get_auth_error_responses())
def test_authentication(
    request: HttpRequest
) -> AuthTestResponse:
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
    return AuthTestResponse(
        status="authenticated",
        message="Authentication test successful!",
        auth_scheme="JWT Cookie (Global)",
        user_id=user.id,  # type: ignore[attr-defined]
        username=user.username,  # type: ignore[attr-defined]
        email=getattr(user, 'email', ''),
        is_staff=getattr(user, 'is_staff', False),
        is_superuser=getattr(user, 'is_superuser', False),
        is_active=getattr(user, 'is_active', True),
        date_joined=str(getattr(user, 'date_joined', ''))[:19],
        last_login=(
            str(getattr(user, 'last_login', ''))[:19]
            if getattr(user, 'last_login', None) else None
        ),
        groups_count=(
            user.groups.count() if hasattr(user, 'groups') else 0  # type: ignore[attr-defined]
        ),
        permissions_count=(
            user.user_permissions.count()  # type: ignore[attr-defined]
            if hasattr(user, 'user_permissions') else 0
        ),
        auth_verification=AuthVerification(
            scheme_active=True,
            token_valid=True,
            user_authenticated=user.is_authenticated,  # type: ignore[attr-defined]
            session_info="JWT Cookie based authentication"
        )
    )


@api.get("/test/auth-status", auth=None, response=AuthStatusResponse)
def test_auth_status(request: HttpRequest) -> AuthStatusResponse:
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
        return AuthStatusResponse(
            auth_status="authenticated",
            message=(
                f"User '{user.username}' is authenticated via JWT cookie"  # type: ignore[attr-defined]  # noqa: E501
            ),
            user_id=user.id,  # type: ignore[attr-defined]
            has_valid_token=True,
            guidance=AuthGuidance(
                next_step="Try the /api/test/auth endpoint for comprehensive user info",
                note="This endpoint bypasses global auth to show status"
            )
        )
    else:
        return AuthStatusResponse(
            auth_status="unauthenticated",
            message=(
                "No valid JWT token found - authentication required for protected endpoints"
            ),
            user_id=None,
            has_valid_token=False,
            guidance=AuthGuidance(
                next_step=f"Obtain a valid JWT token and set it in the {ACCESS_TOKEN_NAME} cookie",
                protected_endpoint="/api/test/auth will require authentication",
                public_endpoints=(
                    "This endpoint (/api/test/auth-status) and /api/health are public"
                )
            )
        )


# Add app routers
# Register movie-related routers with clean URL structure
api.add_router("/movies", movies_router)
api.add_router("/genres", genres_router)
api.add_router("/keywords", keywords_router)
api.add_router("/people", people_router)
