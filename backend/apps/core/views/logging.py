"""
Logging API views for receiving frontend logs.

This module provides API endpoints for the frontend to send log entries
to the backend for centralized logging and monitoring.
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

# Import our correlation utility
from middleware.logging import get_correlation_id

# Get the logger instance
frontend_logger = logging.getLogger('frontend')
app_logger = logging.getLogger('app')


@method_decorator(csrf_exempt, name='dispatch')
class FrontendLogAPIView(APIView):
    """
    API endpoint for receiving frontend log entries.

    This endpoint allows the frontend to send log entries to the backend
    for centralized logging, monitoring, and debugging.

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

    def post(self, request):
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

        except (json.JSONDecodeError, ValueError) as e:
            # Handle JSON parsing errors
            if "JSON" in str(e) or "Expecting value" in str(e):
                return Response(
                    {"error": "Invalid JSON payload", "success": False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # Re-raise if it's not a JSON error
                raise
        except Exception as e:
            # Handle DRF ParseError and other parsing/validation exceptions
            if "JSON parse error" in str(e) or "ParseError" in str(type(e).__name__):
                return Response(
                    {"error": "Invalid JSON payload", "success": False},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Log the error but don't expose internal details
            # Try to get request data safely
            try:
                request_data = str(request.data)[:1000] if hasattr(request, 'data') else 'N/A'
            except Exception:
                request_data = 'Unable to access request data'
            app_logger.error(f"Frontend log API error: {str(e)}", extra={
                'correlation_id': get_correlation_id(request),
                'request_data': request_data
            })

            return Response(
                {"error": "Internal server error", "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _parse_request_data(self, request) -> Dict[str, Any]:
        """Parse and return the request data."""
        if hasattr(request, 'data') and request.data:
            return request.data
        elif request.body:
            return json.loads(request.body)
        else:
            return {}

    def _validate_log_entry(self, data: Dict[str, Any]) -> str | None:
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
        if data['level'].upper() not in valid_levels:
            levels_str = ', '.join(valid_levels)
            return f"Invalid log level: {data['level']}. Must be one of: {levels_str}"

        # Validate timestamp format
        try:
            datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return "Invalid timestamp format. Expected ISO format."

        return None

    def _process_log_entry(self, data: Dict[str, Any], request) -> bool:
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

            log_level = level_mapping.get(data['level'].upper(), logging.INFO)

            # Prepare the log message
            message = f"[FRONTEND] {data['message']}"

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

    def get(self, request):
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
                "timestamp": datetime.now().isoformat()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            app_logger.error(f"Logging health check failed: {str(e)}")
            return Response({
                "status": "unhealthy",
                "service": "logging",
                "error": "Failed to write test log entry"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
