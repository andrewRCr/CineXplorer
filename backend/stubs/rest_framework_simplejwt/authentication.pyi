"""
Type stub file for djangorestframework-simplejwt authentication.

Provides explicit type annotations for SimpleJWT's JWTAuthentication class,
enabling type-safe authentication operations.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: djangorestframework-simplejwt 5.3.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading djangorestframework-simplejwt:
1. Check release notes for JWTAuthentication API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify method signatures match runtime behavior
4. Update "Last verified" date above

Trade-off: This stub eliminates type: ignore comments and provides proper type
inference for get_user() and get_validated_token(), but requires manual
verification on simplejwt upgrades.

Purpose: Eliminates type: ignore on JWTAuthentication.get_user() usage
Pattern: Custom stubs for third-party libraries without complete type information
Compliance: Zero typing.Any usage per DEVELOPMENT-RULES.md
"""
from __future__ import annotations

from django.contrib.auth.base_user import AbstractBaseUser
from rest_framework.authentication import BaseAuthentication

from .models import TokenUser
from .tokens import Token

class JWTAuthentication(BaseAuthentication):
    """
    An authentication plugin that authenticates requests through a JSON web
    token provided in a request header.
    """

    def __init__(self, *args: object, **kwargs: object) -> None:
        """Initialize JWT authentication."""
        ...

    def get_validated_token(self, raw_token: bytes) -> Token:
        """
        Validates an encoded JSON web token and returns a validated token
        wrapper object.

        Args:
            raw_token: The raw JWT token bytes

        Returns:
            Validated Token instance

        Raises:
            InvalidToken: If token is invalid
        """
        ...

    def get_user(self, validated_token: Token) -> AbstractBaseUser | TokenUser:
        """
        Attempts to find and return a user using the given validated token.

        Args:
            validated_token: The validated JWT token

        Returns:
            User instance (either AbstractBaseUser or TokenUser)

        Raises:
            InvalidToken: If token doesn't contain user identification
            AuthenticationFailed: If user not found or inactive
        """
        ...


class JWTStatelessUserAuthentication(JWTAuthentication):
    """
    An authentication plugin that authenticates requests through a JSON web
    token provided in a request header without performing a database lookup.
    """

    def get_user(self, validated_token: Token) -> TokenUser:
        """
        Returns a stateless user object which is backed by the given validated
        token.

        Args:
            validated_token: The validated JWT token

        Returns:
            TokenUser instance (stateless user)

        Raises:
            InvalidToken: If token doesn't contain user identification
        """
        ...
