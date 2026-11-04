"""Management command to populate movie blacklist from problematic production companies.

Uses research findings to bulk-add movies from studios that exclusively
produce adult/exploitation content mislabeled as general films in TMDB.

Usage:
    python manage.py populate_blacklist          # Dry run (default)
    python manage.py populate_blacklist --commit # Actually add entries
    python manage.py populate_blacklist --clear  # Clear existing entries first
"""

from __future__ import annotations

import time
from argparse import ArgumentParser
from dataclasses import dataclass
from typing import cast

from django.core.management.base import BaseCommand
from django.db import IntegrityError

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.models import BlacklistedMovie


@dataclass
class BlacklistedCompany:
    """Production company identified as exclusively producing problematic content."""

    tmdb_id: int
    name: str
    reason: str


# Studios that exclusively produce adult content mislabeled as general films
# (adult=false) in TMDB. Identified through research and pattern analysis.
BLACKLISTED_COMPANIES: list[BlacklistedCompany] = [
    BlacklistedCompany(
        tmdb_id=80856,  # Note: TMDB has duplicate entry at 267239 (all adult=true)
        name="Pink Pineapple",
        reason="100% hentai/adult anime studio",
    ),
    BlacklistedCompany(
        tmdb_id=174515,
        name="Osu Production",
        reason="Adult/pink film studio (1986-era)",
    ),
    BlacklistedCompany(
        tmdb_id=142460,
        name="Sekine Production",
        reason="Adult/pink film studio",
    ),
    BlacklistedCompany(
        tmdb_id=9301,
        name="Kokuei",
        reason="100% pink film studio",
    ),
    BlacklistedCompany(
        tmdb_id=73435,
        name="Shintoho Pictures",
        reason="100% adult content studio",
    ),
    BlacklistedCompany(
        tmdb_id=120194,
        name="Million Film",
        reason="100% pink film studio",
    ),
    # Additional studios identified from browse result pattern analysis
    BlacklistedCompany(
        tmdb_id=213979,
        name="Xces Film",
        reason="100% adult/pink film studio",
    ),
    BlacklistedCompany(
        tmdb_id=84362,
        name="Cement Match",
        reason="100% adult/pink film studio",
    ),
    BlacklistedCompany(
        tmdb_id=219019,
        name="Office Burrows",
        reason="100% adult/pink film studio",
    ),
    BlacklistedCompany(
        tmdb_id=127883,
        name="Shin Nihon Eizo",
        reason="100% adult/pink film studio",
    ),
]


class Command(BaseCommand):
    """Populate movie blacklist from problematic production companies.

    Queries TMDB for all movies from studios identified as exclusively
    producing adult content mislabeled in TMDB (adult=false).
    """

    help = "Populate movie blacklist from problematic production companies"

    def add_arguments(self, parser: ArgumentParser) -> None:
        """Add command-line arguments."""
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Actually add entries to database (default is dry run)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing blacklist entries before populating",
        )
        parser.add_argument(
            "--company",
            type=int,
            help="Only process specific company by TMDB ID",
        )

    def handle(self, *args: object, **options: object) -> None:
        """Execute the command."""
        commit = bool(options.get("commit", False))
        clear = bool(options.get("clear", False))
        company_filter = options.get("company")

        if not commit:
            self.stdout.write(self.style.WARNING("DRY RUN - use --commit to actually add entries"))
            self.stdout.write("")

        if clear and commit:
            count = BlacklistedMovie.objects.count()
            BlacklistedMovie.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing blacklist entries"))

        client = TMDBApiClient()
        total_added = 0
        total_skipped = 0
        total_already_adult = 0

        companies = BLACKLISTED_COMPANIES
        if company_filter:
            companies = [c for c in companies if c.tmdb_id == company_filter]
            if not companies:
                self.stderr.write(self.style.ERROR(f"Company {company_filter} not in blacklist"))
                return

        for company in companies:
            self.stdout.write(f"\nProcessing: {company.name} (TMDB {company.tmdb_id})")
            self.stdout.write(f"  Reason: {company.reason}")

            added, skipped, already_adult = self._process_company(client, company, commit)
            total_added += added
            total_skipped += skipped
            total_already_adult += already_adult

            self.stdout.write(
                f"  Results: {added} added, {skipped} skipped (existing), "
                f"{already_adult} already marked adult"
            )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(self.style.SUCCESS(f"Total: {total_added} movies added to blacklist"))
        self.stdout.write(f"  Skipped (already in blacklist): {total_skipped}")
        self.stdout.write(f"  Skipped (already adult=true): {total_already_adult}")

        if not commit:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING("DRY RUN - no changes made. Use --commit to apply.")
            )

    def _process_company(
        self,
        client: TMDBApiClient,
        company: BlacklistedCompany,
        commit: bool,
    ) -> tuple[int, int, int]:
        """Query TMDB for all movies from a company and add to blacklist.

        Returns:
            Tuple of (added_count, skipped_count, already_adult_count)
        """
        added = 0
        skipped = 0
        already_adult = 0
        page = 1
        total_pages = 1  # Will be updated from first response

        while page <= total_pages:
            response = self._fetch_company_movies(client, company.tmdb_id, page)

            if not response.is_success():
                self.stderr.write(
                    self.style.ERROR(f"  Error fetching page {page}: {response.error_message}")
                )
                break

            data = response.get_json_data()
            if data is None:
                self.stderr.write(self.style.ERROR(f"  No data in response for page {page}"))
                break

            raw_total_pages = data.get("total_pages")
            # TMDB caps at 500 pages maximum
            total_pages = min(raw_total_pages, 500) if isinstance(raw_total_pages, int) else 1

            raw_results = data.get("results")

            if page == 1:
                total_results = data.get("total_results", 0)
                self.stdout.write(f"  Found {total_results} movies ({total_pages} pages)")

            if not isinstance(raw_results, list):
                self.stderr.write(self.style.ERROR(f"  Invalid results format for page {page}"))
                break

            # Type narrow results list for iteration
            results = cast(list[object], raw_results)
            page_added, page_skipped, page_adult = self._process_company_movies(
                results, company, commit
            )
            added += page_added
            skipped += page_skipped
            already_adult += page_adult

            page += 1

            # Rate limiting: TMDB allows 40 requests/10 seconds
            # Be conservative with 0.3s delay between requests
            if page <= total_pages:
                time.sleep(0.3)

        return added, skipped, already_adult

    def _process_company_movies(
        self,
        results: list[object],
        company: BlacklistedCompany,
        commit: bool,
    ) -> tuple[int, int, int]:
        """Count and optionally store eligible movies from one upstream page."""
        added = 0
        skipped = 0
        already_adult = 0
        for item in results:
            if not isinstance(item, dict):
                continue
            # TMDB returns dict with string keys
            movie_data = cast(dict[str, object], item)
            raw_movie_id = movie_data.get("id")
            if not isinstance(raw_movie_id, int):
                continue
            movie_id: int = raw_movie_id
            is_adult = bool(movie_data.get("adult", False))

            if is_adult:
                # Already marked adult in TMDB - our filters already exclude these
                already_adult += 1
                continue

            reason = f"{company.name} (TMDB {company.tmdb_id}) - {company.reason}"

            if commit:
                try:
                    BlacklistedMovie.objects.create(
                        tmdb_id=movie_id,
                        reason=reason,
                    )
                    added += 1
                except IntegrityError:
                    # Already exists
                    skipped += 1
            else:
                # Dry run - check if would be added
                if BlacklistedMovie.objects.filter(tmdb_id=movie_id).exists():
                    skipped += 1
                else:
                    added += 1

        return added, skipped, already_adult

    def _fetch_company_movies(
        self,
        client: TMDBApiClient,
        company_id: int,
        page: int,
    ) -> ApiResponse:
        """Fetch movies from a specific company via TMDB discover endpoint."""
        return client.discover_movies(
            with_companies=str(company_id),
            page=page,
            include_adult=False,  # We want to find mislabeled content
        )
