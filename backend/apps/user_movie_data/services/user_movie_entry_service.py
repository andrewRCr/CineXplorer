"""Write private viewing and review history under the owning film's record lock."""

from datetime import date
from zoneinfo import ZoneInfo

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import InvalidInputError, NotFoundError
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

    @staticmethod
    def _locked_entry(
        user: AbstractBaseUser, tmdb_id: int, entry_id: int
    ) -> tuple[UserMovieData, UserMovieEntry]:
        record = (
            UserMovieData.objects.select_for_update().filter(user=user, movie_id=tmdb_id).first()
        )
        if record is None:
            raise NotFoundError("Entry not found")
        entry = UserMovieEntry.objects.filter(record=record, pk=entry_id).first()
        if entry is None:
            raise NotFoundError("Entry not found")
        return record, entry

    def edit(
        self,
        user: AbstractBaseUser,
        tmdb_id: int,
        entry_id: int,
        payload: UserMovieEntryWriteSchema,
    ) -> UserMovieEntryWriteResponseSchema:
        self._validate(payload)
        with transaction.atomic():
            record, entry = self._locked_entry(user, tmdb_id, entry_id)
            previous_flags = {flag: getattr(record, flag) for flag, _ in LIST_TIMES}
            history = UserMovieEntry.objects.get_queryset().filter(record=record)
            previous_latest = history.ordered_for_history().first()
            previous_rating = entry.rating
            entry.watched_on = payload.watched_on
            entry.rating = payload.rating
            entry.review = payload.review
            entry.rewatch = payload.rewatch
            entry.save()
            latest = history.ordered_for_history().first()
            if (
                entry.rating is not None
                and latest is not None
                and latest.pk == entry.pk
                and (
                    previous_rating != entry.rating
                    or previous_latest is None
                    or previous_latest.pk != entry.pk
                )
            ):
                record.user_rating = entry.rating
            record.user_liked = payload.liked
            stamp_list_joins(record, previous_flags)
            record.save()
            return self._response(user, tmdb_id, entry)

    def delete(
        self, user: AbstractBaseUser, tmdb_id: int, entry_id: int
    ) -> UserMovieEntryWriteResponseSchema:
        with transaction.atomic():
            _, entry = self._locked_entry(user, tmdb_id, entry_id)
            deleted = UserMovieEntrySchema.from_entry(entry, tmdb_id)
            entry.delete()
            return UserMovieEntryWriteResponseSchema(
                entry=deleted,
                record=UserMovieDataSchema.from_record(
                    self._records.get_by_tmdb_id(user, tmdb_id)
                ),
            )
