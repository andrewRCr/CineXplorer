"""
Test settings for Django tests.
Mocks the email service to prevent real API calls during testing.
"""

import sys
from datetime import timedelta
from unittest.mock import MagicMock
from .settings import *


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
sys.modules['core.services.email_service'] = mock_email_module

# Override email settings for tests
ZEPTOMAIL_API_KEY = "test_key"
EMAIL_VERIFICATION_TOKEN_EXPIRY = timedelta(hours=24)
FRONTEND_URL = "http://testserver"

# Add missing settings for tests
FORBIDDEN_USERNAMES = ['admin', 'root', 'superuser', 'administrator']

# Test database configuration - use PostgreSQL test database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'devDB',  # Use dev database for local testing
        'USER': 'devUser',
        'PASSWORD': 'devPassword',
        'HOST': 'dev-db',
        'PORT': '5432',
    }
}

# Add TESTING flag for environment detection
TESTING = True
