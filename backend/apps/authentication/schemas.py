"""Pydantic schemas for the authentication API.

This module defines schemas for authentication and user management endpoints
following Django Ninja patterns established in Phase 1 (movie domain).

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


# Registration Schemas
class RegisterInputSchema(Schema):
    """Schema for user registration input.

    Manual Schema (not ModelSchema) because registration includes
    password handling and validation logic not directly on User model.
    """

    username: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Unique username for the account"
    )
    email: EmailStr = Field(
        ...,
        description="User's email address (must be unique)"
    )
    password: str = Field(
        ...,
        min_length=5,
        description="Account password (minimum 5 characters)"
    )
    first_name: str | None = Field(
        default=None,
        max_length=150,
        description="User's first name (optional)"
    )
    last_name: str | None = Field(
        default=None,
        max_length=150,
        description="User's last name (optional)"
    )


class RegisterResponseSchema(Schema):
    """Schema for successful registration response."""

    message: str = Field(
        ...,
        description="Success message with email verification instruction"
    )
    user_id: int = Field(
        ...,
        description="ID of the newly created user"
    )
    email: str = Field(
        ...,
        description="Email address where verification was sent"
    )
    email_sent: bool = Field(
        ...,
        description="Whether verification email was successfully sent"
    )


# JWT Token Schemas
class TokenObtainInputSchema(Schema):
    """Schema for JWT token obtain (login) input.

    Supports authentication with either username or email.
    Field name follows django-allauth convention (allauth.account.forms.LoginForm).
    """

    login: str = Field(
        ...,
        description="Username or email for authentication"
    )
    password: str = Field(
        ...,
        description="User's password"
    )


class TokenResponseSchema(Schema):
    """Schema for JWT token response (obtain and refresh).

    Tokens are set as httponly cookies, but also returned in
    response body for client convenience.
    """

    access: str = Field(
        ...,
        description="JWT access token (also set as httponly cookie)"
    )
    refresh: str = Field(
        ...,
        description="JWT refresh token (also set as httponly cookie)"
    )
    user_id: int = Field(
        ...,
        description="ID of the authenticated user"
    )
    email_verified: bool = Field(
        ...,
        description="Whether user's email has been verified via allauth"
    )


# User Profile Schemas
class UserProfileSchema(ModelSchema):
    """Schema for user profile retrieval and updates.

    Uses ModelSchema for direct mapping to Django User model.
    Password field excluded from responses (write_only in updates).
    """

    email_verified: bool | None = Field(
        default=None,
        description="Whether user's email is verified (computed from allauth)"
    )
    full_name: str | None = Field(
        default=None,
        description="User's full name (first_name + last_name)"
    )

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "first_name", "last_name"]


class UserProfileUpdateSchema(Schema):
    """Schema for user profile updates.

    Manual Schema with all optional fields for partial updates (PATCH).
    Password updates handled separately for security.
    """

    email: EmailStr | None = Field(
        default=None,
        description="Updated email address"
    )
    first_name: str | None = Field(
        default=None,
        max_length=150,
        description="Updated first name"
    )
    last_name: str | None = Field(
        default=None,
        max_length=150,
        description="Updated last name"
    )
    password: str | None = Field(
        default=None,
        min_length=5,
        description="Updated password (minimum 5 characters)"
    )


# CSRF Token Schema
class CsrfTokenResponseSchema(Schema):
    """Schema for CSRF token response.

    Token is set as cookie and returned in response body.
    """

    csrf_token: str = Field(
        ...,
        description="CSRF token for state-changing requests"
    )


# Logout Schema
class LogoutResponseSchema(Schema):
    """Schema for logout response."""

    message: str = Field(
        ...,
        description="Logout success message"
    )


# Email Verification Schemas
class EmailVerificationInputSchema(Schema):
    """Schema for email verification input."""

    key: str = Field(
        ...,
        description="Email verification key from confirmation link"
    )


class EmailVerificationResponseSchema(Schema):
    """Schema for email verification response."""

    message: str = Field(
        ...,
        description="Verification success/failure message"
    )


class ResendVerificationInputSchema(Schema):
    """Schema for resend verification email input."""

    email: EmailStr = Field(
        ...,
        description="Email address to resend verification to"
    )


class ResendVerificationResponseSchema(Schema):
    """Schema for resend verification response."""

    message: str = Field(
        ...,
        description="Resend operation result message"
    )


__all__ = [
    "CsrfTokenResponseSchema",
    "EmailVerificationInputSchema",
    "EmailVerificationResponseSchema",
    "LogoutResponseSchema",
    "RegisterInputSchema",
    "RegisterResponseSchema",
    "ResendVerificationInputSchema",
    "ResendVerificationResponseSchema",
    "TokenObtainInputSchema",
    "TokenResponseSchema",
    "UserProfileSchema",
    "UserProfileUpdateSchema",
]
