from __future__ import annotations

import logging

import requests
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.response import Response

from user_movie_data.models import UserMovieData
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


def get_user_movie_data_bulk(tmdb_ids: list[int],
                             user: User) -> dict[int, dict[str, object] | None]:
    """
    Bulk fetch user_movie_data for a list of tmdb_ids and a user instance.
    Returns dict {tmdb_id: serialized user_movie_data or None}.
    """
    # Early return for empty input
    if not tmdb_ids:
        return {}

    # De-duplicate IDs to avoid redundant DB work
    unique_ids = set(tmdb_ids)

    # Initialize result map with None for all unique IDs
    result: dict[int, dict[str, object] | None] = {tmdb_id: None for tmdb_id in unique_ids}

    # Query all UserMovieData for this user and these tmdb_ids
    user_movie_data_qs = UserMovieData.objects.filter(user=user, tmdb_id__in=unique_ids)

    # Serialize results
    serializer = UserMovieDataSerializer(user_movie_data_qs, many=True)

    # Overlay serialized items onto result map (single pass, no "not in" checks)
    for item in serializer.data:
        result[item['tmdb_id']] = item

    return result
