"""Django Ninja router for user movie data endpoints.

This module provides authenticated endpoints for managing user interactions
with movies, including watchlist status, ratings, and reviews.

All endpoints require JWT authentication and follow the ModelSchema pattern
established in Phase 1 for type-safe Django model operations.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, cast

from django.contrib.auth.models import User
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from authentication.auth_ninja import JWTCookieAuth
from core.models import Movie  # noqa: F401  # Used for type checking in schema
from user_movie_data.models import UserMovieData
from user_movie_data.schemas import (
    UserMovieDataCreateSchema,
    UserMovieDataDetailSchema,
    UserMovieDataUpdateSchema,
)

if TYPE_CHECKING:
    class AuthenticatedRequest(HttpRequest):
        auth: User

# Create router with JWT authentication
user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTCookieAuth())


@user_movie_data_router.get("/by-tmdb-id", response=UserMovieDataDetailSchema)
def get_user_movie_data_by_tmdb_id(
    request: HttpRequest,
    tmdb_id: int
) -> UserMovieDataDetailSchema:
    """
    Retrieve user movie data for a specific movie by TMDB ID.

    This endpoint checks if the authenticated user has existing data
    (watchlist, rating, review, etc.) for a movie identified by its TMDB ID.

    Args:
        request: HTTP request with authenticated user
        tmdb_id: TMDB ID of the movie

    Returns:
        UserMovieDataDetailSchema: User's data for the specified movie

    Raises:
        HttpError: 404 if no data exists for this user/movie combination
    """
    # Django Ninja injects auth attribute at runtime
    user = cast(User, request.auth)  # type: ignore[attr-defined]

    # Query with select_related for efficient movie data access
    try:
        obj = UserMovieData.objects.select_related('movie').get(
            user=user,
            movie__tmdb_id=tmdb_id
        )
    except UserMovieData.DoesNotExist:
        raise HttpError(404, "User movie data not found for this TMDB ID")

    # Create response from ORM object with movie fields (type-safe)
    return UserMovieDataDetailSchema.from_orm_with_movie(obj)


@user_movie_data_router.post("", response=UserMovieDataDetailSchema)
def create_user_movie_data(
    request: HttpRequest,
    payload: UserMovieDataCreateSchema
) -> UserMovieDataDetailSchema:
    """
    Create new user movie data entry.

    This endpoint creates a new UserMovieData record when a user first
    interacts with a movie (adds to watchlist, rates, reviews, etc.).

    Args:
        request: HTTP request with authenticated user
        payload: User movie data to create (includes movie_id for FK lookup)

    Returns:
        UserMovieDataDetailSchema: Created user movie data

    Raises:
        HttpError: 400 if movie_id is invalid or entry already exists
    """
    # Django Ninja injects auth attribute at runtime
    user = cast(User, request.auth)  # type: ignore[attr-defined]

    # Verify movie exists
    movie = get_object_or_404(Movie, id=payload.movie_id)

    # Check if entry already exists
    if UserMovieData.objects.filter(user=user, movie=movie).exists():
        raise HttpError(400, "User movie data already exists for this movie")

    # Create the entry
    obj = UserMovieData.objects.create(
        user=user,
        movie=movie,
        user_watched=payload.user_watched,
        user_on_watchlist=payload.user_on_watchlist,
        user_liked=payload.user_liked,
        user_rating=payload.user_rating,
        user_review=payload.user_review,
    )

    # Create response from ORM object with movie fields (type-safe)
    return UserMovieDataDetailSchema.from_orm_with_movie(obj)


@user_movie_data_router.patch("/{id}", response=UserMovieDataDetailSchema)
def update_user_movie_data(
    request: HttpRequest,
    id: int,
    payload: UserMovieDataUpdateSchema
) -> UserMovieDataDetailSchema:
    """
    Update existing user movie data entry.

    This endpoint supports partial updates (PATCH) to modify any subset
    of user movie data fields (watchlist, rating, review, etc.).

    Args:
        request: HTTP request with authenticated user
        id: Primary key of the UserMovieData object
        payload: Fields to update (all optional for PATCH)

    Returns:
        UserMovieDataDetailSchema: Updated user movie data

    Raises:
        HttpError: 404 if object not found or doesn't belong to user
    """
    # Django Ninja injects auth attribute at runtime
    user = cast(User, request.auth)  # type: ignore[attr-defined]

    # Get object with user ownership check
    obj: UserMovieData = get_object_or_404(
        UserMovieData.objects.select_related('movie'),
        id=id,
        user=user
    )

    # Update only provided fields (exclude_unset for partial updates)
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obj, field, value)

    obj.save()

    # Create response from ORM object with movie fields (type-safe)
    return UserMovieDataDetailSchema.from_orm_with_movie(obj)


@user_movie_data_router.delete("/{id}", response={204: None})
def delete_user_movie_data(request: HttpRequest, id: int) -> tuple[int, None]:
    """
    Delete user movie data entry.

    This endpoint removes a UserMovieData record. This is rare and typically
    used only to correct mistakes in user input.

    Args:
        request: HTTP request with authenticated user
        id: Primary key of the UserMovieData object

    Returns:
        204 No Content on successful deletion

    Raises:
        HttpError: 404 if object not found or doesn't belong to user
    """
    # Django Ninja injects auth attribute at runtime
    user = cast(User, request.auth)  # type: ignore[attr-defined]

    # Get object with user ownership check
    obj = get_object_or_404(UserMovieData, id=id, user=user)
    obj.delete()

    return (204, None)
