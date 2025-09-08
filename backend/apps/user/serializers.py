"""
Serializers for the user API View.
"""

from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext as _
from core.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework.exceptions import ValidationError


class RegisterSerializer(serializers.ModelSerializer):
    """ Serializer for user registration. """

    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True, 'min_length': 5}}

    def create(self, validated_data):
        """ Creates and returns a user with encrypted password. """

        user = get_user_model().objects.create_user(**validated_data)
        return user

    def is_valid(self, raise_exception=False):
        """ Validates the serializer data. """

        valid = super().is_valid(raise_exception=raise_exception)
        if valid:
            username = self.validated_data['username']
            email = self.validated_data['email']
            if User.objects.filter(username=username).exists():
                self._errors['username'] = [
                    'Username already associated with an existing account.']
                valid = False
            if User.objects.filter(email=email).exists():
                self._errors['email'] = [
                    'Email address already associated with an existing account.']
                valid = False
            if 'password' in self.initial_data and len(self.initial_data['password']) < 5:
                self._errors['password'] = [
                    'Password must be at least 5 characters long.']
                valid = False

        return valid


class UserSerializer(serializers.ModelSerializer):
    """ Serializer for the user object. """

    class Meta:
        model: type[AbstractUser] = get_user_model()
        fields: list[str] = ['username', 'email', 'password', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True, 'min_length': 5}}

    # def create(self, validated_data) -> AbstractUser:
    #     """ Creates and returns a user with encrypted password. """

    #     return get_user_model().objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        """ Updates and returns a user object instance. """

        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)

        if password:
            user.set_password(password)
            user.save()

        return user


class AuthTokenSerializer(serializers.Serializer):
    """ Serializer for the user authentication token. """

    usernameOrEmail = serializers.CharField()
    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False,
    )

    def validate(self, attrs):
        """ Validates and authenticates the user. """

        usernameOrEmail = attrs.get('usernameOrEmail')
        password = attrs.get('password')

        user: AbstractUser | None = authenticate(
            request=self.context.get('request'),
            username=usernameOrEmail,
            password=password)

        if not user:
            msg: str = _('Unable to authenticate with provided credentials.')
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """ Extended to include select user data (id) in the token response. """

    def validate(self, attrs):
        """ Validate the user credentials and return the token data w/ user_id added. """
        data = super().validate(attrs)

        # Check if user's email is verified
        if not self.user.email_verified:
            raise ValidationError(
                'Please verify your email address before logging in. '
                'Check your email for the verification link.'
            )

        # add custom user data to the response
        data["user_id"] = self.user.id
        data["email_verified"] = self.user.email_verified
        return data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """ Extended to obtain refresh token from http-only cookie instead of request body/headers. """

    refresh = None

    def validate(self, attrs):
        """ Validate the refresh token after obtaining from set cookie. """

        attrs["refresh"] = self.context["request"].COOKIES.get(
            settings.SIMPLE_JWT['REFRESH_TOKEN_NAME'])
        if attrs["refresh"]:
            return super().validate(attrs)
        else:
            raise ValidationError("No valid refresh token found in cookies.")
