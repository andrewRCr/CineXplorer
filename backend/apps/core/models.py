"""Core database models.

Keep the companion models.pyi declarations in sync when model fields change.
The stub describes the runtime field types to consumers.
"""

from django.db import models


class Movie(models.Model):
    """Represents a minimal local stub for a TMDB movie.

    Used as an anchor for user-specific data.
    """

    tmdb_id = models.PositiveIntegerField(primary_key=True)
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255, blank=True, null=True)
    release_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-release_date", "tmdb_id"]

    def __str__(self) -> str:
        return self.title
