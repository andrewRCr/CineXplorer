"""Tests for the tracked blacklist file and its sync into the database."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from django.core.cache import cache
from django.core.management import CommandError, call_command

from apps.movie.models import BlacklistedMovie
from apps.movie.services.data_quality.blacklist_file import (
    BlacklistEntry,
    BlacklistFileError,
    read_blacklist,
    sync_blacklist,
    write_blacklist,
)
from apps.movie.services.data_quality.filters import BLACKLIST_CACHE_KEY, get_blacklisted_ids

HEADER = "tmdb_id,reason,source\n"


def blacklist_file(tmp_path: Path, rows: str) -> Path:
    """Write a blacklist file with the standard header and the given rows."""
    path = tmp_path / "blacklist.csv"
    path.write_text(HEADER + rows, encoding="utf-8")
    return path


def table() -> dict[int, str]:
    """The blacklist table as a map of TMDB ID to reason."""
    return dict(BlacklistedMovie.objects.values_list("tmdb_id", "reason"))


# ============================================================================
# Reading and writing the file
# ============================================================================


def test_write_then_read_keeps_entries_sorted_by_id(tmp_path: Path) -> None:
    path = tmp_path / "blacklist.csv"
    write_blacklist(
        [
            BlacklistEntry(300, "Studio, catalogue-wide", "rule:studio-1"),
            BlacklistEntry(100, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        ],
        path,
    )

    assert path.read_text(encoding="utf-8").splitlines()[0] == HEADER.strip()
    assert read_blacklist(path) == [
        BlacklistEntry(100, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        BlacklistEntry(300, "Studio, catalogue-wide", "rule:studio-1"),
    ]


@pytest.mark.parametrize(
    ("contents", "problem"),
    [
        ("tmdb_id,reason\n100,Adult\n", "header"),
        (HEADER + "100,Adult,hand:a\n100,Adult again,hand:b\n", "listed twice"),
        (HEADER + "12ab,Adult,hand:a\n", "TMDB ID"),
        (HEADER + "-5,Adult,hand:a\n", "TMDB ID"),
        (HEADER + "100,,hand:a\n", "reason"),
        (HEADER + "100,Adult,\n", "source"),
        (HEADER + f"100,{'x' * 256},hand:a\n", "reason"),
        (HEADER + "100,Adult\n", "fields"),
    ],
)
def test_a_malformed_file_is_refused(tmp_path: Path, contents: str, problem: str) -> None:
    path = tmp_path / "blacklist.csv"
    path.write_text(contents, encoding="utf-8")

    with pytest.raises(BlacklistFileError, match=problem):
        read_blacklist(path)


def test_the_shipped_file_is_valid() -> None:
    """The tracked file parses, holds each ID once, is sorted, and names a source for every row."""
    entries = read_blacklist()

    assert entries
    ids = [entry.tmdb_id for entry in entries]
    assert ids == sorted(ids)
    assert all(re.fullmatch(r"(rule|hand):[a-z0-9-]+", entry.source) for entry in entries)


# ============================================================================
# Syncing the table
# ============================================================================


@pytest.mark.django_db
def test_sync_makes_the_table_match_the_file() -> None:
    BlacklistedMovie.objects.create(tmdb_id=1, reason="Kept")
    BlacklistedMovie.objects.create(tmdb_id=2, reason="Old reason")
    BlacklistedMovie.objects.create(tmdb_id=3, reason="No longer listed")

    result = sync_blacklist(
        [
            BlacklistEntry(1, "Kept", "hand:a"),
            BlacklistEntry(2, "New reason", "hand:a"),
            BlacklistEntry(4, "Added", "rule:studio-9"),
        ]
    )

    assert table() == {1: "Kept", 2: "New reason", 4: "Added"}
    assert (result.added, result.removed, result.updated) == (1, 1, 1)


@pytest.mark.django_db
def test_a_second_sync_changes_nothing() -> None:
    entries = [BlacklistEntry(1, "Adult", "hand:a"), BlacklistEntry(2, "Adult", "hand:a")]
    sync_blacklist(entries)

    result = sync_blacklist(entries)

    assert (result.added, result.removed, result.updated) == (0, 0, 0)
    assert table() == {1: "Adult", 2: "Adult"}


@pytest.mark.django_db
def test_sync_clears_the_cached_blacklist() -> None:
    cache.set(BLACKLIST_CACHE_KEY, {999}, 300)

    sync_blacklist([BlacklistEntry(5, "Adult", "hand:a")])

    assert get_blacklisted_ids() == {5}


@pytest.mark.django_db
def test_the_command_loads_the_shipped_file() -> None:
    call_command("sync_blacklist")

    assert set(table()) == {entry.tmdb_id for entry in read_blacklist()}


@pytest.mark.django_db
def test_the_command_refuses_a_malformed_file_and_leaves_the_table(tmp_path: Path) -> None:
    BlacklistedMovie.objects.create(tmdb_id=1, reason="Kept")
    path = blacklist_file(tmp_path, "2,Adult,hand:a\n2,Adult,hand:b\n")

    with pytest.raises(CommandError, match="listed twice"):
        call_command("sync_blacklist", file=str(path))

    assert table() == {1: "Kept"}
