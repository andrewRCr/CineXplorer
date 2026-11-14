"""Persist and read a user's movie state, with TMDB at the external boundary."""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import InvalidInputError, NotFoundError
from apps.core.models import Movie
from apps.core.pagination import paginate_queryset
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.schemas import MovieListItemSchema, MovieListResponseSchema
from apps.movie.services.tmdb_api_boundary.response_factories import (
    handle_tmdb_api_error,
    movie_card_fields,
)
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.schemas import LibraryQuerySchema, UserMovieDataSchema
from apps.user_movie_data.services.movie_state_rules import (
    LIST_TIMES,
    apply_record_save,
    stamp_list_joins,
)


class UserMovieDataService:
    """Scope every user-data operation to its owner and inject only the TMDB client."""

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

    def save(
        self, user: AbstractBaseUser, tmdb_id: int, fields: dict[str, object]
    ) -> tuple[UserMovieData, bool]:
        """Apply only supplied fields, serializing concurrent saves of one user's movie."""
        allowed = {
            "user_watched",
            "user_on_watchlist",
            "user_liked",
            "user_rating",
        }
        changes = {key: value for key, value in fields.items() if key in allowed}
        if not changes:
            raise InvalidInputError("Provide at least one movie data field")
        if changes.get("user_watched") is False and changes.get("user_rating") is not None:
            raise InvalidInputError("A rating requires a watched movie")

        movie = Movie.objects.filter(pk=tmdb_id).first()
        if movie is None:
            response = self._tmdb_client.get_movie_details(tmdb_id)
            if not response.is_success():
                handle_tmdb_api_error(response, "save_movie", lookup=True, tmdb_id=tmdb_id)
            card = movie_card_fields(response.get_json_data() or {})
            movie, _ = Movie.objects.get_or_create(
                tmdb_id=tmdb_id, defaults={**card, "refreshed_at": timezone.now()}
            )

        with transaction.atomic():
            record, created = UserMovieData.objects.select_for_update().get_or_create(
                user=user, movie=movie
            )
            previous = {flag: getattr(record, flag) for flag, _ in LIST_TIMES}
            apply_record_save(record, changes)
            stamp_list_joins(record, previous, undo=fields.get("undo") is True)
            record.save()
        return self.get_by_tmdb_id(user, tmdb_id), created

    def delete(self, user: AbstractBaseUser, tmdb_id: int) -> None:
        """Delete the requesting user's state while keeping its movie card."""
        self.get_by_tmdb_id(user, tmdb_id).delete()

    def get_by_tmdb_id(self, user: AbstractBaseUser, tmdb_id: int) -> UserMovieData:
        record = (
            UserMovieData.objects.get_queryset()
            .for_user(user)
            .with_log_summary()
            .select_related("movie")
            .filter(movie_id=tmdb_id)
            .first()
        )
        if record is None:
            raise NotFoundError("User movie data not found for this TMDB ID")
        return record

    def get_library(
        self, user: AbstractBaseUser, query: LibraryQuerySchema | None = None
    ) -> MovieListResponseSchema:
        """Read a bounded page from stored cards with one count and one row query."""
        query = query if query is not None else LibraryQuerySchema()
        records = (
            UserMovieData.objects.get_queryset()
            .for_user(user)
            .with_log_summary()
            .select_related("movie")
        )
        if query.watchlist:
            records = records.on_watchlist()
        if query.watched:
            records = records.watched()
        if query.liked:
            records = records.liked()
        if query.rated:
            records = records.rated()
        if not any((query.watchlist, query.watched, query.liked, query.rated)):
            records = records.with_state()
        joined_lists = [
            field
            for active, field in [
                (query.watchlist, "watchlist_added_at"),
                (query.watched, "watched_added_at"),
                (query.liked, "liked_added_at"),
            ]
            if active
        ]
        added_field = joined_lists[0] if len(joined_lists) == 1 else "created_at"
        records = records.ordered_for_library(query.sort, query.direction, added_field)
        rows, metadata = paginate_queryset(records, query.page, query.page_size)
        movies: list[MovieListItemSchema] = []
        for record in rows:
            movie = record.movie
            movies.append(
                MovieListItemSchema(
                    tmdb_id=movie.tmdb_id,
                    title=movie.title,
                    poster_path=movie.poster_path,
                    release_date=movie.release_date,
                    vote_average=movie.vote_average,
                    vote_count=movie.vote_count,
                    runtime=movie.runtime,
                    genre_ids=movie.genre_ids,
                    overview=movie.overview,
                    user_movie_data=UserMovieDataSchema.from_record(record),
                )
            )
        return MovieListResponseSchema(**metadata, results=movies, next_tmdb_page_start=None)
