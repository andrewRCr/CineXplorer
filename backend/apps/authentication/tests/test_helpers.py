"""Test helpers for authentication domain.

**Location in Test Hierarchy:** Tier 4 - Domain Helpers

Provides mock builders and input schema factories for AuthenticationService
unit tests. Keep helpers small and focused to avoid obscuring behavior.

Related helpers:
- `core/tests/test_helpers.py` for create_mock_user(), JSON helpers, CSRF tokens
- `authentication/tests/fixtures.py` for integration-level factory data
"""
from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock

from authentication.schemas import (
    EmailVerificationInputSchema,
    RegisterInputSchema,
    ResendVerificationInputSchema,
    TokenObtainInputSchema,
    UserProfileUpdateSchema,
)

__all__ = [
    "create_email_verification_input",
    "create_mock_jwt_settings",
    "create_mock_refresh_token",
    "create_register_input",
    "create_resend_verification_input",
    "create_token_input",
    "create_user_profile_update_input",
]


def create_register_input(**overrides: object) -> RegisterInputSchema:
    """Build RegisterInputSchema with sensible defaults."""
    data = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }
    data.update(overrides)
    return RegisterInputSchema(**data)


def create_token_input(**overrides: object) -> TokenObtainInputSchema:
    """Build TokenObtainInputSchema with sensible defaults."""
    data = {
        "login": "testuser",
        "password": "testpass123",
    }
    data.update(overrides)
    return TokenObtainInputSchema(**data)


def create_email_verification_input(**overrides: object) -> EmailVerificationInputSchema:
    """Build EmailVerificationInputSchema with sensible defaults."""
    data = {"key": "test-confirmation-key"}
    data.update(overrides)
    return EmailVerificationInputSchema(**data)


def create_resend_verification_input(**overrides: object) -> ResendVerificationInputSchema:
    """Build ResendVerificationInputSchema with sensible defaults."""
    data = {"email": "testuser@example.com"}
    data.update(overrides)
    return ResendVerificationInputSchema(**data)


def create_user_profile_update_input(**overrides: object) -> UserProfileUpdateSchema:
    """Build UserProfileUpdateSchema with sensible defaults."""
    data = {
        "email": "updated@example.com",
        "first_name": "Updated",
        "last_name": "User",
        "password": "updatedpass123",
    }
    data.update(overrides)
    return UserProfileUpdateSchema(**data)


def create_mock_jwt_settings(**overrides: object) -> SimpleNamespace:
    """Create a lightweight mock for JWT settings."""
    data = {
        "refresh_token_name": "refresh_token",
        "access_token_name": "access_token",
        "refresh_lifetime": timedelta(days=14),
        "access_lifetime": timedelta(minutes=5),
        "samesite": "Lax",
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def create_mock_refresh_token(
    *,
    user_id: int = 1,
    access_token: str = "access-token",
    refresh_token: str = "refresh-token",
) -> Mock:
    """Create a mock RefreshToken-like object with payload and access_token."""
    mock_refresh = Mock()
    mock_refresh.access_token = access_token
    mock_refresh.payload = {"user_id": user_id}
    mock_refresh.__str__ = Mock(return_value=refresh_token)
    return mock_refresh
