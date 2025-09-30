"""
Django admin interface customization for user movie data.
"""

from django.contrib import admin
from .models import UserMovieData


@admin.register(UserMovieData)
class UserMovieDataAdmin(admin.ModelAdmin):
    """Admin interface for UserMovieData model."""

    list_display = ('user', 'movie', 'user_watched', 'user_on_watchlist', 'user_liked', 'user_rating')  # noqa: E501
    list_filter = ('user_watched', 'user_on_watchlist', 'user_liked')
    search_fields = ('user__username', 'user__email', 'movie__title')
    ordering = ('user', 'movie')
