"""Make the blacklist table match the tracked blacklist file.

Usage:
    python manage.py sync_blacklist
    python manage.py sync_blacklist --file path/to/blacklist.csv
"""

from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.movie.services.data_quality.blacklist_file import (
    BLACKLIST_FILE,
    BlacklistFileError,
    read_blacklist,
    sync_blacklist,
)


class Command(BaseCommand):
    """Add, remove and re-word blacklist rows to match the file; safe to run repeatedly."""

    help = "Make the blacklist table match the tracked blacklist file"

    def add_arguments(self, parser: ArgumentParser) -> None:
        """Add command-line arguments."""
        parser.add_argument(
            "--file",
            default=str(BLACKLIST_FILE),
            help="Blacklist file to load (default: the tracked file)",
        )

    def handle(self, *args: object, **options: object) -> None:
        """Validate the file, then sync the table to it."""
        path = Path(str(options["file"]))
        try:
            entries = read_blacklist(path)
        except BlacklistFileError as exc:
            raise CommandError(f"Blacklist not synced: {exc}") from exc

        result = sync_blacklist(entries)
        self.stdout.write(
            self.style.SUCCESS(
                f"Blacklist synced: {len(entries)} entries "
                f"({result.added} added, {result.removed} removed, {result.updated} re-worded)"
            )
        )
