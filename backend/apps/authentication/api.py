"""Django Ninja API router for authentication endpoints.

This module defines authentication and user management API endpoints
using Django Ninja, following the patterns established in Phase 1.
"""
from __future__ import annotations

import secrets
from typing import Literal

from allauth.account.models import EmailAddress, EmailConfirmation
from authentication.auth_ninja import get_current_user
from authentication.schemas import (
    CsrfTokenResponseSchema,
    EmailVerificationInputSchema,
    EmailVerificationResponseSchema,
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
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import HttpRequest, HttpResponse
from ninja import Router
from ninja_jwt.tokens import RefreshToken

# Create authentication router
auth_router = Router(tags=["Authentication"])


def _get_jwt_settings() -> dict[str, object]:
    """Get JWT settings from Django settings.

    Returns SIMPLE_JWT settings dictionary.
    """
    return settings.SIMPLE_JWT  # type: ignore[return-value]  # Django settings are dynamic


@auth_router.post(
    "/register/",
    auth=None,
    response={201: RegisterResponseSchema, 409: dict[str, object], 500: dict[str, object]},
)
def register_user(
    request: HttpRequest, payload: RegisterInputSchema
) -> tuple[int, dict[str, object]]:
    """Register a new user and send email verification.

    Creates a new user account and triggers email verification via
    django-allauth CustomAccountAdapter.

    Args:
        request: HTTP request object
        payload: Registration data (username, email, password, first_name, last_name)

    Returns:
        tuple: (status_code, response_data)
            - 201: User created successfully, verification email sent
            - 409: Username/email already exists or forbidden username
            - 500: Email sending failed (user creation rolled back)

    Email verification flow:
        1. User created with Django's create_user()
        2. EmailAddress.objects.add_email() creates EmailAddress record and sends confirmation
        3. User receives email with verification link via CustomAccountAdapter (ZeptoMail)
        4. Email verification handled by allauth EmailAddress model
    """
    user_model = get_user_model()

    # Check for forbidden usernames
    forbidden_usernames = settings.FORBIDDEN_USERNAMES
    if payload.username.lower() in forbidden_usernames:
        return 409, {
            "error": f'Username "{payload.username}" is not allowed.'
        }

    # Check for existing username
    if user_model.objects.filter(username=payload.username).exists():
        return 409, {
            "error": "Username already associated with an existing account."
        }

    # Check for existing email
    if user_model.objects.filter(email=payload.email).exists():
        return 409, {
            "error": "Email address already associated with an existing account."
        }

    # Create the user
    user = user_model.objects.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name
    )

    # Send verification email via allauth API
    try:
        # Create EmailAddress record and send confirmation using allauth
        EmailAddress.objects.add_email(request, user, payload.email, confirm=True)
        return 201, {
            "message": "Registration successful. Please check your email to verify your account.",
            "user_id": user.id,
            "email": user.email,
            "email_sent": True
        }
    except Exception:
        # Email failed to send - delete the user and return error
        user.delete()
        return 500, {
            "error": "Registration failed. Unable to send verification email. "
            "Please try again later or contact support.",
            "email_sent": False
        }


@auth_router.post(
    "/token/",
    auth=None,
    response={
        200: TokenResponseSchema,
        400: dict[str, object],
        401: dict[str, object],
        403: dict[str, object],
    },
)
def obtain_token(
    request: HttpRequest, response: HttpResponse, payload: TokenObtainInputSchema
) -> tuple[int, dict[str, object]]:
    """Obtain JWT access and refresh tokens (login).

    Authenticates user with username/email and password, then returns
    JWT tokens set as httponly cookies.

    Args:
        request: HTTP request object
        response: HTTP response object (for setting cookies)
        payload: Login credentials (login, password)

    Returns:
        tuple: (status_code, response_data)
            - 200: Authentication successful, tokens set as cookies
            - 400: Missing credentials
            - 401: Invalid credentials
            - 403: Email not verified

    Cookie attributes:
        - httponly: True (prevents JavaScript access)
        - secure: True (HTTPS only)
        - samesite: Lax (CSRF protection)
    """
    login = payload.login
    password = payload.password

    if not login or not password:
        return 400, {"error": "Username/email and password are required."}

    # Authenticate user (supports both username and email via allauth backend)
    # allauth's AuthenticationBackend handles username/email detection
    authenticated_user = authenticate(
        request=request,
        username=login,  # allauth backend expects 'username' parameter
        password=password
    )

    if not authenticated_user:
        return 401, {"error": "Unable to authenticate with provided credentials."}

    # Check email verification using allauth EmailAddress API
    if not EmailAddress.objects.filter(user=authenticated_user, verified=True).exists():
        return 403, {
            "error": "Please verify your email address before logging in. "
            "Check your email for the verification link."
        }

    # Generate JWT tokens
    refresh = RefreshToken.for_user(authenticated_user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Get JWT settings
    jwt_settings = _get_jwt_settings()
    access_token_name = str(jwt_settings['ACCESS_TOKEN_NAME'])
    refresh_token_name = str(jwt_settings['REFRESH_TOKEN_NAME'])
    access_lifetime = jwt_settings['ACCESS_TOKEN_LIFETIME']  # type: ignore[assignment]  # Django settings dynamic
    refresh_lifetime = jwt_settings['REFRESH_TOKEN_LIFETIME']  # type: ignore[assignment]  # Django settings dynamic
    samesite: Literal['Lax', 'Strict', 'None'] = jwt_settings.get('JWT_COOKIE_SAMESITE', 'Lax')  # type: ignore[assignment]  # Django settings dynamic

    # Set tokens as httponly cookies
    response.set_cookie(
        access_token_name,
        access_token,
        max_age=int(access_lifetime.total_seconds()),
        httponly=True,
        secure=True,  # HTTPS only in production
        samesite=samesite,
    )
    response.set_cookie(
        refresh_token_name,
        refresh_token,
        max_age=int(refresh_lifetime.total_seconds()),
        httponly=True,
        secure=True,
        samesite=samesite,
    )

    # Return token data (also available in cookies)
    return 200, {
        "access": access_token,
        "refresh": refresh_token,
        "user_id": authenticated_user.id,
        "email_verified": True  # Already checked above
    }


@auth_router.post(
    "/token/refresh/",
    auth=None,
    response={200: TokenResponseSchema, 400: dict[str, object]},
)
def refresh_token(
    request: HttpRequest, response: HttpResponse
) -> tuple[int, dict[str, object]]:
    """Refresh JWT access token using refresh token from cookie.

    Reads refresh token from httponly cookie and generates new access token.

    Args:
        request: HTTP request object
        response: HTTP response object (for setting new cookies)

    Returns:
        tuple: (status_code, response_data)
            - 200: Token refreshed successfully, new tokens set as cookies
            - 400: No valid refresh token in cookies

    Cookie handling:
        - Reads refresh token from httponly cookie
        - Sets new access and refresh tokens as httponly cookies
    """
    # Get JWT settings
    jwt_settings = _get_jwt_settings()
    refresh_token_name = str(jwt_settings['REFRESH_TOKEN_NAME'])
    access_token_name = str(jwt_settings['ACCESS_TOKEN_NAME'])
    access_lifetime = jwt_settings['ACCESS_TOKEN_LIFETIME']  # type: ignore[assignment]  # Django settings dynamic
    refresh_lifetime = jwt_settings['REFRESH_TOKEN_LIFETIME']  # type: ignore[assignment]  # Django settings dynamic
    samesite: Literal['Lax', 'Strict', 'None'] = jwt_settings.get('JWT_COOKIE_SAMESITE', 'Lax')  # type: ignore[assignment]  # Django settings dynamic

    # Get refresh token from cookie
    refresh_token_value = request.COOKIES.get(refresh_token_name)

    if not refresh_token_value:
        return 400, {"error": "No valid refresh token found in cookies."}

    try:
        # Validate and refresh the token
        refresh = RefreshToken(refresh_token_value)
        access_token = str(refresh.access_token)

        # Rotate refresh token: set new JTI and expiration time
        refresh.set_jti()
        refresh.set_exp()
        new_refresh_token = str(refresh)

        # Set new tokens as httponly cookies
        response.set_cookie(
            access_token_name,
            access_token,
            max_age=int(access_lifetime.total_seconds()),
            httponly=True,
            secure=True,
            samesite=samesite,
        )
        response.set_cookie(
            refresh_token_name,
            new_refresh_token,
            max_age=int(refresh_lifetime.total_seconds()),
            httponly=True,
            secure=True,
            samesite=samesite,
        )

        # Get user_id from token payload
        user_id = refresh.payload.get('user_id')

        return 200, {
            "access": access_token,
            "refresh": new_refresh_token,
            "user_id": user_id,
            "email_verified": True  # Assume verified (token already issued)
        }
    except Exception as e:
        return 400, {"error": f"Invalid or expired refresh token: {e!s}"}


@auth_router.post("/logout/", response={200: LogoutResponseSchema})
def logout(request: HttpRequest, response: HttpResponse) -> tuple[int, dict[str, object]]:
    """Logout user by clearing JWT cookies.

    Clears both access and refresh token cookies to end the session.
    Uses matching cookie attributes to ensure reliable removal across browsers.

    Args:
        request: HTTP request object
        response: HTTP response object (for deleting cookies)

    Returns:
        tuple: (status_code, response_data)
            - 200: Logout successful, cookies cleared

    Cookie deletion:
        - Deletes access token cookie
        - Deletes refresh token cookie
        - Uses same path, domain, samesite as when cookies were set
    """
    # Get JWT settings
    jwt_settings = _get_jwt_settings()
    access_token_name = str(jwt_settings['ACCESS_TOKEN_NAME'])
    refresh_token_name = str(jwt_settings['REFRESH_TOKEN_NAME'])
    samesite: Literal['Lax', 'Strict', 'None'] = jwt_settings.get('JWT_COOKIE_SAMESITE', 'Lax')  # type: ignore[assignment]  # Django settings dynamic

    # Delete cookies with matching attributes for reliable removal
    cookie_kwargs = {
        'path': '/',  # Default path
        'domain': None,  # Use default domain
        'samesite': samesite,
    }

    response.delete_cookie(access_token_name, **cookie_kwargs)
    response.delete_cookie(refresh_token_name, **cookie_kwargs)

    return 200, {"message": "Logged out successfully."}


@auth_router.get("/csrf/", response={200: CsrfTokenResponseSchema}, auth=None)
def get_csrf_token(request: HttpRequest, response: HttpResponse) -> tuple[int, dict[str, object]]:
    """Get CSRF token for AJAX requests.

    Generates a CSRF token and sets it as a cookie that JavaScript can read.
    This endpoint requires no authentication and is used by the frontend
    to obtain a CSRF token for state-changing requests.

    Args:
        request: HTTP request object
        response: HTTP response object (for setting cookie)

    Returns:
        tuple: (status_code, response_data)
            - 200: CSRF token generated and set as cookie

    Cookie attributes:
        - httponly: False (must be readable by JavaScript)
        - secure: True (HTTPS only)
        - samesite: Lax (less strict for localhost dev)
        - path: / (available everywhere)

    Note:
        The token is both set as an XSRF-TOKEN cookie and returned
        in the response body for client convenience.
    """
    token = secrets.token_urlsafe(32)

    # Set CSRF token as a cookie readable by JavaScript
    response.set_cookie(
        "XSRF-TOKEN",
        token,
        httponly=False,  # Must be readable by JS
        secure=True,     # Only over HTTPS
        samesite="Lax",  # Less strict for localhost dev
        domain=None,     # Important for localhost
        path="/",        # Ensure cookie is available everywhere
    )

    return 200, {"csrf_token": token}


@auth_router.get("/profile/", response={200: UserProfileSchema})
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

    # Create base schema from ORM model
    profile = UserProfileSchema.from_orm(user)

    # Add computed fields using allauth EmailAddress API
    profile.email_verified = EmailAddress.objects.filter(user=user, verified=True).exists()
    profile.full_name = f"{user.first_name} {user.last_name}".strip() or None

    return profile


@auth_router.patch("/profile/", response={200: UserProfileSchema, 400: dict[str, object]})
def update_user_profile(
    request: HttpRequest,
    payload: UserProfileUpdateSchema
) -> tuple[int, UserProfileSchema | dict[str, object]]:
    """Update authenticated user's profile.

    Supports partial updates (PATCH) for user profile fields including
    password changes with proper hashing.

    Args:
        request: HTTP request object with authenticated user
        payload: Fields to update (all optional)

    Returns:
        tuple: (status_code, response_data)
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

    # Update only provided fields (exclude_unset for partial updates)
    update_data = payload.dict(exclude_unset=True)

    # Handle password separately for proper hashing
    password = update_data.pop('password', None)

    # Update model fields
    for field, value in update_data.items():
        setattr(user, field, value)

    # Hash and set password if provided
    if password:
        user.set_password(password)

    user.save()

    # Create response schema with computed fields using allauth EmailAddress API
    profile = UserProfileSchema.from_orm(user)
    profile.email_verified = EmailAddress.objects.filter(user=user, verified=True).exists()
    profile.full_name = f"{user.first_name} {user.last_name}".strip() or None

    return 200, profile


@auth_router.post(
    "/verify-email/",
    auth=None,
    response={200: EmailVerificationResponseSchema, 400: dict[str, object]},
)
def verify_email(
    request: HttpRequest, payload: EmailVerificationInputSchema
) -> tuple[int, dict[str, str]]:
    """Verify user's email address using the confirmation key.

    Args:
        request: Django HTTP request
        payload: Email verification input with confirmation key

    Returns:
        Success message if verification succeeds, error if key is invalid/expired
    """
    try:
        # Get the EmailConfirmation object by key
        confirmation = EmailConfirmation.objects.get(key=payload.key)

        # Check if already confirmed
        email_address = confirmation.email_address
        if email_address.verified:
            return 400, {"message": "Email address is already verified."}

        # Confirm the email (this marks it as verified)
        confirmation.confirm(request)

        return 200, {"message": "Email verified successfully."}

    except EmailConfirmation.DoesNotExist:
        return 400, {"message": "Invalid or expired verification link."}


@auth_router.post(
    "/resend-verification/",
    auth=None,
    response={200: ResendVerificationResponseSchema, 400: dict[str, object]},
)
def resend_verification(
    request: HttpRequest, payload: ResendVerificationInputSchema
) -> tuple[int, dict[str, str]]:
    """Resend email verification to the provided email address.

    Args:
        request: Django HTTP request
        payload: Email address to resend verification to

    Returns:
        Success message (even if email doesn't exist for security)
    """
    user_model = get_user_model()

    try:
        user = user_model.objects.get(email=payload.email)

        # Check if already verified using allauth EmailAddress API
        if EmailAddress.objects.filter(user=user, verified=True).exists():
            return 400, {"message": "This email address is already verified."}

        # Get or create EmailAddress record and send confirmation via allauth
        try:
            email_address = EmailAddress.objects.get(user=user, email__iexact=payload.email)
            # Send new confirmation email using allauth's built-in method
            email_address.send_confirmation(request)
            return 200, {"message": "Verification email sent successfully."}
        except EmailAddress.DoesNotExist:
            # Create EmailAddress record if it doesn't exist, then send confirmation
            EmailAddress.objects.add_email(request, user, payload.email, confirm=True)
            return 200, {"message": "Verification email sent successfully."}

    except user_model.DoesNotExist:
        # Don't reveal if email exists or not for security
        return 200, {"message": "If the email address exists, a verification email has been sent."}


__all__ = [
    "auth_router",
]
