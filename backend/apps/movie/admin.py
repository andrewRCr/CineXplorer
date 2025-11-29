"""
Django admin interface for movie app models.
"""

from django.contrib import admin

from .models import BlacklistedMovie, BlacklistedProductionCompany


@admin.register(BlacklistedMovie)
class BlacklistedMovieAdmin(admin.ModelAdmin):
    """Admin interface for managing blacklisted TMDB movies."""

    list_display = ("tmdb_id", "reason", "added_at")
    list_filter = ("added_at",)
    search_fields = ("tmdb_id", "reason")
    ordering = ("-added_at",)
    readonly_fields = ("added_at",)


@admin.register(BlacklistedProductionCompany)
class BlacklistedProductionCompanyAdmin(admin.ModelAdmin):
    """Admin interface for managing blacklisted production companies."""

    list_display = ("name", "tmdb_company_id", "reason", "added_at")
    list_filter = ("added_at",)
    search_fields = ("name", "tmdb_company_id", "reason")
    ordering = ("-added_at",)
    readonly_fields = ("added_at",)
