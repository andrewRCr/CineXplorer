from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.views import APIView
from rest_framework.response import Response

from user_movie_data.services.user_movie_data_service import (
    get_user_movie_data,
    get_user_movie_data_bulk,
)

"""
Base views for single resource (non-paginated) TMDB endpoints.
"""


class SingleResourceTMDBView(APIView):
    authentication_classes = [TokenAuthentication]
    service_method = None  # override in subclass

    def get(self, request, tmdb_id, *args, **kwargs):
        if self.service_method is None:
            return Response(
                {"error": "No service method defined."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        tmdb_response = self.service_method(tmdb_id)
        # If service returns a Response, extract .data; else use as-is
        if isinstance(tmdb_response, Response):
            data = tmdb_response.data
            status_code = tmdb_response.status_code
        else:
            data = tmdb_response
            status_code = status.HTTP_200_OK

        # Attach user_movie_data if authenticated and resource is a movie
        # (for future: allow subclass to customize user data attachment)
        if request.auth and 'id' in data:
            # Only attach if this is a movie resource
            if 'title' in data:
                user_movie_data_response = get_user_movie_data(
                    data['id'], request.auth.key)
                if user_movie_data_response.status_code == status.HTTP_200_OK:
                    data["user_movie_data"] = user_movie_data_response.data
        return Response(data, status=status_code)


"""
Base views for paginated TMDB endpoints.
"""


class PaginatedTMDBView(APIView):
    authentication_classes = [TokenAuthentication]
    service_method = None  # override in subclass

    def get(self, request, *args, **kwargs):
        page = request.query_params.get('page', 1)
        if self.service_method is None:
            return Response(
                {"error": "No service method defined."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        tmdb_response = self.service_method(page=page)
        if isinstance(tmdb_response, Response):
            data = tmdb_response.data
        else:
            data = tmdb_response
        # Attach user_movie_data if authenticated
        if request.auth:
            results = data.get('results', [])
            if not isinstance(results, list):
                results = []
            movie_ids = [movie['id'] for movie in results]
            user_movie_data_map = get_user_movie_data_bulk(movie_ids, request.user)
            for movie in results:
                movie_id = movie['id']
                movie['user_movie_data'] = user_movie_data_map.get(movie_id)
        return Response(data)


class PaginatedTMDBQueryView(APIView):
    authentication_classes = [TokenAuthentication]
    service_method = None  # override in subclass

    def get(self, request, *args, **kwargs):
        page = request.query_params.get('page', 1)
        query = request.query_params.get('query', '')
        if self.service_method is None:
            return Response(
                {"error": "No service method defined."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        tmdb_response = self.service_method(page=page, query=query)
        if isinstance(tmdb_response, Response):
            data = tmdb_response.data
        else:
            data = tmdb_response
        # Attach user_movie_data if authenticated
        if request.auth:
            results = data.get('results', [])
            if not isinstance(results, list):
                results = []
            movie_ids = [movie['id'] for movie in results]
            user_movie_data_map = get_user_movie_data_bulk(movie_ids, request.user)
            for movie in results:
                movie_id = movie['id']
                movie['user_movie_data'] = user_movie_data_map.get(movie_id)
        return Response(data)
