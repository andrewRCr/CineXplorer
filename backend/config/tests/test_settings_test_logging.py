"""
Test to verify that test environment logging configuration works correctly.

This test ensures that the logging configuration in settings_test.py behaves
as expected for CI/CD environments.
"""

import os
import logging
import io
from contextlib import redirect_stderr
from django.test import TestCase
from django.conf import settings


class TestLoggingConfigurationTest(TestCase):
    """Test the test environment logging configuration."""

    def setUp(self):
        """Set up test environment."""
        # Clear any existing handlers to ensure clean test
        for logger_name in ["cinexplorer", "django.db.backends", "cinexplorer.requests"]:
            logger = logging.getLogger(logger_name)
            logger.handlers.clear()

    def test_logging_configuration_exists(self):
        """Test that LOGGING configuration exists in settings."""
        self.assertTrue(hasattr(settings, "LOGGING"))
        self.assertIsInstance(settings.LOGGING, dict)

        # Verify basic structure
        logging_config = settings.LOGGING
        self.assertIn("version", logging_config)
        self.assertIn("handlers", logging_config)
        self.assertIn("loggers", logging_config)
        self.assertIn("formatters", logging_config)

    def test_handlers_configuration(self):
        """Test that handlers are configured for testing."""
        handlers = settings.LOGGING["handlers"]

        # Should have test_console handler for errors
        self.assertIn("test_console", handlers)
        console_handler = handlers["test_console"]
        self.assertEqual(console_handler["class"], "logging.StreamHandler")
        self.assertEqual(console_handler["level"], "ERROR")
        self.assertEqual(console_handler["stream"], "ext://sys.stderr")

        # Should have test_null handler for suppressed logs
        self.assertIn("test_null", handlers)
        null_handler = handlers["test_null"]
        self.assertEqual(null_handler["class"], "logging.NullHandler")

    def test_loggers_configuration(self):
        """Test that loggers are configured appropriately for testing."""
        loggers = settings.LOGGING["loggers"]

        # Root logger should only show errors
        self.assertIn("", loggers)
        root_logger = loggers[""]
        self.assertEqual(root_logger["level"], "ERROR")
        self.assertIn("test_console", root_logger["handlers"])

        # Database logger should be suppressed
        self.assertIn("django.db.backends", loggers)
        db_logger = loggers["django.db.backends"]
        self.assertEqual(db_logger["level"], "CRITICAL")
        self.assertIn("test_null", db_logger["handlers"])

        # Request logger should be suppressed
        self.assertIn("cinexplorer.requests", loggers)
        request_logger = loggers["cinexplorer.requests"]
        self.assertIn("test_null", request_logger["handlers"])

    def test_error_level_logging_works(self):
        """Test that ERROR level messages are displayed."""
        # Capture stderr to test logging output
        stderr_capture = io.StringIO()

        with redirect_stderr(stderr_capture):
            # Configure logging with our test settings
            logging.config.dictConfig(settings.LOGGING)

            # Get application logger and log an error
            logger = logging.getLogger("cinexplorer")
            logger.error("Test error message for logging verification")

        # Check that the error was logged to stderr
        stderr_output = stderr_capture.getvalue()
        self.assertIn("Test error message for logging verification", stderr_output)
        self.assertIn("[TEST] ERROR:", stderr_output)

    def test_info_level_logging_suppressed(self):
        """Test that INFO level messages are suppressed."""
        # Capture stderr to test logging output
        stderr_capture = io.StringIO()

        with redirect_stderr(stderr_capture):
            # Configure logging with our test settings
            logging.config.dictConfig(settings.LOGGING)

            # Get application logger and log info (should be suppressed)
            logger = logging.getLogger("cinexplorer")
            logger.info("Test info message that should be suppressed")

        # Check that the info message was NOT logged
        stderr_output = stderr_capture.getvalue()
        self.assertNotIn("Test info message that should be suppressed", stderr_output)

    def test_database_logging_suppressed(self):
        """Test that database logging is completely suppressed."""
        # Capture stderr to test logging output
        stderr_capture = io.StringIO()

        with redirect_stderr(stderr_capture):
            # Configure logging with our test settings
            logging.config.dictConfig(settings.LOGGING)

            # Get database logger and try to log (should be suppressed)
            db_logger = logging.getLogger("django.db.backends")
            db_logger.error("Database error that should be suppressed")
            db_logger.critical("Even critical DB messages should be suppressed")

        # Check that database messages were NOT logged (null handler)
        stderr_output = stderr_capture.getvalue()
        self.assertNotIn("Database error", stderr_output)
        self.assertNotIn("critical DB messages", stderr_output)

    def test_request_logging_suppressed(self):
        """Test that request logging is suppressed."""
        # Capture stderr to test logging output
        stderr_capture = io.StringIO()

        with redirect_stderr(stderr_capture):
            # Configure logging with our test settings
            logging.config.dictConfig(settings.LOGGING)

            # Get request logger and try to log (should be suppressed)
            request_logger = logging.getLogger("cinexplorer.requests")
            request_logger.error("Request error that should be suppressed")

        # Check that request messages were NOT logged (null handler)
        stderr_output = stderr_capture.getvalue()
        self.assertNotIn("Request error", stderr_output)

    def test_no_file_handlers_in_test_config(self):
        """Test that no file handlers are configured for testing."""
        handlers = settings.LOGGING["handlers"]

        # Check that none of the handlers are file-based
        for handler_name, handler_config in handlers.items():
            handler_class = handler_config.get("class", "")
            self.assertNotIn("FileHandler", handler_class)
            self.assertNotIn("RotatingFileHandler", handler_class)
            self.assertNotIn("filename", handler_config)

        # Should only have console and null handlers
        handler_classes = [config.get("class", "") for config in handlers.values()]
        expected_classes = ["logging.StreamHandler", "logging.NullHandler"]

        for handler_class in handler_classes:
            self.assertIn(handler_class, expected_classes)

    def test_testing_flag_is_set(self):
        """Test that TESTING flag is properly set."""
        self.assertTrue(settings.TESTING)

    def test_formatters_are_simple(self):
        """Test that test formatters are simple and don't include sensitive info."""
        formatters = settings.LOGGING["formatters"]

        # Test formatters should be simple
        self.assertIn("test_simple", formatters)
        simple_format = formatters["test_simple"]["format"]
        self.assertIn("[TEST]", simple_format)
        self.assertIn("{levelname}", simple_format)
        self.assertIn("{message}", simple_format)

        # Should not include detailed path information that might be environment-specific
        self.assertNotIn("{pathname}", simple_format)
        self.assertNotIn("{filename}", simple_format)


def run_standalone_test():
    """
    Run this test standalone to verify test logging configuration.

    This function can be called directly to test logging configuration
    without running the full Django test suite.
    """
    import django
    from django.conf import settings as django_settings

    # Configure Django settings for testing
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_test")

    if not django_settings.configured:
        django.setup()

    print("Testing logging configuration for test environment...")
    print("=" * 60)

    # Test basic configuration
    print("\\n1. Testing logging configuration structure...")
    logging_config = django_settings.LOGGING
    print(f"   ✓ LOGGING setting exists: {bool(logging_config)}")
    print(f"   ✓ Handlers configured: {len(logging_config.get('handlers', {}))}")
    print(f"   ✓ Loggers configured: {len(logging_config.get('loggers', {}))}")

    # Test error logging
    print("\\n2. Testing error logging...")
    logging.config.dictConfig(django_settings.LOGGING)
    logger = logging.getLogger("cinexplorer")

    print("   Logging test error message...")
    logger.error("This is a test error message - should appear")
    print("   ✓ Error logging test completed")

    # Test suppressed logging
    print("\\n3. Testing suppressed logging...")
    logger.info("This info message should NOT appear")
    logger.debug("This debug message should NOT appear")
    db_logger = logging.getLogger("django.db.backends")
    db_logger.error("This DB error should NOT appear")
    print("   ✓ Log suppression test completed")

    print("\\n" + "=" * 60)
    print("Test logging configuration verification completed!")
    print("If you saw '[TEST] ERROR:' messages above, logging is working correctly.")
    print("If you did not see any database/info messages, suppression is working.")


if __name__ == "__main__":
    run_standalone_test()
