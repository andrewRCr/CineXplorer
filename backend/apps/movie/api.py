"""Django Ninja router for movie endpoints.

This module defines the movie API endpoints using Django Ninja routers and
integrates with the typed movie service layer.
"""

from __future__ import annotations

from ninja import Router
from ninja.errors import HttpError
from django.http import HttpRequest

from core.models import UserMovieData
from .schemas import (
    MovieDetailSchema,
    PaginatedMovieResponseSchema,
    GenreSchema,
    PaginatedKeywordResponseSchema,
    PaginatedPersonResponseSchema,
    UserMovieDataSchema,
)

# Import service functions
from .services import movie_service

# Create the router instance for movie endpoints
router = Router(tags=["movies"])


# =========================
# Supporting Data Endpoints
# =========================


@router.get("/genres", response=list[GenreSchema], auth=None)
def get_movie_genres(request):
    """Retrieve the list of available movie genres from TMDB."""
    return movie_service.get_movie_genres()


@router.get("/keywords", response=PaginatedKeywordResponseSchema, auth=None)
def get_popular_keywords(request, page: int = 1):
    """Retrieve popular keywords with pagination."""
    return movie_service.get_popular_keywords(page=page)


@router.get("/keywords/search", response=PaginatedKeywordResponseSchema, auth=None)
def search_keywords(request, query: str):
    """Search for keywords by query string."""
    return movie_service.search_keywords(query)


@router.get("/people", response=PaginatedPersonResponseSchema, auth=None)
def get_popular_people(request, page: int = 1):
    """Retrieve popular people (actors, directors, etc.) with pagination."""
    return movie_service.get_popular_people(page=page)


@router.get("/people/search", response=PaginatedPersonResponseSchema, auth=None)
def search_people(request, query: str):
    """Search for people by name."""
    return movie_service.search_people(query)


# =========================
# Paginated Movie Endpoints
# =========================


@router.get("/movies/now-playing", response=PaginatedMovieResponseSchema, auth=None)
def get_now_playing_movies(request, page: int = 1):
    """Retrieve now playing movies with pagination."""
    return movie_service.get_nowPlaying_movies(page=page)


@router.get("/movies/upcoming", response=PaginatedMovieResponseSchema, auth=None)
def get_upcoming_movies(request, page: int = 1):
    """Retrieve upcoming movies with pagination."""
    return movie_service.get_upcoming_movies(page=page)


@router.get("/movies/search", response=PaginatedMovieResponseSchema, auth=None)
def search_movies(request, query: str, page: int = 1):
    """Search for movies by title with pagination."""
    return movie_service.search_movies(query=query, page=page)


# =========================
# Movie Discovery Endpoint
# =========================


def _build_simple_filters(sort_by, genres, keywords, people, certification,
                          region, release_date_gte, release_date_lte):
    """Build simple string parameter filters."""
    filters = {}
    simple_params = {
        'sort_by': sort_by,
        'genres': genres,
        'keywords': keywords,
        'people': people,
        'certification': certification,
        'region': region,
        'release_date_gte': release_date_gte,
        'release_date_lte': release_date_lte,
    }
    for param, value in simple_params.items():
        if value is not None:
            filters[param] = value
    return filters


def _process_year_filters(filters, year, min_year, max_year):
    """Process year filtering parameters."""
    if year is not None:
        if year.isdigit():
            filters['year'] = int(year)
        elif year.endswith('s') and len(year) == 5 and year[:-1].isdigit():
            decade_start = int(year[:-1])
            filters['release_date_gte'] = f"{decade_start}-01-01"
            filters['release_date_lte'] = f"{decade_start + 9}-12-31"
        else:
            raise HttpError(400, f"Invalid year format: {year}")

    if min_year is not None:
        filters['release_date_gte'] = f"{min_year}-01-01"
    if max_year is not None:
        filters['release_date_lte'] = f"{max_year}-12-31"


def _process_rating_filters(filters, vote_average_gte, vote_average_lte, min_rating):
    """Process rating filtering parameters."""
    if vote_average_gte is not None:
        filters['vote_average_gte'] = vote_average_gte
    elif min_rating is not None:
        filters['vote_average_gte'] = min_rating

    if vote_average_lte is not None:
        filters['vote_average_lte'] = vote_average_lte


def _process_runtime_filters(filters, runtime_gte, runtime_lte, min_runtime, max_runtime):
    """Process runtime filtering parameters."""
    if runtime_gte is not None:
        filters['runtime_gte'] = runtime_gte
    elif min_runtime is not None:
        filters['runtime_gte'] = min_runtime

    if runtime_lte is not None:
        filters['runtime_lte'] = runtime_lte
    elif max_runtime is not None:
        filters['runtime_lte'] = max_runtime


@router.get("/movies/discover", response=PaginatedMovieResponseSchema, auth=None)
def discover_movies(
    request,
    page: int = 1,
    # Sorting and basic filters
    sort_by: str | None = None,
    genres: str | None = None,
    keywords: str | None = None,
    people: str | None = None,
    certification: str | None = None,
    region: str | None = None,
    # Year filtering (supports single year, decade with 's' suffix, or min/max year)
    year: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    # Date range filtering
    release_date_gte: str | None = None,
    release_date_lte: str | None = None,
    # Rating filtering
    vote_average_gte: float | None = None,
    vote_average_lte: float | None = None,
    min_rating: float | None = None,
    # Runtime filtering
    runtime_gte: int | None = None,
    runtime_lte: int | None = None,
    min_runtime: int | None = None,
    max_runtime: int | None = None,
):
    """
    Discover movies with comprehensive filtering capabilities.

    Supports all TMDB discover endpoint parameters including:
    - Sorting (sort_by)
    - Genre, keyword, and people filtering
    - Year filtering (single year, decade like "1990s", or min/max year range)
    - Date range filtering
    - Rating filtering (vote_average_gte/lte or min_rating)
    - Runtime filtering (runtime_gte/lte or min/max_runtime)
    - Certification and region filtering
    """
    filters = _build_simple_filters(
        sort_by, genres, keywords, people, certification, region,
        release_date_gte, release_date_lte
    )

    _process_year_filters(filters, year, min_year, max_year)
    _process_rating_filters(filters, vote_average_gte, vote_average_lte, min_rating)
    _process_runtime_filters(
        filters, runtime_gte, runtime_lte, min_runtime, max_runtime
    )

    return movie_service.discover_movies(page=page, **filters)


# =========================
# Single Resource Endpoints
# =========================


@router.get("/movies/{tmdb_id}", response=MovieDetailSchema, auth=None)
def get_movie_detail(request: HttpRequest, tmdb_id: int):
    """
    Retrieve detailed movie information by TMDB ID.

    Includes user-specific data (watched status, rating, etc.) if user is authenticated.
    """
    # Get movie details from service
    movie_detail = movie_service.get_movie_by_id(tmdb_id)

    # Get user-specific data if user is authenticated
    user_movie_data = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        try:
            user_data = UserMovieData.objects.get(
                user=request.user,
                movie__tmdb_id=tmdb_id
            )
            user_movie_data = UserMovieDataSchema(
                id=user_data.id,  # Django model ID is always int for saved instances
                tmdb_id=user_data.movie.tmdb_id,
                title=user_data.movie.title,
                user_watched=user_data.user_watched,
                user_on_watchlist=user_data.user_on_watchlist,
                user_liked=user_data.user_liked,
                user_rating=user_data.user_rating,
                user_review=user_data.user_review,
            )
        except UserMovieData.DoesNotExist:
            # No user data exists for this movie, which is fine
            pass

    # Add user data to the movie detail response
    movie_detail.user_movie_data = user_movie_data

    return movie_detail
