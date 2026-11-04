"""TMDB API boundary layer.

This package handles transformation between application domain and TMDB API:
- query_params: Building parameters FOR TMDB API requests
- response_factories: Creating application schemas FROM TMDB API responses

Import from canonical sources:
    from apps.movie.services.api_boundary import BrowseServiceParams
    from apps.movie.services.tmdb_api_boundary.response_factories import (
        create_movie_base_from_tmdb
    )
"""
