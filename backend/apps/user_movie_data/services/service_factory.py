"""Production factories for user-movie services."""

from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService


def get_movie_enrichment_service() -> MovieEnrichmentService:
    return MovieEnrichmentService()


def get_user_movie_data_service() -> UserMovieDataService:
    return UserMovieDataService()


def get_user_movie_entry_service() -> UserMovieEntryService:
    return UserMovieEntryService()
