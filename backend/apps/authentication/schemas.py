"""Pydantic schemas for the authentication API.

This module defines schemas for authentication and user management endpoints
following Django Ninja patterns.

Pattern Guidelines:
- Use ModelSchema for Django User model operations (profile retrieval/updates)
- Use manual Schema for authentication flows (no direct model mapping)
- Input schemas validate request data
- Response schemas define API responses
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from ninja import Schema
from ninja.orm import ModelSchema
from pydantic import EmailStr, Field

# Password validation constants
PASSWORD_MIN_LENGTH = 8  # Minimum password length for registration


# Registration Schemas
class RegisterInputSchema(Schema):
    """Schema for user registration input.

    Manual Schema (not ModelSchema) because registration includes
    password handling and validation logic not directly on User model.
    """

    username: str = Field(
        ..., min_length=1, max_length=150, description="Unique username for the account"
    )
    email: EmailStr = Field(..., description="User's email address (must be unique)")
    password: str = Field(
        ...,
        min_length=PASSWORD_MIN_LENGTH,
        description=f"Account password (minimum {PASSWORD_MIN_LENGTH} characters)",
    )
    first_name: str | None = Field(
        default=None, max_length=150, description="User's first name (optional)"
    )
    last_name: str | None = Field(
        default=None, max_length=150, description="User's last name (optional)"
    )


class RegisterResponseSchema(Schema):
    """Schema for successful registration response."""

    message: str = Field(..., description="Success message with email verification instruction")
    user_id: int = Field(..., description="ID of the newly created user")
    email: str = Field(..., description="Email address where verification was sent")
    email_sent: bool = Field(..., description="Whether verification email was successfully sent")


# JWT Token Schemas
class TokenObtainInputSchema(Schema):
    """Schema for JWT token obtain (login) input.

    Supports authentication with either username or email.
    Field name follows django-allauth convention (allauth.account.forms.LoginForm).
    """

    login: str = Field(..., description="Username or email for authentication")
    password: str = Field(..., description="User's password")
    remember_me: bool = Field(
        default=False, description="Keep the refresh cookie between browser sessions"
    )


class TokenResponseSchema(Schema):
    """Schema for password sign-in with an access token and user details.

    The response exposes the access token and user details. The refresh
    token is delivered only in its HttpOnly cookie.
    """

    access_token: str = Field(..., description="JWT access token for API authorization")
    user_id: int = Field(..., description="ID of the authenticated user")
    username: str = Field(..., description="Username of the authenticated user")
    first_name: str | None = Field(default=None, description="User's first name (if provided)")
    email_verified: bool = Field(
        ..., description="Whether user's email has been verified via allauth"
    )


# User Profile Schemas
class UserProfileSchema(ModelSchema):
    """Schema for user profile retrieval and updates.

    Uses ModelSchema for direct mapping to Django User model.
    Password field excluded from responses (write_only in updates).
    """

    email_verified: bool | None = Field(
        default=None, description="Whether user's email is verified (computed from allauth)"
    )
    full_name: str | None = Field(
        default=None, description="User's full name (first_name + last_name)"
    )

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "first_name", "last_name"]


# CSRF Token Schema
class CsrfTokenResponseSchema(Schema):
    """Schema for CSRF token response.

    Token is set as cookie and returned in response body.
    """

    csrf_token: str = Field(..., description="CSRF token for state-changing requests")


# Logout Schema
class LogoutResponseSchema(Schema):
    """Schema for logout response."""

    message: str = Field(..., description="Logout success message")


# Email Verification Schemas
class EmailVerificationInputSchema(Schema):
    """Schema for email verification input."""

    key: str = Field(..., description="Email verification key from confirmation link")


class EmailVerificationResponseSchema(Schema):
    """Schema for email verification response."""

    message: str = Field(..., description="Verification success/failure message")
    email: str = Field(..., description="Verified email address (for pre-filling login form)")


class ResendVerificationInputSchema(Schema):
    """Schema for resend verification email input.

    Uses opaque token from login error response instead of email address.
    This prevents user enumeration while enabling resend for all login methods.
    """

    resend_token: str = Field(
        ..., min_length=32, description="Opaque resend token from login error response"
    )


class EmailDeliveryErrorSchema(Schema):
    """A retryable failure to send a transactional email."""

    detail: str


class ResendVerificationResponseSchema(Schema):
    """Schema for resend verification response."""

    message: str = Field(..., description="Resend operation result message")


# Hybrid Authentication Token Schemas
class HybridTokenRefreshResponseSchema(Schema):
    """Schema for hybrid authentication token refresh response.

    Hybrid Architecture:
    - Access token: Returned in response body (frontend stores in localStorage)
    - Refresh token: NOT in response (remains in HTTP-only cookie)
    - Metadata: Expiration info for frontend token management

    This includes expiration metadata alongside the access token.
    """

    access_token: str = Field(
        ..., description="JWT access token for localStorage (5-min lifetime)"
    )
    expires_in: int = Field(
        ..., description="Access token lifetime in seconds (300 for 5 minutes)"
    )
    issued_at: str = Field(..., description="Token issue timestamp (ISO 8601 UTC)")


__all__ = [
    "CsrfTokenResponseSchema",
    "EmailDeliveryErrorSchema",
    "EmailVerificationInputSchema",
    "EmailVerificationResponseSchema",
    "HybridTokenRefreshResponseSchema",
    "LogoutResponseSchema",
    "RegisterInputSchema",
    "RegisterResponseSchema",
    "ResendVerificationInputSchema",
    "ResendVerificationResponseSchema",
    "TokenObtainInputSchema",
    "TokenResponseSchema",
    "UserProfileSchema",
]
