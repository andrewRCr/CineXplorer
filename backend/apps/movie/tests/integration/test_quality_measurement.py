"""Tests for measuring how much of TMDB's results each data quality stage removes.

TMDB is replaced at its client; the blacklist, the session tracker and the movie service run for
real.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import date
from io import StringIO
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import override_settings

from apps.core.services.api_response import ApiResponse
from apps.core.tmdb_models.tmdb_responses import TMDBMovieBase
from apps.movie.models import BlacklistedMovie
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.data_quality.filters import (
    BLACKLIST_CACHE_KEY,
    apply_data_quality_filters,
)
from apps.movie.services.data_quality.measurement import (
    STAGES,
    MeasurementMismatchError,
    RecordingTMDBClient,
    SampleBrowse,
    Tally,
    count_stage_removals,
    measure_browse,
    reconcile,
    render_table,
)
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie

pytestmark = pytest.mark.django_db

LANGUAGE, BLACKLIST, COMPLETENESS, RELEASE_DATE, VOTES = STAGES


@pytest.fixture(autouse=True)
def fresh_blacklist_cache() -> Iterator[None]:
    cache.delete(BLACKLIST_CACHE_KEY)
    yield
    cache.delete(BLACKLIST_CACHE_KEY)


def movie(tmdb_id: int, **overrides: object) -> TMDBMovieBase:
    """A title that passes every stage unless an override says otherwise."""
    base = create_tmdb_movie(tmdb_id, f"Movie {tmdb_id}", "2001-01-01", 7.0)
    return base.model_copy(update=overrides)


def tmdb_pages(pages: list[list[TMDBMovieBase]]) -> Mock:
    """Answer TMDB's discover endpoint with these pages, by the page number requested."""

    def answer(
        endpoint: str, params: dict[str, object] | None = None, *args: object, **kwargs: object
    ) -> ApiResponse:
        assert endpoint == "discover/movie"
        page = (params or {})["page"]
        assert isinstance(page, int)
        return create_mock_paginated_response(
            pages[page - 1], page=page, total_pages=len(pages), total_results=20 * len(pages)
        )

    return Mock(side_effect=answer)


def test_each_title_counts_at_the_first_stage_that_removes_it() -> None:
    BlacklistedMovie.objects.create(tmdb_id=3, reason="Test")
    movies = [
        movie(1),
        movie(2, original_title="東京物語"),
        movie(3),
        movie(4, poster_path=""),
        movie(5, release_date=""),
        movie(6, vote_count=1),
        # Removed by the language-script stage before completeness sees its missing poster
        movie(7, original_title="東京物語", poster_path=""),
    ]
    params = BrowseServiceParams(language="en", min_vote_count=3)

    survivors, removed = count_stage_removals(movies, params)

    assert survivors == [1]
    assert removed == {LANGUAGE: 2, BLACKLIST: 1, COMPLETENESS: 1, RELEASE_DATE: 1, VOTES: 1}
    pipeline = apply_data_quality_filters(movies, None, None, None, None, 3, "en")
    assert [m.tmdb_id for m in pipeline] == survivors


def test_reconcile_counts_repeats_and_rejects_titles_the_stages_removed() -> None:
    # 2 was shown by an earlier request, and TMDB lists 3 twice
    assert reconcile(returned=[1, 3], survivors=[1, 2, 3, 3], shown_before={2}) == 2

    with pytest.raises(MeasurementMismatchError):
        reconcile(returned=[1, 3, 4], survivors=[1, 2, 3], shown_before={2})
    with pytest.raises(MeasurementMismatchError):
        reconcile(returned=[1], survivors=[1, 3], shown_before=set())


@patch(TMDB_CLIENT_GET)
def test_a_browse_follows_the_cursor_and_counts_the_pages_a_top_up_reads(
    mock_get: Mock,
) -> None:
    page_1 = [movie(1, poster_path=""), *(movie(i) for i in range(2, 21))]
    # TMDB lists title 5 again on page 2
    page_2 = [movie(5), *(movie(i) for i in range(22, 41))]
    page_3 = [movie(41, vote_count=0), *(movie(i) for i in range(42, 61))]
    mock_get.side_effect = tmdb_pages([page_1, page_2, page_3]).side_effect
    pauses: list[None] = []
    client = RecordingTMDBClient(pause=lambda: pauses.append(None))

    tally = measure_browse(
        MovieService(tmdb_client=client),
        client,
        SampleBrowse("Browse", "browse", {"sort_by": "popularity.desc"}),
        requests=5,
    )

    # Request 1 reads pages 1 and 2 to top up its 19 titles; request 2 reads page 3, the last
    assert tally == Tally(
        read=60,
        removed={LANGUAGE: 0, BLACKLIST: 0, COMPLETENESS: 1, RELEASE_DATE: 0, VOTES: 1},
        repeated=1,
        shown=57,
        requests=2,
        topped_up=1,
        extra_pages=1,
    )
    assert len(pauses) == 3


@patch(TMDB_CLIENT_GET)
def test_now_playing_counts_no_vote_removals_since_it_skips_the_vote_floor(
    mock_get: Mock,
) -> None:
    mock_get.side_effect = tmdb_pages(
        [[movie(1, vote_count=0), *(movie(i) for i in range(2, 21))]]
    ).side_effect
    client = RecordingTMDBClient()

    tally = measure_browse(
        MovieService(tmdb_client=client),
        client,
        SampleBrowse("Now Playing", "now_playing", {"sort_by": "popularity.desc"}),
        requests=5,
    )

    assert tally.removed[VOTES] == 0
    assert tally.shown == 20
    sent = mock_get.call_args.args[1]
    assert "primary_release_date.gte" in sent


def test_the_table_shows_each_stage_as_a_share_of_the_results_read() -> None:
    browse = Tally(
        read=200,
        removed={LANGUAGE: 0, BLACKLIST: 4, COMPLETENESS: 10, RELEASE_DATE: 2, VOTES: 0},
        repeated=4,
        shown=180,
        requests=9,
        topped_up=1,
        extra_pages=1,
    )
    english = Tally(
        read=100,
        removed={LANGUAGE: 5, BLACKLIST: 0, COMPLETENESS: 5, RELEASE_DATE: 0, VOTES: 0},
        repeated=0,
        shown=90,
        requests=4,
        topped_up=1,
        extra_pages=2,
    )

    table = render_table(
        {"Browse": browse, "English": english},
        measured_on=date(2026, 11, 5),
        blacklist_rows=2488,
        requests_per_browse=5,
    )

    assert (
        "Measured 2026-11-05 (UTC) from 13 requests that read 16 TMDB pages (300 results)"
    ) in table
    assert "The blacklist held 2,488 titles." in table
    assert (
        "| Browse | 200 | 0.0% | 2.0% | 5.0% | 1.0% | 0.0% | 2.0% | 90.0% | 1 of 9 | 1 |"
    ) in table
    assert (
        "| English | 100 | 5.0% | 0.0% | 5.0% | 0.0% | 0.0% | 0.0% | 90.0% | 1 of 4 | 2 |"
    ) in table
    assert (
        "| Total | 300 | 1.7% | 1.3% | 5.0% | 0.7% | 0.0% | 1.3% | 90.0% | 2 of 13 | 3 |"
    ) in table
    assert "the first 5 requests of each" in table


@override_settings(ENVIRONMENT="production")
@patch(TMDB_CLIENT_GET)
def test_the_command_runs_only_in_development(mock_get: Mock) -> None:
    with pytest.raises(CommandError, match="only in development"):
        call_command("measure_quality_filters", "--pause", "0")

    mock_get.assert_not_called()


@patch(TMDB_CLIENT_GET)
def test_the_command_measures_the_sample_and_writes_the_table(
    mock_get: Mock, tmp_path: Path
) -> None:
    mock_get.side_effect = tmdb_pages([[movie(i) for i in range(1, 21)]]).side_effect
    output = tmp_path / "table.md"
    stdout = StringIO()

    call_command(
        "measure_quality_filters",
        "--requests",
        "1",
        "--pause",
        "0",
        "--output",
        str(output),
        stdout=stdout,
    )

    table = output.read_text()
    # 17 browses of one request each, every one reading the same single page
    assert ("| Total | 340 |") in table
    assert "| Upcoming |" in table
    assert "| Horror 1980s |" in table
    assert str(output) in stdout.getvalue()
