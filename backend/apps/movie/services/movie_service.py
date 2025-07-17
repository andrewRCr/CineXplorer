from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
import requests
import logging
from django.conf import settings

from movie.serializers import MovieDetailSerializer

logger: logging.Logger = logging.getLogger(__name__)

base_url = "https://api.themoviedb.org/3"


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


def get_movie_by_id(tmdb_id: int):
    """ Retrieves movie details and credits from TMDB by movie ID. """

    try:
        info_url = f"{base_url}/movie/{tmdb_id}?api_key={settings.TMDB_API_KEY}"
        credits_url = f"{base_url}/movie/{tmdb_id}/credits?api_key={settings.TMDB_API_KEY}"

        info_response = requests.get(info_url)
        if info_response.status_code == 404:
            return Response(status=status.HTTP_404_NOT_FOUND, data={
                "error": f"Movie with id {tmdb_id} not found."})
        elif info_response.status_code != 200:  # handle errors in fetching movie info
            logger.error(f"Failed to retrieve movie info for id {tmdb_id}.")
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={
                "error": f"An error occurred while retrieving info for movie w/ id {tmdb_id}."})

        credits_response = requests.get(credits_url)
        if credits_response.status_code != 200:  # handle errors in fetching credits
            logger.error(f"Failed to retrieve credits for movie id {tmdb_id}.")
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={
                "error": f"An error occurred while retrieving credits for movie w/ id {tmdb_id}."})

        movie_serializer = MovieDetailSerializer(info_response.json())
        movie_data = movie_serializer.data

        result = {}
        result.update(movie_data)
        result.update(get_simple_credits(credits_response.json()))

        return Response(data=result)

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to retrieve movie data: {e}")
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, exception=True, data={
            "error": f"An error occured while finding movie with id {tmdb_id}."})


def search_movies(query: str) -> Response:
    """ Searches for movies by query string using TMDB. """

    try:
        search_url = f"{base_url}/search/movie?api_key={settings.TMDB_API_KEY}&query={query}"
        query_response = requests.get(search_url)

        if query_response.json()['total_results'] == 0:
            return Response(status=status.HTTP_404_NOT_FOUND, data={
                "error": "No movies found matching the query."})

        if query_response.status_code != 200:
            logger.error(f"Failed to search movies: {query_response.status_code}")
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={
                "error": "An error occurred while searching for movies."})

        return Response(data=query_response.json())

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to search movies: {e}")
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={
            "error": "An error occurred while searching for movies."})
