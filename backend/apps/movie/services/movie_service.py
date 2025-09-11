from typing import Optional
from rest_framework import status
import requests
import logging
from django.conf import settings
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
base_url = "https://api.themoviedb.org/3"

# =========================
# Helper Functions
# =========================


def tmdb_dict_to_movie_dict(tmdb_dict):
    """
    Convert a TMDB API dict to a movie dictionary for serialization.
    This function creates a dictionary with only the fields needed by the serializer.
    """
    return {
        'tmdb_id': tmdb_dict.get('id'),
        'title': tmdb_dict.get('title'),
        'poster_path': tmdb_dict.get('poster_path', ''),
        'release_date': tmdb_dict.get('release_date') or None,
        'vote_average': tmdb_dict.get('vote_average'),
    }


def tmdb_get(endpoint: str, params: Optional[dict] = None) -> dict:
    """Generic TMDB GET request with error handling."""
    if params is None:
        params = {}
    params["api_key"] = settings.TMDB_API_KEY
    url = f"{base_url}/{endpoint}"
    print(f"TMDB REQUEST: {url}")
    print(f"TMDB PARAMS: {params}")
    try:
        response = requests.get(url, params=params)
        print(f"TMDB RESPONSE STATUS: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"TMDB request failed: {url} {response.status_code}")
            logger.error(f"TMDB Response: {response.text}")
            return {
                "error": (
                    f"TMDB request failed: {response.status_code}"
                ),
                "status": response.status_code
            }
        result = response.json()
        print(f"TMDB RESPONSE PAGE: {result.get('page', 'N/A')}")
        print(f"TMDB RESPONSE TOTAL_PAGES: {result.get('total_pages', 'N/A')}")
        return result

    except requests.exceptions.RequestException as e:
        logger.error(f"TMDB request exception: {e}")
        return {"error": str(e), "status": 500}


def get_simple_credits(credits_response):
    """ Extracts simplified, relevant credits from the TMDB credits response. """
    return {
        'crew': [
            {'id': person['id'], 'name': person['name'],
                'job': person['job'], 'profile_path': person['profile_path']}
            for person in credits_response.get('crew', [])
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

        movie_dict = tmdb_dict_to_movie_dict(info_response.json())
        credits = get_simple_credits(credits_response.json())
        movie_dict.update({
            'crew': credits.get('crew', []),
            'cast': credits.get('cast', []),
            'overview': info_response.json().get('overview', ''),
            'genres': info_response.json().get('genres', []),
            'production_companies': info_response.json().get('production_companies', []),
            'runtime': info_response.json().get('runtime', 0),
        })
        return movie_dict

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
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies]
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
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies]
    return result


def search_movies(query: str, page: int = 1):
    """ Searches for movies by query string using TMDB, with pagination. """
    params = {
        "query": query,
        "page": page,
        "include_adult": "false",  # Exclude adult content
        "language": "en-US",
        "region": "US"
    }
    result = tmdb_get("search/movie", params)
    if "error" in result:
        return result

    movies = result.get('results', [])
    print(f"DEBUG: search_movies called with query='{query}', page={page}")
    print(f"DEBUG: TMDB returned {len(movies)} raw results")

    # Filter out non-visual content (conservative approach)
    filtered_movies = []
    for movie in movies:
        title = movie.get('title', '')
        title_lower = title.lower()

        # Skip if it's not a movie (though search/movie should only return movies)
        if movie.get('media_type') and movie.get('media_type') != 'movie':
            print(f"DEBUG: Skipping {title} - media_type: {movie.get('media_type')}")
            continue

        # Skip obvious non-visual content (very conservative)
        skip_terms = [
            'soundtrack', 'score', 'music from', 'original motion picture soundtrack',
            'original score', 'music score', 'film score', 'motion picture score'
        ]
        if any(skip_term in title_lower for skip_term in skip_terms):
            print(f"DEBUG: Skipping {title} - contains non-visual content")
            continue

        filtered_movies.append(movie)

    print(f"DEBUG: After filtering: {len(filtered_movies)} movies kept")
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in filtered_movies]
    # Update total_results to reflect filtered count
    result['total_results'] = len(filtered_movies) + \
        (result.get('total_results', 0) - len(movies))

    return result


def discover_movies(page: int = 1, **filters):
    """
    Flexible movie discovery with full TMDB filtering capabilities.

    Supported filters:
    - sort_by: Sort order (popularity.desc, release_date.desc, etc.)
    - genres: Comma-separated genre IDs
    - year: Release year
    - vote_average_gte/lte: Rating range
    - keywords: Comma-separated keyword IDs
    - people: Comma-separated person IDs
    - release_date_gte/lte: Release date range
    - runtime_gte/lte: Runtime range in minutes
    - certification: Certification rating
    - region: Country code for regional release dates
    """
    print(f"DEBUG: discover_movies called with page={page}, filters: {filters}")
    params = {
        "include_adult": "false",
        "include_video": "false",
        "language": "en-US",
        "region": filters.get('region', 'US'),
        "page": page,
    }

    # Map filter names to TMDB parameter names
    filter_mapping = {
        'sort_by': 'sort_by',
        'genres': 'with_genres',
        'year': 'year',
        'vote_average_gte': 'vote_average.gte',
        'vote_average_lte': 'vote_average.lte',
        'keywords': 'with_keywords',
        'people': 'with_people',
        'release_date_gte': 'primary_release_date.gte',
        'release_date_lte': 'primary_release_date.lte',
        'runtime_gte': 'with_runtime.gte',
        'runtime_lte': 'with_runtime.lte',
        'certification': 'certification',
    }

    # Apply filters if provided
    for filter_name, tmdb_param in filter_mapping.items():
        if filter_name in filters and filters[filter_name] is not None:
            params[tmdb_param] = str(filters[filter_name])

    # Set default sort if not specified
    if 'sort_by' not in params:
        params['sort_by'] = 'popularity.desc'

    result = tmdb_get("discover/movie", params)
    if "error" in result:
        return result

    movies = result.get('results', [])
    print(f"DEBUG: TMDB returned {len(movies)} movies, "
          f"total_results: {result.get('total_results', 'N/A')}")
    if movies:
        print(f"DEBUG: First movie release date: "
              f"{movies[0].get('release_date', 'N/A')}")
    result['results'] = [tmdb_dict_to_movie_dict(m) for m in movies]
    return result


# =========================
# Supporting Data Service Methods
# =========================


def get_movie_genres():
    """Retrieves the list of movie genres from TMDB."""
    result = tmdb_get("genre/movie/list")
    if "error" in result:
        return result
    return result.get('genres', [])


def get_popular_keywords(page: int = 1):
    """Retrieves popular keywords from TMDB."""
    result = tmdb_get("keyword/popular", {"page": page})
    if "error" in result:
        return result
    return result


def search_keywords(query: str):
    """Searches for keywords by query string."""
    if not query or len(query.strip()) < 2:
        return {"results": []}

    result = tmdb_get("search/keyword", {"query": query})
    if "error" in result:
        return result
    return result.get('results', [])


def get_popular_people(page: int = 1):
    """Retrieves popular people (actors, directors, etc.) from TMDB."""
    result = tmdb_get("person/popular", {"page": page})
    if "error" in result:
        return result
    return result


def search_people(query: str):
    """Searches for people by name."""
    if not query or len(query.strip()) < 2:
        return {"results": []}

    result = tmdb_get("search/person", {"query": query})
    if "error" in result:
        return result
    return result.get('results', [])
