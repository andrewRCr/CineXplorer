"""Rules that regenerate their part of the blacklist file from TMDB.

Each rule covers a production company whose catalogue, or one era of it, is adult content that
TMDB doesn't flag as adult. Regenerating replaces only rule rows: hand picks keep their IDs, and an
ID two rules match goes to the rule listed first in `RULES`.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from typing import Protocol, cast

from apps.core.services.api_response import ApiResponse
from apps.movie.constants import TMDB_MAX_PAGE
from apps.movie.services.data_quality.blacklist_file import BlacklistEntry

# Conservative pacing between sequential TMDB page requests.
PAGE_PAUSE_SECONDS = 0.3


class DiscoverClient(Protocol):
    """The part of the TMDB client a rule needs."""

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        """Query TMDB's discover endpoint."""
        ...


class RuleFetchError(RuntimeError):
    """TMDB's answer for a rule failed, was malformed or was incomplete."""


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


@dataclass(frozen=True)
class _Page:
    """One discover page's counts and titles."""

    total_pages: int
    total_results: int
    ids: set[int]
    # Titles TMDB doesn't flag as adult: the ones a rule blacklists.
    unflagged: set[int]


def _read_page(rule: BlacklistRule, page: int, response: ApiResponse) -> _Page:
    """Check one discover page and return its counts and titles."""
    data = response.get_json_data() if response.is_success() else None
    if data is None:
        raise RuleFetchError(
            f"{rule.source}: TMDB page {page} failed (status {response.status_code})"
        )
    total_pages = data.get("total_pages")
    total_results = data.get("total_results")
    results = data.get("results")
    if (
        not isinstance(total_pages, int)
        or not isinstance(total_results, int)
        or not isinstance(results, list)
    ):
        raise RuleFetchError(
            f"{rule.source}: TMDB page {page} is missing its page count, result count or results"
        )
    if total_pages > TMDB_MAX_PAGE:
        raise RuleFetchError(
            f"{rule.source}: TMDB reports {total_pages} pages but serves only {TMDB_MAX_PAGE}"
        )
    ids: set[int] = set()
    unflagged: set[int] = set()
    for item in cast(list[object], results):
        movie = cast(dict[str, object], item) if isinstance(item, dict) else {}
        movie_id = movie.get("id")
        if not isinstance(movie_id, int):
            raise RuleFetchError(f"{rule.source}: TMDB page {page} has a result without an ID")
        ids.add(movie_id)
        if not movie.get("adult"):
            unflagged.add(movie_id)
    return _Page(total_pages, total_results, ids, unflagged)


def fetch_rule_ids(
    client: DiscoverClient,
    rule: BlacklistRule,
    pause: Callable[[float], None] = time.sleep,
) -> set[int]:
    """Return the rule's TMDB movie IDs, leaving out titles TMDB already flags as adult.

    Raises:
        RuleFetchError: A page failed or was malformed, TMDB reports more pages than it serves,
            a later page's counts differ from the first page's, or the pages held fewer titles
            than TMDB counts, so the result would be incomplete.
    """
    params: dict[str, object] = {
        "with_companies": str(rule.company_id),
        "include_adult": False,
        # TMDB's default order, popularity, shifts while the pages are read, so titles repeat
        # on one page and go missing from another.
        "sort_by": "primary_release_date.asc",
    }
    if rule.released_from:
        params["primary_release_date.gte"] = rule.released_from
    if rule.released_to:
        params["primary_release_date.lte"] = rule.released_to

    first = _read_page(rule, 1, client.discover_movies(page=1, **params))
    seen = set(first.ids)
    ids = set(first.unflagged)
    for page in range(2, first.total_pages + 1):
        pause(PAGE_PAUSE_SECONDS)
        current = _read_page(rule, page, client.discover_movies(page=page, **params))
        # A later page from a changed catalogue could end the fetch early or hide a skip.
        if (current.total_pages, current.total_results) != (
            first.total_pages,
            first.total_results,
        ):
            raise RuleFetchError(
                f"{rule.source}: TMDB page {page} reports {current.total_results} titles on "
                f"{current.total_pages} pages, but page 1 reported {first.total_results} on "
                f"{first.total_pages}"
            )
        seen |= current.ids
        ids |= current.unflagged
    if len(seen) < first.total_results:
        raise RuleFetchError(
            f"{rule.source}: TMDB reports {first.total_results} titles but its pages held "
            f"{len(seen)} different ones"
        )
    return ids


def apply_rules(
    entries: Iterable[BlacklistEntry],
    results: Sequence[tuple[BlacklistRule, set[int]]],
) -> tuple[list[BlacklistEntry], dict[str, tuple[int, int]]]:
    """Replace the given rules' rows with their fetched IDs, all at once.

    Rows from every other source keep their IDs. Of the given rules, the earlier one in `results`
    holds an ID that several match, so the outcome doesn't depend on which rule held it before.

    Returns:
        The new entries, and each rule's source mapped to how many of its rows were added and
        removed.
    """
    entries = list(entries)
    regenerated = {rule.source for rule, _ids in results}
    kept = [entry for entry in entries if entry.source not in regenerated]
    held = {entry.tmdb_id for entry in kept}
    rows: list[BlacklistEntry] = []
    changes: dict[str, tuple[int, int]] = {}
    for rule, ids in results:
        previous = {entry.tmdb_id for entry in entries if entry.source == rule.source}
        current = ids - held
        held |= current
        rows.extend(
            BlacklistEntry(tmdb_id=tmdb_id, reason=rule.reason, source=rule.source)
            for tmdb_id in sorted(current)
        )
        changes[rule.source] = (len(current - previous), len(previous - current))
    return kept + rows, changes
