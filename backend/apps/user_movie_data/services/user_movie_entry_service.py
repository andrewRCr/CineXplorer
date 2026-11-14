"""Write private viewing and review history under the owning film's record lock."""

from datetime import date
from zoneinfo import ZoneInfo

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import InvalidInputError
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.schemas import (
    UserMovieDataSchema,
    UserMovieEntrySchema,
    UserMovieEntryWriteResponseSchema,
    UserMovieEntryWriteSchema,
)
from apps.user_movie_data.services.movie_card import get_or_fetch_card
from apps.user_movie_data.services.movie_state_rules import (
    LIST_TIMES,
    apply_entry_create,
    stamp_list_joins,
)
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService


class UserMovieEntryService:
    """Serialize writes of a film's history with writes of its current facts."""

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()
        self._records = UserMovieDataService(tmdb_client=self._tmdb_client)

    @staticmethod
    def _validate(payload: UserMovieEntryWriteSchema) -> tuple[ZoneInfo, date]:
        zone = ZoneInfo(payload.time_zone)
        today = timezone.now().astimezone(zone).date()
        if payload.watched_on is None and payload.review is None:
            raise InvalidInputError("Provide a viewing date or a review")
        if payload.rewatch and payload.watched_on is None:
            raise InvalidInputError("A rewatch requires a viewing date")
        if payload.watched_on is not None and payload.watched_on > today:
            raise InvalidInputError("A viewing date cannot be in the future")
        return zone, today

    def _response(
        self, user: AbstractBaseUser, tmdb_id: int, entry: UserMovieEntry
    ) -> UserMovieEntryWriteResponseSchema:
        return UserMovieEntryWriteResponseSchema(
            entry=UserMovieEntrySchema.from_entry(entry, tmdb_id),
            record=UserMovieDataSchema.from_record(self._records.get_by_tmdb_id(user, tmdb_id)),
        )

    def create(
        self, user: AbstractBaseUser, tmdb_id: int, payload: UserMovieEntryWriteSchema
    ) -> UserMovieEntryWriteResponseSchema:
        zone, today = self._validate(payload)
        movie = get_or_fetch_card(self._tmdb_client, tmdb_id)
        with transaction.atomic():
            record, _ = UserMovieData.objects.select_for_update().get_or_create(
                user=user, movie=movie
            )
            previous = {flag: getattr(record, flag) for flag, _ in LIST_TIMES}
            entry = UserMovieEntry.objects.create(
                record=record,
                watched_on=payload.watched_on,
                rating=payload.rating,
                review=payload.review,
                rewatch=payload.rewatch,
                made_on=today,
            )
            record.user_liked = payload.liked
            latest = (
                UserMovieEntry.objects.get_queryset()
                .filter(record=record)
                .ordered_for_history()
                .first()
            )
            if payload.rating is not None and latest is not None and latest.pk == entry.pk:
                record.user_rating = payload.rating
            apply_entry_create(record, payload.watched_on, zone)
            stamp_list_joins(record, previous)
            record.save()
            return self._response(user, tmdb_id, entry)
