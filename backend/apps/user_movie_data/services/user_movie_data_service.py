import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

from core.models import UserMovieData
from user_movie_data.serializers import UserMovieDataSerializer

logger: logging.Logger = logging.getLogger(__name__)


def get_user_movie_data(tmdb_id: int, token: str) -> Response:
    """ Retrieves user-specific movie data from the backend by movie ID. """

    try:
        url = f"{settings.BACKEND_URL}/user-movie-data/find-by-movie/{tmdb_id}/"
        response = requests.get(url, headers={'Authorization': f'Token {token}'})

        if response.status_code == 404:
            return Response(status=status.HTTP_404_NOT_FOUND, data={
                "error": f"User movie data for movie id {tmdb_id} not found."})

        user_movie_data_serializer = UserMovieDataSerializer(response.json())
        return Response(data=user_movie_data_serializer.data)

    except requests.RequestException as e:
        logger.error(f"Error fetching user movie data for id {tmdb_id}: {e}")
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={
            "error": "An error occurred while retrieving user movie data."})


def get_user_movie_data_bulk(tmdb_ids, user):
    """
    Bulk fetch user_movie_data for a list of tmdb_ids and a user instance.
    Returns dict {tmdb_id: serialized user_movie_data or None}.
    """
    # Query all UserMovieData for this user and these tmdb_ids
    user_movie_data_qs = UserMovieData.objects.filter(user=user, tmdb_id__in=tmdb_ids)
    # Serialize results
    serializer = UserMovieDataSerializer(user_movie_data_qs, many=True)
    # Build dict {tmdb_id: user_movie_data}
    result = {item['tmdb_id']: item for item in serializer.data}
    # Fill in None for tmdb_ids with no data
    for tmdb_id in tmdb_ids:
        if tmdb_id not in result:
            result[tmdb_id] = None
    return result
