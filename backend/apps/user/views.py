"""
Views for the user API.
"""

from django.contrib.auth.models import AbstractUser, AnonymousUser
from rest_framework import generics, authentication, permissions
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.settings import api_settings

from user.serializers import UserSerializer, AuthTokenSerializer


class CreateUserView(generics.CreateAPIView):
    """ Defines a POST request view that creates a new user in the system. """

    serializer_class = UserSerializer


class CreateTokenView(ObtainAuthToken):
    """ Defines a POST request view that creates a new auth token for the user. """

    serializer_class = AuthTokenSerializer
    renderer_classes = api_settings.DEFAULT_RENDERER_CLASSES


class ManageUserView(generics.RetrieveUpdateAPIView):
    """ Defines a GET/PUT/PATCH request view that updates an authenticated user's basic info. """

    serializer_class = UserSerializer
    authentication_classes = [authentication.TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> AbstractUser | AnonymousUser:  # type: ignore
        """ Retrieves and returns the currently authenticated user. """

        return self.request.user
