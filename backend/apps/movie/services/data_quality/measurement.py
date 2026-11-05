"""Measure how much of TMDB's results each data quality stage removes.

A fixed sample of browses runs through the movie service as the app requests them: each follows
the next-page cursor with its own session tracker, so top-ups and session repeats happen as they
do for a visitor. Every TMDB page the service reads goes through the quality stages in pipeline
order, counting the titles each stage removes. Each request is reconciled with what the service
returned, so the counts describe the pipeline as it runs.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date
from typing import TYPE_CHECKING, Literal

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.core.services.validators import validate_tmdb_paginated_response
from apps.core.tmdb_models.tmdb_responses import TMDBMovieBase, TMDBPaginatedMovieResponse
from apps.movie.schemas import MovieDiscoverFilterSchema, MovieListItemSchema

from ..api_boundary import BrowseServiceParams, transform_to_service_params
from ..deduplication_tracker import DeduplicationTracker
from .filters import (
    filter_movies_by_blacklist,
    filter_movies_by_completeness,
    filter_movies_by_language_script,
    filter_movies_by_rating,
    filter_movies_by_year,
)
from .policy import VoteCountPolicy

if TYPE_CHECKING:
    from apps.movie.schemas import MovieListResponseSchema

    from ..movie_service import MovieService

# The quality stages, in the order apply_data_quality_filters runs them
STAGES: tuple[str, ...] = (
    "Language script",
    "Blacklist",
    "Completeness",
    "Release date",
    "Votes and rating",
)

DEFAULT_REQUESTS = 5
DEFAULT_PAUSE_SECONDS = 0.25

Endpoint = Literal["browse", "now_playing", "upcoming"]

SORT_ORDERS: tuple[str, ...] = (
    "popularity.desc",
    "vote_average.desc",
    "release_date.desc",
    "release_date.asc",
    "original_title.asc",
)


@dataclass(frozen=True)
class SampleBrowse:
    """One browse in the sample: its table group, endpoint and the filters the app sends."""

    group: str
    endpoint: Endpoint
    filters: Mapping[str, str]


SAMPLE: tuple[SampleBrowse, ...] = (
    *(SampleBrowse("Browse", "browse", {"sort_by": sort}) for sort in SORT_ORDERS),
    *(SampleBrowse("Now Playing", "now_playing", {"sort_by": sort}) for sort in SORT_ORDERS),
    *(SampleBrowse("Upcoming", "upcoming", {"sort_by": sort}) for sort in SORT_ORDERS),
    SampleBrowse("English", "browse", {"sort_by": "popularity.desc", "language": "en"}),
    SampleBrowse(
        "Horror 1980s",
        "browse",
        {
            "sort_by": "popularity.desc",
            "genres": "27",
            "release_date_gte": "1980-01-01",
            "release_date_lte": "1989-12-31",
        },
    ),
)


def _no_stage_counts() -> dict[str, int]:
    return dict.fromkeys(STAGES, 0)


@dataclass
class Tally:
    """Counts for one or more browses. `read` is every TMDB result on the pages read."""

    read: int = 0
    removed: dict[str, int] = field(default_factory=_no_stage_counts)
    repeated: int = 0
    shown: int = 0
    requests: int = 0
    topped_up: int = 0
    extra_pages: int = 0

    def add(self, other: Tally) -> None:
        self.read += other.read
        for stage in STAGES:
            self.removed[stage] += other.removed[stage]
        self.repeated += other.repeated
        self.shown += other.shown
        self.requests += other.requests
        self.topped_up += other.topped_up
        self.extra_pages += other.extra_pages


class MeasurementMismatchError(Exception):
    """The service returned titles the stage counts don't account for."""


class RecordingTMDBClient(TMDBApiClient):
    """TMDB client that keeps each discover response and pauses after every call."""

    def __init__(self, pause: Callable[[], None] = lambda: None) -> None:
        super().__init__()
        self.discover_responses: list[ApiResponse] = []
        self._pause = pause

    def get(
        self,
        endpoint: str,
        params: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        **kwargs: object,
    ) -> ApiResponse:
        response = super().get(endpoint, params, headers, **kwargs)
        self._pause()
        if endpoint == "discover/movie":
            self.discover_responses.append(response)
        return response


def _to_list_item(movie: TMDBMovieBase) -> MovieListItemSchema:
    """Convert a TMDB result the way apply_data_quality_filters does."""
    movie_dict = movie.model_dump()
    movie_dict["tmdb_id"] = movie_dict.pop("id")
    if movie_dict.get("release_date") == "":
        movie_dict["release_date"] = None
    return MovieListItemSchema.model_validate(movie_dict)


def count_stage_removals(
    movies: Sequence[TMDBMovieBase], params: BrowseServiceParams
) -> tuple[list[int], dict[str, int]]:
    """Run TMDB's results through the quality stages in order.

    Returns the IDs that pass every stage, in order, and how many titles each stage removed. A
    title counts at the first stage that removes it.
    """
    removed = _no_stage_counts()
    language_kept = filter_movies_by_language_script(list(movies), params.language)
    removed[STAGES[0]] = len(movies) - len(language_kept)

    later_stages: tuple[
        tuple[str, Callable[[list[MovieListItemSchema]], list[MovieListItemSchema]]], ...
    ] = (
        (STAGES[1], filter_movies_by_blacklist),
        (STAGES[2], filter_movies_by_completeness),
        (STAGES[3], lambda kept: filter_movies_by_year(kept, params.year_min, params.year_max)),
        (
            STAGES[4],
            lambda kept: filter_movies_by_rating(
                kept, params.rating_min, params.rating_max, min_vote_count=params.min_vote_count
            ),
        ),
    )
    kept = [_to_list_item(movie) for movie in language_kept]
    for stage, apply_stage in later_stages:
        survivors = apply_stage(kept)
        removed[stage] = len(kept) - len(survivors)
        kept = survivors
    return [movie.tmdb_id for movie in kept], removed


def reconcile(returned: Sequence[int], survivors: Iterable[int], shown_before: set[int]) -> int:
    """Check one request's response against its stage survivors; return how many repeated.

    The service returns every survivor once, in order, except titles shown earlier in the session.

    Raises:
        MeasurementMismatchError: The response differs from what the stage counts predict.
    """
    expected: list[int] = []
    seen = set(shown_before)
    repeated = 0
    for tmdb_id in survivors:
        if tmdb_id in seen:
            repeated += 1
            continue
        seen.add(tmdb_id)
        expected.append(tmdb_id)
    if list(returned) != expected:
        raise MeasurementMismatchError(
            f"The service returned {len(returned)} titles where the stage counts expect "
            f"{len(expected)}; the measurement no longer matches the pipeline."
        )
    return repeated


def _request(
    service: MovieService,
    browse: SampleBrowse,
    cursor: int | None,
    tracker: DeduplicationTracker,
) -> tuple[MovieListResponseSchema, BrowseServiceParams]:
    """Make one request as the app does; return the response and the params its stages used."""
    params = transform_to_service_params(
        MovieDiscoverFilterSchema.model_validate(
            {**browse.filters, "page": 1, "tmdb_page_start": cursor}
        )
    )
    if browse.endpoint == "browse":
        return service.discover_movies(page=1, params=params, dedup_tracker=tracker), params
    fetch = (
        service.get_now_playing_movies
        if browse.endpoint == "now_playing"
        else service.get_upcoming_movies
    )
    # These endpoints set their own vote floor before filtering
    stage_params = params.model_copy(
        update={"min_vote_count": VoteCountPolicy.get_threshold(endpoint=browse.endpoint)}
    )
    return fetch(page=1, params=params, dedup_tracker=tracker), stage_params


def measure_browse(
    service: MovieService,
    client: RecordingTMDBClient,
    browse: SampleBrowse,
    requests: int = DEFAULT_REQUESTS,
) -> Tally:
    """Follow one browse's cursor for up to `requests` requests and count each stage's removals.

    `service` must make its TMDB calls through `client`.
    """
    tally = Tally()
    tracker = DeduplicationTracker(session_id=f"quality-measurement-{uuid.uuid4().hex}")
    shown: set[int] = set()
    cursor: int | None = None
    stage_params: BrowseServiceParams | None = None
    for _ in range(requests):
        first = len(client.discover_responses)
        response, stage_params = _request(service, browse, cursor, tracker)
        pages = [
            validate_tmdb_paginated_response(raw, TMDBPaginatedMovieResponse)
            for raw in client.discover_responses[first:]
        ]
        survivors: list[int] = []
        for page in pages:
            page_survivors, removed = count_stage_removals(page.results, stage_params)
            survivors.extend(page_survivors)
            tally.read += len(page.results)
            for stage in STAGES:
                tally.removed[stage] += removed[stage]
        returned = [movie.tmdb_id for movie in response.results]
        tally.repeated += reconcile(returned, survivors, shown)
        shown.update(returned)
        tally.shown += len(returned)
        tally.requests += 1
        if len(pages) > 1:
            tally.topped_up += 1
            tally.extra_pages += len(pages) - 1
        cursor = response.next_tmdb_page_start
        if cursor is None:
            break
    if stage_params is not None:
        tracker.clear_session(stage_params)
    return tally


def measure_sample(
    service: MovieService,
    client: RecordingTMDBClient,
    sample: Sequence[SampleBrowse] = SAMPLE,
    requests: int = DEFAULT_REQUESTS,
) -> dict[str, Tally]:
    """Measure every browse in the sample; return the tallies by group, in sample order."""
    tallies: dict[str, Tally] = {}
    for browse in sample:
        tallies.setdefault(browse.group, Tally()).add(
            measure_browse(service, client, browse, requests)
        )
    return tallies


def _share(count: int, read: int) -> str:
    return f"{100 * count / read:.1f}%" if read else "-"


def _row(group: str, tally: Tally) -> str:
    cells = [
        group,
        f"{tally.read:,}",
        *(_share(tally.removed[stage], tally.read) for stage in STAGES),
        _share(tally.repeated, tally.read),
        _share(tally.shown, tally.read),
        f"{tally.topped_up} of {tally.requests}",
        f"{tally.extra_pages:,}",
    ]
    return f"| {' | '.join(cells)} |"


def render_table(
    tallies: Mapping[str, Tally],
    measured_on: date,
    blacklist_rows: int,
    requests_per_browse: int,
) -> str:
    """Render the tallies as a dated Markdown table with what the sample covers."""
    total = Tally()
    for tally in tallies.values():
        total.add(tally)
    pages = total.requests + total.extra_pages
    header = [
        "Group",
        "Results read",
        *STAGES,
        "Repeated",
        "Shown",
        "Requests topped up",
        "Extra pages",
    ]
    lines = [
        "## What the quality pipeline removes",
        "",
        f"Measured {measured_on.isoformat()} (UTC) from {total.requests:,} requests that read "
        f"{pages:,} TMDB pages ({total.read:,} results): Browse, Now Playing and Upcoming under "
        "each of the five sort orders, and English and Horror 1980s browses by popularity, the "
        f"first {requests_per_browse} requests of each. The blacklist held {blacklist_rows:,} "
        "titles.",
        "",
        f"| {' | '.join(header)} |",
        f"|---|{'---:|' * (len(header) - 1)}",
        *(_row(group, tally) for group, tally in tallies.items()),
        _row("Total", total),
        "",
        "- Shares are of the results read. Each title counts at the first stage that removes it; "
        "repeated titles were shown earlier in the session or listed twice by TMDB.",
        "- TMDB's query filters act before results arrive (adult titles, videos, the vote-count "
        "floor, rating bounds), so what they exclude isn't counted.",
        "- The language-script stage runs only when a Latin-script language is selected, here in "
        "the English browse. The release-date stage removes undated and pre-1888 titles "
        "everywhere, and titles outside a selected year range, here in Horror 1980s.",
        "- Now Playing and Upcoming skip the vote-count floor, since new releases have few votes.",
        f"- Not covered: search, other filters, and requests past the first "
        f"{requests_per_browse} of each browse.",
        "",
    ]
    return "\n".join(lines)
