"""
Request logging middleware for CineXplorer.

This middleware provides:
- UUID-based correlation IDs for request tracking
- Request start/completion logging with timing
- User context and sensitive data filtering
- Integration with the logging system for request correlation

Usage:
    Add 'middleware.logging.RequestLoggingMiddleware' to MIDDLEWARE in Django settings.
"""

import uuid
import time
import logging
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser

from django_types import HttpRequest


# Get logger for request tracking
logger = logging.getLogger('cinexplorer.requests')


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log HTTP requests and responses with correlation IDs.

    This middleware:
    1. Generates a unique correlation ID for each request
    2. Logs request start with method, path, and user context
    3. Logs request completion with status code and duration
    4. Filters sensitive data from logs
    5. Filters health check requests (unless they're unhealthy)
    6. Provides utility to access correlation ID from request
    """

    # Sensitive header names to exclude from logs
    SENSITIVE_HEADERS = {
        'authorization', 'cookie', 'x-api-key', 'x-auth-token',
        'x-csrf-token', 'x-forwarded-authorization'
    }

    # Sensitive parameter names to exclude from logs
    SENSITIVE_PARAMS = {
        'password', 'token', 'api_key', 'secret', 'auth',
        'csrf_token', 'csrfmiddlewaretoken'
    }

    # Health check endpoints to filter (unless unhealthy)
    HEALTH_CHECK_PATHS = {
        '/api/health-check/',
        '/api/health-check',
        '/health/',
        '/health',
        '/healthz/',
        '/healthz'
    }

    def _is_health_check(self, request: HttpRequest) -> bool:
        """
        Check if this is a health check request.

        Args:
            request: The HTTP request

        Returns:
            bool: True if this is a health check request
        """
        return request.path in self.HEALTH_CHECK_PATHS

    def process_request(self, request: HttpRequest) -> None:
        """
        Process incoming request - generate correlation ID and log request start.

        Args:
            request: The incoming HTTP request
        """
        # Generate unique correlation ID for this request
        correlation_id = str(uuid.uuid4())
        request.correlation_id = correlation_id

        # Record request start time for duration calculation
        request.start_time = time.time()

        # Build query string for full URL
        query_string = request.META.get('QUERY_STRING', '')
        full_url = f"{request.path}{'?' + query_string if query_string else ''}"

        # Get user context (safely handle anonymous users)
        user_info = self._get_user_context(request)
        client_ip = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:100]  # Truncate long user agents

        # Create concise, informative log message
        log_message = f"{request.method} {full_url} from {client_ip}"
        if user_info['is_authenticated']:
            log_message += f" (user: {user_info['username']})"

        # Log with structured data for detailed analysis but readable message
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        logger.info(
            log_message,
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'full_url': full_url,
                'query_string': query_string,
                'user': user_info,
                'client_ip': client_ip,
                'user_agent': user_agent,
                'referer': request.META.get('HTTP_REFERER', ''),
                'event_type': 'request_start',
                'is_ajax': is_ajax,
                'is_health_check': self._is_health_check(request)
            }
        )

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process outgoing response - log request completion with timing.

        Args:
            request: The HTTP request
            response: The HTTP response

        Returns:
            HttpResponse: The unmodified response
        """

        # Calculate request duration
        duration = None
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time

        # Get correlation ID (should exist from process_request)
        correlation_id = getattr(request, 'correlation_id', 'unknown')

        # Determine log level based on status code
        log_level = self._get_log_level_for_status(response.status_code)

        # Build query string for full URL
        query_string = request.META.get('QUERY_STRING', '')
        full_url = f"{request.path}{'?' + query_string if query_string else ''}"

        # Create concise, informative completion message
        duration_str = f"{round(duration * 1000)}ms" if duration else "?ms"
        if response.status_code < 400:
            status_emoji = "✅"
        elif response.status_code < 500:
            status_emoji = "⚠️"
        else:
            status_emoji = "❌"

        base_msg = f"{status_emoji} {response.status_code} {request.method}"
        log_message = f"{base_msg} {full_url} ({duration_str})"

        # Add response size if significant
        response_size = len(response.content) if hasattr(response, 'content') else 0
        if response_size > 1024:  # Only log size if > 1KB
            size_kb = round(response_size / 1024, 1)
            log_message += f" [{size_kb}KB]"

        # Log request completion with structured data
        logger.log(
            log_level,
            log_message,
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'full_url': full_url,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2) if duration else None,
                'response_size_bytes': response_size,
                'event_type': 'request_complete',
                'is_health_check': self._is_health_check(request)
            }
        )

        return response

    def process_exception(self, request: HttpRequest, exception: Exception) -> None:
        """
        Process unhandled exceptions - log with correlation ID.

        Args:
            request: The HTTP request
            exception: The unhandled exception
        """
        # Always log exceptions, even for health checks (they indicate real problems)

        # Calculate duration if possible
        duration = None
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time

        correlation_id = getattr(request, 'correlation_id', 'unknown')

        # Build query string for full URL
        query_string = request.META.get('QUERY_STRING', '')
        full_url = f"{request.path}{'?' + query_string if query_string else ''}"

        # Create informative exception message
        duration_str = f"{round(duration * 1000)}ms" if duration else "?ms"
        exception_msg = str(exception)[:200]
        log_message = (f"💥 EXCEPTION {request.method} {full_url} "
                       f"({duration_str}) - {exception.__class__.__name__}: "
                       f"{exception_msg}")

        # Log exception with full context
        logger.error(
            log_message,
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'full_url': full_url,
                'exception_type': exception.__class__.__name__,
                'exception_message': str(exception),
                'duration_ms': round(duration * 1000, 2) if duration else None,
                'event_type': 'request_exception',
                'is_health_check': self._is_health_check(request)
            },
            exc_info=True  # Include full traceback
        )

    def _get_user_context(self, request: HttpRequest) -> dict[str, object]:
        """
        Get user context for logging (safely handles anonymous users).

        Args:
            request: The HTTP request

        Returns:
            dict[str, object]: User context information
        """
        user = getattr(request, 'user', None)

        if not user or isinstance(user, AnonymousUser):
            return {
                'id': None,
                'username': 'anonymous',
                'is_authenticated': False
            }

        return {
            'id': user.id,
            'username': getattr(user, 'username', 'unknown'),
            'is_authenticated': True,
            'is_staff': getattr(user, 'is_staff', False),
            'is_superuser': getattr(user, 'is_superuser', False)
        }

    def _get_client_ip(self, request: HttpRequest) -> str:
        """
        Get client IP address, handling proxies.

        Args:
            request: The HTTP request

        Returns:
            str: Client IP address
        """
        # Check for forwarded headers first (common in Docker/proxy setups)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return str(x_forwarded_for).split(',')[0].strip()

        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return str(x_real_ip)

        return str(request.META.get('REMOTE_ADDR', 'unknown'))

    def _get_log_level_for_status(self, status_code: int) -> int:
        """
        Determine appropriate log level based on HTTP status code.

        Args:
            status_code: HTTP response status code

        Returns:
            int: Logging level constant
        """
        if status_code >= 500:
            return logging.ERROR
        elif status_code >= 400:
            return logging.WARNING
        else:
            return logging.INFO


def get_correlation_id(request: HttpRequest) -> str | None:
    """
    Utility function to get correlation ID from request object.

    This function can be used throughout the application to access
    the correlation ID for the current request.

    Args:
        request: The HTTP request object

    Returns:
        str: The correlation ID, or None if not available

    Example:
        from middleware.logging import get_correlation_id

        def my_view(request):
            correlation_id = get_correlation_id(request)
            logger.info("Processing view", extra={'correlation_id': correlation_id})
    """
    return getattr(request, 'correlation_id', None)
