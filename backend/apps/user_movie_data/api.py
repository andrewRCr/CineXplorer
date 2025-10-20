"""Django Ninja router for user movie data endpoints.

This module provides authenticated endpoints for managing user interactions
with movies, including watchlist status, ratings, and reviews.

All endpoints require JWT authentication and follow the ModelSchema pattern
established in Phase 1 for type-safe Django model operations.
"""
from __future__ import annotations

from authentication.auth_ninja import JWTCookieAuth, get_current_user
from core.models import Movie
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from movie.schemas import MovieBaseSchema, PaginatedMovieResponseSchema
from movie.services import movie_service
from ninja import Router
from ninja.errors import HttpError
from user_movie_data.models import UserMovieData
from user_movie_data.schemas import (
    UserMovieDataCreateSchema,
    UserMovieDataDetailSchema,
    UserMovieDataUpdateSchema,
)
from user_movie_data.services.movie_enrichment_service import MovieEnrichmentService

# Create router with JWT authentication
user_movie_data_router = Router(tags=["user-movie-data"], auth=JWTCookieAuth())

# Initialize enrichment service
enrichment_service = MovieEnrichmentService()


@user_movie_data_router.get("/movies", response=PaginatedMovieResponseSchema)
def get_user_movies(
    request: HttpRequest,
    watchlist: bool = False
) -> PaginatedMovieResponseSchema:
    """
    Retrieve movies associated with the authenticated user.

    This endpoint returns a paginated list of movies that the user has interacted
    with (watched, rated, added to watchlist, etc.). Movies are enriched with
    complete TMDB data and user-specific metadata.

    Args:
        request: HTTP request with authenticated user
        watchlist: Optional filter to show only watchlist movies (default: False)

    Returns:
        PaginatedMovieResponseSchema: Paginated list of movies with user data

    Raises:
        HttpError: 401 if authentication fails

    Example:
        GET /api/user-movie-data/movies - All user movies
        GET /api/user-movie-data/movies?watchlist=true - Watchlist only
    """
    # Get authenticated user
    user = get_current_user(request)

    # Query UserMovieData for this user
    user_data_qs = UserMovieData.objects.filter(user=user).select_related('movie')

    # Apply watchlist filter if requested
    if watchlist:
        user_data_qs = user_data_qs.filter(user_on_watchlist=True)

    # Extract tmdb_ids from user data
    tmdb_ids = [umd.movie.tmdb_id for umd in user_data_qs]  # pyright: ignore[reportUnknownMemberType]

    # If no movies, return empty response
    if not tmdb_ids:
        return PaginatedMovieResponseSchema(
            page=1,
            total_pages=0,
            total_results=0,
            results=[]
        )

    # Fetch full movie data from TMDB for each movie
    # Note: For now, we fetch individually. Future optimization: batch API if available
    movies: list[MovieBaseSchema] = []
    for tmdb_id in tmdb_ids:
        try:
            movie_detail = movie_service.get_movie_by_id(tmdb_id)
            # MovieDetailSchema extends MovieBaseSchema, so we can use it directly
            # For watchlist, we only need the base fields, but keeping detail data
            # doesn't hurt and avoids unnecessary data conversion
            movies.append(movie_detail)
        except HttpError:
            # Skip movies that are no longer available in TMDB
            # This can happen if a movie is removed from TMDB after user added it
            continue

    # Enrich movies with user-specific data
    # Note: enrichment_service mutates the input list in place,
    # so MovieDetailSchema objects stay as MovieDetailSchema
    enriched_movies = enrichment_service.enrich_movies_with_user_movie_data(movies, user)

    # Return paginated response
    # Note: Pagination not implemented in this minimal version
    return PaginatedMovieResponseSchema(
        page=1,
        total_pages=1 if enriched_movies else 0,
        total_results=len(enriched_movies),
        results=enriched_movies
    )


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
    # Get authenticated user with explicit error handling
    user = get_current_user(request)

    # Query with select_related for efficient movie data access
    try:
        obj = UserMovieData.objects.select_related('movie').get(
            user=user,
            movie__tmdb_id=tmdb_id
        )
    except UserMovieData.DoesNotExist:
        raise HttpError(404, "User movie data not found for this TMDB ID") from None

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

    If the movie doesn't exist in our local database yet, it fetches the
    movie data from TMDB and creates a local Movie stub record.

    Args:
        request: HTTP request with authenticated user
        payload: User movie data to create (includes movie_id for FK lookup)

    Returns:
        UserMovieDataDetailSchema: Created user movie data

    Raises:
        HttpError: 400 if entry already exists
        HttpError: 404 if movie not found in TMDB
    """
    # Get authenticated user with explicit error handling
    user = get_current_user(request)

    # Get or create Movie record
    # If movie doesn't exist locally, fetch from TMDB and create stub
    try:
        movie = Movie.objects.get(tmdb_id=payload.movie_id)
    except Movie.DoesNotExist:
        # Fetch movie data from TMDB to create local stub
        try:
            movie_detail = movie_service.get_movie_by_id(payload.movie_id)
        except HttpError as e:
            # Re-raise if movie not found in TMDB
            raise HttpError(404, f"Movie not found in TMDB: {e.message}") from e

        # Create minimal Movie stub from TMDB data
        movie = Movie.objects.create(
            tmdb_id=movie_detail.tmdb_id,
            title=movie_detail.title,
            poster_path=movie_detail.poster_path,
            release_date=movie_detail.release_date
        )

    # Atomically get or create to avoid race condition
    obj, created = UserMovieData.objects.get_or_create(
        user=user,
        movie=movie,
        defaults={
            'user_watched': payload.user_watched,
            'user_on_watchlist': payload.user_on_watchlist,
            'user_liked': payload.user_liked,
            'user_rating': payload.user_rating,
            'user_review': payload.user_review,
        }
    )

    if not created:
        raise HttpError(400, "User movie data already exists for this movie")

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
    # Get authenticated user with explicit error handling
    user = get_current_user(request)

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
    # Get authenticated user with explicit error handling
    user = get_current_user(request)

    # Get object with user ownership check
    obj = get_object_or_404(UserMovieData, id=id, user=user)
    obj.delete()

    return (204, None)
