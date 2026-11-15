"""Read an owner's private timeline from stored entries and movie cards."""

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Case, IntegerField, Q, Value, When
from django.db.models.functions import Coalesce

from apps.core.pagination import paginate_queryset
from apps.core.utils.schemas import PaginatedResponse
from apps.user_movie_data.models import UserMovieEntry
from apps.user_movie_data.schemas import HistoryQuerySchema, HistoryRowSchema


class UserMovieHistoryService:
    """Page viewings and undated reviews in a deterministic timeline order."""

    def get_history(
        self, user: AbstractBaseUser, query: HistoryQuerySchema
    ) -> PaginatedResponse[HistoryRowSchema]:
        entries = (
            UserMovieEntry.objects.filter(record__user=user)
            .filter(Q(watched_on__isnull=False) | Q(review__isnull=False))
            .select_related("record__movie")
            .annotate(
                history_day=Coalesce("watched_on", "made_on"),
                kind_rank=Case(
                    When(watched_on__isnull=False, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            )
            .order_by("-history_day", "-created_at", "kind_rank", "-pk")
        )
        rows, metadata = paginate_queryset(entries, query.page, query.page_size)
        return PaginatedResponse[HistoryRowSchema](
            **metadata,
            results=[
                HistoryRowSchema(
                    kind="viewing" if entry.watched_on else "review",
                    day=entry.watched_on or entry.made_on,
                    id=entry.pk,
                    tmdb_id=entry.record.movie.tmdb_id,
                    watched_on=entry.watched_on,
                    rating=entry.rating,
                    review=entry.review,
                    rewatch=entry.rewatch,
                    title=entry.record.movie.title,
                    release_date=entry.record.movie.release_date,
                    poster_path=entry.record.movie.poster_path,
                )
                for entry in rows
            ],
        )
