"""Refresh stored movie cards within a bounded nightly run."""

from __future__ import annotations

import logging
import time
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db.models import F, Q
from django.utils import timezone

from apps.core.exceptions import DomainError
from apps.core.models import Movie
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.services.tmdb_api_boundary.response_factories import (
    handle_tmdb_api_error,
    movie_card_fields,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Refresh stored movie cards for up to 20 minutes and report cards older than seven days."
    )

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        super().__init__()
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

    def handle(self, *args: object, **options: object) -> None:
        started = time.monotonic()
        refreshed = failed = 0
        movie_ids = Movie.objects.order_by(
            F("refreshed_at").asc(nulls_first=True), "tmdb_id"
        ).values_list("tmdb_id", flat=True)
        for tmdb_id in movie_ids.iterator(chunk_size=200):
            if time.monotonic() - started >= 20 * 60:
                break
            try:
                response = self._tmdb_client.get_movie_details(tmdb_id)
                if not response.is_success():
                    handle_tmdb_api_error(
                        response, "refresh_movie_card", lookup=True, tmdb_id=tmdb_id
                    )
                card = movie_card_fields(response.get_json_data() or {})
                now = timezone.now()
                refreshed += Movie.objects.filter(tmdb_id=tmdb_id).update(
                    **card, refreshed_at=now, updated_at=now
                )
            except DomainError:
                failed += 1
                logger.exception("Movie card refresh failed for TMDB ID %d", tmdb_id)
        self.stdout.write(f"Refreshed: {refreshed}; failed: {failed}")
        stale_ids = list(
            Movie.objects.filter(
                Q(refreshed_at__isnull=True)
                | Q(refreshed_at__lt=timezone.now() - timedelta(days=7))
            )
            .order_by("tmdb_id")
            .values_list("tmdb_id", flat=True)
        )
        if stale_ids:
            raise CommandError(
                "Stale TMDB IDs: " + ", ".join(str(tmdb_id) for tmdb_id in stale_ids)
            )
