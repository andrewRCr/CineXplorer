"""Django Ninja API router for authentication endpoints.

This module defines authentication and user management API endpoints
using Django Ninja with established API patterns.
"""
from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from ninja import Router, Status

from apps.authentication.auth_ninja import get_current_user, jwt_cookie_auth
from apps.authentication.schemas import (
    CsrfTokenResponseSchema,
    EmailVerificationInputSchema,
    EmailVerificationResponseSchema,
    HybridTokenRefreshResponseSchema,
    LogoutResponseSchema,
    RegisterInputSchema,
    RegisterResponseSchema,
    ResendVerificationInputSchema,
    ResendVerificationResponseSchema,
    TokenObtainInputSchema,
    TokenResponseSchema,
    UserProfileSchema,
    UserProfileUpdateSchema,
)
from apps.authentication.services.service_factory import get_authentication_service
from apps.authentication.throttles import TestAwareAnonThrottle, TestAwareUserThrottle

# Create authentication router
auth_router = Router(tags=["Authentication"])


@auth_router.post(
    "/register/",
    auth=None,
    response={
        201: RegisterResponseSchema,
        400: dict[str, object],
        409: dict[str, object],
        500: dict[str, object]
    },
    throttle=[TestAwareAnonThrottle('3/h')],
)
def register_user(
    request: HttpRequest, payload: RegisterInputSchema
) -> Status[RegisterResponseSchema | dict[str, object]]:
    """Register a new user and send email verification.

    Creates a new user account and triggers email verification via
    django-allauth CustomAccountAdapter.

    Args:
        request: HTTP request object
        payload: Registration data (username, email, password, first_name, last_name)

    Returns:
        Status: the status code and response data
            - 201: User created successfully, verification email sent
            - 400: Password validation failed (too weak, common, or similar to user attributes)
            - 409: Username/email already exists or forbidden username
            - 500: Email sending failed (user creation rolled back)

    Password validation:
        - Enforced at schema level: min_length=8 (Pydantic)
        - Enforced at registration: Django password validators
          (common passwords, user similarity, etc.)

    Email verification flow:
        1. User created with Django's create_user()
        2. EmailAddress.objects.add_email() creates EmailAddress record and sends confirmation
        3. User receives email with verification link via CustomAccountAdapter (ZeptoMail)
        4. Email verification handled by allauth EmailAddress model
    """
    service = get_authentication_service()
    status_code, body = service.register_user(request, payload)
    return Status(status_code, body)


@auth_router.post(
    "/token/",
    auth=None,
    response={
        200: TokenResponseSchema,
        400: dict[str, object],
        401: dict[str, object],
        403: dict[str, object],
    },
    throttle=[TestAwareAnonThrottle('5/m')],
)
def obtain_token(
    request: HttpRequest, response: HttpResponse, payload: TokenObtainInputSchema
) -> Status[TokenResponseSchema | dict[str, object]]:
    """Obtain JWT access and refresh tokens (login) for hybrid authentication.

    Hybrid Authentication Architecture:
    - Authenticates user with username/email and password
    - Returns access token in response body (frontend stores in localStorage)
    - Sets refresh token as HTTP-only cookie (XSS-proof, secure)
    - Access token has 5-minute lifetime (short-lived, reduces XSS risk)
    - Refresh token has 14-day lifetime (long-lived, stored securely)

    Args:
        request: HTTP request object
        response: HTTP response object (for setting refresh token cookie)
        payload: Login credentials (login, password)

    Returns:
        Status: the status code and response data
            - 200: Authentication successful, access token in body, refresh token in cookie
            - 400: Missing credentials
            - 401: Invalid credentials
            - 403: Email not verified

    Response body includes:
        - access: JWT access token for localStorage (frontend manages)
        - refresh: JWT refresh token value (also in HTTP-only cookie)
        - user_id: Authenticated user's ID
        - email_verified: Email verification status

    Cookie attributes (refresh token only):
        - httponly: True (prevents JavaScript access)
        - secure: True (HTTPS only)
        - samesite: Lax (CSRF protection)
    """
    service = get_authentication_service()
    status_code, body = service.obtain_token(request, response, payload)
    return Status(status_code, body)


@auth_router.post(
    "/token/refresh/",
    auth=None,
    response={200: TokenResponseSchema, 400: dict[str, object], 401: dict[str, object]},
    throttle=[TestAwareUserThrottle('10/m')],
)
def refresh_token(
    request: HttpRequest, response: HttpResponse
) -> Status[TokenResponseSchema | dict[str, object]]:
    """Refresh JWT access token using refresh token from cookie.

    Reads refresh token from httponly cookie and generates new access token.
    Implements token rotation security: old refresh tokens are automatically
    blacklisted after rotation (via BLACKLIST_AFTER_ROTATION setting).

    Args:
        request: HTTP request object
        response: HTTP response object (for setting new cookies)

    Returns:
        Status: the status code and response data
            - 200: Token refreshed successfully, new tokens set as cookies
            - 400: No valid refresh token in cookies or invalid format
            - 401: Token blacklisted (reuse attempt detected)

    Security:
        - Automatic token rotation: new refresh token issued on each refresh
        - Old tokens blacklisted automatically via BLACKLIST_AFTER_ROTATION
        - Reuse attempts logged as security events with IP and user agent

    Cookie handling:
        - Reads refresh token from httponly cookie
        - Sets new access and refresh tokens as httponly cookies
    """
    service = get_authentication_service()
    status_code, body = service.refresh_token(request, response)
    return Status(status_code, body)


@auth_router.post(
    "/auth/refresh",
    auth=None,
    response={
        200: HybridTokenRefreshResponseSchema,
        400: dict[str, object],
        401: dict[str, object]
    },
    throttle=[TestAwareUserThrottle('10/m')],
)
def hybrid_refresh_token(
    request: HttpRequest, response: HttpResponse
) -> Status[HybridTokenRefreshResponseSchema | dict[str, object]]:
    """Refresh JWT access token for hybrid authentication.

    Hybrid Authentication Architecture:
    - Reads refresh token from HTTP-only cookie (secure, XSS-proof)
    - Returns new access token in response body (frontend stores in localStorage)
    - Does NOT set access token as cookie (frontend manages it)
    - Rotates refresh token in HTTP-only cookie (automatic blacklisting)

    This endpoint supports the hybrid auth pattern where:
    - Short-lived access tokens (5 min) in localStorage for instant auth checks
    - Long-lived refresh tokens (14 days) in HTTP-only cookies for security

    Args:
        request: HTTP request object
        response: HTTP response object (for setting new refresh token cookie)

    Returns:
        Status: the status code and response data
            - 200: New access token in response body, refresh token rotated in cookie
            - 400: No refresh token found or invalid token format
            - 401: Token blacklisted (reuse attempt detected)

    Security:
        - Token rotation: New refresh token issued on each refresh
        - Automatic blacklisting: Old tokens blacklisted via BLACKLIST_AFTER_ROTATION
        - Reuse detection: Blacklisted token attempts logged as security events
    """
    service = get_authentication_service()
    status_code, body = service.hybrid_refresh_token(request, response)
    return Status(status_code, body)


@auth_router.post("/logout/", auth=None, response={200: LogoutResponseSchema})
def logout(request: HttpRequest, response: HttpResponse) -> Status[dict[str, object]]:
    """Logout user by clearing JWT cookies (hybrid authentication).

    Clears refresh token cookie to end the session. No authentication required
    since logout is idempotent (just deletes browser cookies) and users may
    call it when tokens are already expired.

    Hybrid Authentication Note:
    - Only deletes refresh token cookie (access token managed by frontend in localStorage)
    - Frontend should clear localStorage access token separately
    - Uses matching cookie attributes to ensure reliable removal across browsers

    Args:
        request: HTTP request object (no authentication required)
        response: HTTP response object (for deleting cookies)

    Returns:
        Status: the status code and response data
            - 200: Logout successful, cookies cleared

    Cookie deletion:
        - Deletes refresh token cookie (HTTP-only, secure)
        - Uses same path, domain, samesite as when cookie was set
    """
    service = get_authentication_service()
    status_code, body = service.logout(response)
    return Status(status_code, body)


@auth_router.get("/csrf/", response={200: CsrfTokenResponseSchema}, auth=None)
def get_csrf_token(request: HttpRequest, response: HttpResponse) -> Status[dict[str, object]]:
    """Get CSRF token for AJAX requests.

    Generates a CSRF token using Django's built-in get_token() and ensures
    it's available as a cookie that JavaScript can read. This endpoint requires
    no authentication and is used by the frontend to obtain a CSRF token for
    state-changing requests.

    Args:
        request: HTTP request object
        response: HTTP response object (for setting cookie)

    Returns:
        Status: the status code and response data
            - 200: CSRF token generated and set as cookie

    Cookie details:
        - Name: 'csrftoken' (Django's default, configurable via CSRF_COOKIE_NAME)
        - httponly: False (must be readable by JavaScript per CSRF_COOKIE_HTTPONLY setting)
        - secure: True in production (per CSRF_COOKIE_SECURE setting)
        - samesite: Lax (per SESSION_COOKIE_SAMESITE setting)
        - path: / (available everywhere)

    Note:
        Django's CsrfViewMiddleware will automatically set the csrftoken cookie
        when get_token() is called. The token is returned in the response body
        for client convenience. We force the cookie to be set even if middleware
        doesn't set it automatically.
    """
    from django.middleware.csrf import get_token

    # Generate CSRF token using Django's built-in method
    # This ensures the token is compatible with Django's CsrfViewMiddleware
    token = get_token(request)

    # Explicitly set the CSRF cookie to ensure it's always sent
    # This addresses cases where Django Ninja might not trigger middleware cookie setting
    response.set_cookie(
        settings.CSRF_COOKIE_NAME,
        token,
        max_age=settings.CSRF_COOKIE_AGE,
        path=settings.CSRF_COOKIE_PATH,
        domain=settings.CSRF_COOKIE_DOMAIN,
        secure=settings.CSRF_COOKIE_SECURE,
        httponly=settings.CSRF_COOKIE_HTTPONLY,
        samesite=settings.CSRF_COOKIE_SAMESITE,
    )

    # Return the token value for client convenience
    return Status(200, {"csrf_token": token})


@auth_router.get("/profile/", response={200: UserProfileSchema}, auth=jwt_cookie_auth)
def get_user_profile(request: HttpRequest) -> UserProfileSchema:
    """Retrieve authenticated user's profile.

    Returns the current user's profile information including computed fields
    for email verification status and full name.

    Args:
        request: HTTP request object with authenticated user

    Returns:
        UserProfileSchema: User profile with computed fields

    Raises:
        HttpError: 401 if user is not authenticated

    Computed fields:
        - email_verified: Checked via allauth EmailAddress model
        - full_name: Concatenated first_name + last_name
    """
    user = get_current_user(request)
    service = get_authentication_service()
    return service.get_user_profile(user)


@auth_router.patch(
    "/profile/",
    response={200: UserProfileSchema, 400: dict[str, object]},
    auth=jwt_cookie_auth
)
def update_user_profile(
    request: HttpRequest,
    payload: UserProfileUpdateSchema
) -> Status[UserProfileSchema | dict[str, object]]:
    """Update authenticated user's profile.

    Supports partial updates (PATCH) for user profile fields including
    password changes with proper hashing.

    Args:
        request: HTTP request object with authenticated user
        payload: Fields to update (all optional)

    Returns:
        Status: the status code and response data
            - 200: Profile updated successfully
            - 400: Validation error

    Password handling:
        - Password is hashed using set_password() before saving
        - Password is write-only (not returned in response)

    Computed fields in response:
        - email_verified: Checked via allauth EmailAddress model
        - full_name: Concatenated first_name + last_name
    """
    user = get_current_user(request)
    service = get_authentication_service()
    profile = service.update_user_profile(user, payload)
    return Status(200, profile)


@auth_router.post(
    "/verify-email/",
    auth=None,
    response={200: EmailVerificationResponseSchema, 400: dict[str, object]},
)
def verify_email(
    request: HttpRequest, payload: EmailVerificationInputSchema
) -> Status[EmailVerificationResponseSchema | dict[str, str]]:
    """Verify user's email address using the confirmation key.

    Supports both HMAC-based confirmations (default) and database-stored confirmations.

    Args:
        request: Django HTTP request
        payload: Email verification input with confirmation key

    Returns:
        Success message if verification succeeds, error if key is invalid/expired
    """
    service = get_authentication_service()
    status_code, body = service.verify_email(request, payload)
    return Status(status_code, body)


@auth_router.post(
    "/resend-verification/",
    auth=None,
    response={200: ResendVerificationResponseSchema, 400: dict[str, object]},
    throttle=[TestAwareAnonThrottle('3/h')],  # Rate limit to prevent email spam abuse
)
def resend_verification(
    request: HttpRequest, payload: ResendVerificationInputSchema
) -> Status[ResendVerificationResponseSchema | dict[str, str]]:
    """Resend email verification to the provided email address.

    Args:
        request: Django HTTP request
        payload: Email address to resend verification to

    Returns:
        Success message (even if email doesn't exist for security)
    """
    service = get_authentication_service()
    status_code, body = service.resend_verification(request, payload)
    return Status(status_code, body)


__all__ = [
    "auth_router",
]
