"""Type stub file for django-ninja-jwt exceptions.

Provides type annotations for JWT-related exceptions.

Maintenance Contract:
Synchronized with: django-ninja-jwt 5.3.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading django-ninja-jwt:
1. Check release notes for exception API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify exception hierarchy matches runtime behavior
4. Update "Last verified" date above

Note: django-ninja-jwt is a direct fork of djangorestframework-simplejwt with
identical exception API.
"""

from __future__ import annotations

class TokenError(Exception):
    """Base exception for all token-related errors."""

class InvalidToken(TokenError):  # noqa: N818
    """Exception raised when a token is invalid (expired, malformed, etc.).

    Note: Name matches django-ninja-jwt library (cannot rename to InvalidTokenError).
    """

class TokenBackendError(TokenError):
    """Exception raised when token backend operations fail."""
