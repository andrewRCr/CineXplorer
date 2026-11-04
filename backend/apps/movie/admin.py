"""Django admin interface for movie app models."""

from django.contrib import admin
from django.db.models import Model
from django.http import HttpRequest

from .models import BlacklistedMovie


@admin.register(BlacklistedMovie)
class BlacklistedMovieAdmin(admin.ModelAdmin):
    """Read-only view of the blacklist.

    The tracked file `apps/movie/data/blacklist.csv` is its source: change the file in a pull
    request, and `sync_blacklist` loads it.
    """

    list_display = ("tmdb_id", "reason", "added_at")
    list_filter = ("added_at",)
    search_fields = ("tmdb_id", "reason")
    ordering = ("-added_at",)

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Model | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Model | None = None) -> bool:
        return False
