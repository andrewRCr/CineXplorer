"""
Django Ninja schemas for core app endpoints.

This module provides Pydantic schemas for:
- Frontend logging API (receiving frontend log entries)
- Logging health check endpoint
"""

from __future__ import annotations

from typing import Literal

from ninja import Schema

# Frontend Logging Schemas


class FrontendLogEntrySchema(Schema):
    """
    Schema for frontend log entries sent to the backend.

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
    "DevConsoleLogRequest",
    "DevConsoleLogResponse",
    "FrontendLogEntrySchema",
    "FrontendLogErrorResponse",
    "FrontendLogSuccessResponse",
    "LogHealthCheckResponse",
]
