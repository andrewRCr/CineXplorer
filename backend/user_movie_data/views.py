"""
Views for the user movie data API.
"""

from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

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
