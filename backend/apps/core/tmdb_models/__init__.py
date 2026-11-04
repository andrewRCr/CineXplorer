"""TMDB API response models package.

This package contains Pydantic models representing The Movie Database (TMDB) API
response structures. These models provide type safety when parsing TMDB API responses
before converting them to Django Ninja schemas for the API layer.

Note: Django ORM models (like Movie) are in backend.apps.core.models, not here.
"""

from .tmdb_responses import (
    TMDBCastMember,
    TMDBCreditsResponse,
    TMDBCrewMember,
    TMDBGenre,
    TMDBGenreListResponse,
    TMDBKeyword,
    TMDBMovieBase,
    TMDBMovieDetail,
    TMDBPaginatedKeywordResponse,
    TMDBPaginatedMovieResponse,
    TMDBPaginatedPersonResponse,
    TMDBPaginatedResponse,
    TMDBPerson,
    TMDBProductionCompany,
)

__all__ = [
    "TMDBCastMember",
    "TMDBCreditsResponse",
    "TMDBCrewMember",
    "TMDBGenre",
    "TMDBGenreListResponse",
    "TMDBKeyword",
    "TMDBMovieBase",
    "TMDBMovieDetail",
    "TMDBPaginatedKeywordResponse",
    "TMDBPaginatedMovieResponse",
    "TMDBPaginatedPersonResponse",
    "TMDBPaginatedResponse",
    "TMDBPerson",
    "TMDBProductionCompany",
]
