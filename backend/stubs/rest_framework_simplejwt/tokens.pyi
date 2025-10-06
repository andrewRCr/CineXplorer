"""
Type stub file for djangorestframework-simplejwt tokens.

Provides explicit type annotations for SimpleJWT's Token, RefreshToken, and
AccessToken classes, enabling type-safe token operations.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: djangorestframework-simplejwt 5.3.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading djangorestframework-simplejwt:
1. Check release notes for Token/RefreshToken/AccessToken API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify constructor signatures and property types match runtime behavior
4. Update "Last verified" date above

Trade-off: This stub eliminates type: ignore comments and provides proper type
inference for token.access_token and token.payload, but requires manual
verification on simplejwt upgrades.

Purpose: Eliminates type: ignore comments on RefreshToken usage, adds payload typing
Pattern: Custom stubs for third-party libraries without complete type information
Compliance: Zero typing.Any usage per DEVELOPMENT-RULES.md (uses dict[str, object])
"""
from __future__ import annotations

from typing import Protocol

from django.contrib.auth.base_user import AbstractBaseUser

class _TokenProtocol(Protocol):
    """
    Protocol for JWT token objects that can be converted to strings.

    Avoids using typing.Any per DEVELOPMENT-RULES.md type safety standards.
    All token classes in SimpleJWT implement __str__ for token string serialization.
    """
    def __str__(self) -> str: ...


class Token:
    """
    Base class for JWT tokens in SimpleJWT.

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
        ...

    def __str__(self) -> str:
        """Return the encoded JWT token string."""
        ...

    @classmethod
    def for_user(cls, user: AbstractBaseUser) -> Token:
        """
        Create a new token for the given user.

        Args:
            user: User to create token for

        Returns:
            Token instance with user claims
        """
        ...


class AccessToken(Token):
    """
    Access token for API authentication.

    Short-lived token used for authenticating API requests.
    """
    ...


class RefreshToken(Token):
    """
    Refresh token for obtaining new access tokens.

    Long-lived token used to obtain new access tokens without re-authentication.
    """

    @classmethod
    def for_user(cls, user: AbstractBaseUser) -> RefreshToken:  # type: ignore[override]
        """
        Create a new refresh token for the given user.

        Args:
            user: User to create token for

        Returns:
            RefreshToken instance with user claims
        """
        ...

    @property
    def access_token(self) -> AccessToken:
        """
        Generate and return an access token from this refresh token.

        Returns:
            AccessToken instance that can be converted to string via str()
        """
        ...
