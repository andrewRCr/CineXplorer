"""
Django Ninja API endpoints for core app.

This module provides:
- General health check endpoint (GET /health-check/)
- Frontend logging endpoint (POST /logs/)
- Logging health check endpoint (GET /logs/health/)
"""

from __future__ import annotations

import logging
from datetime import datetime

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from middleware.logging import get_correlation_id

from .schemas import (
    FrontendLogEntrySchema,
    FrontendLogErrorResponse,
    FrontendLogSuccessResponse,
    LogHealthCheckResponse,
)

# Get logger instances
frontend_logger = logging.getLogger("frontend")
app_logger = logging.getLogger("app")

# Create router for core endpoints
core_router = Router(tags=["core"])


@core_router.post(
    "/logs/",
    auth=None,  # Allow anonymous users (throttled at middleware level)
    response={
        201: FrontendLogSuccessResponse,
        400: FrontendLogErrorResponse,
        413: FrontendLogErrorResponse,
        500: FrontendLogErrorResponse,
    },
)
def frontend_log(
    request: HttpRequest, payload: FrontendLogEntrySchema
) -> tuple[int, FrontendLogSuccessResponse | FrontendLogErrorResponse]:
    """
    Receive frontend log entries for centralized logging.

    This endpoint allows the frontend to send log entries to the backend
    for centralized logging, monitoring, and debugging.

    Security:
    - Rate limited via middleware (scope: 'frontend_logs')
    - Payload size limited to prevent abuse
    - Available to anonymous users but throttled aggressively

    Args:
        request: HTTP request object
        payload: Frontend log entry data

    Returns:
        Success response with 201 status or error response with appropriate status

    Raises:
        HttpError: 400 for validation errors, 413 for payload too large, 500 for server errors
    """
    # Check payload size to prevent abuse
    max_payload_size = getattr(settings, "FRONTEND_LOG_MAX_PAYLOAD_SIZE", 50 * 1024)  # 50KB
    payload_size = len(request.body) if request.body else 0
    if payload_size > max_payload_size:
        app_logger.warning(
            "Frontend log payload too large",
            extra={
                "correlation_id": get_correlation_id(request),
                "payload_size": payload_size,
                "max_allowed": max_payload_size,
            },
        )
        return (
            413,
            FrontendLogErrorResponse(
                success=False,
                error="Payload too large",
                max_size_bytes=max_payload_size,
            ),
        )

    # Validate required fields
    validation_error = _validate_log_entry(payload)
    if validation_error:
        return (400, FrontendLogErrorResponse(success=False, error=validation_error))

    # Process the log entry
    success = _process_log_entry(payload, request)

    if success:
        return (201, FrontendLogSuccessResponse(success=True, message="Log entry received"))
    else:
        return (500, FrontendLogErrorResponse(success=False, error="Failed to process log entry"))


@core_router.get("/health-check/", auth=None)
def health_check(request: HttpRequest) -> dict[str, str]:
    """
    General health check endpoint for Docker orchestration.

    This lightweight endpoint confirms the Django application is running
    and responsive. Infrastructure dependencies (PostgreSQL, Redis) are
    validated independently by Docker Compose health checks.

    Args:
        request: HTTP request object

    Returns:
        Status response indicating the application is healthy
    """
    return {"status": "healthy"}


@core_router.get("/logs/health/", auth=None, response=LogHealthCheckResponse)
def log_health_check(request: HttpRequest) -> LogHealthCheckResponse:
    """
    Health check endpoint for the logging system.

    This endpoint verifies that the logging system is working correctly
    and can receive frontend logs.

    Args:
        request: HTTP request object

    Returns:
        Health status response with correlation ID and timestamp

    Raises:
        HttpError: 500 if logging system is unhealthy
    """
    try:
        # Test that we can write to the logs
        test_correlation_id = get_correlation_id(request)

        frontend_logger.info(
            "Logging health check requested",
            extra={
                "correlation_id": test_correlation_id,
                "health_check": True,
            },
        )

        return LogHealthCheckResponse(
            status="healthy",
            service="logging",
            correlation_id=test_correlation_id,
            timestamp=timezone.now().isoformat(),
        )

    except Exception as e:
        app_logger.error(f"Logging health check failed: {e!s}")
        raise HttpError(
            500,
            "Logging system unhealthy",
        ) from e


# Helper functions (migrated from DRF view)


def _validate_log_entry(data: FrontendLogEntrySchema) -> str | None:
    """
    Validate the log entry data.

    Args:
        data: Frontend log entry schema

    Returns:
        Error message if validation fails, None if valid
    """
    # Validate log level
    valid_levels = ["DEBUG", "INFO", "WARNING", "WARN", "ERROR", "CRITICAL"]
    if data.level.upper() not in valid_levels:
        levels_str = ", ".join(valid_levels)
        return f"Invalid log level: {data.level}. Must be one of: {levels_str}"

    # Validate timestamp format
    try:
        datetime.fromisoformat(data.timestamp.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return "Invalid timestamp format. Expected ISO format."

    return None


def _process_log_entry(data: FrontendLogEntrySchema, request: HttpRequest) -> bool:
    """
    Process the frontend log entry.

    Args:
        data: Frontend log entry schema
        request: HTTP request object

    Returns:
        True if processed successfully, False otherwise
    """
    try:
        # Normalize log level for Python logging
        level_mapping = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "WARN": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL,
        }

        log_level = level_mapping.get(data.level.upper(), logging.INFO)

        # Prepare the log message with truncation to prevent flooding
        max_message_length = getattr(settings, "FRONTEND_LOG_MAX_MESSAGE_LENGTH", 1000)
        raw_message = data.message
        if len(raw_message) > max_message_length:
            truncated_message = raw_message[:max_message_length] + "…[truncated]"
        else:
            truncated_message = raw_message
        message = f"[FRONTEND] {truncated_message}"

        # Prepare extra data for structured logging
        correlation_id = data.correlation_id or get_correlation_id(request)
        extra_data: dict[str, object] = {
            "frontend_log": True,
            "correlation_id": correlation_id,
            "frontend_timestamp": data.timestamp,
            "user_agent": data.user_agent or "",
            "frontend_url": data.url or "",
            "frontend_user_id": data.user_id,
            "frontend_session_id": data.session_id or "",
            "source": data.source or "frontend",
            "environment": data.environment or "unknown",
        }

        # Add browser info if provided
        if data.browser_info:
            extra_data["browser_info"] = data.browser_info  # type: ignore[assignment]

        # Add user interactions if provided (for debugging context)
        if data.recent_interactions:
            extra_data["recent_interactions"] = data.recent_interactions  # type: ignore[assignment]

        # Add any additional data provided
        if data.data:
            extra_data["frontend_data"] = data.data  # type: ignore[assignment]

        # Log to the frontend logger with appropriate level
        frontend_logger.log(log_level, message, extra=extra_data)

        # For critical errors, also log to the main app logger
        if log_level >= logging.ERROR:
            critical_msg = f"Critical frontend error: {message}"
            app_logger.log(log_level, critical_msg, extra=extra_data)

        return True

    except Exception as e:
        error_msg = f"Failed to process frontend log entry: {e!s}"
        app_logger.error(
            error_msg,
            extra={
                "correlation_id": get_correlation_id(request),
                "original_data": data.dict(),
            },
        )
        return False


__all__ = ["core_router"]
