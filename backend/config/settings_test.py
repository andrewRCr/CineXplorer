"""
Test settings for Django tests.
Mocks the email service to prevent real API calls during testing.
"""

import os
import sys
from datetime import timedelta
from typing import TYPE_CHECKING
from unittest.mock import MagicMock

from .settings import *  # noqa: F403

if TYPE_CHECKING:
    from apps.accounts.models import CustomUser


class MockEmailService:
    """Mock email service for testing."""

    def send_verification_email(self, user: CustomUser) -> bool:  # type: ignore[name-defined]
        """Mock verification email sending."""
        print(f"MOCK: Would send verification email to {user.email}")
        return True

    def send_welcome_email(self, user: CustomUser) -> bool:  # type: ignore[name-defined]
        """Mock welcome email sending."""
        print(f"MOCK: Would send welcome email to {user.email}")
        return True


# Create a mock module to replace the real email service
mock_email_module = MagicMock()
mock_email_module.EmailService = MockEmailService

# Replace the module in sys.modules before Django loads
sys.modules["core.services.email_service"] = mock_email_module

# Override email settings for tests
ZEPTOMAIL_API_KEY = "test_key"  # pyright: ignore[reportConstantRedefinition]
# Expiry settings (1 day for faster tests)
# - EMAIL_VERIFICATION_EXPIRY_DAYS: Custom app setting
# - ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS: Django-allauth setting
EMAIL_VERIFICATION_EXPIRY_DAYS = 1  # pyright: ignore[reportConstantRedefinition]
EMAIL_VERIFICATION_TOKEN_EXPIRY = timedelta(days=EMAIL_VERIFICATION_EXPIRY_DAYS)  # pyright: ignore[reportConstantRedefinition]
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = EMAIL_VERIFICATION_EXPIRY_DAYS  # pyright: ignore[reportConstantRedefinition]
FRONTEND_URL = "http://testserver"  # pyright: ignore[reportConstantRedefinition]

# Add missing settings for tests
FORBIDDEN_USERNAMES = ["admin", "root", "superuser", "administrator"]  # pyright: ignore[reportConstantRedefinition]

# Environment-aware database configuration
# Check if we're in CI (GitHub Actions) or local development
IS_CI = os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"

# Also check database credentials as a fallback
DB_USER = os.getenv("POSTGRES_USER", "devUser")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "devPassword")
DB_NAME = os.getenv("POSTGRES_DB", "devDB")

# If we're using postgres credentials, assume we're in CI
if DB_USER == "postgres" and DB_PASSWORD == "postgres":
    IS_CI = True  # pyright: ignore[reportConstantRedefinition]

if IS_CI:
    # CI environment uses postgres credentials
    DATABASES = {  # pyright: ignore[reportConstantRedefinition]
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": DB_NAME,
            "USER": DB_USER,
            "PASSWORD": DB_PASSWORD,
            "HOST": "dev-db",
            "PORT": "5432",
        }
    }
else:
    # Local development uses dev credentials
    DATABASES = {  # pyright: ignore[reportConstantRedefinition]
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": DB_NAME,
            "USER": DB_USER,
            "PASSWORD": DB_PASSWORD,
            "HOST": "dev-db",
            "PORT": "5432",
        }
    }

# Add TESTING flag for environment detection
TESTING = True  # pyright: ignore[reportConstantRedefinition]

# Disable Django Ninja throttling for tests (prevents rate limit failures)
REST_FRAMEWORK = {  # pyright: ignore[reportConstantRedefinition]
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": None,  # Disable anonymous throttling
        "user": None,  # Disable user throttling
    },
}

# Note: Logging configuration is now handled by the unified config in config/logging.py
# The unified config works well for both development and test environments
# Tests use the same logging setup as development, which provides good debugging capability
