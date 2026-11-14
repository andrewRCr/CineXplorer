"""Django admin interface customization for user movie data."""

from django.contrib import admin
from django.db.models import Model, QuerySet
from django.http import HttpRequest

from .models import UserMovieData
from .services.user_movie_data_service import UserMovieDataService


@admin.register(UserMovieData)
class UserMovieDataAdmin(admin.ModelAdmin):
    """Admin interface for UserMovieData model."""

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Model | None = None) -> bool:
        return False

    def delete_model(self, request: HttpRequest, obj: Model) -> None:
        UserMovieDataService.delete_records(UserMovieData.objects.filter(pk=obj.pk))

    def delete_queryset(self, request: HttpRequest, queryset: QuerySet[UserMovieData]) -> None:
        UserMovieDataService.delete_records(queryset)

    list_display = (
        "user",
        "movie",
        "user_watched",
        "user_on_watchlist",
        "user_liked",
        "user_rating",
    )
    list_filter = ("user_watched", "user_on_watchlist", "user_liked")
    search_fields = ("user__username", "user__email", "movie__title")
    ordering = ("user", "movie")
