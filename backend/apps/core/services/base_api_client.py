"""Base API Client for consistent HTTP request handling.

This module provides a reusable base class for HTTP API clients with
standardized logging, error handling, timing, correlation IDs, and
response processing across the application.
"""

from __future__ import annotations

import logging
import re
import time
import uuid
from abc import ABC, abstractmethod

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .api_response import ApiResponse

_API_KEY_IN_QUERY = re.compile(r"(api_key=)[^&\s'\"()]+")


def redact_api_keys(text: str) -> str:
    """Mask API keys in request URLs quoted by exception messages."""
    return _API_KEY_IN_QUERY.sub(r"\1[REDACTED]", text)


class BaseApiClient(ABC):
    """Abstract base class for HTTP API clients.

    Provides common functionality for HTTP requests including:
    - Correlation ID generation and tracking
    - Request/response logging with timing
    - Standardized error handling and classification
    - Response wrapper with consistent interface
    - Configurable timeouts and retry logic
    """

    def __init__(
        self,
        base_url: str,
        logger_name: str | None = None,
        timeout: int = 30,
        max_retries: int = 0,
    ) -> None:
        """Initialize the base API client.

        Args:
            base_url: Base URL for API endpoints
            logger_name: Name for the logger (defaults to class name)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

        # Set up logging
        if logger_name:
            self.logger = logging.getLogger(logger_name)
        else:
            self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

        # Set up session with retry logic if max_retries > 0
        self.session = requests.Session()
        if max_retries > 0:
            retry_strategy = Retry(
                total=max_retries,
                backoff_factor=1,  # Wait 1s, 2s, 4s, 8s between retries
                status_forcelist=[429, 500, 502, 503, 504],  # Retry on these status codes
                allowed_methods=["HEAD", "GET", "OPTIONS"],  # Safe methods only
            )
            adapter = HTTPAdapter(max_retries=retry_strategy)
            self.session.mount("https://", adapter)
            self.session.mount("http://", adapter)

    def generate_correlation_id(self) -> str:
        """Generate a unique correlation ID for request tracking."""
        return str(uuid.uuid4())

    def build_url(self, endpoint: str) -> str:
        """Build the full URL from base URL and endpoint."""
        endpoint = endpoint.lstrip("/")
        return f"{self.base_url}/{endpoint}"

    @abstractmethod
    def prepare_headers(self, headers: dict[str, str] | None = None) -> dict[str, str]:
        """Prepare headers for the request.

        Subclasses should implement this to add authentication, API keys, etc.

        Args:
            headers: Additional headers to include

        Returns:
            Complete headers dictionary for the request
        """

    @abstractmethod
    def get_sanitized_params(self, params: dict[str, object] | None = None) -> dict[str, object]:
        """Get sanitized parameters for logging (remove sensitive data).

        Args:
            params: Original parameters dictionary

        Returns:
            Sanitized parameters safe for logging
        """

    def classify_error(self, status_code: int) -> str:
        """Classify error based on HTTP status code.

        Args:
            status_code: HTTP status code

        Returns:
            Error category string
        """
        if status_code >= 500:
            return "server_error"
        if status_code == 429:
            return "rate_limit"
        if status_code >= 400:
            return "client_error"
        return "unknown"

    @staticmethod
    def _safe_headers_dict(response: requests.Response) -> dict[str, str]:
        """Safely extract headers as a dictionary from a response object.

        Handles both real Response objects and mock objects in tests,
        returning an empty dict if headers cannot be extracted.

        Args:
            response: Requests response object (or mock)

        Returns:
            Headers as a dictionary, or empty dict if extraction fails
        """
        try:
            if hasattr(response.headers, "items"):
                return dict(response.headers)
            return {}
        except (TypeError, AttributeError):
            # Handle Mock objects or other non-dict-like headers
            return {}

    def get_error_details(self, status_code: int) -> str:
        """Get human-readable error details for status code.

        Subclasses can override for API-specific error messages.

        Args:
            status_code: HTTP status code

        Returns:
            Human-readable error description
        """
        error_details = {
            400: "Bad Request - The request was invalid or malformed",
            401: "Unauthorized - Invalid or missing authentication",
            403: "Forbidden - Access denied to the requested resource",
            404: "Not Found - The requested resource does not exist",
            422: "Unprocessable Entity - Request data validation failed",
            429: "Rate Limited - Too many requests, please retry later",
            500: "Internal Server Error - API server error",
            502: "Bad Gateway - API gateway error",
            503: "Service Unavailable - API temporarily unavailable",
            504: "Gateway Timeout - API request timed out",
        }

        return error_details.get(status_code, f"HTTP {status_code} - Unexpected response from API")

    def process_successful_response(
        self, response: requests.Response, correlation_id: str, endpoint: str, duration_ms: int
    ) -> ApiResponse:
        """Process a successful HTTP response.

        Args:
            response: Requests response object
            correlation_id: Correlation ID for this request
            endpoint: API endpoint that was called
            duration_ms: Request duration in milliseconds

        Returns:
            ApiResponse object with parsed data
        """
        try:
            data = response.json()
        except ValueError as json_error:
            # Handle invalid JSON responses
            error_message = f"Invalid JSON in response: {json_error}"

            self.logger.error(
                "API returned invalid JSON | error_type=%s",
                type(json_error).__name__,
                extra={
                    "correlation_id": correlation_id,
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "error_type": "json_parsing_error",
                    "response_size_bytes": len(response.content)
                    if hasattr(response.content, "__len__")
                    else 0,
                    "exception_type": type(json_error).__name__,
                },
            )

            return ApiResponse(
                status_code=500,  # Treat as server error
                error_message=error_message,
                error_details="The API returned an invalid JSON response",
                error_category="json_parsing_error",
                correlation_id=correlation_id,
                endpoint=endpoint,
                duration_ms=duration_ms,
                headers=self._safe_headers_dict(response),
                raw_response=response,
            )

        # Log successful response
        self.logger.info(
            "API request successful",
            extra={
                "correlation_id": correlation_id,
                "endpoint": endpoint,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "response_size_bytes": (
                    len(response.content) if hasattr(response.content, "__len__") else 0
                ),
            },
        )

        return ApiResponse(
            status_code=response.status_code,
            data=data,
            headers=self._safe_headers_dict(response),
            correlation_id=correlation_id,
            endpoint=endpoint,
            method="GET",  # Default, subclasses can override
            duration_ms=duration_ms,
            raw_response=response,
        )

    def process_error_response(
        self, response: requests.Response, correlation_id: str, endpoint: str, duration_ms: int
    ) -> ApiResponse:
        """Process an error HTTP response.

        Args:
            response: Requests response object with error status
            correlation_id: Correlation ID for this request
            endpoint: API endpoint that was called
            duration_ms: Request duration in milliseconds

        Returns:
            ApiResponse object with error information
        """
        error_category = self.classify_error(response.status_code)
        error_details = self.get_error_details(response.status_code)
        error_message = f"API request failed with status {response.status_code}"

        # Log error with appropriate level based on status code
        log_data = {
            "correlation_id": correlation_id,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "error_category": error_category,
            "response_size_bytes": (
                len(response.content) if hasattr(response.content, "__len__") else 0
            ),
            "error_response": (
                str(response.text)[:500]
                if hasattr(response.text, "__getitem__")
                else str(response.text)
            ),
        }

        if response.status_code >= 500:
            self.logger.error("API server error", extra=log_data)
        elif response.status_code == 429:
            self.logger.warning("API rate limit exceeded", extra=log_data)
        elif response.status_code >= 400:
            self.logger.warning("API client error", extra=log_data)
        else:
            self.logger.warning("API request failed", extra=log_data)

        return ApiResponse(
            status_code=response.status_code,
            error_message=error_message,
            error_details=error_details,
            error_category=error_category,
            correlation_id=correlation_id,
            endpoint=endpoint,
            method="GET",  # Default, subclasses can override
            duration_ms=duration_ms,
            headers=self._safe_headers_dict(response),
            raw_response=response,
        )

    def handle_request_exception(
        self,
        error: Exception,
        correlation_id: str,
        endpoint: str,
        duration_ms: int,
        url: str,
        params: dict[str, object] | None = None,
    ) -> ApiResponse:
        """Handle request exceptions (network errors, timeouts, etc.).

        The exception text can quote the request URL, query string included, so it
        goes only to the log, with API keys redacted. The response carries a fixed
        message and a gateway status: 504 for a timeout, 502 for any other failure.

        Args:
            error: The exception that occurred
            correlation_id: Correlation ID for this request
            endpoint: API endpoint that was called
            duration_ms: Request duration in milliseconds
            url: Full URL that was requested
            params: Request parameters (will be sanitized for logging)

        Returns:
            ApiResponse object with error information
        """
        sanitized_params = self.get_sanitized_params(params)

        # Add performance warning for slow exceptions (>1000ms)
        if duration_ms > 1000:
            self.logger.warning(
                "API request exception slow performance",
                extra={
                    "correlation_id": correlation_id,
                    "endpoint": endpoint,
                    "duration_ms": duration_ms,
                    "performance_warning": True,
                    "threshold_exceeded": "1000ms",
                    "performance_ratio": round(duration_ms / 1000.0, 2),
                    "slow_exception_impact": (
                        "Exception handling time exceeds performance threshold"
                    ),
                    "error_type": type(error).__name__,
                },
            )

        if isinstance(error, requests.exceptions.Timeout):
            self.logger.error(
                "API request timeout",
                extra={
                    "correlation_id": correlation_id,
                    "endpoint": endpoint,
                    "duration_ms": duration_ms,
                    "error_type": "timeout_error",
                    "error_category": "network_error",
                    "timeout_error": redact_api_keys(str(error)),
                    "url": url,
                    "params": sanitized_params,
                    "timeout_threshold_exceeded": duration_ms > 30000,
                },
            )

            return ApiResponse(
                status_code=504,
                error_message="API request timed out",
                error_details=(
                    "The request timed out. This may indicate network issues or high API load."
                ),
                error_category="network_error",
                correlation_id=correlation_id,
                endpoint=endpoint,
                duration_ms=duration_ms,
            )

        if isinstance(error, requests.exceptions.ConnectionError):
            self.logger.error(
                "API connection error",
                extra={
                    "correlation_id": correlation_id,
                    "endpoint": endpoint,
                    "duration_ms": duration_ms,
                    "error_type": "connection_error",
                    "error_category": "network_error",
                    "connection_error": redact_api_keys(str(error)),
                    "url": url,
                    "base_url": self.base_url,
                    "params": sanitized_params,
                    "network_diagnostic": "Unable to establish connection to API",
                },
            )

            return ApiResponse(
                status_code=502,
                error_message="API connection failed",
                error_details=(
                    "Unable to connect to API. This may indicate network "
                    "connectivity issues or service outage."
                ),
                error_category="network_error",
                correlation_id=correlation_id,
                endpoint=endpoint,
                duration_ms=duration_ms,
            )

        # Generic request exception
        self.logger.error(
            "API request exception",
            extra={
                "correlation_id": correlation_id,
                "endpoint": endpoint,
                "duration_ms": duration_ms,
                "error_type": type(error).__name__,
                "error_category": "request_error",
                "request_error": redact_api_keys(str(error)),
                "url": url,
                "params": sanitized_params,
                "exception_module": type(error).__module__,
                "is_critical": True,
            },
        )

        return ApiResponse(
            status_code=502,
            error_message="API request failed",
            error_details=f"Unexpected error during API request: {type(error).__name__}",
            error_category="request_error",
            correlation_id=correlation_id,
            endpoint=endpoint,
            duration_ms=duration_ms,
        )

    def get(
        self,
        endpoint: str,
        params: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        **kwargs: object,
    ) -> ApiResponse:
        """Make a GET request to the API.

        Args:
            endpoint: API endpoint (relative to base_url)
            params: Query parameters
            headers: Additional headers
            **kwargs: Additional arguments passed to requests.get

        Returns:
            ApiResponse object with response data or error information
        """
        correlation_id = self.generate_correlation_id()
        url = self.build_url(endpoint)

        # Prepare headers and parameters
        prepared_headers = self.prepare_headers(headers)
        sanitized_params = self.get_sanitized_params(params)

        # Log request start
        self.logger.info(
            "API request started",
            extra={
                "correlation_id": correlation_id,
                "endpoint": endpoint,
                "method": "GET",
                "url": url,
                "params": sanitized_params,
                "param_count": len(sanitized_params) if sanitized_params else 0,
            },
        )

        # DEBUG-level: Log full request parameters for debugging
        if self.logger.isEnabledFor(logging.DEBUG) and params:
            self.logger.debug(f"API request params: {sanitized_params}")

        start_time = time.time()

        try:
            # Filter out None values; requests library handles native types correctly
            request_params = {}
            if params:
                for key, value in params.items():
                    if value is not None:
                        request_params[key] = value

            response = self.session.get(
                url,
                params=request_params or None,  # type: ignore[arg-type]
                headers=prepared_headers,
                timeout=self.timeout,
                # Note: **kwargs ignored to avoid type errors - requests has
                # very specific parameter types
            )
            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code == 200:
                return self.process_successful_response(
                    response, correlation_id, endpoint, duration_ms
                )
            return self.process_error_response(response, correlation_id, endpoint, duration_ms)

        except requests.exceptions.RequestException as error:
            duration_ms = int((time.time() - start_time) * 1000)
            return self.handle_request_exception(
                error, correlation_id, endpoint, duration_ms, url, params
            )
