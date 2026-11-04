"""Django Ninja router for user movie data endpoints.

This module provides authenticated endpoints for managing user interactions
with movies, including watchlist status, ratings, and reviews.

All endpoints require JWT authentication. Business logic is delegated to
UserMovieDataService, keeping API layer focused on HTTP concerns only.

Architecture:
- API layer: Request/response handling, authentication, validation
- Service layer: Business logic (CRUD, TMDB integration, filtering)
- Repository layer: Data access abstraction
"""
from __future__ import annotations

from django.http import HttpRequest
from ninja import Router, Status

from apps.authentication.auth_ninja import JWTCookieAuth, get_current_user
from apps.movie.schemas import MovieListResponseSchema
from apps.user_movie_data.schemas import (
    UserMovieDataCreateSchema,
    UserMovieDataDetailSchema,
    UserMovieDataUpdateSchema,
)
from apps.user_movie_data.services.service_factory import get_user_movie_data_service

# Create router with JWT authentication
user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTCookieAuth())

# Initialize services
_service = get_user_movie_data_service()


@user_movie_data_router.get("/movies", response=MovieListResponseSchema)
def get_user_movies(
    request: HttpRequest,
    watchlist: bool = False,
) -> MovieListResponseSchema:
    """
    Retrieve movies associated with the authenticated user.

    This endpoint returns all movies that the user has interacted with
    (watched, rated, added to watchlist, etc.). Movies are enriched with
    complete TMDB data and user-specific metadata.

    Note: Returns all results at once (no server-side pagination). Frontend
    uses client-side virtualization for large lists.

    Args:
        request: HTTP request with authenticated user
        watchlist: Filter to show only watchlist movies (default: False)

    Returns:
        MovieListResponseSchema: List of movies with user data

    Raises:
        HttpError: 401 if authentication fails

    Example:
        GET /api/user-movie-data/movies - All user movies
        GET /api/user-movie-data/movies?watchlist=true - Watchlist only
    """
    user = get_current_user(request)

    # Delegate to service layer for full, non-paginated list
    response = _service.get_all_user_movies(
        user=user,
        watchlist_only=watchlist if watchlist else None,
    )

    return response


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
    user = get_current_user(request)

    # Service handles authorization and raises HttpError(404) if not found
    umd = _service.get_by_tmdb_id(user, tmdb_id)

    return UserMovieDataDetailSchema.from_orm_with_movie(umd)


@user_movie_data_router.post("", response=UserMovieDataDetailSchema)
def create_user_movie_data(
    request: HttpRequest,
    payload: UserMovieDataCreateSchema
) -> UserMovieDataDetailSchema:
    """
    Create new user movie data entry.

    This endpoint creates a new UserMovieData record when a user first
    interacts with a movie (adds to watchlist, rates, reviews, etc.).

    If the movie doesn't exist in our local database yet, the service
    fetches the movie data from TMDB and creates a local Movie stub record.

    Args:
        request: HTTP request with authenticated user
        payload: User movie data to create (includes movie_id as TMDB ID)

    Returns:
        UserMovieDataDetailSchema: Created user movie data

    Raises:
        HttpError: 400 if entry already exists
        HttpError: 404 if movie not found in TMDB
    """
    user = get_current_user(request)

    # Service handles TMDB fetch, movie stub creation, and UserMovieData creation
    umd = _service.create(
        user=user,
        tmdb_id=payload.movie_id,
        user_watched=payload.user_watched,
        user_on_watchlist=payload.user_on_watchlist,
        user_liked=payload.user_liked,
        user_rating=payload.user_rating,
        user_review=payload.user_review,
    )

    return UserMovieDataDetailSchema.from_orm_with_movie(umd)


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
    user = get_current_user(request)

    # Extract only provided fields for partial update
    update_data = payload.model_dump(exclude_unset=True)

    # Service handles authorization and raises HttpError(404) if not found
    umd = _service.update(
        user=user,
        record_id=id,
        user_watched=update_data.get("user_watched"),
        user_on_watchlist=update_data.get("user_on_watchlist"),
        user_liked=update_data.get("user_liked"),
        user_rating=update_data.get("user_rating"),
        user_review=update_data.get("user_review"),
    )

    return UserMovieDataDetailSchema.from_orm_with_movie(umd)


@user_movie_data_router.delete("/{id}", response={204: None})
def delete_user_movie_data(request: HttpRequest, id: int) -> Status[None]:
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
    user = get_current_user(request)

    # Service handles authorization and raises HttpError(404) if not found
    _service.delete(user=user, record_id=id)

    return Status(204, None)
