"""
Views for the user movie data API.
"""

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView

from core.models import UserMovieData
from user_movie_data import serializers


class UserMovieDataViewSet(viewsets.ModelViewSet):
    """ View for manage user movie data APIs. """

    serializer_class = serializers.UserMovieDataDetailSerializer
    queryset = UserMovieData.objects.all()
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):  # type: ignore
        """ Retrieve all user movie data for only the authenticated user. """

        return self.queryset.filter(user=self.request.user).order_by('-id')

    def get_serializer_class(self):  # type: ignore
        """ Returns the appropriate serializer class for the request. """

        if self.action == 'list':  # use simple serialization
            return serializers.UserMovieDataSerializer
        else:  # use default, detailed serialization
            return self.serializer_class

    def perform_create(self, serializer):
        """ Creates a new UserMovieData object, with the authenticated user assigned. """

        serializer.save(user=self.request.user)


class UserMovieDataFindByMovie(viewsets.ReadOnlyModelViewSet):
    """  """

    serializer_class = serializers.UserMovieDataDetailSerializer
    queryset = UserMovieData.objects.all()
    lookup_field = 'tmdb_id'
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):  # type: ignore
        print(f"user: {self.request.user.username}")
        self.queryset = self.queryset.filter(user=self.request.user)
        print(f"forUser: {self.queryset}")
        tmdb_id = self.request.query_params.get('tmdb_id')  # type: ignore
        if tmdb_id is not None:
            queryset = self.queryset.filter(tmdb_id=tmdb_id)
        print(f"Final: {self.queryset}")
        return self.queryset
