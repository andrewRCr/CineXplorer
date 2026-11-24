"""Test helpers for authentication domain.

**Location in Test Hierarchy:** Tier 4 - Domain Helpers

Provides input schema factories, mock builders and account log assertions.

Related helpers:
- `core/tests/test_helpers.py` for create_mock_user(), JSON helpers, CSRF tokens
- `authentication/tests/fixtures.py` for integration-level factory data
"""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from typing import TYPE_CHECKING, Protocol, cast
from unittest.mock import Mock

from django.http import HttpResponse

from apps.authentication.schemas import (
    EmailVerificationInputSchema,
    RegisterInputSchema,
    ResendVerificationInputSchema,
    TokenObtainInputSchema,
)
from middleware.logging import RequestLoggingMiddleware, get_correlation_id

if TYPE_CHECKING:
    from logging import LogRecord

    from django.http import HttpRequest
    from django.test import RequestFactory

PROXY_IP = "192.0.2.12"
VISITOR_IP = "198.51.100.24"

__all__ = [
    "PROXY_IP",
    "VISITOR_IP",
    "assert_account_log_correlation",
    "create_email_verification_input",
    "create_mock_jwt_settings",
    "create_mock_refresh_token",
    "create_register_input",
    "create_resend_verification_input",
    "create_token_input",
    "normalize_response_data",
    "start_proxied_request",
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


def create_token_input(
    *, login: str = "testuser", password: str = "testpass123", remember_me: bool = False
) -> TokenObtainInputSchema:
    """Build TokenObtainInputSchema with sensible defaults."""
    return TokenObtainInputSchema(login=login, password=password, remember_me=remember_me)


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


def start_proxied_request(factory: RequestFactory, path: str) -> tuple[HttpRequest, str]:
    """Give a service-level test request its ID through the request logger."""
    request = factory.post(path, REMOTE_ADDR=PROXY_IP, HTTP_X_FORWARDED_FOR=VISITOR_IP)
    RequestLoggingMiddleware(lambda request: HttpResponse()).process_request(request)
    request_id = get_correlation_id(request)
    assert request_id is not None
    return request, request_id


def assert_account_log_correlation(records: list[LogRecord], event: str, request_id: str) -> None:
    """Check the indicated event for the request link and for address redaction."""
    (record,) = [record for record in records if record.getMessage().startswith(event)]
    assert getattr(record, "correlation_id", None) == request_id
    assert f"cid={request_id}" in record.getMessage()
    assert "ip=" not in record.getMessage()
    assert PROXY_IP not in repr(vars(record))
    assert VISITOR_IP not in repr(vars(record))
