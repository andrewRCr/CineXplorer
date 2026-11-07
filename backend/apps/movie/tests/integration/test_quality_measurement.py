"""Tests for measuring how much of TMDB's results each data quality stage removes.

TMDB is replaced at its client; the blacklist, the session tracker and the movie service run for
real.
"""

from __future__ import annotations

from datetime import date
from io import StringIO
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from django.core.management import CommandError, call_command
from django.test import override_settings

from apps.core.services.api_response import ApiResponse
from apps.core.tmdb_models.tmdb_responses import TMDBMovieBase
from apps.movie.constants import TMDB_MAX_PAGE
from apps.movie.models import BlacklistedMovie
from apps.movie.services.api_boundary import BrowseServiceParams
from apps.movie.services.data_quality.filters import apply_data_quality_filters
from apps.movie.services.data_quality.measurement import (
    SORT_ORDERS,
    STAGES,
    MeasurementMismatchError,
    RecordingTMDBClient,
    SampleBrowse,
    Tally,
    browses_with_floor,
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


def every_page(movies: list[TMDBMovieBase]) -> Mock:
    """Answer every discover page with these titles, as if TMDB served its full 500 pages."""

    def answer(
        endpoint: str, params: dict[str, object] | None = None, *args: object, **kwargs: object
    ) -> ApiResponse:
        page = (params or {})["page"]
        assert isinstance(page, int)
        return create_mock_paginated_response(
            movies, page=page, total_pages=TMDB_MAX_PAGE, total_results=20 * TMDB_MAX_PAGE
        )

    return Mock(side_effect=answer)


def sent_params(mock_get: Mock) -> list[dict[str, object]]:
    return [call.args[1] for call in mock_get.call_args_list]


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
        under_floor=1,
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


@patch(TMDB_CLIENT_GET)
def test_a_deep_browse_starts_reading_at_its_tmdb_page(mock_get: Mock) -> None:
    pages = [[movie(20 * page + i) for i in range(1, 21)] for page in range(4)]
    mock_get.side_effect = tmdb_pages(pages).side_effect
    client = RecordingTMDBClient()

    tally = measure_browse(
        MovieService(tmdb_client=client),
        client,
        SampleBrowse(
            "Most Popular (from TMDB page 3)",
            "browse",
            {"sort_by": "popularity.desc"},
            start_page=3,
        ),
        requests=5,
    )

    assert [params["page"] for params in sent_params(mock_get)] == [3, 4]
    assert tally.read == 40
    assert tally.requests == 2


@patch(TMDB_CLIENT_GET)
def test_without_the_query_floor_the_backend_vote_stage_removes_what_tmdb_sends(
    mock_get: Mock,
) -> None:
    page = [
        movie(1, vote_count=2),
        # Under the floor too, but completeness removes it first
        movie(2, vote_count=0, poster_path=""),
        movie(3, vote_count=None),
        # At the floor, so kept
        movie(4, vote_count=3),
        *(movie(i) for i in range(5, 24)),
    ]
    mock_get.side_effect = tmdb_pages([page]).side_effect
    browse = SampleBrowse(
        "Most Popular", "browse", {"sort_by": "popularity.desc", "vote_average_gte": "5"}
    )
    client = RecordingTMDBClient(query_vote_floor=False)

    tally = measure_browse(MovieService(tmdb_client=client), client, browse, requests=5)

    sent = sent_params(mock_get)[0]
    assert "vote_count.gte" not in sent
    assert sent["sort_by"] == "popularity.desc"
    assert sent["vote_average.gte"] == 5
    assert tally.under_floor == 3
    assert tally.removed[VOTES] == 2
    assert tally.removed[COMPLETENESS] == 1
    assert tally.shown == 20

    mock_get.reset_mock()
    default_client = RecordingTMDBClient()
    measure_browse(MovieService(tmdb_client=default_client), default_client, browse, requests=5)
    assert sent_params(mock_get)[0]["vote_count.gte"] == 3


def test_the_floor_off_run_measures_only_browses_with_a_vote_floor() -> None:
    sample = (
        SampleBrowse("Now Playing", "now_playing", {"sort_by": "popularity.desc"}),
        SampleBrowse("Newest", "browse", {"sort_by": "release_date.desc"}),
        SampleBrowse("Highest Rated", "browse", {"sort_by": "vote_average.desc"}),
        SampleBrowse(
            "English (Alphabetical)", "browse", {"sort_by": "original_title.asc", "language": "en"}
        ),
        SampleBrowse(
            "Most Popular (from TMDB page 400)",
            "browse",
            {"sort_by": "popularity.desc"},
            start_page=400,
        ),
    )

    assert [browse.group for browse in browses_with_floor(sample)] == [
        "Highest Rated",
        "English (Alphabetical)",
        "Most Popular (from TMDB page 400)",
    ]


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

    sample = (
        *(SampleBrowse("Browse", "browse", {"sort_by": sort}) for sort in SORT_ORDERS),
        SampleBrowse("English", "browse", {"sort_by": "popularity.desc", "language": "en"}),
    )

    table = render_table(
        {"Browse": browse, "English": english},
        measured_on=date(2026, 11, 5),
        blacklist_rows=2488,
        requests_per_browse=5,
        sample=sample,
    )

    assert table.startswith("## What the quality pipeline removes\n")
    assert (
        "Measured 2026-11-05 (UTC) from 13 requests that read 16 TMDB pages (300 results), up to "
        "the first 5 requests of each browse. Browse runs every sort order the app offers; every "
        "other row is one browse. The blacklist held 2,488 titles."
    ) in table
    assert "| Group | Results read | Language script |" in table
    assert "Under the floor" not in table
    assert (
        "| Browse | 200 | 0.0% | 2.0% | 5.0% | 1.0% | 0.0% | 2.0% | 90.0% | 1 of 9 | 1 |"
    ) in table
    assert (
        "| English | 100 | 5.0% | 0.0% | 5.0% | 0.0% | 0.0% | 0.0% | 90.0% | 1 of 4 | 2 |"
    ) in table
    assert (
        "| Total | 300 | 1.7% | 1.3% | 5.0% | 0.7% | 0.0% | 1.3% | 90.0% | 2 of 13 | 3 |"
    ) in table
    assert "so what they exclude isn't counted here." in table
    assert "It doesn't apply to Newest in Browse, since new releases have few votes." in table
    assert "requests past the first 5 of each browse." in table


def test_the_floor_off_table_counts_what_the_floor_keeps_out() -> None:
    highest_rated = Tally(
        read=100,
        removed={LANGUAGE: 0, BLACKLIST: 0, COMPLETENESS: 5, RELEASE_DATE: 0, VOTES: 8},
        under_floor=10,
        repeated=0,
        shown=87,
        requests=5,
        topped_up=4,
        extra_pages=6,
    )

    table = render_table(
        {"Highest Rated": highest_rated},
        measured_on=date(2026, 11, 6),
        blacklist_rows=2488,
        requests_per_browse=5,
        sample=(SampleBrowse("Highest Rated", "browse", {"sort_by": "vote_average.desc"}),),
        query_vote_floor=False,
    )

    assert table.startswith("## What the vote floor keeps out\n")
    assert (
        "Measured 2026-11-06 (UTC) from 5 requests that read 11 TMDB pages (100 results), up to "
        "the first 5 requests of each browse, with the vote-count floor left off TMDB's query. "
        "Each row is one browse."
    ) in table
    assert "| Group | Results read | Under the floor | Language script |" in table
    assert (
        "| Highest Rated | 100 | 10.0% | 0.0% | 0.0% | 5.0% | 0.0% | 8.0% | 0.0% | 87.0% | "
        "4 of 5 | 6 |"
    ) in table
    assert "only the backend's vote stage applied it" in table
    assert "whichever stage removed it first" in table


def test_the_notes_name_the_rows_each_conditional_stage_acts_in() -> None:
    sample = (
        *(SampleBrowse("Now Playing", "now_playing", {"sort_by": sort}) for sort in SORT_ORDERS),
        SampleBrowse("Highest Rated", "browse", {"sort_by": "vote_average.desc"}),
        SampleBrowse(
            "English (Newest)", "browse", {"sort_by": "release_date.desc", "language": "en"}
        ),
        SampleBrowse(
            "Horror 1980s (Most Popular)",
            "browse",
            {
                "sort_by": "popularity.desc",
                "genres": "27",
                "release_date_gte": "1980-01-01",
                "release_date_lte": "1989-12-31",
            },
        ),
    )

    table = render_table(
        {browse.group: Tally() for browse in sample},
        measured_on=date(2026, 11, 6),
        blacklist_rows=2488,
        requests_per_browse=20,
        sample=sample,
    )

    assert (
        "Now Playing runs every sort order the app offers; every other row is one browse."
    ) in table
    assert "a Latin-script language is selected, here in English (Newest)." in table
    assert "outside a selected year range, here in Horror 1980s (Most Popular)." in table
    assert "The vote-count floor is 3 votes, or 200 for a rating sort without a rating range." in (
        table
    )
    assert (
        "It doesn't apply to Now Playing and English (Newest), since new releases have few votes."
    ) in table


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
    # Released in 1985 with 500 votes, so every browse in the sample keeps all 20
    titles = [movie(i, release_date="1985-06-01", vote_count=500) for i in range(1, 21)]
    mock_get.side_effect = every_page(titles).side_effect
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
    # 21 browses of one request each, every one reading a single page
    assert "| Total | 420 |" in table
    for row in (
        "Most Popular",
        "Highest Rated",
        "Newest",
        "Oldest",
        "Alphabetical",
        "Now Playing",
        "Upcoming",
        "English (Most Popular)",
        "English (Newest)",
        "English (Alphabetical)",
        "Horror 1980s (Most Popular)",
        "Most Popular (from TMDB page 100)",
        "Most Popular (from TMDB page 400)",
    ):
        assert f"| {row} | " in table
    assert {100, 400} <= {params["page"] for params in sent_params(mock_get)}
    assert str(output) in stdout.getvalue()


@patch(TMDB_CLIENT_GET)
def test_the_command_can_leave_the_vote_floor_off_tmdbs_query(
    mock_get: Mock, tmp_path: Path
) -> None:
    titles = [movie(i, release_date="1985-06-01", vote_count=500) for i in range(2, 22)]
    mock_get.side_effect = every_page(
        [movie(1, release_date="1985-06-01", vote_count=1), *titles]
    ).side_effect
    output = tmp_path / "table.md"

    call_command(
        "measure_quality_filters",
        "--requests",
        "1",
        "--pause",
        "0",
        "--query-vote-floor",
        "off",
        "--output",
        str(output),
        stdout=StringIO(),
    )

    table = output.read_text()
    assert table.startswith("## What the vote floor keeps out")
    # The nine browses with a vote floor, one request each, each reading 21 results
    assert "| Total | 189 | 4.8% |" in table
    assert "| Newest |" not in table
    assert "| Now Playing |" not in table
    assert all("vote_count.gte" not in params for params in sent_params(mock_get))
