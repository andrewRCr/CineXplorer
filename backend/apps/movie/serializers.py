"""
Serializers for the movie API View.
"""
from __future__ import annotations

from rest_framework import serializers

from core.models import UserMovieData
from shared import UserMovieData as UserMovieDataType
# from shared import Movie  # Unused import


class MovieSerializer(serializers.Serializer):
    """ Serializer for the minimal movie object, including user-specific data (if present). """

    tmdb_id = serializers.IntegerField()
    title = serializers.CharField()
    poster_path = serializers.CharField(allow_null=True)
    release_date = serializers.DateField(allow_null=True)
    user_movie_data = serializers.SerializerMethodField()
    # Pass-through fields from TMDB API service needed in paginated views
    vote_average = serializers.FloatField(read_only=True)
    # Include runtime for filtering verification
    runtime = serializers.IntegerField(read_only=True, allow_null=True)

    def get_user_movie_data(self, obj: dict[str, object] | object) -> UserMovieDataType | None:
        request = self.context.get('request', None)
        user = getattr(request, 'user', None)
        user_movie_data_map = self.context.get('user_movie_data_map', None)
        if not user or not user.is_authenticated:
            return None
        if user_movie_data_map is not None:
            # For list views, use the pre-fetched map for efficiency
            movie_id = obj.get('tmdb_id') if isinstance(obj, dict) else obj.tmdb_id
            user_data = user_movie_data_map.get(movie_id)
            if user_data:
                from user_movie_data.serializers import UserMovieDataSerializer
                return UserMovieDataSerializer(user_data).data
            return None
        # Fallback for single resource views (detail): use detail serializer for full fields
        movie_id = obj.get('tmdb_id') if isinstance(obj, dict) else obj.tmdb_id
        user_data = UserMovieData.objects.filter(user=user, movie_id=movie_id).first()
        if user_data:
            from user_movie_data.serializers import UserMovieDataDetailSerializer
            return UserMovieDataDetailSerializer(user_data).data
        return None


class MovieDetailSerializer(MovieSerializer):
    """ Detailed serializer for the movie object, including TMDB pass-through fields. """

    # Additional pass-through fields for detail view
    overview = serializers.CharField(read_only=True)
    genres = serializers.JSONField(read_only=True)
    production_companies = serializers.JSONField(read_only=True)
    vote_average = serializers.FloatField(read_only=True)
    runtime = serializers.IntegerField(read_only=True)
    cast = serializers.JSONField(read_only=True)
    crew = serializers.JSONField(read_only=True)
