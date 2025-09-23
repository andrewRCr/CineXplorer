
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

        # Process simple string parameters
        self._process_string_params(request, filters)

        # Process year parameters (most complex logic)
        self._process_year_params(request, filters)

        # Process rating parameters
        self._process_rating_params(request, filters)

        # Process runtime parameters
        self._process_runtime_params(request, filters)

        return filters

    def _process_string_params(self, request, filters):
        """Process simple string parameters that don't need validation."""
        string_params = [
            'sort_by', 'genres', 'keywords', 'people',
            'release_date_gte', 'release_date_lte', 'certification', 'region'
        ]

        for param in string_params:
            if param in request.query_params:
                filters[param] = request.query_params[param]

    def _process_year_params(self, request, filters):
        """Process year-related parameters with validation."""
        if 'year' in request.query_params:
            self._handle_year_parameter(request.query_params['year'], filters)

        if 'min_year' in request.query_params:
            self._handle_min_year(request.query_params['min_year'], filters)

        if 'max_year' in request.query_params:
            self._handle_max_year(request.query_params['max_year'], filters)

    def _handle_year_parameter(self, year_value, filters):
        """Handle the year parameter which can be a single year or decade."""
        if year_value.isdigit():
            try:
                filters['year'] = int(year_value)
            except ValueError:
                raise ValueError('Invalid year parameter')
        elif year_value.endswith('s') and len(year_value) == 5:
            try:
                decade_start = int(year_value[:-1])
                filters['release_date_gte'] = f"{decade_start}-01-01"
                filters['release_date_lte'] = f"{decade_start + 9}-12-31"
            except ValueError:
                raise ValueError('Invalid decade parameter')
        else:
            raise ValueError('Invalid year format')

    def _handle_min_year(self, min_year_value, filters):
        """Handle min_year parameter."""
        try:
            min_year = int(min_year_value)
            filters['release_date_gte'] = f"{min_year}-01-01"
        except ValueError:
            raise ValueError('Invalid min_year parameter')

    def _handle_max_year(self, max_year_value, filters):
        """Handle max_year parameter."""
        try:
            max_year = int(max_year_value)
            filters['release_date_lte'] = f"{max_year}-12-31"
        except ValueError:
            raise ValueError('Invalid max_year parameter')

    def _process_rating_params(self, request, filters):
        """Process rating-related parameters with validation."""
        rating_params = {
            'vote_average_gte': 'vote_average_gte',
            'vote_average_lte': 'vote_average_lte',
            'min_rating': 'vote_average_gte'
        }

        for param, filter_key in rating_params.items():
            if param in request.query_params:
                try:
                    filters[filter_key] = float(request.query_params[param])
                except ValueError:
                    raise ValueError(f'Invalid {param} parameter')

    def _process_runtime_params(self, request, filters):
        """Process runtime-related parameters with validation."""
        runtime_params = {
            'runtime_gte': 'runtime_gte',
            'runtime_lte': 'runtime_lte',
            'min_runtime': 'runtime_gte',
            'max_runtime': 'runtime_lte'
        }

        for param, filter_key in runtime_params.items():
            if param in request.query_params:
                try:
                    filters[filter_key] = int(request.query_params[param])
                except ValueError:
                    raise ValueError(f'Invalid {param} parameter')


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
