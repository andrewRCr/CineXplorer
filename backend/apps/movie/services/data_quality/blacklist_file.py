"""The tracked blacklist file and its sync into the database.

`apps/movie/data/blacklist.csv` is the blacklist's source of truth: one row per TMDB movie ID,
with the reason it is excluded and the source that put it there. A source is either a rule in
`blacklist_rules`, which rewrites its own rows, or a reviewed hand pick. The file holds IDs, never
TMDB's titles or other content, so it can be kept indefinitely. `sync_blacklist` makes the
`BlacklistedMovie` table match the file.
"""

from __future__ import annotations

import csv
import logging
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from django.core.cache import cache
from django.db import transaction

from apps.movie.models import BlacklistedMovie
from apps.movie.services.data_quality.filters import BLACKLIST_CACHE_KEY

logger = logging.getLogger(__name__)

BLACKLIST_FILE = Path(__file__).resolve().parents[2] / "data" / "blacklist.csv"
FIELDS = ("tmdb_id", "reason", "source")
REASON_MAX_LENGTH = 255


class BlacklistFileError(ValueError):
    """The blacklist file is malformed."""


@dataclass(frozen=True)
class BlacklistEntry:
    """One blacklisted TMDB movie: why it is excluded, and the source that listed it."""

    tmdb_id: int
    reason: str
    source: str


@dataclass(frozen=True)
class SyncResult:
    """How many table rows a sync added, removed and re-worded."""

    added: int
    removed: int
    updated: int


def read_blacklist(path: Path = BLACKLIST_FILE) -> list[BlacklistEntry]:
    """Read and validate the blacklist file.

    Raises:
        BlacklistFileError: The header is wrong, or a row has a bad ID, an empty or over-long
            reason, no source, or an ID already listed.
    """
    entries: list[BlacklistEntry] = []
    seen: set[int] = set()
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        if tuple(next(reader, ())) != FIELDS:
            raise BlacklistFileError(f"{path.name}: the header must be {','.join(FIELDS)}")
        for line, row in enumerate(reader, start=2):
            if len(row) != len(FIELDS):
                raise BlacklistFileError(f"{path.name} line {line}: expected {len(FIELDS)} fields")
            raw_id, reason, source = (value.strip() for value in row)
            if not raw_id.isdecimal() or int(raw_id) == 0:
                raise BlacklistFileError(f"{path.name} line {line}: {raw_id!r} is not a TMDB ID")
            if not reason or len(reason) > REASON_MAX_LENGTH:
                raise BlacklistFileError(
                    f"{path.name} line {line}: "
                    f"the reason must be 1 to {REASON_MAX_LENGTH} characters"
                )
            if not source:
                raise BlacklistFileError(f"{path.name} line {line}: the source is empty")
            tmdb_id = int(raw_id)
            if tmdb_id in seen:
                raise BlacklistFileError(
                    f"{path.name} line {line}: TMDB ID {tmdb_id} is listed twice"
                )
            seen.add(tmdb_id)
            entries.append(BlacklistEntry(tmdb_id=tmdb_id, reason=reason, source=source))
    return entries


def write_blacklist(entries: Iterable[BlacklistEntry], path: Path = BLACKLIST_FILE) -> None:
    """Write the blacklist file, sorted by TMDB ID so each change reads as a small diff."""
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(FIELDS)
        for entry in sorted(entries, key=lambda entry: entry.tmdb_id):
            writer.writerow((entry.tmdb_id, entry.reason, entry.source))


def sync_blacklist(entries: Iterable[BlacklistEntry]) -> SyncResult:
    """Make the blacklist table match the given entries, then drop the old cached copy."""
    wanted = {entry.tmdb_id: entry.reason for entry in entries}
    with transaction.atomic():
        existing = {row.tmdb_id: row for row in BlacklistedMovie.objects.all()}
        stale = [tmdb_id for tmdb_id in existing if tmdb_id not in wanted]
        BlacklistedMovie.objects.filter(tmdb_id__in=stale).delete()
        missing = [
            BlacklistedMovie(tmdb_id=tmdb_id, reason=reason)
            for tmdb_id, reason in wanted.items()
            if tmdb_id not in existing
        ]
        BlacklistedMovie.objects.bulk_create(missing)
        reworded = [
            row
            for tmdb_id, row in existing.items()
            if tmdb_id in wanted and row.reason != wanted[tmdb_id]
        ]
        for row in reworded:
            row.reason = wanted[row.tmdb_id]
        BlacklistedMovie.objects.bulk_update(reworded, ["reason"])

    try:
        cache.delete(BLACKLIST_CACHE_KEY)
    except Exception:
        # The table is synced; the cached copy expires on its own within its timeout.
        logger.exception("Could not clear the cached blacklist after a sync")

    return SyncResult(added=len(missing), removed=len(stale), updated=len(reworded))
