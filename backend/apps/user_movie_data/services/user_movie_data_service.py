from rest_framework import status
from rest_framework.response import Response
import requests
import logging
from django.conf import settings

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
