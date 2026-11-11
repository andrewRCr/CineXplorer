"""Authenticated HTTP routes for a user's movie state."""

from __future__ import annotations

from typing import Annotated

from django.http import HttpRequest
from ninja import Router, Status
from pydantic import Field

from apps.authentication.auth_ninja import JWTSessionAuth, get_current_user
from apps.core.schemas import ErrorResponseSchema
from apps.movie.schemas import MovieListResponseSchema
from apps.user_movie_data.schemas import UserMovieDataPatchSchema, UserMovieDataSchema
from apps.user_movie_data.services.service_factory import get_user_movie_data_service

user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTSessionAuth())
_service = get_user_movie_data_service()
PositiveTMDBId = Annotated[int, Field(gt=0)]


@user_movie_data_router.get("/movies", response=MovieListResponseSchema)
def get_user_movies(request: HttpRequest, watchlist: bool = False) -> MovieListResponseSchema:
    """Read the user's movies, optionally restricted to the watchlist."""
    return _service.get_all_user_movies(
        user=get_current_user(request), watchlist_only=watchlist if watchlist else None
    )


@user_movie_data_router.get(
    "/{tmdb_id}",
    response={
        200: UserMovieDataSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
    },
)
def get_user_movie_data(request: HttpRequest, tmdb_id: PositiveTMDBId) -> UserMovieDataSchema:
    return UserMovieDataSchema.from_record(
        _service.get_by_tmdb_id(get_current_user(request), tmdb_id)
    )


@user_movie_data_router.patch(
    "/{tmdb_id}",
    response={
        200: UserMovieDataSchema,
        201: UserMovieDataSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
        429: ErrorResponseSchema,
        502: ErrorResponseSchema,
        503: ErrorResponseSchema,
        504: ErrorResponseSchema,
    },
)
def save_user_movie_data(
    request: HttpRequest, tmdb_id: PositiveTMDBId, payload: UserMovieDataPatchSchema
) -> Status[UserMovieDataSchema]:
    record, created = _service.save(
        get_current_user(request), tmdb_id, payload.model_dump(exclude_unset=True)
    )
    return Status(201 if created else 200, UserMovieDataSchema.from_record(record))


@user_movie_data_router.delete(
    "/{tmdb_id}",
    response={
        204: None,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
    },
)
def delete_user_movie_data(request: HttpRequest, tmdb_id: PositiveTMDBId) -> Status[None]:
    _service.delete(get_current_user(request), tmdb_id)
    return Status(204, None)
