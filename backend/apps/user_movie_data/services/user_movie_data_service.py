"""Persist and read a user's movie state, with TMDB at the external boundary."""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.core.exceptions import InvalidInputError, NotFoundError
from apps.core.models import Movie
from apps.core.pagination import paginate_queryset
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.schemas import MovieListItemSchema, MovieListResponseSchema
from apps.movie.services.movie_service import MovieService
from apps.movie.services.pipelines.batch import fetch_movies_batch
from apps.movie.services.tmdb_api_boundary.response_factories import (
    handle_tmdb_api_error,
    movie_card_fields,
)
from apps.user_movie_data.models import UserMovieData, UserMovieDataQuerySet
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService


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
            "user_review",
            "watched_at",
        }
        changes = {key: value for key, value in fields.items() if key in allowed}
        if not changes:
            raise InvalidInputError("Provide at least one movie data field")
        if changes.get("user_watched") is False and changes.get("watched_at") is not None:
            raise InvalidInputError("A watched date requires a watched movie")

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
            for field, value in changes.items():
                setattr(record, field, value)
            if changes.get("user_watched") is False:
                record.watched_at = None
            if not record.user_watched and record.watched_at is not None:
                raise InvalidInputError("A watched date requires a watched movie")
            record.save()
        return record, created

    def delete(self, user: AbstractBaseUser, tmdb_id: int) -> None:
        """Delete the requesting user's state while keeping its movie card."""
        self.get_by_tmdb_id(user, tmdb_id).delete()

    def create(
        self,
        user: AbstractBaseUser,
        tmdb_id: int,
        *,
        user_watched: bool = False,
        user_on_watchlist: bool = False,
        user_liked: bool = False,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
        if movie is None:
            detail = MovieService(tmdb_client=self._tmdb_client).get_movie_by_id(tmdb_id)
            movie = Movie.objects.create(
                tmdb_id=detail.tmdb_id,
                title=detail.title,
                poster_path=detail.poster_path,
                release_date=detail.release_date,
            )
        try:
            with transaction.atomic():
                return UserMovieData.objects.create(
                    user=user,
                    movie=movie,
                    user_watched=user_watched,
                    user_on_watchlist=user_on_watchlist,
                    user_liked=user_liked,
                    user_rating=user_rating,
                    user_review=user_review,
                )
        except IntegrityError as error:
            raise InvalidInputError("Already exists") from error

    def get_by_id(self, user: AbstractBaseUser, record_id: int) -> UserMovieData:
        record = (
            UserMovieData.objects.get_queryset()
            .for_user(user)
            .select_related("movie")
            .filter(pk=record_id)
            .first()
        )
        if record is None:
            raise NotFoundError("User movie data not found")
        return record

    def get_by_tmdb_id(self, user: AbstractBaseUser, tmdb_id: int) -> UserMovieData:
        record = (
            UserMovieData.objects.get_queryset()
            .for_user(user)
            .select_related("movie")
            .filter(movie_id=tmdb_id)
            .first()
        )
        if record is None:
            raise NotFoundError("User movie data not found for this TMDB ID")
        return record

    def update(
        self,
        user: AbstractBaseUser,
        record_id: int,
        *,
        user_watched: bool | None = None,
        user_on_watchlist: bool | None = None,
        user_liked: bool | None = None,
        user_rating: int | None = None,
        user_review: str | None = None,
    ) -> UserMovieData:
        record = self.get_by_id(user, record_id)
        fields = {
            "user_watched": user_watched,
            "user_on_watchlist": user_on_watchlist,
            "user_liked": user_liked,
            "user_rating": user_rating,
            "user_review": user_review,
        }
        for field, value in fields.items():
            if value is not None:
                setattr(record, field, value)
        record.save()
        return record

    def delete_by_record_id(self, user: AbstractBaseUser, record_id: int) -> None:
        self.get_by_id(user, record_id).delete()

    def _filtered_records(
        self,
        user: AbstractBaseUser,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> UserMovieDataQuerySet:
        records = UserMovieData.objects.get_queryset().for_user(user).select_related("movie")
        if watchlist_only:
            records = records.on_watchlist()
        if watched_only:
            records = records.watched()
        if rated_only:
            records = records.rated()
        return records.order_by("-id")

    def _build_enriched_movies(
        self,
        umd_list: list[UserMovieData],
        user: AbstractBaseUser,
    ) -> list[MovieListItemSchema]:
        tmdb_ids = [record.movie.tmdb_id for record in umd_list]
        if not tmdb_ids:
            return []
        movies = fetch_movies_batch(tmdb_ids)
        lookup = {movie.tmdb_id: movie for movie in movies}
        ordered_movies = [lookup[tmdb_id] for tmdb_id in tmdb_ids if tmdb_id in lookup]
        return MovieEnrichmentService().enrich_movies_with_user_movie_data(ordered_movies, user)

    def get_user_movies(
        self,
        user: AbstractBaseUser,
        page: int = 1,
        page_size: int = 20,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> MovieListResponseSchema:
        records = self._filtered_records(
            user, watchlist_only=watchlist_only, watched_only=watched_only, rated_only=rated_only
        )
        rows, metadata = paginate_queryset(records, page, page_size)
        return MovieListResponseSchema(
            **metadata, results=self._build_enriched_movies(list(rows), user)
        )

    def get_all_user_movies(
        self,
        user: AbstractBaseUser,
        *,
        watchlist_only: bool | None = None,
        watched_only: bool | None = None,
        rated_only: bool | None = None,
    ) -> MovieListResponseSchema:
        records = self._filtered_records(
            user, watchlist_only=watchlist_only, watched_only=watched_only, rated_only=rated_only
        )
        movies = self._build_enriched_movies(list(records), user)
        return MovieListResponseSchema(
            page=1, total_pages=1 if movies else 0, total_results=len(movies), results=movies
        )
