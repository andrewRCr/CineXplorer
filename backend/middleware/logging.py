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
from typing import Optional
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser


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
    5. Provides utility to access correlation ID from request
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
        
        # Get user context (safely handle anonymous users)
        user_info = self._get_user_context(request)
        
        # Get filtered request info
        request_info = self._get_filtered_request_info(request)
        
        # Log request start
        logger.info(
            "Request started",
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'query_string': request.META.get('QUERY_STRING', ''),
                'user': user_info,
                'remote_addr': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'content_type': request.META.get('CONTENT_TYPE', ''),
                'filtered_headers': request_info['headers'],
                'event_type': 'request_start'
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
        
        # Get response info
        response_info = self._get_filtered_response_info(response)
        
        # Determine log level based on status code
        log_level = self._get_log_level_for_status(response.status_code)
        
        # Log request completion
        logger.log(
            log_level,
            "Request completed",
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2) if duration else None,
                'response_size': len(response.content) if hasattr(response, 'content') else None,
                'filtered_response_headers': response_info['headers'],
                'event_type': 'request_complete'
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
        # Calculate duration if possible
        duration = None
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
        
        correlation_id = getattr(request, 'correlation_id', 'unknown')
        
        # Log exception with full context
        logger.error(
            f"Request failed with exception: {exception.__class__.__name__}",
            extra={
                'correlation_id': correlation_id,
                'method': request.method,
                'path': request.path,
                'exception_type': exception.__class__.__name__,
                'exception_message': str(exception),
                'duration_ms': round(duration * 1000, 2) if duration else None,
                'event_type': 'request_exception'
            },
            exc_info=True  # Include full traceback
        )
    
    def _get_user_context(self, request: HttpRequest) -> dict:
        """
        Get user context for logging (safely handles anonymous users).
        
        Args:
            request: The HTTP request
            
        Returns:
            dict: User context information
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
            return x_forwarded_for.split(',')[0].strip()
        
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip
        
        return request.META.get('REMOTE_ADDR', 'unknown')
    
    def _get_filtered_request_info(self, request: HttpRequest) -> dict:
        """
        Get filtered request information, excluding sensitive data.
        
        Args:
            request: The HTTP request
            
        Returns:
            dict: Filtered request information
        """
        # Filter headers
        filtered_headers = {}
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].lower().replace('_', '-')
                if header_name not in self.SENSITIVE_HEADERS:
                    filtered_headers[header_name] = value
                else:
                    filtered_headers[header_name] = '[FILTERED]'
        
        return {
            'headers': filtered_headers
        }
    
    def _get_filtered_response_info(self, response: HttpResponse) -> dict:
        """
        Get filtered response information.
        
        Args:
            response: The HTTP response
            
        Returns:
            dict: Filtered response information
        """
        # Response headers are generally safe to log, but filter auth headers
        filtered_headers = {}
        
        # Django responses use different header access
        if hasattr(response, 'headers'):
            for key, value in response.headers.items():
                key_lower = key.lower()
                if 'auth' in key_lower or 'token' in key_lower:
                    filtered_headers[key] = '[FILTERED]'
                else:
                    filtered_headers[key] = value
        
        return {
            'headers': filtered_headers
        }
    
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


def get_correlation_id(request: HttpRequest) -> Optional[str]:
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
