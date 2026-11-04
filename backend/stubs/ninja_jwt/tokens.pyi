"""
Type stub file for django-ninja-jwt tokens.

Provides explicit type annotations for django-ninja-jwt's Token, RefreshToken, and
AccessToken classes. Official type stubs exist but are INCOMPLETE.

⚠️ MAINTENANCE CONTRACT
------------------------
Synchronized with: django-ninja-jwt 5.3.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading django-ninja-jwt or django-types:
1. Check ninja-jwt release notes for Token/RefreshToken/AccessToken API changes
2. Check for official stub improvements (incomplete as of 5.3.x)
3. Run tests - if runtime errors occur, check this stub file first
4. Verify constructor signatures and property types match runtime behavior
5. Update "Last verified" date above

Trade-off: This stub eliminates type: ignore comments and provides proper type
inference for token.access_token and token.payload, but requires manual
verification on ninja-jwt upgrades (~80 lines to maintain).

Purpose: Eliminates type: ignore comments on RefreshToken usage, adds payload typing
Pattern: Custom stubs for third-party libraries with incomplete type information
Token payloads use dict[str, object] because claim values have varying types.
Status: Official stubs exist but INCOMPLETE - this is REQUIRED (supplements official stubs)

Note: django-ninja-jwt is a direct fork of djangorestframework-simplejwt with
identical token API, so these stubs mirror the simplejwt stubs structure.
"""

from __future__ import annotations

from typing import Protocol

from django.contrib.auth.base_user import AbstractBaseUser

class _TokenProtocol(Protocol):
    """
    Protocol for JWT token objects that can be converted to strings.

    All token classes in ninja-jwt implement __str__ for token string serialization.
    """
    def __str__(self) -> str: ...

class Token:
    """
    Base class for JWT tokens in django-ninja-jwt.

    Tokens can be instantiated from a token string or created fresh for a user.
    """

    # Token payload data (decoded JWT claims)
    payload: dict[str, object]

    def __init__(self, token: str | dict[str, object] | None = None) -> None:
        """
        Initialize token from string or create new token.

        Args:
            token: JWT token string to decode, or None to create empty token
        """

    def __str__(self) -> str:
        """Return the encoded JWT token string."""

    @classmethod
    def for_user(cls, user: AbstractBaseUser) -> Token:
        """
        Create a new token for the given user.

        Args:
            user: User to create token for

        Returns:
            Token instance with user claims
        """

class AccessToken(Token):
    """
    Access token for API authentication.

    Short-lived token used for authenticating API requests.
    """

class RefreshToken(Token):
    """
    Refresh token for obtaining new access tokens.

    Long-lived token used to obtain new access tokens without re-authentication.
    """

    @classmethod
    def for_user(cls, user: AbstractBaseUser) -> RefreshToken:
        """
        Create a new refresh token for the given user.

        Args:
            user: User to create token for

        Returns:
            RefreshToken instance with user claims
        """

    @property
    def access_token(self) -> AccessToken:
        """
        Generate and return an access token from this refresh token.

        Returns:
            AccessToken instance that can be converted to string via str()
        """
