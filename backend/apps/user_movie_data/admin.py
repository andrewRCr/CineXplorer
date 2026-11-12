"""Django admin interface customization for user movie data."""

from django.contrib import admin
from django.forms import CharField, ModelForm, Textarea

from .models import UserMovieData


class UserMovieDataAdminForm(ModelForm):
    """Keep non-empty review text exactly as entered, including surrounding spaces."""

    user_review = CharField(required=False, strip=False, max_length=10000, widget=Textarea)

    class Meta:
        model = UserMovieData
        fields = (
            "user",
            "movie",
            "user_watched",
            "user_on_watchlist",
            "user_liked",
            "user_rating",
            "user_review",
            "watched_at",
        )

    def clean_user_review(self) -> str | None:
        review: str = self.cleaned_data["user_review"]
        return review if review.strip() else None


@admin.register(UserMovieData)
class UserMovieDataAdmin(admin.ModelAdmin):
    """Admin interface for UserMovieData model."""

    form = UserMovieDataAdminForm

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
