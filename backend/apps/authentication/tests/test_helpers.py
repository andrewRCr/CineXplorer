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
from typing import Protocol, cast
from unittest.mock import Mock

from apps.authentication.schemas import (
    EmailVerificationInputSchema,
    RegisterInputSchema,
    ResendVerificationInputSchema,
    TokenObtainInputSchema,
)

__all__ = [
    "create_email_verification_input",
    "create_mock_jwt_settings",
    "create_mock_refresh_token",
    "create_register_input",
    "create_resend_verification_input",
    "create_token_input",
    "normalize_response_data",
]


class ModelDumpProtocol(Protocol):
    """Minimal protocol for Pydantic model_dump."""

    def model_dump(self) -> dict[str, object]:
        """Return serialized data."""
        ...


def create_register_input(**overrides: str) -> RegisterInputSchema:
    """Build RegisterInputSchema with sensible defaults."""
    data: dict[str, str] = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }
    merged = {**data, **overrides}
    return RegisterInputSchema(**merged)


def create_token_input(**overrides: str) -> TokenObtainInputSchema:
    """Build TokenObtainInputSchema with sensible defaults."""
    data: dict[str, str] = {
        "login": "testuser",
        "password": "testpass123",
    }
    merged = {**data, **overrides}
    return TokenObtainInputSchema(**merged)


def create_email_verification_input(**overrides: str) -> EmailVerificationInputSchema:
    """Build EmailVerificationInputSchema with sensible defaults."""
    data: dict[str, str] = {"key": "test-confirmation-key"}
    merged = {**data, **overrides}
    return EmailVerificationInputSchema(**merged)


def create_resend_verification_input(**overrides: str) -> ResendVerificationInputSchema:
    """Build ResendVerificationInputSchema with sensible defaults."""
    data: dict[str, str] = {"resend_token": "a" * 64}  # 64-char opaque token
    merged = {**data, **overrides}
    return ResendVerificationInputSchema(**merged)


def create_mock_jwt_settings(**overrides: str | timedelta) -> SimpleNamespace:
    """Create a lightweight mock for JWT settings."""
    data: dict[str, str | timedelta] = {
        "refresh_token_name": "refresh_token",
        "access_token_name": "access_token",
        "refresh_lifetime": timedelta(days=14),
        "access_lifetime": timedelta(minutes=5),
        "samesite": "Lax",
    }
    merged = {**data, **overrides}
    return SimpleNamespace(**merged)


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


def normalize_response_data(data: object) -> dict[str, object]:
    """Normalize schema or dict responses into a dict for assertions."""
    if isinstance(data, dict):
        return cast(dict[str, object], data)
    if hasattr(data, "model_dump"):
        return cast(ModelDumpProtocol, data).model_dump()
    raise TypeError("Unsupported response type")
