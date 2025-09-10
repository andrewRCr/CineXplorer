
"""
Views for the movie API.
"""


from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import UserMovieData
from core.views.tmdb import (
    PaginatedTMDBView,
    SingleResourceTMDBView,
)
from movie.serializers import MovieDetailSerializer, MovieSerializer

from .services import movie_service

# =========================
# Helper methods
# =========================


def serialize_paginated_movies(request, tmdb_response):
    """
    Shared helper for paginated movie endpoints.
    Serializes Movie instances, appends user-specific data, and preserves pagination metadata.
    """

    if not isinstance(tmdb_response, dict) or 'results' not in tmdb_response:
        return Response(tmdb_response, status=500)
    movies_data = tmdb_response['results']
    user = getattr(request, 'user', None)
    user_movie_data_map = {}
    if user and user.is_authenticated:
        movie_ids = [movie['tmdb_id'] for movie in movies_data]
        user_movie_qs = UserMovieData.objects.filter(
            user=user, movie_id__in=movie_ids)
        user_movie_data_map = {umd.movie.tmdb_id: umd for umd in user_movie_qs}

    serializer = MovieSerializer(
        movies_data,
        many=True,
        context={'request': request, 'user_movie_data_map': user_movie_data_map}
    )
    tmdb_response['results'] = serializer.data
    return Response(tmdb_response)

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

        # movie_data is already a dictionary from the service
        serializer = MovieDetailSerializer(
            movie_data,
            context={'request': request, 'user_movie_data': None}
        )
        return Response(serializer.data)

# =========================
# Paginated Resource Endpoints
# =========================


class NowPlayingMoviesView(PaginatedTMDBView):
    service_method = staticmethod(movie_service.get_nowPlaying_movies)

    def get(self, request, *args, **kwargs):
        page = request.query_params.get('page', 1)
        tmdb_response = self.service_method(page=page)
        return serialize_paginated_movies(request, tmdb_response)


class UpcomingMoviesView(PaginatedTMDBView):
    service_method = staticmethod(movie_service.get_upcoming_movies)

    def get(self, request, *args, **kwargs):
        page = request.query_params.get('page', 1)
        tmdb_response = self.service_method(page=page)
        return serialize_paginated_movies(request, tmdb_response)


class SearchMoviesView(PaginatedTMDBView):
    service_method = staticmethod(movie_service.search_movies)

    def get_additional_params(self, request):
        """Extract query parameter for search functionality."""
        return {'query': request.query_params.get('query', '')}


class DiscoverMoviesView(PaginatedTMDBView):
    """Flexible movie discovery endpoint with full TMDB filtering capabilities."""

    service_method = staticmethod(movie_service.discover_movies)

    def get_additional_params(self, request):
        """Extract all filter parameters for the discover endpoint."""
        filters = {}

        # Sorting
        if 'sort_by' in request.query_params:
            filters['sort_by'] = request.query_params['sort_by']

        # Genres (comma-separated list of IDs)
        if 'genres' in request.query_params:
            filters['genres'] = request.query_params['genres']

        # Year filtering
        if 'year' in request.query_params:
            try:
                filters['year'] = int(request.query_params['year'])
            except ValueError:
                # Return error response - this will be handled by the base class
                raise ValueError('Invalid year parameter')

        # Rating range
        if 'vote_average_gte' in request.query_params:
            try:
                filters['vote_average_gte'] = float(
                    request.query_params['vote_average_gte'])
            except ValueError:
                raise ValueError('Invalid vote_average_gte parameter')

        if 'vote_average_lte' in request.query_params:
            try:
                filters['vote_average_lte'] = float(
                    request.query_params['vote_average_lte'])
            except ValueError:
                raise ValueError('Invalid vote_average_lte parameter')

        # Keywords (comma-separated list of IDs)
        if 'keywords' in request.query_params:
            filters['keywords'] = request.query_params['keywords']

        # People (comma-separated list of IDs)
        if 'people' in request.query_params:
            filters['people'] = request.query_params['people']

        # Release date range
        if 'release_date_gte' in request.query_params:
            filters['release_date_gte'] = request.query_params['release_date_gte']

        if 'release_date_lte' in request.query_params:
            filters['release_date_lte'] = request.query_params['release_date_lte']

        # Runtime range
        if 'runtime_gte' in request.query_params:
            try:
                filters['runtime_gte'] = int(request.query_params['runtime_gte'])
            except ValueError:
                raise ValueError('Invalid runtime_gte parameter')

        if 'runtime_lte' in request.query_params:
            try:
                filters['runtime_lte'] = int(request.query_params['runtime_lte'])
            except ValueError:
                raise ValueError('Invalid runtime_lte parameter')

        # Certification
        if 'certification' in request.query_params:
            filters['certification'] = request.query_params['certification']

        # Region
        if 'region' in request.query_params:
            filters['region'] = request.query_params['region']

        return filters


# =========================
# Supporting Data Endpoints
# =========================


class MovieGenresView(APIView):
    """Retrieves the list of available movie genres."""

    def get(self, request, *args, **kwargs):
        genres = movie_service.get_movie_genres()
        if isinstance(genres, dict) and 'error' in genres:
            return Response(genres, status=400)
        return Response(genres)


class PopularKeywordsView(PaginatedTMDBView):
    """Retrieves popular keywords with pagination."""

    service_method = staticmethod(movie_service.get_popular_keywords)


class SearchKeywordsView(APIView):
    """Searches for keywords by query string."""

    def get(self, request, *args, **kwargs):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'results': []})

        keywords = movie_service.search_keywords(query)
        if isinstance(keywords, dict) and 'error' in keywords:
            return Response(keywords, status=400)
        return Response(keywords)


class PopularPeopleView(PaginatedTMDBView):
    """Retrieves popular people with pagination."""

    service_method = staticmethod(movie_service.get_popular_people)


class SearchPeopleView(APIView):
    """Searches for people by name."""

    def get(self, request, *args, **kwargs):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'results': []})

        people = movie_service.search_people(query)
        if isinstance(people, dict) and 'error' in people:
            return Response(people, status=400)
        return Response(people)
