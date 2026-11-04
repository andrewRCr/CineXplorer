"""Tests for the rules that regenerate their part of the blacklist file from TMDB."""

from __future__ import annotations

from io import StringIO
from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.management import CommandError, call_command

from apps.core.services.api_response import ApiResponse
from apps.movie.services.data_quality.blacklist_file import (
    BlacklistEntry,
    read_blacklist,
    write_blacklist,
)
from apps.movie.services.data_quality.blacklist_rules import (
    RULES,
    BlacklistRule,
    RuleFetchError,
    apply_rules,
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
        self.total_results = sum(len(page) for page in pages)

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        self.requests.append(kwargs)
        page = kwargs["page"]
        assert isinstance(page, int)
        if page == self.fail_on_page:
            return ApiResponse(status_code=503, data=None)
        return ApiResponse(
            status_code=200,
            data={
                "page": page,
                "total_pages": len(self.pages),
                "total_results": self.total_results,
                "results": self.pages[page - 1],
            },
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


def test_fetch_reads_the_pages_in_release_date_order() -> None:
    tmdb = FakeTMDB([[{"id": 1, "adult": False}], [{"id": 2, "adult": False}]])

    fetch_rule_ids(tmdb, STUDIO, pause=lambda _seconds: None)

    assert {request["sort_by"] for request in tmdb.requests} == {"primary_release_date.asc"}


def test_fetch_fails_when_the_pages_repeat_titles_and_miss_others() -> None:
    tmdb = FakeTMDB(
        [[{"id": 1, "adult": False}, {"id": 2, "adult": False}], [{"id": 2, "adult": False}]]
    )

    with pytest.raises(RuleFetchError, match="rule:studio-42: TMDB reports 3 titles"):
        fetch_rule_ids(tmdb, STUDIO, pause=lambda _seconds: None)


def test_fetch_limits_an_era_rule_to_its_release_dates() -> None:
    tmdb = FakeTMDB([[{"id": 1, "adult": False}]])

    fetch_rule_ids(tmdb, ERA, pause=lambda _seconds: None)

    assert tmdb.requests[0]["primary_release_date.gte"] == "1971-01-01"
    assert tmdb.requests[0]["primary_release_date.lte"] == "1988-12-31"


def test_a_failed_page_fails_the_whole_rule() -> None:
    tmdb = FakeTMDB([[{"id": 1, "adult": False}], [{"id": 2, "adult": False}]], fail_on_page=2)

    with pytest.raises(RuleFetchError, match="rule:studio-42"):
        fetch_rule_ids(tmdb, STUDIO, pause=lambda _seconds: None)


class ScriptedTMDB:
    """Answers each discover page successfully with the response body given for it."""

    def __init__(self, *bodies: dict[str, object]) -> None:
        self.bodies = bodies

    def discover_movies(self, **kwargs: object) -> ApiResponse:
        page = kwargs["page"]
        assert isinstance(page, int)
        return ApiResponse(status_code=200, data=self.bodies[page - 1])


MISSING_COUNTS = "rule:studio-42: TMDB page 1 is missing its page count, result count or results"
NO_ID = "rule:studio-42: TMDB page 1 has a result without an ID"


@pytest.mark.parametrize(
    ("data", "error"),
    [
        pytest.param(
            {"total_results": 1, "results": [{"id": 1}]}, MISSING_COUNTS, id="no page count"
        ),
        pytest.param(
            {"total_pages": "1", "total_results": 1, "results": [{"id": 1}]},
            MISSING_COUNTS,
            id="page count not a number",
        ),
        pytest.param(
            {"total_pages": 1, "results": [{"id": 1}]}, MISSING_COUNTS, id="no result count"
        ),
        pytest.param(
            {"total_pages": 1, "total_results": "1", "results": [{"id": 1}]},
            MISSING_COUNTS,
            id="result count not a number",
        ),
        pytest.param({"total_pages": 1, "total_results": 1}, MISSING_COUNTS, id="no results"),
        pytest.param(
            {"total_pages": 1, "total_results": 1, "results": "none"},
            MISSING_COUNTS,
            id="results not a list",
        ),
        pytest.param(
            {"total_pages": 1, "total_results": 1, "results": ["Some Film"]},
            NO_ID,
            id="result not an object",
        ),
        pytest.param(
            {"total_pages": 1, "total_results": 1, "results": [{"adult": False}]},
            NO_ID,
            id="result without an ID",
        ),
        pytest.param(
            {"total_pages": 1, "total_results": 1, "results": [{"id": "1"}]},
            NO_ID,
            id="ID not a number",
        ),
        pytest.param(
            {"total_pages": 501, "total_results": 1, "results": [{"id": 1}]},
            "rule:studio-42: TMDB reports 501 pages but serves only 500",
            id="more pages than TMDB serves",
        ),
    ],
)
def test_a_malformed_or_incomplete_page_fails_the_rule(
    data: dict[str, object], error: str
) -> None:
    with pytest.raises(RuleFetchError, match=error):
        fetch_rule_ids(ScriptedTMDB(data), STUDIO, pause=lambda _seconds: None)


def test_fetch_fails_when_a_later_page_reports_different_counts() -> None:
    tmdb = ScriptedTMDB(
        {"total_pages": 3, "total_results": 5, "results": [{"id": 1}, {"id": 2}]},
        {"total_pages": 2, "total_results": 4, "results": [{"id": 3}, {"id": 4}]},
    )

    with pytest.raises(RuleFetchError, match="rule:studio-42: TMDB page 2 reports 4 titles"):
        fetch_rule_ids(tmdb, STUDIO, pause=lambda _seconds: None)


def by_id(entries: list[BlacklistEntry]) -> list[BlacklistEntry]:
    return sorted(entries, key=lambda entry: entry.tmdb_id)


def test_apply_replaces_the_rules_rows_and_leaves_other_sources_alone() -> None:
    entries = [
        BlacklistEntry(1, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(2, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        BlacklistEntry(9, "Studio 7, 1971-1988", "rule:era-7"),
    ]

    updated, changes = apply_rules(entries, [(STUDIO, {2, 3, 4})])

    assert by_id(updated) == [
        BlacklistEntry(2, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"),
        BlacklistEntry(4, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(9, "Studio 7, 1971-1988", "rule:era-7"),
    ]
    assert changes == {"rule:studio-42": (1, 1)}


def test_an_id_two_rules_match_goes_to_the_earlier_rule() -> None:
    updated, _changes = apply_rules([], [(STUDIO, {5}), (ERA, {5, 6})])

    assert by_id(updated) == [
        BlacklistEntry(5, "Studio 42, catalogue-wide", "rule:studio-42"),
        BlacklistEntry(6, "Studio 7, 1971-1988", "rule:era-7"),
    ]


def test_an_id_that_moves_to_an_earlier_rule_stays_listed() -> None:
    entries = [BlacklistEntry(5, "Studio 7, 1971-1988", "rule:era-7")]

    updated, changes = apply_rules(entries, [(STUDIO, {5}), (ERA, set())])

    assert updated == [BlacklistEntry(5, "Studio 42, catalogue-wide", "rule:studio-42")]
    assert changes == {"rule:studio-42": (1, 0), "rule:era-7": (0, 1)}


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
        return ApiResponse(
            status_code=200, data={"total_pages": 1, "total_results": 1, "results": results}
        )

    with (
        patch("apps.core.services.tmdb_api_client.TMDBApiClient.get", side_effect=tmdb_get),
        pytest.raises(CommandError, match="file unchanged"),
    ):
        call_command("regenerate_blacklist", file=str(path))

    assert path.read_bytes() == before


def test_regenerate_moves_an_id_to_the_earlier_rule_and_keeps_hand_picks(tmp_path: Path) -> None:
    first, last = RULES[0], RULES[-1]
    hand_pick = BlacklistEntry(
        3, "Mislabeled adult content on TMDB", "hand:browse-reports-2025-12"
    )
    path = tmp_path / "blacklist.csv"
    write_blacklist([hand_pick, BlacklistEntry(5, last.reason, last.source)], path)

    def tmdb_get(endpoint: str, params: dict[str, object]) -> ApiResponse:
        matches = params["with_companies"] == str(first.company_id)
        results = [{"id": 3, "adult": False}, {"id": 5, "adult": False}] if matches else []
        return ApiResponse(
            status_code=200,
            data={"total_pages": 1, "total_results": len(results), "results": results},
        )

    with patch("apps.core.services.tmdb_api_client.TMDBApiClient.get", side_effect=tmdb_get):
        call_command("regenerate_blacklist", file=str(path), stdout=StringIO())

    assert read_blacklist(path) == [hand_pick, BlacklistEntry(5, first.reason, first.source)]
