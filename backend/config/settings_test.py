"""
Test settings for Django tests.
Mocks the email service to prevent real API calls during testing.
"""

import os
import sys
from datetime import timedelta
from unittest.mock import MagicMock
from .settings import *  # noqa: F403,F401


class MockEmailService:
    """Mock email service for testing."""

    def send_verification_email(self, user):
        """Mock verification email sending."""
        print(f"MOCK: Would send verification email to {user.email}")
        return True

    def send_welcome_email(self, user):
        """Mock welcome email sending."""
        print(f"MOCK: Would send welcome email to {user.email}")
        return True


# Create a mock module to replace the real email service
mock_email_module = MagicMock()
mock_email_module.EmailService = MockEmailService

# Replace the module in sys.modules before Django loads
sys.modules["core.services.email_service"] = mock_email_module

# Override email settings for tests
ZEPTOMAIL_API_KEY = "test_key"
EMAIL_VERIFICATION_TOKEN_EXPIRY = timedelta(hours=24)
FRONTEND_URL = "http://testserver"

# Add missing settings for tests
FORBIDDEN_USERNAMES = ["admin", "root", "superuser", "administrator"]

# Environment-aware database configuration
# Check if we're in CI (GitHub Actions) or local development
IS_CI = os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"

# Also check database credentials as a fallback
DB_USER = os.getenv("POSTGRES_USER", "devUser")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "devPassword")
DB_NAME = os.getenv("POSTGRES_DB", "devDB")

# If we're using postgres credentials, assume we're in CI
if DB_USER == "postgres" and DB_PASSWORD == "postgres":
    IS_CI = True

if IS_CI:
    # CI environment uses postgres credentials
    DATABASES = {
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
    DATABASES = {
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
TESTING = True

# Override logging configuration for testing
# Test environments should have minimal logging to:
# - Reduce noise in test output
# - Avoid file system operations during testing
# - Work reliably in CI environments
# - Focus on actual test failures rather than log messages
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "test_simple": {
            "format": "[TEST] {levelname}: {message}",
            "style": "{",
        },
        "test_detailed": {
            "format": "[TEST] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "test_console": {
            "class": "logging.StreamHandler",
            "level": "ERROR",  # Only show errors during testing
            "formatter": "test_simple",
            "stream": "ext://sys.stderr",  # Use stderr to avoid interfering with test output
        },
        "test_null": {
            "class": "logging.NullHandler",  # Discards all log messages
        },
    },
    "loggers": {
        # Root logger - minimal logging
        "": {
            "handlers": ["test_console"],
            "level": "ERROR",
            "propagate": False,
        },
        # CineXplorer application - only critical errors
        "cinexplorer": {
            "handlers": ["test_console"],
            "level": "ERROR",
            "propagate": False,
        },
        # Django framework - only critical errors
        "django": {
            "handlers": ["test_console"],
            "level": "CRITICAL",  # Even more restrictive for Django internals
            "propagate": False,
        },
        # Database queries - completely disabled for testing
        "django.db.backends": {
            "handlers": ["test_null"],
            "level": "CRITICAL",
            "propagate": False,
        },
        # Request logging - disabled for testing
        "cinexplorer.requests": {
            "handlers": ["test_null"],
            "level": "CRITICAL",
            "propagate": False,
        },
        # TMDB API - only show errors
        "cinexplorer.tmdb": {
            "handlers": ["test_console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
