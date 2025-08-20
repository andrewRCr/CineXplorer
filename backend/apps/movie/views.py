
"""
Views for the movie API.
"""


from core.views.tmdb import PaginatedTMDBView, PaginatedTMDBQueryView, SingleResourceTMDBView
from core.models import UserMovieData
from .services import movie_service
from rest_framework.response import Response
from movie.serializers import MovieSerializer, MovieDetailSerializer


# =========================
# Single Resource Detail Endpoints
# =========================


class MovieDetailView(SingleResourceTMDBView):
    """Retrieves movie details by TMDB ID, including user-specific data if available."""
    service_method = staticmethod(movie_service.get_movie_by_id)

    def get(self, request, tmdb_id, *args, **kwargs):
        if not tmdb_id:
            return Response({'error': 'Movie ID is required.'}, status=400)
        try:
            tmdb_id = int(tmdb_id)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid movie ID.'}, status=400)
        movie_data = self.service_method(tmdb_id)
        # If service returns an error Response, return it directly
        if isinstance(movie_data, Response):
            return movie_data
        # If service returns an error dict, return it as a response
        if isinstance(movie_data, dict) and 'error' in movie_data:
            # Use 404 for not found, 400 for other errors
            status_code = 404 if 'not found' in movie_data['error'].lower() else 400
            return Response(movie_data, status=status_code)
        serializer = MovieDetailSerializer(movie_data, context={'request': request})
        return Response(serializer.data)

# =========================
# Paginated Resource Endpoints
# =========================


class NowPlayingMoviesView(PaginatedTMDBView):
    """ Retrieves a list of movies by recency, including user-specific data if available. """
    service_method = staticmethod(movie_service.get_nowPlaying_movies)

    def get(self, request, *args, **kwargs):
        """
        Retrieves now playing movies, serializes Movie instances,
        appends user-specific data, and preserves pagination metadata.
        """
        tmdb_response = self.service_method()
        if not isinstance(tmdb_response, dict) or 'results' not in tmdb_response:
            return Response(tmdb_response, status=500)
        movies_data = tmdb_response['results']
        user = getattr(request, 'user', None)
        user_movie_data_map = {}
        if user and user.is_authenticated:
            movie_ids = [movie.id for movie in movies_data]
            user_movie_qs = UserMovieData.objects.filter(
                user=user, movie_id__in=movie_ids)
            user_movie_data_map = {umd.movie.id: umd for umd in user_movie_qs}
        serializer = MovieSerializer(
            movies_data,
            many=True,
            context={'request': request, 'user_movie_data_map': user_movie_data_map}
        )
        tmdb_response['results'] = serializer.data
        return Response(tmdb_response)


class UpcomingMoviesView(PaginatedTMDBView):
    """ Retrieves a list of upcoming movies, including user-specific data if available. """
    service_method = staticmethod(movie_service.get_upcoming_movies)

    def get(self, request, *args, **kwargs):
        """
        Retrieves upcoming movies, serializes Movie instances,
        appends user-specific data, and preserves pagination metadata.
        """
        tmdb_response = self.service_method()
        if not isinstance(tmdb_response, dict) or 'results' not in tmdb_response:
            return Response(tmdb_response, status=500)
        movies_data = tmdb_response['results']
        user = getattr(request, 'user', None)
        user_movie_data_map = {}
        if user and user.is_authenticated:
            movie_ids = [movie.id for movie in movies_data]
            user_movie_qs = UserMovieData.objects.filter(
                user=user, movie_id__in=movie_ids)
            user_movie_data_map = {umd.movie.id: umd for umd in user_movie_qs}
        serializer = MovieSerializer(
            movies_data,
            many=True,
            context={'request': request, 'user_movie_data_map': user_movie_data_map}
        )
        tmdb_response['results'] = serializer.data
        return Response(tmdb_response)


class SearchMoviesView(PaginatedTMDBQueryView):
    """Searches for movies by query string, including user-specific data if available."""
    service_method = staticmethod(movie_service.search_movies)

    def get(self, request, *args, **kwargs):
        """
        Searches for movies by query string, serializes Movie instances,
        appends user-specific data, and preserves pagination metadata.
        """
        query = request.query_params.get('query', '')
        tmdb_response = self.service_method(query)
        if not isinstance(tmdb_response, dict) or 'results' not in tmdb_response:
            return Response(tmdb_response, status=500)
        movies_data = tmdb_response['results']
        user = getattr(request, 'user', None)
        user_movie_data_map = {}
        if user and user.is_authenticated:
            movie_ids = [movie.id for movie in movies_data]
            user_movie_qs = UserMovieData.objects.filter(
                user=user, movie_id__in=movie_ids)
            user_movie_data_map = {umd.movie.id: umd for umd in user_movie_qs}
        serializer = MovieSerializer(
            movies_data,
            many=True,
            context={'request': request, 'user_movie_data_map': user_movie_data_map}
        )
        tmdb_response['results'] = serializer.data
        return Response(tmdb_response)
