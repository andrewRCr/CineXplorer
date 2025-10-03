"""
Command to wait for the database to be available before starting the core app.
"""

import sys
import time
from typing import Any

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """
    Django command to wait for the database to be available before starting the core app.

    Supports configurable timeout and exponential backoff to avoid log spam.
    """

    def add_arguments(self, parser):
        """Add command-line arguments."""
        parser.add_argument(
            '--timeout',
            type=int,
            default=60,
            help='Maximum time to wait for database in seconds (default: 60)',
        )

    def handle(self, *args: str, **options: Any) -> None:  # Any: Django command options dict
        """Entry-point for command with timeout and exponential backoff."""
        timeout = options['timeout']
        start_time = time.monotonic()
        delay = 1  # Initial delay in seconds
        MAX_DELAY = 30  # Maximum delay between retries

        self.stdout.write("Waiting for database...")

        while True:
            elapsed = time.monotonic() - start_time
            if elapsed >= timeout:
                self.stderr.write(
                    self.style.ERROR(
                        f"Database connection timeout after {timeout}s. "
                        "Check database configuration and container health."
                    )
                )
                sys.exit(1)

            try:
                # Direct connection check (lighter than self.check)
                connections["default"].ensure_connection()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Database available (connected after {elapsed:.1f}s)"
                    )
                )
                return

            except OperationalError:
                remaining = max(0, timeout - elapsed)
                self.stdout.write(
                    f"Database unavailable; retrying in {delay}s "
                    f"(~{remaining:.0f}s remaining)"
                )
                time.sleep(delay)
                delay = min(delay * 2, MAX_DELAY)  # Exponential backoff with cap
