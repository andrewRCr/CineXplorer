"""
Movie app models.

This module contains models specific to movie data management,
including blacklists for filtering problematic TMDB results.
"""

from django.db import models


class BlacklistedMovie(models.Model):
    """
    Movies to exclude from all TMDB results.

    Used to manually filter out specific TMDB IDs that slip through
    automated filters (e.g., mislabeled content, non-movie entries).

    Managed via Django admin - no deploy required to update blacklist.
    """

    tmdb_id = models.IntegerField(  # type: ignore[var-annotated]
        unique=True,
        db_index=True,
        help_text="TMDB movie ID to exclude from results",
    )
    reason = models.CharField(  # type: ignore[var-annotated]
        max_length=255,
        help_text="Why this movie is blacklisted (for documentation)",
    )
    added_at = models.DateTimeField(  # type: ignore[var-annotated]
        auto_now_add=True,
        help_text="When this entry was added",
    )

    class Meta:
        verbose_name = "Blacklisted Movie"
        verbose_name_plural = "Blacklisted Movies"
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"TMDB {self.tmdb_id}: {self.reason}"


class BlacklistedProductionCompany(models.Model):
    """
    Production companies to exclude from all TMDB results.

    Used to filter out movies from studios that exclusively produce
    problematic content (e.g., adult content mislabeled as general films,
    exploitation studios). Any movie with a blacklisted production company
    is excluded from results.

    Managed via Django admin - no deploy required to update blacklist.
    """

    tmdb_company_id = models.IntegerField(  # type: ignore[var-annotated]
        unique=True,
        db_index=True,
        help_text="TMDB production company ID to exclude",
    )
    name = models.CharField(  # type: ignore[var-annotated]
        max_length=255,
        help_text="Company name (for human readability - TMDB IDs aren't meaningful)",
    )
    reason = models.CharField(  # type: ignore[var-annotated]
        max_length=255,
        help_text="Why this company is blacklisted (for documentation)",
    )
    added_at = models.DateTimeField(  # type: ignore[var-annotated]
        auto_now_add=True,
        help_text="When this entry was added",
    )

    class Meta:
        verbose_name = "Blacklisted Production Company"
        verbose_name_plural = "Blacklisted Production Companies"
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"{self.name} (TMDB {self.tmdb_company_id}): {self.reason}"
