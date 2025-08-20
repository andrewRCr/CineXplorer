"""
Serializers for the user movie data API View.
"""

from rest_framework import serializers
from core.models import UserMovieData


class UserMovieDataSerializer(serializers.ModelSerializer):
    """ Serializer for the user movie data object. """

    tmdb_id = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    def get_tmdb_id(self, obj):
        # Return the TMDB id from the related Movie instance
        return obj.movie.tmdb_id if obj.movie else None

    def get_title(self, obj):
        # Return the title from the related Movie instance
        return obj.movie.title if obj.movie else None

    class Meta:
        model = UserMovieData
        fields = [
            'id',
            'tmdb_id',
            'title',
            'user_watched',
            'user_on_watchlist',
            'user_liked',
            'user_rating'
        ]
        read_only_fields = ['id']


class UserMovieDataDetailSerializer(UserMovieDataSerializer):
    """ Detailed serializer for the user movie data object. """

    tmdb_id = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta(UserMovieDataSerializer.Meta):
        fields = UserMovieDataSerializer.Meta.fields + ['user_review']
