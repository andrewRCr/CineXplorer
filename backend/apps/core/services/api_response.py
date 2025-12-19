"""
API Response wrapper for consistent handling of HTTP responses.

This module provides a standardized way to handle API responses across
all HTTP clients in the application, ensuring consistent access to
response data, status codes, headers, timing, and error information.
"""

from __future__ import annotations

import contextlib
import json
import logging
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Shared mapping of standard rate limit headers to normalized keys
# Used by both ApiResponse and API clients for consistent rate limit handling
RATE_LIMIT_HEADER_MAPPING: dict[str, str] = {
    'x-ratelimit-limit': 'limit',
    'x-ratelimit-remaining': 'remaining',
    'x-ratelimit-reset': 'reset',
    'retry-after': 'retry_after'
}


@dataclass
class ApiResponse:
    """
    Standardized wrapper for HTTP API responses.

    Provides consistent access to response data, metadata, timing,
    and error information regardless of the underlying HTTP client.
    """

    # Core response data
    status_code: int
    data: Mapping[str, object] | Sequence[object] | str | None = None
    headers: dict[str, str] | None = None

    # Request metadata
    correlation_id: str | None = None
    duration_ms: int | None = None
    endpoint: str | None = None
    method: str = "GET"

    # Error information
    error_message: str | None = None
    error_details: str | None = None
    error_category: str | None = None

    # Raw response (for debugging)
    raw_response: object | None = None

    def is_success(self) -> bool:
        """Check if the response indicates success (2xx status codes)."""
        return 200 <= self.status_code < 300

    def is_client_error(self) -> bool:
        """Check if the response indicates a client error (4xx status codes)."""
        return 400 <= self.status_code < 500

    def is_server_error(self) -> bool:
        """Check if the response indicates a server error (5xx status codes)."""
        return 500 <= self.status_code < 600

    def is_rate_limited(self) -> bool:
        """Check if the response indicates rate limiting."""
        return self.status_code == 429

    def has_data(self) -> bool:
        """Check if the response contains data."""
        return self.data is not None

    def get_json_data(self) -> dict[str, object] | None:
        """
        Get response data as JSON dictionary.
        Returns None if data is not a dictionary.
        """
        if isinstance(self.data, dict):
            return self.data
        return None

    def get_header(self, name: str, default: str | None = None) -> str | None:
        """Get a specific header value, case-insensitive."""
        if not self.headers:
            return default

        # Try exact match first
        if name in self.headers:
            return self.headers[name]

        # Try case-insensitive match
        name_lower = name.lower()
        for header_name, header_value in self.headers.items():
            if header_name.lower() == name_lower:
                return header_value

        return default

    def get_rate_limit_info(self) -> dict[str, object] | None:
        """
        Extract rate limiting information from headers.
        Returns None if no rate limit headers are found.
        """
        if not self.headers:
            return None

        rate_limit_info: dict[str, object] = {}

        for header_name, key in RATE_LIMIT_HEADER_MAPPING.items():
            value = self.get_header(header_name)
            if value is not None:
                # Try to convert numeric values to integers
                if key in ['limit', 'remaining', 'reset', 'retry_after']:
                    try:
                        rate_limit_info[key] = int(value)
                    except ValueError:
                        rate_limit_info[key] = value
                else:
                    rate_limit_info[key] = value

        return rate_limit_info if rate_limit_info else None

    def get_content_info(self) -> dict[str, object]:
        """Get information about the response content."""
        content_info: dict[str, object] = {}

        if self.headers:
            content_info['content_type'] = self.get_header('content-type')
            content_info['content_length'] = self.get_header('content-length')

            # Convert content length to integer if possible
            content_length = content_info['content_length']
            if content_length:
                with contextlib.suppress(ValueError):
                    content_info['content_length'] = int(content_length)

        # Add data size information (in bytes)
        if self.data is not None:
            if isinstance(self.data, str):
                content_info['data_size'] = len(self.data.encode('utf-8'))
            elif isinstance(self.data, (dict, list)):
                try:
                    content_info['data_size'] = len(json.dumps(self.data).encode('utf-8'))
                except (TypeError, ValueError):
                    content_info['data_size'] = None

        return content_info

    def get_error_summary(self) -> dict[str, object] | None:
        """
        Get a comprehensive error summary if the response indicates an error.
        Returns None for successful responses.
        """
        if self.is_success():
            return None

        error_summary: dict[str, object] = {
            'status_code': self.status_code,
            'error_message': self.error_message,
            'error_details': self.error_details,
            'error_category': self.error_category,
            'correlation_id': self.correlation_id,
            'endpoint': self.endpoint,
            'method': self.method,
            'duration_ms': self.duration_ms
        }

        # Add rate limit info for rate limit errors or any response with Retry-After
        # Some backends use 503/529 with Retry-After for throttling instead of 429
        if self.is_rate_limited() or self.get_header('retry-after') is not None:
            rate_limit_info = self.get_rate_limit_info()
            if rate_limit_info:
                error_summary['rate_limit_info'] = rate_limit_info

        # Remove None values for cleaner output
        return {k: v for k, v in error_summary.items() if v is not None}

    def to_legacy_dict(self) -> dict[str, object]:
        """
        Convert to legacy dictionary format for backward compatibility.
        This matches the current error format used in movie_service.py.
        """
        if self.is_success():
            # For successful responses, return the data directly
            if self.data is not None and isinstance(self.data, dict):
                return self.data
            return {}

        # For errors, return the legacy error format
        error_dict: dict[str, object] = {
            "error": self.error_message or f"Request failed with status {self.status_code}",
            "status": self.status_code,
            "correlation_id": self.correlation_id
        }

        if self.error_details:
            error_dict["error_details"] = self.error_details

        return error_dict

    def __str__(self) -> str:
        """String representation for logging and debugging."""
        status_desc = "SUCCESS" if self.is_success() else "ERROR"
        return (
            f"ApiResponse({status_desc}, status={self.status_code}, "
            f"correlation_id={self.correlation_id}, duration={self.duration_ms}ms)"
        )
