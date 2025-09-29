"""
Logging API views for receiving frontend logs.

This module provides API endpoints for the frontend to send log entries
to the backend for centralized logging and monitoring.
"""

import json
import logging

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ParseError
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

# Import our correlation utility
from middleware.logging import get_correlation_id
# Import shared types
# from shared import ApiResponse  # Unused import

# Get the logger instance
frontend_logger = logging.getLogger('frontend')
app_logger = logging.getLogger('app')


@method_decorator(csrf_exempt, name='dispatch')
class FrontendLogAPIView(APIView):
    """
    API endpoint for receiving frontend log entries.

    This endpoint allows the frontend to send log entries to the backend
    for centralized logging, monitoring, and debugging.

    Security:
    - Rate limited via ScopedRateThrottle (scope: 'frontend_logs')
    - Payload size limited to prevent abuse
    - Available to anonymous users but throttled aggressively

    Expected payload:
    {
        "level": "ERROR",
        "message": "Error message",
        "timestamp": "2025-09-23T15:35:36Z",
        "data": {...},  // Optional additional data
        "correlationId": "uuid-string",  // Optional
        "userAgent": "Mozilla/...",
        "url": "https://...",
        "userId": 123,  // Optional
        "sessionId": "session-id",
        "source": "frontend",
        "environment": "development",
        "browserInfo": {...},  // Optional browser context
        "recentInteractions": [...]  // Optional user interactions
    }
    """

    permission_classes = [AllowAny]  # Allow both authenticated and anonymous users
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'frontend_logs'

    def post(self, request: Request) -> Response:
        # Check payload size to prevent abuse
        MAX_PAYLOAD_SIZE = getattr(settings, 'FRONTEND_LOG_MAX_PAYLOAD_SIZE', 50 * 1024)  # 50KB
        payload_size = len(request.body) if request.body else 0
        if payload_size > MAX_PAYLOAD_SIZE:
            app_logger.warning("Frontend log payload too large", extra={
                'correlation_id': get_correlation_id(request),
                'payload_size': payload_size,
                'max_allowed': MAX_PAYLOAD_SIZE
            })
            return Response(
                {"error": "Payload too large", "success": False, "max_size_bytes": MAX_PAYLOAD_SIZE},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            )

        try:
            # Parse the request data
            data = self._parse_request_data(request)

            # Validate required fields
            validation_error = self._validate_log_entry(data)
            if validation_error:
                return Response(
                    {"error": validation_error, "success": False},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process the log entry
            success = self._process_log_entry(data, request)

            if success:
                return Response(
                    {"success": True, "message": "Log entry received"},
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"error": "Failed to process log entry", "success": False},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except ParseError as e:
            # Handle DRF ParseError for invalid JSON/data
            app_logger.warning("Frontend log API received invalid JSON", extra={
                'correlation_id': get_correlation_id(request),
                'error': str(e)
            })
            return Response(
                {"error": "Invalid JSON payload", "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )
        except json.JSONDecodeError as e:
            # Handle JSON parsing errors
            app_logger.warning("Frontend log API received malformed JSON", extra={
                'correlation_id': get_correlation_id(request),
                'error': str(e)
            })
            return Response(
                {"error": "Invalid JSON payload", "success": False},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Log the error but don't expose internal details
            # Try to get request data safely
            try:
                request_data = str(request.data)[:1000] if hasattr(request, 'data') else 'N/A'
            except Exception:
                request_data = 'Unable to access request data'
            app_logger.error(f"Frontend log API error: {str(e)}", extra={
                'correlation_id': get_correlation_id(request),
                'request_data': request_data,
                'exception_type': type(e).__name__
            })

            return Response(
                {"error": "Internal server error", "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _parse_request_data(self, request: Request) -> dict[str, object]:
        """Parse and return the request data."""
        if hasattr(request, 'data') and request.data:
            return request.data
        elif request.body:
            return json.loads(request.body)
        else:
            return {}

    def _validate_log_entry(self, data: dict[str, object]) -> str | None:
        """
        Validate the log entry data.

        Returns:
            str | None: Error message if validation fails, None if valid
        """
        required_fields = ['level', 'message', 'timestamp']

        for field in required_fields:
            if field not in data or not data[field]:
                return f"Missing required field: {field}"

        # Validate log level
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'WARN', 'ERROR', 'CRITICAL']
        level = data.get('level')
        if not isinstance(level, str) or level.upper() not in valid_levels:
            levels_str = ', '.join(valid_levels)
            return f"Invalid log level: {level}. Must be one of: {levels_str}"

        # Validate timestamp format
        try:
            timestamp = data.get('timestamp')
            if isinstance(timestamp, str):
                datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                raise ValueError('Timestamp must be a string')
        except (ValueError, AttributeError):
            return "Invalid timestamp format. Expected ISO format."

        return None

    def _process_log_entry(self, data: dict[str, object], request: Request) -> bool:
        """
        Process the frontend log entry.

        Returns:
            bool: True if processed successfully, False otherwise
        """
        try:
            # Normalize log level for Python logging
            level_mapping = {
                'DEBUG': logging.DEBUG,
                'INFO': logging.INFO,
                'WARNING': logging.WARNING,
                'WARN': logging.WARNING,
                'ERROR': logging.ERROR,
                'CRITICAL': logging.CRITICAL
            }

            level_str = data.get('level', 'INFO')
            if isinstance(level_str, str):
                log_level = level_mapping.get(level_str.upper(), logging.INFO)
            else:
                log_level = logging.INFO

            # Prepare the log message with truncation to prevent flooding
            MAX_MESSAGE_LENGTH = getattr(settings, 'FRONTEND_LOG_MAX_MESSAGE_LENGTH', 1000)
            raw_message = str(data['message']) if data['message'] is not None else ''
            if len(raw_message) > MAX_MESSAGE_LENGTH:
                truncated_message = raw_message[:MAX_MESSAGE_LENGTH] + "…[truncated]"
            else:
                truncated_message = raw_message
            message = f"[FRONTEND] {truncated_message}"

            # Prepare extra data for structured logging
            correlation_id = (data.get('correlationId') or
                              get_correlation_id(request))
            extra_data = {
                'frontend_log': True,
                'correlation_id': correlation_id,
                'frontend_timestamp': data['timestamp'],
                'user_agent': data.get('userAgent', ''),
                'frontend_url': data.get('url', ''),
                'frontend_user_id': data.get('userId'),
                'frontend_session_id': data.get('sessionId', ''),
                'source': data.get('source', 'frontend'),
                'environment': data.get('environment', 'unknown'),
            }

            # Add browser info if provided
            if 'browserInfo' in data:
                extra_data['browser_info'] = data['browserInfo']

            # Add user interactions if provided (for debugging context)
            if 'recentInteractions' in data:
                extra_data['recent_interactions'] = data['recentInteractions']

            # Add any additional data provided
            if 'data' in data and data['data']:
                extra_data['frontend_data'] = data['data']

            # Log to the frontend logger with appropriate level
            frontend_logger.log(log_level, message, extra=extra_data)

            # For critical errors, also log to the main app logger
            if log_level >= logging.ERROR:
                critical_msg = f"Critical frontend error: {message}"
                app_logger.log(log_level, critical_msg, extra=extra_data)

            return True

        except Exception as e:
            error_msg = f"Failed to process frontend log entry: {str(e)}"
            app_logger.error(error_msg, extra={
                'correlation_id': get_correlation_id(request),
                'original_data': data
            })
            return False


class LogHealthCheckView(APIView):
    """
    Health check endpoint for the logging system.

    This endpoint can be used to verify that the logging system is working
    correctly and can receive frontend logs.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        """Return logging system health status."""
        try:
            # Test that we can write to the logs
            test_correlation_id = get_correlation_id(request)

            frontend_logger.info("Logging health check requested", extra={
                'correlation_id': test_correlation_id,
                'health_check': True
            })

            return Response({
                "status": "healthy",
                "service": "logging",
                "correlation_id": test_correlation_id,
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            app_logger.error(f"Logging health check failed: {str(e)}")
            return Response({
                "status": "unhealthy",
                "service": "logging",
                "error": "Failed to write test log entry"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
