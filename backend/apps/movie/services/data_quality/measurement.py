"""Measure how much of TMDB's results each data quality stage removes.

A fixed sample of browses runs through the movie service as the app requests them: each follows
the next-page cursor with its own session tracker, so top-ups and session repeats happen as they
do for a visitor. Every TMDB page the service reads goes through the quality stages in pipeline
order, counting the titles each stage removes. Each request is reconciled with what the service
returned, so the counts describe the pipeline as it runs.

A run can leave the vote-count floor off TMDB's query, so that the backend's vote stage, which
applies the same floor, counts what the floor keeps out.
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
from ..deduplication_tracker import DeduplicationTracker, HashableParams
from .filters import (
    LATIN_SCRIPT_LANGUAGES,
    filter_movies_by_blacklist,
    filter_movies_by_completeness,
    filter_movies_by_language_script,
    filter_movies_by_rating,
    filter_movies_by_year,
)
from .policy import (
    EARLIEST_VALID_RELEASE_YEAR,
    MODERATE_VOTE_THRESHOLD,
    STRICT_VOTE_THRESHOLD,
    VoteCountPolicy,
)

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

# The app's sort orders, by the labels its sort menu shows
SORT_LABELS: dict[str, str] = {
    "popularity.desc": "Most Popular",
    "vote_average.desc": "Highest Rated",
    "release_date.desc": "Newest",
    "release_date.asc": "Oldest",
    "original_title.asc": "Alphabetical",
}
SORT_ORDERS: tuple[str, ...] = tuple(SORT_LABELS)


@dataclass(frozen=True)
class SampleBrowse:
    """One browse in the sample: its table group, endpoint and the filters the app sends.

    `start_page` is the TMDB page its first request reads, where a visitor's cursor would be after
    scrolling that deep; without it the browse starts at the top.
    """

    group: str
    endpoint: Endpoint
    filters: Mapping[str, str]
    start_page: int | None = None


SAMPLE: tuple[SampleBrowse, ...] = (
    *(SampleBrowse(label, "browse", {"sort_by": sort}) for sort, label in SORT_LABELS.items()),
    *(SampleBrowse("Now Playing", "now_playing", {"sort_by": sort}) for sort in SORT_ORDERS),
    *(SampleBrowse("Upcoming", "upcoming", {"sort_by": sort}) for sort in SORT_ORDERS),
    *(
        SampleBrowse(
            f"English ({SORT_LABELS[sort]})", "browse", {"sort_by": sort, "language": "en"}
        )
        for sort in ("popularity.desc", "release_date.desc", "original_title.asc")
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
    *(
        SampleBrowse(
            f"Most Popular (from TMDB page {page})",
            "browse",
            {"sort_by": "popularity.desc"},
            start_page=page,
        )
        for page in (100, 400)
    ),
)


def _no_stage_counts() -> dict[str, int]:
    return dict.fromkeys(STAGES, 0)


@dataclass
class Tally:
    """Counts for one or more browses. `read` is every TMDB result on the pages read.

    `under_floor` counts the results read below their browse's vote floor, whichever stage
    removed them first.
    """

    read: int = 0
    removed: dict[str, int] = field(default_factory=_no_stage_counts)
    under_floor: int = 0
    repeated: int = 0
    shown: int = 0
    requests: int = 0
    topped_up: int = 0
    extra_pages: int = 0

    def add(self, other: Tally) -> None:
        self.read += other.read
        for stage in STAGES:
            self.removed[stage] += other.removed[stage]
        self.under_floor += other.under_floor
        self.repeated += other.repeated
        self.shown += other.shown
        self.requests += other.requests
        self.topped_up += other.topped_up
        self.extra_pages += other.extra_pages


class MeasurementMismatchError(Exception):
    """The service returned titles the stage counts don't account for."""


class RecordingTMDBClient(TMDBApiClient):
    """TMDB client that keeps each discover response and pauses after every call.

    With `query_vote_floor` off, discover queries go out without their vote-count floor, leaving
    the backend's vote stage to apply it alone.
    """

    def __init__(
        self, pause: Callable[[], None] = lambda: None, *, query_vote_floor: bool = True
    ) -> None:
        super().__init__()
        self.discover_responses: list[ApiResponse] = []
        self._pause = pause
        self._query_vote_floor = query_vote_floor

    def get(
        self,
        endpoint: str,
        params: dict[str, object] | None = None,
        headers: dict[str, str] | None = None,
        **kwargs: object,
    ) -> ApiResponse:
        if endpoint == "discover/movie" and params is not None and not self._query_vote_floor:
            params = {key: value for key, value in params.items() if key != "vote_count.gte"}
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


def count_under_floor(movies: Sequence[TMDBMovieBase], floor: int | None) -> int:
    """Count the titles below a vote floor, judged as the vote stage judges them."""
    if floor is None:
        return 0
    return sum(1 for movie in movies if movie.vote_count is None or movie.vote_count < floor)


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


def _service_params(browse: SampleBrowse, cursor: int | None) -> BrowseServiceParams:
    """The params the app sends the service for one request of this browse."""
    return transform_to_service_params(
        MovieDiscoverFilterSchema.model_validate(
            {**browse.filters, "page": 1, "tmdb_page_start": cursor}
        )
    )


def stage_params(browse: SampleBrowse) -> BrowseServiceParams:
    """The params the quality stages use for this browse, including its vote floor."""
    params = _service_params(browse, browse.start_page)
    if browse.endpoint == "browse":
        return params
    # These endpoints set their own vote floor before filtering
    return params.model_copy(
        update={"min_vote_count": VoteCountPolicy.get_threshold(endpoint=browse.endpoint)}
    )


def browses_with_floor(sample: Sequence[SampleBrowse]) -> tuple[SampleBrowse, ...]:
    """The browses that send TMDB a vote floor, which a run with the floor left off measures."""
    return tuple(browse for browse in sample if stage_params(browse).min_vote_count is not None)


def _request(
    service: MovieService,
    browse: SampleBrowse,
    cursor: int | None,
    tracker: DeduplicationTracker,
) -> MovieListResponseSchema:
    """Make one request as the app does."""
    params = _service_params(browse, cursor)
    if browse.endpoint == "browse":
        return service.discover_movies(page=1, params=params, dedup_tracker=tracker)
    fetch = (
        service.get_now_playing_movies
        if browse.endpoint == "now_playing"
        else service.get_upcoming_movies
    )
    return fetch(page=1, params=params, dedup_tracker=tracker)


class _MeasurementTracker(DeduplicationTracker):
    """Remove a temporary browse's state using the service's effective filters."""

    def __init__(self) -> None:
        super().__init__(session_id=f"quality-measurement-{uuid.uuid4().hex}")
        self._recorded_params: list[HashableParams] = []

    def add_returned_ids(self, params: HashableParams, ids: list[int]) -> None:
        if ids:
            self._recorded_params.append(params)
        super().add_returned_ids(params, ids)

    def clear_recorded_sessions(self) -> None:
        """Clear each filter combination used, including across a date-window change."""
        for params in self._recorded_params:
            self.clear_session(params)


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
    tracker = _MeasurementTracker()
    params = stage_params(browse)
    shown: set[int] = set()
    cursor = browse.start_page
    try:
        for _ in range(requests):
            first = len(client.discover_responses)
            response = _request(service, browse, cursor, tracker)
            pages = [
                validate_tmdb_paginated_response(raw, TMDBPaginatedMovieResponse)
                for raw in client.discover_responses[first:]
            ]
            survivors: list[int] = []
            for page in pages:
                page_survivors, removed = count_stage_removals(page.results, params)
                survivors.extend(page_survivors)
                tally.read += len(page.results)
                tally.under_floor += count_under_floor(page.results, params.min_vote_count)
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
        return tally
    finally:
        tracker.clear_recorded_sessions()


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


def _join(items: Sequence[str]) -> str:
    """Join as prose: "A", "A and B", "A, B and C"."""
    if len(items) < 2:
        return "".join(items)
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _sort_label(browse: SampleBrowse) -> str:
    return SORT_LABELS[browse.filters.get("sort_by", "popularity.desc")]


def _by_group(sample: Sequence[SampleBrowse]) -> dict[str, list[SampleBrowse]]:
    groups: dict[str, list[SampleBrowse]] = {}
    for browse in sample:
        groups.setdefault(browse.group, []).append(browse)
    return groups


def _describe_rows(groups: Mapping[str, Sequence[SampleBrowse]]) -> str:
    """Say which rows combine several browses, and which sort orders they run."""
    combined = {group: browses for group, browses in groups.items() if len(browses) > 1}
    if not combined:
        return "Each row is one browse."
    every_sort = [
        group
        for group, browses in combined.items()
        if sorted(map(_sort_label, browses)) == sorted(SORT_LABELS.values())
    ]
    parts: list[str] = []
    if every_sort:
        verb = "runs" if len(every_sort) == 1 else "each run"
        parts.append(f"{_join(every_sort)} {verb} every sort order the app offers")
    parts.extend(
        f"{group} runs {_join([_sort_label(browse) for browse in browses])}"
        for group, browses in combined.items()
        if group not in every_sort
    )
    if len(combined) < len(groups):
        parts.append("every other row is one browse")
    sentence = "; ".join(parts)
    return f"{sentence[0].upper()}{sentence[1:]}."


def _stage_notes(groups: Mapping[str, Sequence[SampleBrowse]]) -> list[str]:
    """Name the rows where the conditional stages act, from each browse's own params."""
    params = {
        group: [stage_params(browse) for browse in browses] for group, browses in groups.items()
    }
    language_rows = [
        group
        for group, group_params in params.items()
        if any(
            p.language is not None and p.language in LATIN_SCRIPT_LANGUAGES for p in group_params
        )
    ]
    year_rows = [
        group
        for group, group_params in params.items()
        if any(p.year_min is not None or p.year_max is not None for p in group_params)
    ]
    no_floor: list[str] = []
    for group, browses in groups.items():
        missing = [
            browse
            for browse, browse_params in zip(browses, params[group], strict=True)
            if browse_params.min_vote_count is None
        ]
        if len(missing) == len(browses):
            no_floor.append(group)
        elif missing:
            no_floor.append(f"{_join([_sort_label(browse) for browse in missing])} in {group}")

    language = "- The language-script stage runs only when a Latin-script language is selected"
    language += (
        f", here in {_join(language_rows)}." if language_rows else "; no row here selects one."
    )
    release_date = (
        f"- The release-date stage removes undated and pre-{EARLIEST_VALID_RELEASE_YEAR} titles "
        "everywhere, and titles outside a selected year range"
    )
    release_date += f", here in {_join(year_rows)}." if year_rows else "."
    floor = (
        f"- The vote-count floor is {MODERATE_VOTE_THRESHOLD} votes, or {STRICT_VOTE_THRESHOLD} "
        "for a rating sort without a rating range."
    )
    if no_floor:
        floor += f" It doesn't apply to {_join(no_floor)}, since new releases have few votes."
    return [language, release_date, floor]


def _row(group: str, tally: Tally, *, under_floor: bool) -> str:
    cells = [
        group,
        f"{tally.read:,}",
        *([_share(tally.under_floor, tally.read)] if under_floor else []),
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
    *,
    sample: Sequence[SampleBrowse],
    query_vote_floor: bool = True,
) -> str:
    """Render the tallies as a dated Markdown table that states what `sample` covers.

    With `query_vote_floor` off, the table counts what the vote floor keeps out.
    """
    total = Tally()
    for tally in tallies.values():
        total.add(tally)
    pages = total.requests + total.extra_pages
    groups = _by_group(sample)
    header = [
        "Group",
        "Results read",
        *([] if query_vote_floor else ["Under the floor"]),
        *STAGES,
        "Repeated",
        "Shown",
        "Requests topped up",
        "Extra pages",
    ]
    if query_vote_floor:
        title = "## What the quality pipeline removes"
        floor_setting = ""
        query_note = (
            "- TMDB's query filters act before results arrive (adult titles, videos, the "
            "vote-count floor, rating bounds), so what they exclude isn't counted here."
        )
    else:
        title = "## What the vote floor keeps out"
        floor_setting = ", with the vote-count floor left off TMDB's query"
        query_note = (
            "- The vote-count floor was left off TMDB's query, so only the backend's vote stage "
            "applied it. Under the floor counts every result read below its browse's floor, "
            "whichever stage removed it first. TMDB's other query filters (adult titles, videos, "
            "rating bounds) still act before results arrive."
        )
    lines = [
        title,
        "",
        f"Measured {measured_on.isoformat()} (UTC) from {total.requests:,} requests that read "
        f"{pages:,} TMDB pages ({total.read:,} results), up to the first {requests_per_browse} "
        f"requests of each browse{floor_setting}. {_describe_rows(groups)} The blacklist held "
        f"{blacklist_rows:,} titles.",
        "",
        f"| {' | '.join(header)} |",
        f"|---|{'---:|' * (len(header) - 1)}",
        *(
            _row(group, tally, under_floor=not query_vote_floor)
            for group, tally in tallies.items()
        ),
        _row("Total", total, under_floor=not query_vote_floor),
        "",
        "- Shares are of the results read. Each title counts at the first stage that removes it; "
        "repeated titles were shown earlier in the session or listed twice by TMDB.",
        "- A browse ends early, as it does in the app, when TMDB has no more pages or a request "
        "has nothing left to show.",
        query_note,
        *_stage_notes(groups),
        "- Not covered: search, other filters, and requests past the first "
        f"{requests_per_browse} of each browse.",
        "",
    ]
    return "\n".join(lines)
