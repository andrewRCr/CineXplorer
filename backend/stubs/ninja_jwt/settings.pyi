"""
Type stub file for django-ninja-jwt settings.

Provides type annotations for JWT settings configuration.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: django-ninja-jwt 5.3.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading django-ninja-jwt:
1. Check release notes for settings API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify api_settings attributes match runtime behavior
4. Update "Last verified" date above

Note: django-ninja-jwt uses the same SIMPLE_JWT Django settings key as
djangorestframework-simplejwt, maintaining backward compatibility.
"""
from __future__ import annotations

from datetime import timedelta

class APISettings:
    """
    Settings object for django-ninja-jwt configuration.

    Reads from Django's SIMPLE_JWT settings dict.
    """

    # User identification claims
    USER_ID_FIELD: str  # Default: 'id'
    USER_ID_CLAIM: str  # Default: 'user_id'

    # Token lifetimes
    ACCESS_TOKEN_LIFETIME: timedelta
    REFRESH_TOKEN_LIFETIME: timedelta

    # Token type
    AUTH_TOKEN_CLASSES: tuple[str, ...]

    # Algorithm settings
    ALGORITHM: str
    SIGNING_KEY: str
    VERIFYING_KEY: str | None

    # Audience and issuer
    AUDIENCE: str | None
    ISSUER: str | None

    # Token prefix for Authorization header
    AUTH_HEADER_TYPES: tuple[str, ...]
    AUTH_HEADER_NAME: str

    # Cookie names (custom settings for our implementation)
    ACCESS_TOKEN_NAME: str
    REFRESH_TOKEN_NAME: str
    JWT_COOKIE_SAMESITE: str

    def __getattr__(self, name: str) -> object:
        """
        Allow dynamic attribute access for settings not explicitly typed.

        Args:
            name: Setting name

        Returns:
            Setting value
        """


# Global settings instance
api_settings: APISettings
