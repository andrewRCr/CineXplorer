"""
Tests for the frontend logging API endpoint.

This module tests the API endpoints that receive frontend log entries
and process them for centralized logging.
"""

import json
import logging
from datetime import UTC, datetime
from unittest.mock import patch

from django.test import Client, TestCase


class FrontendLogAPITest(TestCase):
    """Test cases for the frontend logging API endpoint."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = Client()
        self.api_url = '/api/core/logs/'
        self.health_url = '/api/core/logs/health/'

    def test_valid_log_entry(self):
        """Test that a valid log entry is processed successfully."""
        log_data = {
            'level': 'ERROR',
            'message': 'Test frontend error',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
            'url': 'https://example.com/test',
            'userAgent': 'Mozilla/5.0 Test Browser',
            'sessionId': 'test-session-123',
            'source': 'frontend',
            'environment': 'test'
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertTrue(response_data['success'])
        self.assertEqual(response_data['message'], 'Log entry received')

    def test_missing_required_fields(self):
        """Test that missing required fields return validation error."""
        log_data = {
            'level': 'ERROR',
            # missing 'message' and 'timestamp'
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('Missing required field', response_data['error'])

    def test_invalid_log_level(self):
        """Test that invalid log level returns validation error."""
        log_data = {
            'level': 'INVALID_LEVEL',
            'message': 'Test message',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('Invalid log level', response_data['error'])

    def test_invalid_timestamp_format(self):
        """Test that invalid timestamp format returns validation error."""
        log_data = {
            'level': 'ERROR',
            'message': 'Test message',
            'timestamp': 'not-a-valid-timestamp',
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('Invalid timestamp format', response_data['error'])

    def test_invalid_json_payload(self):
        """Test that invalid JSON returns appropriate error."""
        response = self.client.post(
            self.api_url,
            data='invalid-json-data',
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('Invalid JSON payload', response_data['error'])

    def test_log_entry_with_browser_info(self):
        """Test log entry with browser information."""
        log_data = {
            'level': 'INFO',
            'message': 'Test with browser info',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
            'browserInfo': {
                'userAgent': 'Mozilla/5.0',
                'language': 'en-US',
                'platform': 'Win32',
                'viewport': {'width': 1920, 'height': 1080},
                'timezone': 'America/New_York'
            }
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertTrue(response_data['success'])

    def test_log_entry_with_user_interactions(self):
        """Test log entry with user interactions for debugging."""
        log_data = {
            'level': 'ERROR',
            'message': 'Error with user context',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
            'recentInteractions': [
                {
                    'type': 'click',
                    'target': '#submit-button',
                    'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
                    'url': 'https://example.com/form'
                },
                {
                    'type': 'navigation',
                    'target': '/error-page',
                    'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
                    'url': 'https://example.com/error'
                }
            ]
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertTrue(response_data['success'])

    def test_health_check_endpoint(self):
        """Test the logging system health check endpoint."""
        response = self.client.get(self.health_url)

        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['status'], 'healthy')
        self.assertEqual(response_data['service'], 'logging')
        self.assertIn('correlation_id', response_data)
        self.assertIn('timestamp', response_data)

    @patch('core.views.logging.frontend_logger')
    def test_logging_integration(self, mock_frontend_logger):
        """Test that log entries are properly sent to the logging system."""
        log_data = {
            'level': 'CRITICAL',
            'message': 'Critical error test',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
            'data': {'error_code': 500, 'details': 'Server error'}
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)

        # Verify that the frontend logger was called
        mock_frontend_logger.log.assert_called_once()

        # Check the call arguments
        call_args = mock_frontend_logger.log.call_args
        self.assertEqual(call_args[0][0], logging.CRITICAL)  # Log level
        self.assertIn('[FRONTEND]', call_args[0][1])  # Message prefix
        self.assertIn('frontend_log', call_args[1]['extra'])  # Extra data

    def test_get_method_not_allowed(self):
        """Test that GET requests to the logging endpoint are not allowed."""
        response = self.client.get(self.api_url)
        self.assertEqual(response.status_code, 405)  # Method Not Allowed

    def test_cors_headers_for_frontend(self):
        """Test that the API is accessible from frontend (CORS consideration)."""
        # Note: This test assumes CORS is configured elsewhere in the Django settings
        log_data = {
            'level': 'INFO',
            'message': 'CORS test',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json',
            HTTP_ORIGIN='http://localhost:5173'  # Frontend dev server
        )

        # The request should succeed regardless of CORS (handled by middleware)
        self.assertEqual(response.status_code, 201)


class LoggingAPIIntegrationTest(TestCase):
    """Integration tests for the logging API with the actual logging system."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = Client()
        self.api_url = '/api/core/logs/'

    @patch('core.views.logging.frontend_logger')
    @patch('core.views.logging.app_logger')
    def test_critical_error_logs_to_both_loggers(self, mock_app_logger, mock_frontend_logger):
        """Test that critical errors are logged to both frontend and app loggers."""
        log_data = {
            'level': 'CRITICAL',
            'message': 'System critical error',
            'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
        }

        response = self.client.post(
            self.api_url,
            data=json.dumps(log_data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)

        # Verify both loggers were called
        mock_frontend_logger.log.assert_called_once()
        mock_app_logger.log.assert_called_once()

        # Verify log levels
        frontend_call = mock_frontend_logger.log.call_args
        app_call = mock_app_logger.log.call_args

        self.assertEqual(frontend_call[0][0], logging.CRITICAL)
        self.assertEqual(app_call[0][0], logging.CRITICAL)

    def test_info_level_only_logs_to_frontend(self):
        """Test that INFO level logs only go to frontend logger."""
        with patch('core.views.logging.frontend_logger') as mock_frontend_logger, \
             patch('core.views.logging.app_logger') as mock_app_logger:

            log_data = {
                'level': 'INFO',
                'message': 'Information message',
                'timestamp': datetime.now(tz=UTC).isoformat() + 'Z',
            }

            response = self.client.post(
                self.api_url,
                data=json.dumps(log_data),
                content_type='application/json'
            )

            self.assertEqual(response.status_code, 201)

            # Verify only frontend logger was called
            mock_frontend_logger.log.assert_called_once()
            mock_app_logger.log.assert_not_called()
