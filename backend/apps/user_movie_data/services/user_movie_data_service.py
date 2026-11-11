"""Persist and read a user's movie state, with TMDB at the external boundary."""

from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db import IntegrityError, transaction

from apps.core.exceptions import InvalidInputError, NotFoundError
from apps.core.models import Movie
from apps.core.pagination import paginate_queryset
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.schemas import MovieListItemSchema, MovieListResponseSchema
from apps.movie.services.movie_service import MovieService
from apps.movie.services.pipelines.batch import fetch_movies_batch
from apps.user_movie_data.models import UserMovieData, UserMovieDataQuerySet
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService


class UserMovieDataService:
    """Scope every user-data operation to its owner and inject only the TMDB client."""

    def __init__(self, tmdb_client: TMDBApiClient | None = None) -> None:
        self._tmdb_client = tmdb_client if tmdb_client is not None else TMDBApiClient()

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

    def delete(self, user: AbstractBaseUser, record_id: int) -> None:
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
