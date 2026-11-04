"""Django management command to test logging configuration.

This command tests all aspects of the logging system to ensure proper integration.
"""

import logging
from argparse import ArgumentParser

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Test the logging system configuration and verify all components work correctly"

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--include-db",
            action="store_true",
            help="Include database query tests (requires database connection)",
        )
        parser.add_argument(
            "--include-slow-query",
            action="store_true",
            help="Test slow query logging (simulates slow database operations)",
        )

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write(self.style.SUCCESS("Testing CineXplorer logging system..."))

        # Django guarantees these exist with default False (action="store_true")
        include_db: bool = bool(options["include_db"])
        include_slow_query: bool = bool(options["include_slow_query"])

        # Test all loggers
        self.test_application_loggers()
        # Test formatters by checking log output
        self.test_log_levels()
        # Test database logging if requested
        if include_db:
            self.test_database_logging(include_slow=include_slow_query)
        # Test error logging
        self.test_error_logging()
        # Display logging configuration summary
        self.display_logging_summary()
        self.stdout.write(self.style.SUCCESS("Logging system test completed!"))

    def test_application_loggers(self) -> None:
        """Test all application-specific loggers."""
        self.stdout.write("Testing application loggers...")
        # Import from our logging configuration
        from config.logging import app_logger, db_logger, request_logger, tmdb_logger

        # Test each logger
        loggers_to_test = [
            ("cinexplorer", app_logger, "Main application logger"),
            ("requests", request_logger, "Request/response logger"),
            ("tmdb", tmdb_logger, "TMDB API logger"),
            ("database", db_logger, "Database logger"),
        ]

        for name, logger, description in loggers_to_test:
            logger.info(f"Testing {description} - this message should appear in logs")
            self.stdout.write(f"  ✓ {name}: {description}")

    def test_log_levels(self) -> None:
        """Test different log levels and their output."""
        self.stdout.write("Testing log levels...")
        app_logger = logging.getLogger("cinexplorer")
        # Test all log levels
        app_logger.debug("DEBUG level message - should only appear in debug mode")
        app_logger.info("INFO level message - general information")
        app_logger.warning("WARNING level message - potential issue")
        app_logger.error("ERROR level message - error occurred")
        app_logger.critical("CRITICAL level message - critical system error")
        self.stdout.write("  ✓ All log levels tested")

    def test_database_logging(self, include_slow: bool = False) -> None:
        """Test database query logging."""
        self.stdout.write("Testing database logging...")
        try:
            from django.db import connection

            # Simple query to test database logging
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 as test_value")
                cursor.fetchone()
            self.stdout.write("  ✓ Database query executed (should appear in database.log)")
            if include_slow:
                self.stdout.write("  Testing slow query simulation...")
                # Import our slow query logging function
                from config.logging import log_slow_query

                # Simulate different query performance levels
                test_queries = [
                    ("SELECT * FROM users_user WHERE id = %s", 0.05, "Fast query"),
                    ("SELECT * FROM users_user ORDER BY username", 0.15, "Slow query"),
                    ("SELECT COUNT(*) FROM users_user", 0.6, "Warning-level slow query"),
                    (
                        "SELECT * FROM users_user WHERE username LIKE '%test%'",
                        2.5,
                        "Critical slow query",
                    ),
                ]
                for query, time_taken, description in test_queries:
                    log_slow_query(query, time_taken, params=("test_param",))
                    self.stdout.write(f"    ✓ {description}: {time_taken * 1000:.0f}ms")
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Database logging test failed: {type(e).__name__}")
            )

    def test_error_logging(self) -> None:
        """Test error logging and exception handling."""
        self.stdout.write("Testing error logging...")
        app_logger = logging.getLogger("cinexplorer")
        # Test logging an exception
        try:
            # Intentionally cause an exception for testing
            raise ValueError("Test exception for logging system validation")
        except ValueError:
            app_logger.exception("Caught test exception")
            self.stdout.write("  ✓ Exception logging tested (should appear in errors.log)")

    def display_logging_summary(self) -> None:
        """Display summary of logging configuration."""
        self.stdout.write("\nLogging Configuration Summary:")
        try:
            from config.logging import (
                LOG_ROTATION_CONFIG,
                LOG_STORAGE_ESTIMATES,
                get_database_performance_summary,
            )

            # Performance thresholds
            perf_summary = get_database_performance_summary()
            self.stdout.write("  Database Performance Thresholds:")
            for category, time_ms in perf_summary["thresholds_ms"].items():
                formatted_name = category.replace("_", " ").title()
                self.stdout.write(f"    {formatted_name}: {time_ms:.0f}ms")
            # Storage estimates
            self.stdout.write("  Estimated Storage Usage:")
            for log_type, estimate in LOG_STORAGE_ESTIMATES.items():
                if log_type != "total_estimated":
                    self.stdout.write(f"    {log_type}: {estimate}")
            total_est = LOG_STORAGE_ESTIMATES["total_estimated"]
            self.stdout.write(f"  Total: {total_est}")
            # Rotation config
            self.stdout.write("  Log Rotation:")
            max_mb = LOG_ROTATION_CONFIG["max_bytes"] // (1024 * 1024)
            self.stdout.write(f"    Max file size: {max_mb}MB")
            default_backups = LOG_ROTATION_CONFIG["backup_count_default"]
            self.stdout.write(f"    Default backups: {default_backups}")
            error_backups = LOG_ROTATION_CONFIG["backup_count_errors"]
            self.stdout.write(f"    Error log backups: {error_backups}")
        except ImportError as e:
            self.stdout.write(
                self.style.WARNING(f"Could not import logging configuration: {type(e).__name__}")
            )
        # Show log files location
        from django.conf import settings

        if hasattr(settings, "LOG_DIRECTORY"):
            self.stdout.write(f"  Log files location: {settings.LOG_DIRECTORY}")
        self.stdout.write("\nTo view logs in real-time:")
        self.stdout.write("  docker-compose exec backend tail -f logs/cinexplorer.log")
        self.stdout.write("  docker-compose exec backend tail -f logs/database.log")
        self.stdout.write("  docker-compose exec backend tail -f logs/errors.log")
