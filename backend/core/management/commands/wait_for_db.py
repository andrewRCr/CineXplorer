"""
Command to wait for the database to be available before starting the core app.
"""

import time
from psycopg import OperationalError as PsycopgError
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """
    Django command to wait for the database to be available before starting the core app.
    """

    def handle(self, *args, **options):
        """Entry-point for command."""

        self.stdout.write("Waiting for database...\n")
        db_up = False
        while not db_up:
            try:
                self.check(databases=["default"])  # type: ignore
                db_up = True  # no exception raised
            except (PsycopgError, OperationalError):
                self.stdout.write(
                    "Database unavailable; waiting 1 second...\n")
                time.sleep(1)

        self.stdout.write(self.style.SUCCESS("Database available.\n"))
