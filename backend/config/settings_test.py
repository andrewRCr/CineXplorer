"""Test settings for Django tests.
Uses Django's in-memory email backend to capture emails without sending.
"""

import os

from .settings import *  # noqa: F403

# Use Django's in-memory email backend for tests
# Emails are captured in django.core.mail.outbox for assertion
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"  # pyright: ignore[reportConstantRedefinition]
# Expiry settings (1 day for faster tests)
# - EMAIL_VERIFICATION_EXPIRY_DAYS: Custom app setting
# - ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS: Django-allauth setting
EMAIL_VERIFICATION_EXPIRY_DAYS = 1  # pyright: ignore[reportConstantRedefinition]
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = EMAIL_VERIFICATION_EXPIRY_DAYS  # pyright: ignore[reportConstantRedefinition]
# Disable email verification rate limiting for tests
# Production default is "1/180s/key" (1 email per 3 minutes per address)
# which causes test failures when the same test runs multiple times
# because rate limit state persists in Redis between test runs.
# Setting to empty string disables the rate limit for this action.
ACCOUNT_RATE_LIMITS = {  # pyright: ignore[reportConstantRedefinition]
    "confirm_email": "",  # Disable rate limiting for email confirmation in tests
}
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
# Django Ninja's TestAware throttles automatically bypass when TESTING=True
# (see authentication/throttles.py for implementation)
TESTING = True  # pyright: ignore[reportConstantRedefinition]

# Note: Logging configuration is now handled by the unified config in config/logging.py
# The unified config works well for both development and test environments
# Tests use the same logging setup as development, which provides good debugging capability
