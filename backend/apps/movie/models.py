"""Movie app models.

This module contains models specific to movie data management,
including blacklists for filtering problematic TMDB results.
"""

from django.db import models


class BlacklistedMovie(models.Model):
    """Movies to exclude from all TMDB results.

    Used to manually filter out specific TMDB IDs that slip through
    automated filters (e.g., mislabeled content, non-movie entries).

    Managed via Django admin - no deploy required to update blacklist.
    """

    tmdb_id = models.IntegerField(
        unique=True,
        db_index=True,
        help_text="TMDB movie ID to exclude from results",
    )
    reason = models.CharField(
        max_length=255,
        help_text="Why this movie is blacklisted (for documentation)",
    )
    added_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this entry was added",
    )

    class Meta:
        verbose_name = "Blacklisted Movie"
        verbose_name_plural = "Blacklisted Movies"
        ordering = ["-added_at"]

    def __str__(self) -> str:
        return f"TMDB {self.tmdb_id}: {self.reason}"
