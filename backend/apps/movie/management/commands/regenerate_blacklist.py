"""Regenerate the rule-based rows of the tracked blacklist file from TMDB.

Each rule in `blacklist_rules.RULES` rewrites its own rows; hand picks are left as they are. The
file is written only when every rule's TMDB queries succeed. Review the diff, then run
`sync_blacklist`.

Usage:
    python manage.py regenerate_blacklist
    python manage.py regenerate_blacklist --file path/to/blacklist.csv
"""

from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.services.data_quality.blacklist_file import (
    BLACKLIST_FILE,
    BlacklistFileError,
    read_blacklist,
    write_blacklist,
)
from apps.movie.services.data_quality.blacklist_rules import (
    RULES,
    RuleFetchError,
    apply_rule,
    fetch_rule_ids,
)


class Command(BaseCommand):
    """Query TMDB for each rule and rewrite that rule's rows in the blacklist file."""

    help = "Regenerate the rule-based rows of the blacklist file from TMDB"

    def add_arguments(self, parser: ArgumentParser) -> None:
        """Add command-line arguments."""
        parser.add_argument(
            "--file",
            default=str(BLACKLIST_FILE),
            help="Blacklist file to rewrite (default: the tracked file)",
        )

    def handle(self, *args: object, **options: object) -> None:
        """Fetch every rule, then write the file once."""
        path = Path(str(options["file"]))
        try:
            entries = read_blacklist(path)
        except BlacklistFileError as exc:
            raise CommandError(f"Blacklist not regenerated: {exc}") from exc

        client = TMDBApiClient()
        for rule in RULES:
            try:
                ids = fetch_rule_ids(client, rule)
            except RuleFetchError as exc:
                raise CommandError(f"Blacklist not regenerated, file unchanged: {exc}") from exc
            entries, added, removed = apply_rule(entries, rule, ids)
            self.stdout.write(
                f"{rule.source}: {len(ids)} on TMDB, {added} added, {removed} removed"
            )

        write_blacklist(entries, path)
        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {len(entries)} entries. Review the diff, then run sync_blacklist."
            )
        )
