
"""
Views for the movie API.
"""
from __future__ import annotations
# from typing import Any  # Removed per Quality Gate #6

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import UserMovieData
from core.views.tmdb import (
    PaginatedTMDBView,
    SingleResourceTMDBView,
)
from movie.serializers import MovieDetailSerializer, MovieSerializer
from shared.api_types import TMDBSearchResponse

from .services import movie_service

# =========================
# Helper methods
# =========================


def serialize_paginated_movies(request: Request, tmdb_response: TMDBSearchResponse) -> Response:
    """
    Shared helper for paginated movie endpoints.
    Serializes Movie instances, appends user-specific data, and preserves pagination metadata.
    """

    # movies_data is now properly typed as list[TMDBMovieResponse]
    movies_data = tmdb_response['results']
    user = getattr(request, 'user', None)
    user_movie_data_map: dict[int, UserMovieData] = {}
    if user and user.is_authenticated:
        # Extract TMDB IDs from properly typed movie data
        # type: ignore[index] # TMDB API response structure
        movie_ids = [movie['id'] for movie in movies_data]
        user_movie_qs = UserMovieData.objects.filter(
            user=user, movie_id__in=movie_ids)
        # type: ignore[attr-defined] # Django model field access
        user_movie_data_map = {umd.movie.tmdb_id: umd for umd in user_movie_qs}

    serializer = MovieSerializer(
        movies_data,
        many=True,
        context={'request': request, 'user_movie_data_map': user_movie_data_map}
    )
    # Create mutable response dict to avoid TypedDict assignment issues
    response_dict = dict(tmdb_response)
    # type: ignore[attr-defined] # DRF serializer.data property
    response_dict['results'] = serializer.data
    return Response(response_dict)

# =========================
# Single Resource Detail Endpoints
# =========================


class MovieDetailView(SingleResourceTMDBView):
    """Retrieves movie details by TMDB ID, including user-specific data if available."""

    service_method = staticmethod(
        movie_service.get_movie_by_id)  # type: ignore[assignment]

    def get(self, request: Request, tmdb_id: int, *args: object, **kwargs: object) -> Response:
        if not tmdb_id:
            return Response({'error': 'Movie ID is required.'}, status=400)
        try:
            tmdb_id = int(tmdb_id)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid movie ID.'}, status=400)
        if self.service_method is None:
            return Response({'error': 'Service method not configured.'}, status=500)
        movie_data = self.service_method(tmdb_id)
        # If service returns an error dict, return it as a response
        if 'error' in movie_data:
            error_msg = movie_data.get('error', '')
            # Use 404 for not found, 400 for other errors
            status_code = (
                404 if 'not found' in str(error_msg).lower()
                else 400
            )
            return Response(movie_data, status=status_code)

        # movie_data is a TMDBMovieResponse from the service
        serializer = MovieDetailSerializer(
            # This is now properly typed as TMDBMovieResponse | dict[str, object]
            movie_data,
            context={'request': request, 'user_movie_data': None}
        )
        # type: ignore[attr-defined] # DRF serializer.data property
        return Response(serializer.data)

# =========================
# Paginated Resource Endpoints
# =========================


class NowPlayingMoviesView(PaginatedTMDBView):
    service_method = staticmethod(
        movie_service.get_nowPlaying_movies)  # type: ignore[assignment]

    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        page_param = request.query_params.get('page', '1')
        page = int(page_param) if page_param and page_param.isdigit() else 1
        if self.service_method is None:
            return Response({'error': 'Service method not configured.'}, status=500)
        tmdb_response = self.service_method(page=page)
        # Handle error responses
        if isinstance(tmdb_response, dict) and 'error' in tmdb_response:
            return Response(tmdb_response, status=400)
        # Type assertion: after error check, this must be TMDBSearchResponse
        assert isinstance(tmdb_response, dict) and 'results' in tmdb_response
        return serialize_paginated_movies(request, tmdb_response)


class UpcomingMoviesView(PaginatedTMDBView):
    service_method = staticmethod(
        movie_service.get_upcoming_movies)  # type: ignore[assignment]

    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        page_param = request.query_params.get('page', '1')
        page = int(page_param) if page_param and page_param.isdigit() else 1
        if self.service_method is None:
            return Response({'error': 'Service method not configured.'}, status=500)
        tmdb_response = self.service_method(page=page)
        # Handle error responses
        if isinstance(tmdb_response, dict) and 'error' in tmdb_response:
            return Response(tmdb_response, status=400)
        # Type assertion: after error check, this must be TMDBSearchResponse
        assert isinstance(tmdb_response, dict) and 'results' in tmdb_response
        return serialize_paginated_movies(request, tmdb_response)


class SearchMoviesView(PaginatedTMDBView):
    service_method = staticmethod(
        movie_service.search_movies)  # type: ignore[assignment]

    def get_additional_params(self, request: Request) -> dict[str, object]:
        """Extract query parameter for search functionality."""
        return {'query': request.query_params.get('query', '')}


class DiscoverMoviesView(PaginatedTMDBView):
    """Flexible movie discovery endpoint with full TMDB filtering capabilities."""

    service_method = staticmethod(
        movie_service.discover_movies)  # type: ignore[assignment]

    def get_additional_params(self, request: Request) -> dict[str, object]:
        """Extract all filter parameters for the discover endpoint."""
        filters: dict[str, object] = {}

        # Process simple string parameters
        self._process_string_params(request, filters)

        # Process year parameters (most complex logic)
        self._process_year_params(request, filters)

        # Process rating parameters
        self._process_rating_params(request, filters)

        # Process runtime parameters
        self._process_runtime_params(request, filters)

        return filters

    def _process_string_params(self, request: Request, filters: dict[str, object]) -> None:
        """Process simple string parameters that don't need validation."""
        string_params = [
            'sort_by', 'genres', 'keywords', 'people',
            'release_date_gte', 'release_date_lte', 'certification', 'region'
        ]

        for param in string_params:
            if param in request.query_params:
                filters[param] = request.query_params[param]

    def _process_year_params(self, request: Request, filters: dict[str, object]) -> None:
        """Process year-related parameters with validation."""
        if 'year' in request.query_params:
            year_param = request.query_params['year']
            self._handle_year_parameter(year_param, filters)

        if 'min_year' in request.query_params:
            min_year_param = request.query_params['min_year']
            self._handle_min_year(min_year_param, filters)

        if 'max_year' in request.query_params:
            max_year_param = request.query_params['max_year']
            self._handle_max_year(max_year_param, filters)

    def _handle_year_parameter(self, year_value: str, filters: dict[str, object]) -> None:
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

    def _handle_min_year(self, min_year_value: str, filters: dict[str, object]) -> None:
        """Handle min_year parameter."""
        try:
            min_year = int(min_year_value)
            filters['release_date_gte'] = f"{min_year}-01-01"
        except ValueError:
            raise ValueError('Invalid min_year parameter')

    def _handle_max_year(self, max_year_value: str, filters: dict[str, object]) -> None:
        """Handle max_year parameter."""
        try:
            max_year = int(max_year_value)
            filters['release_date_lte'] = f"{max_year}-12-31"
        except ValueError:
            raise ValueError('Invalid max_year parameter')

    def _process_rating_params(self, request: Request, filters: dict[str, object]) -> None:
        """Process rating-related parameters with validation."""
        rating_params = {
            'vote_average_gte': 'vote_average_gte',
            'vote_average_lte': 'vote_average_lte',
            'min_rating': 'vote_average_gte'
        }

        for param, filter_key in rating_params.items():
            if param in request.query_params:
                param_value = request.query_params[param]
                try:
                    filters[filter_key] = float(param_value)
                except ValueError:
                    raise ValueError(f'Invalid {param} parameter')

    def _process_runtime_params(self, request: Request, filters: dict[str, object]) -> None:
        """Process runtime-related parameters with validation."""
        runtime_params = {
            'runtime_gte': 'runtime_gte',
            'runtime_lte': 'runtime_lte',
            'min_runtime': 'runtime_gte',
            'max_runtime': 'runtime_lte'
        }

        for param, filter_key in runtime_params.items():
            if param in request.query_params:
                param_value = request.query_params[param]
                try:
                    filters[filter_key] = int(param_value)
                except ValueError:
                    raise ValueError(f'Invalid {param} parameter')


# =========================
# Supporting Data Endpoints
# =========================


class MovieGenresView(APIView):
    """Retrieves the list of available movie genres."""

    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        genres = movie_service.get_movie_genres()
        if isinstance(genres, dict) and 'error' in genres:
            return Response(genres, status=400)
        return Response(genres)


class PopularKeywordsView(PaginatedTMDBView):
    """Retrieves popular keywords with pagination."""

    service_method = staticmethod(
        movie_service.get_popular_keywords)  # type: ignore[assignment]


class SearchKeywordsView(APIView):
    """Searches for keywords by query string."""

    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'results': []})

        keywords = movie_service.search_keywords(query)
        # Service returns dict with either results or error key
        if 'error' in keywords:
            return Response(keywords, status=400)
        return Response(keywords)


class PopularPeopleView(PaginatedTMDBView):
    """Retrieves popular people with pagination."""

    service_method = staticmethod(
        movie_service.get_popular_people)  # type: ignore[assignment]


class SearchPeopleView(APIView):
    """Searches for people by name."""

    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'results': []})

        people = movie_service.search_people(query)
        # Service returns dict with either results or error key
        if 'error' in people:
            return Response(people, status=400)
        return Response(people)
