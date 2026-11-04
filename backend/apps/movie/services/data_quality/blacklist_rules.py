"""Rules that regenerate their part of the blacklist file from TMDB.

Each rule covers a production company whose catalogue, or one era of it, is adult content that
TMDB doesn't flag as adult. Regenerating a rule replaces only the rows carrying its own source, so
hand picks and other rules' rows stay as they are, and an ID another source already holds keeps
that source.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Protocol, cast

from apps.core.services.api_response import ApiResponse
from apps.movie.services.data_quality.blacklist_file import BlacklistEntry

# TMDB's discover endpoint serves at most 500 pages.
MAX_PAGES = 500
# TMDB allows about 40 requests every 10 seconds.
PAGE_PAUSE_SECONDS = 0.3


class DiscoverClient(Protocol):
    """The part of the TMDB client a rule needs."""

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        """Query TMDB's discover endpoint."""
        ...


class RuleFetchError(RuntimeError):
    """TMDB didn't answer every page of a rule, so its rows can't be regenerated."""


@dataclass(frozen=True)
class BlacklistRule:
    """A production company's catalogue, optionally limited to a release-date range."""

    source: str
    company_id: int
    reason: str
    released_from: str | None = None
    released_to: str | None = None


def _studio(company_id: int, name: str, note: str) -> BlacklistRule:
    return BlacklistRule(
        source=f"rule:studio-{company_id}",
        company_id=company_id,
        reason=f"{name} (TMDB {company_id}) - {note}",
    )


RULES: tuple[BlacklistRule, ...] = (
    # Pink Pineapple also has a duplicate TMDB company, 267239, whose titles TMDB already flags
    # as adult.
    _studio(80856, "Pink Pineapple", "100% hentai/adult anime studio"),
    _studio(174515, "Osu Production", "Adult/pink film studio (1986-era)"),
    _studio(142460, "Sekine Production", "Adult/pink film studio"),
    _studio(9301, "Kokuei", "100% pink film studio"),
    _studio(73435, "Shintoho Pictures", "100% adult content studio"),
    _studio(120194, "Million Film", "100% pink film studio"),
    _studio(213979, "Xces Film", "100% adult/pink film studio"),
    _studio(84362, "Cement Match", "100% adult/pink film studio"),
    _studio(219019, "Office Burrows", "100% adult/pink film studio"),
    _studio(127883, "Shin Nihon Eizo", "100% adult/pink film studio"),
    _studio(81980, "Deutsche Dynamik Film", "90%+ adult catalogue"),
    BlacklistRule(
        source="rule:nikkatsu-1971-1988",
        company_id=955,
        reason="Nikkatsu Roman Porno era (1971-1988) bulk blacklist",
        released_from="1971-01-01",
        released_to="1988-12-31",
    ),
)


def fetch_rule_ids(
    client: DiscoverClient,
    rule: BlacklistRule,
    pause: Callable[[float], None] = time.sleep,
) -> set[int]:
    """Return the rule's TMDB movie IDs, leaving out titles TMDB already flags as adult.

    Raises:
        RuleFetchError: A page failed, so the result would be incomplete.
    """
    params: dict[str, object] = {"with_companies": str(rule.company_id), "include_adult": False}
    if rule.released_from:
        params["primary_release_date.gte"] = rule.released_from
    if rule.released_to:
        params["primary_release_date.lte"] = rule.released_to

    ids: set[int] = set()
    page = 1
    total_pages = 1
    while page <= total_pages:
        response = client.discover_movies(page=page, **params)
        data = response.get_json_data() if response.is_success() else None
        if data is None:
            raise RuleFetchError(
                f"{rule.source}: TMDB page {page} failed (status {response.status_code})"
            )
        reported_pages = data.get("total_pages")
        total_pages = min(reported_pages, MAX_PAGES) if isinstance(reported_pages, int) else 1
        results = data.get("results")
        for item in cast(list[object], results) if isinstance(results, list) else []:
            if not isinstance(item, dict):
                continue
            movie = cast(dict[str, object], item)
            movie_id = movie.get("id")
            if isinstance(movie_id, int) and not movie.get("adult"):
                ids.add(movie_id)
        page += 1
        if page <= total_pages:
            pause(PAGE_PAUSE_SECONDS)
    return ids


def apply_rule(
    entries: Iterable[BlacklistEntry],
    rule: BlacklistRule,
    ids: set[int],
) -> tuple[list[BlacklistEntry], int, int]:
    """Replace the rule's rows with the given IDs.

    Returns:
        The new entries, and how many of the rule's rows were added and removed.
    """
    entries = list(entries)
    previous = {entry.tmdb_id for entry in entries if entry.source == rule.source}
    kept = [entry for entry in entries if entry.source != rule.source]
    held = {entry.tmdb_id for entry in kept}
    current = {tmdb_id for tmdb_id in ids if tmdb_id not in held}
    rows = [
        BlacklistEntry(tmdb_id=tmdb_id, reason=rule.reason, source=rule.source)
        for tmdb_id in sorted(current)
    ]
    return kept + rows, len(current - previous), len(previous - current)
