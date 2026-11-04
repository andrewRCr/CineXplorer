"""Tests for the rules that regenerate their part of the blacklist file from TMDB."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.management import CommandError, call_command

from apps.core.services.api_response import ApiResponse
from apps.movie.services.data_quality.blacklist_file import BlacklistEntry, write_blacklist
from apps.movie.services.data_quality.blacklist_rules import (
    RULES,
    BlacklistRule,
    RuleFetchError,
    apply_rule,
    fetch_rule_ids,
)

STUDIO = BlacklistRule(source="rule:studio-42", company_id=42, reason="Studio 42, catalogue-wide")
ERA = BlacklistRule(
    source="rule:era-7",
    company_id=7,
    reason="Studio 7, 1971-1988",
    released_from="1971-01-01",
    released_to="1988-12-31",
)


class FakeTMDB:
    """Answers TMDB's discover endpoint from canned pages and records each request."""

    def __init__(
        self, pages: list[list[dict[str, object]]], fail_on_page: int | None = None
    ) -> None:
        self.pages = pages
        self.fail_on_page = fail_on_page
        self.requests: list[dict[str, object]] = []

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        self.requests.append(kwargs)
        page = kwargs["page"]
        assert isinstance(page, int)
        if page == self.fail_on_page:
            return ApiResponse(status_code=503, data=None)
        return ApiResponse(
            status_code=200,
            data={"page": page, "total_pages": len(self.pages), "results": self.pages[page - 1]},
        )


def test_fetch_collects_every_page_and_skips_titles_tmdb_already_marks_adult() -> None:
    tmdb = FakeTMDB(
        [[{"id": 1, "adult": False}, {"id": 2, "adult": True}], [{"id": 3, "adult": False}]]
    )
    pauses: list[float] = []

    ids = fetch_rule_ids(tmdb, STUDIO, pause=pauses.append)

    assert ids == {1, 3}
    assert [request["page"] for request in tmdb.requests] == [1, 2]
    assert tmdb.requests[0]["with_companies"] == "42"
    assert len(pauses) == 1


def test_fetch_limits_an_era_rule_to_its_release_dates() -> None:
    tmdb = FakeTMDB([[{"id": 1, "adult": False}]])

    fetch_rule_ids(tmdb, ERA, pause=lambda _seconds: None)

    assert tmdb.requests[0]["primary_release_date.gte"] == "1971-01-01"
    assert tmdb.requests[0]["primary_release_date.lte"] == "1988-12-31"


def test_a_failed_page_fails_the_whole_rule() -> None:
    tmdb = FakeTMDB([[{"id": 1, "adult": False}], [{"id": 2, "adult": False}]], fail_on_page=2)

    with pytest.raises(RuleFetchError, match="rule:studio-42"):
        fetch_rule_ids(tmdb, STUDIO, pause=lambda _seconds: None)


def test_apply_replaces_only_the_rules_own_rows_and_leaves_held_ids_alone() -> None:
    entries = [
        BlacklistEntry(1, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(2, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        BlacklistEntry(9, "Studio 7, 1971-1988", "rule:era-7"),
    ]

    updated, added, removed = apply_rule(entries, STUDIO, {2, 3, 4})

    assert sorted(updated, key=lambda entry: entry.tmdb_id) == [
        BlacklistEntry(2, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        BlacklistEntry(4, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(9, "Studio 7, 1971-1988", "rule:era-7"),
    ]
    assert (added, removed) == (1, 1)


def test_regenerate_leaves_the_file_unchanged_when_a_later_rule_fails(tmp_path: Path) -> None:
    path = tmp_path / "blacklist.csv"
    write_blacklist(
        [BlacklistEntry(3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12")],
        path,
    )
    before = path.read_bytes()
    failing_company = str(RULES[-1].company_id)

    def tmdb_get(endpoint: str, params: dict[str, object]) -> ApiResponse:
        if params["with_companies"] == failing_company:
            return ApiResponse(status_code=503, data=None)
        results = [{"id": 99, "adult": False}]
        return ApiResponse(status_code=200, data={"total_pages": 1, "results": results})

    with (
        patch("apps.core.services.tmdb_api_client.TMDBApiClient.get", side_effect=tmdb_get),
        pytest.raises(CommandError, match="file unchanged"),
    ):
        call_command("regenerate_blacklist", file=str(path))

    assert path.read_bytes() == before
