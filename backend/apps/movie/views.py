"""
Views for the movie API.
"""

import requests
import json
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render

from rest_framework import status
from rest_framework.mixins import (RetrieveModelMixin, ListModelMixin)
from rest_framework.viewsets import GenericViewSet

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated


from .services import movie_service
from user_movie_data.services import user_movie_data_service
from user_movie_data.serializers import UserMovieDataSerializer

import tmdbsimple as tmdb
tmdb.API_KEY = settings.TMDB_API_KEY
tmdb.REQUESTS_TIMEOUT = (2, 5)  # seconds, for connect/read


@api_view()
def movie_search_view(request, queryStr) -> HttpResponse:
    """ Movie list view, pulled from TMDB by id. """

    service_response: Response = movie_service.search_movies(queryStr)
    # search = tmdb.Search()
    # response = search.movie(query=queryStr)

    return service_response


class MovieDetailView(APIView):
    """  """

    authentication_classes = [TokenAuthentication]

    def get(self, request, tmdb_id, format=json):
        """ Retrieves movie details by TMDB ID, including user-specific data if available. """

        movie_response = movie_service.get_movie_by_id(tmdb_id)
        if request.auth and movie_response.status_code == status.HTTP_200_OK:
            # movie found and user logged in; get any user movie data to append to response
            user_movie_data_response = user_movie_data_service.get_user_movie_data(
                tmdb_id, request.auth.key)
            if user_movie_data_response.status_code == status.HTTP_200_OK:
                # append user movie data to movie response
                movie_response_data = movie_response.data
                user_movie_data_response_data = user_movie_data_response.data

                if movie_response_data is not None:
                    movie_response_data["user_movie_data"] = user_movie_data_response_data
                else:
                    return Response(
                        {"error": "Movie response data is None."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                return Response(data=movie_response_data)
            else:
                if user_movie_data_response.status_code == status.HTTP_404_NOT_FOUND:
                    # return without user movie data
                    return movie_response

        return movie_response


class NowPlayingMoviesView(APIView):
    """  """

    authentication_classes = [TokenAuthentication]

    def get(self, request, format=json):
        """ Retrieves a list of movies by recency, including user-specific data if available. """

        movie_response = movie_service.get_nowPlaying_movies()
        # TODO: skipping user movie data append for now
        return movie_response


class UpcomingMoviesView(APIView):
    """  """

    authentication_classes = [TokenAuthentication]

    def get(self, request, format=json):
        """ Retrieves a list of upcoming movies, including user-specific data if available. """

        movie_response = movie_service.get_upcoming_movies()
        # TODO: skipping user movie data append for now
        return movie_response

# @api_view()
# def movie_detail_view(request, tmdb_id) -> HttpResponse:
#     """ Basic movie detail info view, pulled from TMDB by id, + any relevant user movie data. """

#     movie_response: Response = movie_service.get_movie_by_id(tmdb_id)

#     if movie_response.status_code == status.HTTP_200_OK and request.auth:
#         print("authorized user:" + request.user.username)
#         # movie found and user logged in; get any user movie data to append to response
#         user_movie_data_response = user_movie_data_service.get_user_movie_data(tmdb_id)
#         if user_movie_data_response.status_code == status.HTTP_200_OK:
#             # append
#             result = {}
#             result.update(movie_response.json())
#             result.update(user_movie_data_response.json())
#             return Response(data=result)
#         else:
#             return user_movie_data_response
#     else:
#         print("no auth user!")

#     return movie_response


# class FindMovieByIdViewSet(GenericViewSet,  # generic view functionality
#                            RetrieveModelMixin):  # handles GETs for 1 Movie

#     serializer_class = serializers.MovieDetailSerializer
#     queryset = Movie.objects.all()

#     def get_queryset(self):  # type: ignore
#         """ Return movie corresponding to passed id. """

#         # return self.queryset.order_by('-title')
#         movie_data = movie_service.get_movie_by_id(tmdb_id=78)  # Example TMDB ID
#         if movie_data:
#             return movie_data
#         else:
#             return Movie.objects.none()


# class MoviesArrayViewSet(GenericViewSet,  # generic view functionality
#                    ListModelMixin):  # handles GETs for many Movies

#     serializer_class = serializers.MovieDetailSerializer
#     queryset = Movie.objects.all()

#     def get_queryset(self):  # type: ignore
#         """ By default, order response objects alphabetically. """

#         # return self.queryset.order_by('-title')
#         movie_data = movie_service.get_movie_data(tmdb_id=78)  # Example TMDB ID
#         if movie_data:
#             return movie_data
#         else:
#             return Movie.objects.none()

#     def get_serializer_class(self):  # type: ignore
#         """ Returns the appropriate serializer class for the request. """

#         if self.action == 'list':  # use simple serialization
#             return serializers.MovieSerializer
#         else:  # use default, detailed serialization
#             return self.serializer_class
