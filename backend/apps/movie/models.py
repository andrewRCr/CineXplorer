"""Movie app models.

This module contains models specific to movie data management,
including blacklists for filtering problematic TMDB results.
"""

from django.db import models


class BlacklistedMovie(models.Model):
    """Movies to exclude from all TMDB results.

    Used to filter out specific TMDB IDs that slip through automated
    filters (e.g., mislabeled content, non-movie entries).

    Loaded from the tracked file `apps/movie/data/blacklist.csv` by the
    `sync_blacklist` command; the admin shows it read-only.
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
