"""Core database models."""

from django.contrib.postgres.fields import ArrayField
from django.db import models


class Movie(models.Model):
    """Stored card data for a movie and an anchor for user-specific state."""

    tmdb_id = models.PositiveIntegerField(primary_key=True)
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255, blank=True, null=True)
    release_date = models.DateField(null=True, blank=True)
    vote_average = models.FloatField(null=True, blank=True)
    vote_count = models.IntegerField(null=True, blank=True)
    runtime = models.IntegerField(null=True, blank=True)
    overview = models.TextField(null=True, blank=True)
    genre_ids = ArrayField(models.IntegerField(), default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    refreshed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-release_date", "tmdb_id"]

    def __str__(self) -> str:
        return self.title
