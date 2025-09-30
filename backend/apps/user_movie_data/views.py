"""
Views for the user movie data API.
"""
from __future__ import annotations

from django.db import models
from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from user_movie_data.models import UserMovieData
from user_movie_data import serializers


class UserMovieDataViewSet(viewsets.ModelViewSet):
    """ View for manage user movie data APIs. """

    serializer_class = serializers.UserMovieDataDetailSerializer
    queryset = UserMovieData.objects.all()
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> models.QuerySet[UserMovieData]:
        """ Retrieve all user movie data for only the authenticated user. """

        return self.queryset.filter(user=self.request.user).select_related('movie').order_by('-id')

    def get_serializer_class(self) -> type[BaseSerializer]:
        """ Returns the appropriate serializer class for the request. """

        if self.action == 'list':  # use simple serialization
            return serializers.UserMovieDataSerializer
        else:  # use default, detailed serialization
            return self.serializer_class

    def perform_create(self, serializer: BaseSerializer) -> None:
        """ Creates a new UserMovieData object, with the authenticated user assigned. """

        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='by-tmdb-id')
    def by_tmdb_id(self, request: Request) -> Response:
        """
        Retrieve a single UserMovieData object for the authenticated user by TMDB movie ID.
        Returns a 404 response if no matching object is found.
        """

        tmdb_id = request.query_params.get('tmdb_id')
        queryset = self.get_queryset()
        if tmdb_id is not None:
            queryset = queryset.filter(movie__tmdb_id=tmdb_id)
        instance = queryset.first()
        if instance is None:
            return Response({}, status=404)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
