"""
Serializers for the user movie data API View.
"""

from rest_framework import serializers

from core.models import UserMovieData


class UserMovieDataSerializer(serializers.ModelSerializer):
    """ Serializer for the user movie data object. """

    class Meta:
        model = UserMovieData
        fields: list[str] = [
            'id',
            'tmdb_id',
            'title',
            'user_watched',
            'user_on_watchlist',
            'user_liked',
            'user_rating'
        ]
        read_only_fields: list[str] = ['id']


class UserMovieDataDetailSerializer(serializers.ModelSerializer):
    """ Detailed serializer for the user movie data object. """

    class Meta(UserMovieDataSerializer.Meta):
        fields = UserMovieDataSerializer.Meta.fields + ['user_review']
