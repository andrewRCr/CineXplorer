"""API boundary layer for HTTP parameter handling.

This package handles the transformation of HTTP request parameters into
service layer data structures. It mirrors tmdb_api_boundary/ which handles
the outbound transformation to TMDB API parameters.

Modules:
    browse_service_params: BrowseServiceParams model (data contract for browse-family endpoints)
    search_service_params: SearchServiceParams model (data contract for search endpoint)
    param_transformer: HTTP → BrowseServiceParams transformation logic
"""

from .browse_service_params import BrowseServiceParams
from .param_transformer import transform_to_service_params
from .search_service_params import SearchServiceParams

__all__ = ["BrowseServiceParams", "SearchServiceParams", "transform_to_service_params"]
