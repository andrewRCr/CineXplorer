"""Django Ninja API router for authentication endpoints.

This module defines authentication and user management API endpoints
using Django Ninja, following the patterns established in Phase 1.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Literal, cast

from authentication.email_verification import email_verification_service
from authentication.schemas import (
    RegisterInputSchema,
    RegisterResponseSchema,
    TokenObtainInputSchema,
    TokenResponseSchema,
)
from core.services.email_service import email_service
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import HttpRequest, HttpResponse
from ninja import Router
from rest_framework_simplejwt.tokens import RefreshToken

# Create authentication router
auth_router = Router(tags=["Authentication"])


def _get_jwt_settings() -> dict[str, str | timedelta]:
    """Get typed JWT settings from Django settings.

    Type-safe accessor for SIMPLE_JWT settings to avoid MyPy errors
    with Django's dynamic settings system.
    """
    jwt_settings = cast(dict[str, str | timedelta], settings.SIMPLE_JWT)
    return jwt_settings


@auth_router.post("/register/", response={201: RegisterResponseSchema, 409: dict, 500: dict})
def register_user(request: HttpRequest, payload: RegisterInputSchema) -> tuple[int, dict]:
    """Register a new user and send email verification.

    Creates a new user account and triggers email verification via
    django-allauth CustomAccountAdapter.

    Args:
        request: HTTP request object
        payload: Registration data (username, email, password)

    Returns:
        tuple: (status_code, response_data)
            - 201: User created successfully, verification email sent
            - 409: Username/email already exists or forbidden username
            - 500: Email sending failed (user creation rolled back)

    Email verification flow:
        1. User created with Django's create_user()
        2. email_service.send_verification_email() triggers allauth confirmation
        3. User receives email with verification link
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
        password=payload.password
    )

    # Send verification email via allauth integration
    email_sent = email_service.send_verification_email(user)

    if email_sent:
        return 201, {
            "message": "Registration successful. Please check your email to verify your account.",
            "user_id": user.id,
            "email": user.email,
            "email_sent": True
        }
    else:
        # Email failed to send - delete the user and return error
        user.delete()
        return 500, {
            "error": "Registration failed. Unable to send verification email. "
            "Please try again later or contact support.",
            "email_sent": False
        }


@auth_router.post("/token/", response={200: TokenResponseSchema, 400: dict, 401: dict, 403: dict})
def obtain_token(request: HttpRequest, response: HttpResponse, payload: TokenObtainInputSchema) -> tuple[int, dict]:
    """Obtain JWT access and refresh tokens (login).

    Authenticates user with username/email and password, then returns
    JWT tokens set as httponly cookies.

    Args:
        request: HTTP request object
        response: HTTP response object (for setting cookies)
        payload: Login credentials (usernameOrEmail, password)

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
    username_or_email = payload.usernameOrEmail
    password = payload.password

    if not username_or_email or not password:
        return 400, {"error": "Username/email and password are required."}

    # Authenticate user (supports both username and email)
    user = authenticate(
        request=request,
        username=username_or_email,
        password=password
    )

    if not user:
        return 401, {"error": "Unable to authenticate with provided credentials."}

    # Check email verification using allauth EmailAddress
    if not email_verification_service.is_email_verified(user):
        return 403, {
            "error": "Please verify your email address before logging in. "
            "Check your email for the verification link."
        }

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Get typed JWT settings
    jwt_settings = _get_jwt_settings()
    access_token_name = cast(str, jwt_settings['ACCESS_TOKEN_NAME'])
    refresh_token_name = cast(str, jwt_settings['REFRESH_TOKEN_NAME'])
    access_lifetime = cast(timedelta, jwt_settings['ACCESS_TOKEN_LIFETIME'])
    refresh_lifetime = cast(timedelta, jwt_settings['REFRESH_TOKEN_LIFETIME'])
    samesite = cast(Literal['Lax', 'Strict', 'None'],
                    jwt_settings.get('JWT_COOKIE_SAMESITE', 'Lax'))

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
        "user_id": user.id,
        "email_verified": True  # Already checked above
    }


@auth_router.post("/token/refresh/", response={200: TokenResponseSchema, 400: dict})
def refresh_token(request: HttpRequest, response: HttpResponse) -> tuple[int, dict]:
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
    # Get typed JWT settings
    jwt_settings = _get_jwt_settings()
    refresh_token_name = cast(str, jwt_settings['REFRESH_TOKEN_NAME'])
    access_token_name = cast(str, jwt_settings['ACCESS_TOKEN_NAME'])
    access_lifetime = cast(timedelta, jwt_settings['ACCESS_TOKEN_LIFETIME'])
    refresh_lifetime = cast(timedelta, jwt_settings['REFRESH_TOKEN_LIFETIME'])
    samesite = cast(Literal['Lax', 'Strict', 'None'],
                    jwt_settings.get('JWT_COOKIE_SAMESITE', 'Lax'))

    # Get refresh token from cookie
    refresh_token_value = request.COOKIES.get(refresh_token_name)

    if not refresh_token_value:
        return 400, {"error": "No valid refresh token found in cookies."}

    try:
        # Validate and refresh the token
        # type: ignore[arg-type]  # SimpleJWT accepts str at runtime
        refresh = RefreshToken(refresh_token_value)
        access_token = str(refresh.access_token)
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


__all__ = [
    "auth_router",
]
