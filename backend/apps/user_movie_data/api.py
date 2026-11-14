"""Authenticated HTTP routes for a user's movie state."""

from __future__ import annotations

from typing import Annotated

from django.http import HttpRequest
from ninja import Query, Router, Status
from pydantic import Field

from apps.authentication.auth_ninja import JWTSessionAuth, get_current_user
from apps.core.schemas import ErrorResponseSchema
from apps.movie.schemas import MovieListResponseSchema
from apps.user_movie_data.schemas import (
    LibraryQuerySchema,
    MovieEntriesSchema,
    UserMovieDataPatchSchema,
    UserMovieDataSchema,
    UserMovieEntryWriteResponseSchema,
    UserMovieEntryWriteSchema,
)
from apps.user_movie_data.services.service_factory import (
    get_user_movie_data_service,
    get_user_movie_entry_service,
)
from apps.user_movie_data.throttles import SaveThrottle

user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTSessionAuth())
_service = get_user_movie_data_service()
_entry_service = get_user_movie_entry_service()
PositiveTMDBId = Annotated[int, Field(gt=0)]


@user_movie_data_router.get(
    "/movies",
    response={200: MovieListResponseSchema, 401: ErrorResponseSchema, 422: ErrorResponseSchema},
)
def get_user_movies(
    request: HttpRequest, query: Query[LibraryQuerySchema]
) -> MovieListResponseSchema:
    """Read a filtered and sorted page of the authenticated user's stored cards."""
    return _service.get_library(get_current_user(request), query)


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
    throttle=[
        SaveThrottle(limit=30, window_seconds=60),
        SaveThrottle(limit=1000, window_seconds=86400),
    ],
    response={
        200: UserMovieDataSchema,
        201: UserMovieDataSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
        409: ErrorResponseSchema,
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


@user_movie_data_router.post(
    "/{tmdb_id}/entries",
    response={
        201: UserMovieEntryWriteResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
        502: ErrorResponseSchema,
        503: ErrorResponseSchema,
        504: ErrorResponseSchema,
    },
)
def create_movie_entry(
    request: HttpRequest, tmdb_id: PositiveTMDBId, payload: UserMovieEntryWriteSchema
) -> Status[UserMovieEntryWriteResponseSchema]:
    return Status(201, _entry_service.create(get_current_user(request), tmdb_id, payload))


@user_movie_data_router.put(
    "/{tmdb_id}/entries/{entry_id}",
    response={
        200: UserMovieEntryWriteResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
    },
)
def edit_movie_entry(
    request: HttpRequest,
    tmdb_id: PositiveTMDBId,
    entry_id: PositiveTMDBId,
    payload: UserMovieEntryWriteSchema,
) -> UserMovieEntryWriteResponseSchema:
    return _entry_service.edit(get_current_user(request), tmdb_id, entry_id, payload)


@user_movie_data_router.delete(
    "/{tmdb_id}/entries/{entry_id}",
    response={
        200: UserMovieEntryWriteResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        422: ErrorResponseSchema,
    },
)
def delete_movie_entry(
    request: HttpRequest, tmdb_id: PositiveTMDBId, entry_id: PositiveTMDBId
) -> UserMovieEntryWriteResponseSchema:
    return _entry_service.delete(get_current_user(request), tmdb_id, entry_id)


@user_movie_data_router.get(
    "/{tmdb_id}/entries",
    response={200: MovieEntriesSchema, 401: ErrorResponseSchema, 422: ErrorResponseSchema},
)
def get_movie_entries(request: HttpRequest, tmdb_id: PositiveTMDBId) -> MovieEntriesSchema:
    return _entry_service.get_for_movie(get_current_user(request), tmdb_id)
