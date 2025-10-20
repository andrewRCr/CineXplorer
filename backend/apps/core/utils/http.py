"""HTTP utilities for request/response handling.

This module provides helper functions for extracting client information,
building error responses, and other HTTP-related operations used across
the API layer.
"""

from django.conf import settings
from django.http import HttpRequest


def get_client_info(request: HttpRequest) -> tuple[str, str]:
    """Extract client IP and user agent from request for logging.

    Args:
        request: The Django HTTP request object

    Returns:
        Tuple of (client_ip, user_agent) where unknown values default to 'unknown'

    Example:
        >>> client_ip, user_agent = get_client_info(request)
        >>> logger.info(
        ...     "User action",
        ...     extra={"client_ip": client_ip, "user_agent": user_agent}
        ... )
    """
    client_ip = request.META.get("REMOTE_ADDR", "unknown")
    user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
    return client_ip, user_agent


def build_error_response(
    error: str,
    *,
    debug_detail: str | None = None,
) -> dict[str, object]:
    """Build standardized error response with optional DEBUG detail.

    Creates a consistent error response structure that includes debug
    information only when DEBUG mode is enabled.

    Args:
        error: The user-facing error message
        debug_detail: Additional technical detail (only included if DEBUG=True)

    Returns:
        Dictionary with error message and optional debug detail

    Example:
        >>> response = build_error_response(
        ...     "Token has been revoked",
        ...     debug_detail="Token blacklisted at 2025-10-20 14:30:00"
        ... )
        >>> # In production (DEBUG=False): {"error": "Token has been revoked"}
        >>> # In dev (DEBUG=True): {"error": "...", "detail": "Token blacklisted..."}
    """
    error_response: dict[str, object] = {"error": error}
    if settings.DEBUG and debug_detail is not None:
        error_response["detail"] = debug_detail
    return error_response
