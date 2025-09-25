from __future__ import annotations
from typing import Callable

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.response import Response

from user_movie_data.services.user_movie_data_service import (
    get_user_movie_data,
    get_user_movie_data_bulk,
)
from shared import TMDBMovieResponse, TMDBSearchResponse

"""
Base views for single resource (non-paginated) TMDB endpoints.
"""


class SingleResourceTMDBView(APIView):
    authentication_classes = [TokenAuthentication]
    service_method: Callable[[int], TMDBMovieResponse | Response] | None = None  # override

    def get(self, request: Request, tmdb_id: int) -> Response:
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
    service_method: Callable[..., TMDBSearchResponse | Response] | None = None  # override

    def get(self, request: Request) -> Response:
        # Extract common parameters
        page = request.query_params.get('page', 1)

        # Allow subclasses to extract additional parameters
        try:
            additional_params = self.get_additional_params(request)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Call service method with all parameters
        if self.service_method is None:
            return Response(
                {"error": "No service method defined."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Merge page with additional parameters
        params = {'page': page, **additional_params}
        tmdb_response = self.service_method(**params)

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

    def get_additional_params(self, request: Request) -> dict[str, object]:
        """
        Override in subclasses to extract additional parameters.
        Should return a dict of parameters to pass to the service method.
        """
        return {}
