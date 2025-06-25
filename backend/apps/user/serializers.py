"""
Serializers for the user API View.
"""

from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext as _
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    """ Serializer for the user object. """

    class Meta:
        model: type[AbstractUser] = get_user_model()
        fields: list[str] = ['username', 'email', 'password', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True, 'min_length': 5}}

    def create(self, validated_data) -> AbstractUser:
        """ Creates and returns a user with encrypted password. """

        return get_user_model().objects.create_user(**validated_data)

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
        # email = attrs.get('email')
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
