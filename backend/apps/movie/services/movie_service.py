from typing import Optional
from rest_framework import status
import requests
import logging
from django.conf import settings
from datetime import datetime, timedelta
from core.models import Movie
# =========================
# Helper Functions
# =========================


def tmdb_dict_to_movie_instance(tmdb_dict):
    """
    Convert a TMDB API dict to a Movie model instance (not saved to DB).
    This function creates a 'stub' Movie instance and attaches additional
    TMDB data to it as attributes for the serializer to use.
    """
    # Create the Movie instance with only the fields that exist on the model.
    # Note the mapping from TMDB's 'id' to our model's 'tmdb_id'.
    movie_instance = Movie(
        tmdb_id=tmdb_dict.get('id'),
        title=tmdb_dict.get('title'),
        poster_path=tmdb_dict.get('poster_path', ''),
        # Handle cases where release_date might be an empty string
        release_date=tmdb_dict.get('release_date') or None,
    )

    # Attach other fields from the TMDB dictionary directly to the instance.
    # The serializer will pick these up as read-only fields.
    # This avoids trying to save them to the database.
    for key, value in tmdb_dict.items():
        if not hasattr(movie_instance, key):
            setattr(movie_instance, key, value)

    return movie_instance


logger: logging.Logger = logging.getLogger(__name__)
base_url = "https://api.themoviedb.org/3"

# =========================
# Helper Functions
# =========================


def tmdb_get(endpoint: str, params: Optional[dict] = None) -> dict:
    """Generic TMDB GET request with error handling."""
    if params is None:
        params = {}
    params["api_key"] = settings.TMDB_API_KEY
    url = f"{base_url}/{endpoint}"
    try:
        response = requests.get(url, params=params)
        if response.status_code != 200:
            logger.error(f"TMDB request failed: {url} {response.status_code}")
            return {
                "error": (
                    f"TMDB request failed: {response.status_code}"
                ),
                "status": response.status_code
            }
        return response.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"TMDB request exception: {e}")
        return {"error": str(e), "status": 500}


def get_simple_credits(credits_response):
    """ Extracts simplified, relevant credits from the TMDB credits response. """
    return {
        'directors': [
            {'name': person['name'], 'id': person['id']}
            for person in credits_response.get('crew', [])
            if person['job'] == 'Director'
        ],
        'writers': [
            {'name': person['name'], 'id': person['id']}
            for person in credits_response.get('crew', [])
            if person['job'] == 'Screenplay'
        ],
        'cast': [
            {'id': person['id'], 'name': person['name'],
                'character': person['character'], 'profile_path': person['profile_path']}
            for person in credits_response.get('cast', [])
        ]
    }


# =========================
# Single Resource Detail Service Methods
# =========================


def get_movie_by_id(tmdb_id: int):
    """ Retrieves movie details and credits from TMDB by movie ID. """

    try:
        info_url = f"{base_url}/movie/{tmdb_id}?api_key={settings.TMDB_API_KEY}"
        credits_url = f"{base_url}/movie/{tmdb_id}/credits?api_key={settings.TMDB_API_KEY}"

        info_response = requests.get(info_url)
        if info_response.status_code == 404:
            return {
                'error': f'Movie with id {tmdb_id} not found.',
                'status': status.HTTP_404_NOT_FOUND
            }
        elif info_response.status_code != 200:
            logger.error(f"Failed to retrieve movie info for id {tmdb_id}.")
            return {
                'error': f'An error occurred while retrieving info for movie w/ id {tmdb_id}.',
                'status': status.HTTP_500_INTERNAL_SERVER_ERROR
            }

        credits_response = requests.get(credits_url)
        if credits_response.status_code != 200:
            logger.error(f"Failed to retrieve credits for movie id {tmdb_id}.")
            return {
                'error': f'An error occurred while retrieving credits for movie w/ id {tmdb_id}.',
                'status': status.HTTP_500_INTERNAL_SERVER_ERROR
            }

        movie_instance = tmdb_dict_to_movie_instance(info_response.json())
        credits = get_simple_credits(credits_response.json())
        movie_instance.directors = credits.get('directors', [])
        movie_instance.writers = credits.get('writers', [])
        movie_instance.cast = credits.get('cast', [])
        return movie_instance

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to retrieve movie data: {e}")
        return {
            'error': f'An error occurred while finding movie with id {tmdb_id}.',
            'status': status.HTTP_500_INTERNAL_SERVER_ERROR
        }

# =========================
# Paginated Resource Service Methods
# =========================


def get_nowPlaying_movies(page=1):
    """ Retrieves a list of now playing movies from TMDB. """
    result = tmdb_get("movie/now_playing", {"page": page})
    if "error" in result:
        return result
    movies = result.get('results', [])
    result['results'] = [tmdb_dict_to_movie_instance(m) for m in movies]
    return result


def get_upcoming_movies(page=1):
    """ Retrieves a list of upcoming movies from TMDB, paginated by page param. """
    today = datetime.today()
    min_date = today.strftime("%Y-%m-%d")
    max_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

    params = {
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "region": "US",
        "page": page,
        "sort_by": "popularity.desc",
        "with_release_type": "2|3",
        "primary_release_date.gte": min_date,
        "primary_release_date.lte": max_date,
    }
    result = tmdb_get("discover/movie", params)
    if "error" in result:
        return result
    movies = result.get('results', [])
    result['results'] = [tmdb_dict_to_movie_instance(m) for m in movies]
    return result


def search_movies(query: str, page: int = 1):
    """ Searches for movies by query string using TMDB, with pagination. """
    params = {"query": query, "page": page}
    result = tmdb_get("search/movie", params)
    if "error" in result:
        return result
    movies = result.get('results', [])
    result['results'] = [tmdb_dict_to_movie_instance(m) for m in movies]
    return result
