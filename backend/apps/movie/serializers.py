"""
Serializers for the movie API View.
"""

from rest_framework import serializers

from core.models import Movie


class MovieSerializer(serializers.ModelSerializer):
    """ Serializer for the movie object, with efficient bulk user_movie_data support. """

    user_movie_data = serializers.SerializerMethodField()
    # Pass-through fields from TMDB API service
    vote_average = serializers.FloatField(read_only=True)
    cast = serializers.JSONField(read_only=True)
    crew = serializers.JSONField(read_only=True)

    class Meta:
        model = Movie
        fields = [
            'tmdb_id',
            'title',
            'poster_path',
            'release_date',
            'vote_average',
            'cast',
            'crew',
            'user_movie_data'
        ]
        read_only_fields = ['tmdb_id',
                            'title',
                            'poster_path',
                            'release_date']

    def get_user_movie_data(self, obj):
        request = self.context.get('request', None)
        user = getattr(request, 'user', None)
        user_movie_data_map = self.context.get('user_movie_data_map', None)
        if not user or not user.is_authenticated:
            return None
        if user_movie_data_map is not None:
            # For list views, use the pre-fetched map for efficiency
            user_data = user_movie_data_map.get(obj.tmdb_id)
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
    # Additional pass-through fields for detail view
    overview = serializers.CharField(read_only=True)
    genres = serializers.JSONField(read_only=True)
    production_companies = serializers.JSONField(read_only=True)

    class Meta(MovieSerializer.Meta):
        fields = MovieSerializer.Meta.fields + [
            'overview', 'genres', 'production_companies'
        ]
        # read_only_fields are inherited and extended implicitly


# class MovieResultsSerializer(serializers.ModelSerializer):
#     """ Serializer for the movie results object. """
