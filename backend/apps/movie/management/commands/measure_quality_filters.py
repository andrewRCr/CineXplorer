"""Measure how much of TMDB's results each data quality stage removes, as a Markdown table.

Runs a fixed sample of browses against TMDB through the movie service, pausing between calls. The
blacklist stage counts what the database's blacklist holds, so sync it first. With the vote floor
off, the browses that send TMDB a vote-count floor run without it, and the table counts what the
floor keeps out.

Usage:
    python manage.py measure_quality_filters
    python manage.py measure_quality_filters --requests 3 --output quality.md
    python manage.py measure_quality_filters --query-vote-floor off
"""

from __future__ import annotations

import time
from argparse import ArgumentParser
from datetime import UTC, datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from ninja.errors import HttpError

from apps.movie.models import BlacklistedMovie
from apps.movie.services.data_quality.measurement import (
    DEFAULT_PAUSE_SECONDS,
    DEFAULT_REQUESTS,
    SAMPLE,
    MeasurementMismatchError,
    RecordingTMDBClient,
    browses_with_floor,
    measure_sample,
    render_table,
)
from apps.movie.services.movie_service import MovieService


class Command(BaseCommand):
    """Measure the sample and print or write the table."""

    help = "Measure how much of TMDB's results each data quality stage removes"

    def add_arguments(self, parser: ArgumentParser) -> None:
        """Add command-line arguments."""
        parser.add_argument(
            "--requests",
            type=int,
            default=DEFAULT_REQUESTS,
            help=f"Requests per browse (default: {DEFAULT_REQUESTS})",
        )
        parser.add_argument(
            "--pause",
            type=float,
            default=DEFAULT_PAUSE_SECONDS,
            help=f"Seconds to wait after each TMDB call (default: {DEFAULT_PAUSE_SECONDS})",
        )
        parser.add_argument(
            "--query-vote-floor",
            choices=("on", "off"),
            default="on",
            help=(
                "on (default) sends TMDB the vote-count floor as the app does; off leaves it to "
                "the backend's vote stage and measures only the browses that have a floor"
            ),
        )
        parser.add_argument("--output", help="Write the table to this file instead of printing it")

    def handle(self, *args: object, **options: object) -> None:
        """Measure every browse in the sample, then render the table once."""
        if settings.ENVIRONMENT != "development":
            raise CommandError("measure_quality_filters runs only in development.")

        requests = int(str(options["requests"]))
        pause = float(str(options["pause"]))
        query_vote_floor = options["query_vote_floor"] == "on"
        sample = SAMPLE if query_vote_floor else browses_with_floor(SAMPLE)
        client = RecordingTMDBClient(
            pause=lambda: time.sleep(pause), query_vote_floor=query_vote_floor
        )
        try:
            tallies = measure_sample(
                MovieService(tmdb_client=client), client, sample, requests=requests
            )
        except (HttpError, MeasurementMismatchError) as exc:
            raise CommandError(f"Measurement stopped: {exc}") from exc

        table = render_table(
            tallies,
            measured_on=datetime.now(UTC).date(),
            blacklist_rows=BlacklistedMovie.objects.count(),
            requests_per_browse=requests,
            sample=sample,
            query_vote_floor=query_vote_floor,
        )
        output = options["output"]
        if output is None:
            self.stdout.write(table)
            return
        Path(str(output)).write_text(table)
        self.stdout.write(f"Wrote the table to {output}")
