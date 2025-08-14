"""
Serializers for the movie API View.
"""

from rest_framework import serializers

from core.models import Movie


class MovieSerializer(serializers.ModelSerializer):
    """ Serializer for the movie object. """

    class Meta:
        model = Movie
        fields: list[str] = [
            'id',
            'title',
            'release_date',
            'original_language',
            'runtime',
            'poster_path',
            'directors',
            'writers',
            'cast',
            'user_movie_data'
        ]
        read_only_fields: list[str] = ['id',
                                       'title',
                                       'release_date',
                                       'original_language',
                                       'runtime',
                                       'poster_path',
                                       'directors',
                                       'writers',
                                       'cast']


class MovieDetailSerializer(serializers.ModelSerializer):
    """ Detailed serializer for the movie object. """

    class Meta(MovieSerializer.Meta):
        fields = MovieSerializer.Meta.fields + \
            ['overview', 'genres', 'production_companies']
        read_only_fields = MovieSerializer.Meta.read_only_fields + \
            ['overview', 'genres', 'production_companies']


# class MovieResultsSerializer(serializers.ModelSerializer):
#     """ Serializer for the movie results object. """
