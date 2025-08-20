"""
Serializers for the movie API View.
"""

from rest_framework import serializers

from core.models import Movie


class MovieSerializer(serializers.ModelSerializer):
    """ Serializer for the movie object, with efficient bulk user_movie_data support. """

    user_movie_data = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = [
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
        read_only_fields = ['id',
                            'title',
                            'release_date',
                            'original_language',
                            'runtime',
                            'poster_path',
                            'directors',
                            'writers',
                            'cast']

    def get_user_movie_data(self, obj):
        request = self.context.get('request', None)
        user = getattr(request, 'user', None)
        user_movie_data_map = self.context.get('user_movie_data_map', None)
        if not user or not user.is_authenticated:
            return None
        if user_movie_data_map is not None:
            user_data = user_movie_data_map.get(obj.id)
            if user_data:
                from user_movie_data.serializers import UserMovieDataSerializer
                return UserMovieDataSerializer(user_data).data
            return None
        # Fallback for single resource views (detail): use detail serializer for full fields
        user_data = obj.user_movie_data.filter(user=user).first()
        if user_data:
            from user_movie_data.serializers import UserMovieDataDetailSerializer
            return UserMovieDataDetailSerializer(user_data).data
        return None


class MovieDetailSerializer(MovieSerializer):
    """ Detailed serializer for the movie object, inherits bulk user_movie_data logic. """

    class Meta(MovieSerializer.Meta):
        fields = MovieSerializer.Meta.fields + [
            'overview', 'genres', 'production_companies'
        ]
        read_only_fields = MovieSerializer.Meta.read_only_fields + [
            'overview', 'genres', 'production_companies'
        ]


# class MovieResultsSerializer(serializers.ModelSerializer):
#     """ Serializer for the movie results object. """
