"""Share the stored-card lookup for record saves and entry creation."""

from django.utils import timezone

from apps.core.models import Movie
from apps.core.services.tmdb_api_client import TMDBApiClient
from apps.movie.services.tmdb_api_boundary.response_factories import (
    handle_tmdb_api_error,
    movie_card_fields,
)


def get_or_fetch_card(client: TMDBApiClient, tmdb_id: int) -> Movie:
    movie = Movie.objects.filter(pk=tmdb_id).first()
    if movie is None:
        response = client.get_movie_details(tmdb_id)
        if not response.is_success():
            handle_tmdb_api_error(response, "save_movie", lookup=True, tmdb_id=tmdb_id)
        card = movie_card_fields(response.get_json_data() or {})
        movie, _ = Movie.objects.get_or_create(
            tmdb_id=tmdb_id, defaults={**card, "refreshed_at": timezone.now()}
        )
    return movie
