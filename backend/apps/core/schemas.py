"""Django Ninja schemas for core app endpoints.

This module provides Pydantic schemas for:
- Frontend logging API (receiving frontend log entries)
- Logging health check endpoint
- Error codes and categories (shared with frontend via OpenAPI)
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from ninja import Schema

# =============================================================================
# Error Codes and Categories
# =============================================================================


class ErrorCode(StrEnum):
    """Standardized error codes for API responses.

    These codes are auto-generated to TypeScript via OpenAPI for type-safe
    error handling across the frontend/backend boundary.
    """

    # Authentication errors
    EMAIL_NOT_VERIFIED = "email_not_verified"
    INVALID_CREDENTIALS = "invalid_credentials"
    ACCOUNT_DISABLED = "account_disabled"
    ACCOUNT_LOCKED = "account_locked"
    INVALID_AUTHORIZATION = "invalid_authorization"
    INVALID_REFRESH_TOKEN = "invalid_refresh_token"

    # User Management Errors
    USERNAME_EXISTS = "username_exists"
    EMAIL_EXISTS = "email_exists"
    INVALID_USERNAME = "invalid_username"
    WEAK_PASSWORD = "weak_password"

    # Movie Data Errors
    MOVIE_NOT_FOUND = "movie_not_found"
    INVALID_RATING = "invalid_rating"
    DUPLICATE_RATING = "duplicate_rating"

    # General API Errors
    VALIDATION_ERROR = "validation_error"
    PERMISSION_DENIED = "permission_denied"
    RESOURCE_NOT_FOUND = "resource_not_found"
    RATE_LIMITED = "rate_limited"


class ErrorCategory(StrEnum):
    """Error categories for grouping related error codes."""

    AUTHENTICATION = "authentication"
    USER_MANAGEMENT = "user_management"
    MOVIE_DATA = "movie_data"
    API_GENERAL = "api_general"


class ApiErrorSchema(Schema):
    """Standard API error structure for error responses.

    This schema is exposed in OpenAPI to enable type-safe error handling
    in the frontend with auto-generated TypeScript types.
    """

    code: ErrorCode
    message: str
    category: ErrorCategory | None = None
    field: str | None = None  # For validation errors on specific fields
    details: dict[str, object] | None = None


# Frontend Logging Schemas


class FrontendLogEntrySchema(Schema):
    """Schema for frontend log entries sent to the backend.

    The frontend sends structured log data to enable centralized logging,
    monitoring, and debugging of client-side issues.
    """

    level: Literal["DEBUG", "INFO", "WARNING", "WARN", "ERROR", "CRITICAL"]  # Required: Log level
    message: str  # Required: Log message
    timestamp: str  # Required: ISO format timestamp
    data: dict[str, object] | None = None  # Optional: Additional structured data
    correlation_id: str | None = None  # Optional: Request correlation ID
    user_agent: str | None = None  # Optional: Browser user agent
    url: str | None = None  # Optional: Frontend URL where log occurred
    user_id: int | None = None  # Optional: Authenticated user ID
    session_id: str | None = None  # Optional: Frontend session ID
    source: str = "frontend"  # Default: Log source identifier
    environment: str | None = None  # Optional: Environment (development, production)
    browser_info: dict[str, object] | None = None  # Optional: Browser context
    recent_interactions: list[object] | None = None  # Optional: User interaction history


class FrontendLogSuccessResponse(Schema):
    """Response for successful log entry submission."""

    success: bool
    message: str


class FrontendLogErrorResponse(Schema):
    """Response for failed log entry submission."""

    success: bool
    error: str
    max_size_bytes: int | None = None  # Only included for payload too large errors


# Logging Health Check Schemas


class LogHealthCheckResponse(Schema):
    """Response for logging system health check."""

    status: str  # "healthy" or "unhealthy"
    service: str  # "logging"
    correlation_id: str | None = None  # Only included on success
    timestamp: str | None = None  # Only included on success
    error: str | None = None  # Only included on failure


# Development Console Logging Schemas


class DevConsoleLogRequest(Schema):
    """Request schema for development console log file writes."""

    log_line: str  # Formatted log line to write to file


class DevConsoleLogResponse(Schema):
    """Response schema for development console log writes."""

    status: str  # "ok" or "error"
    file: str | None = None  # File name written to (on success)
    error: str | None = None  # Error message (on failure)


__all__ = [
    "ApiErrorSchema",
    "DevConsoleLogRequest",
    "DevConsoleLogResponse",
    "ErrorCategory",
    "ErrorCode",
    "FrontendLogEntrySchema",
    "FrontendLogErrorResponse",
    "FrontendLogSuccessResponse",
    "LogHealthCheckResponse",
]


class HealthCheckResponse(Schema):
    """A successful readiness response."""

    status: Literal["healthy"]


class ServiceUnavailableResponse(Schema):
    """A readiness failure without internal connection details."""

    detail: str


class ErrorResponseSchema(Schema):
    """The error response sent by shared handlers."""

    detail: str
    code: ErrorCode | None = None
