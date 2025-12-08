"""API boundary layer for HTTP parameter handling.

This package handles the transformation of HTTP request parameters into
service layer data structures. It mirrors tmdb_api_boundary/ which handles
the outbound transformation to TMDB API parameters.

Modules:
    browse_service_params: BrowseServiceParams model (data contract between API and service layers)
    param_transformer: HTTP → BrowseServiceParams transformation logic
"""

from .browse_service_params import BrowseServiceParams
from .param_transformer import transform_to_service_params

__all__ = ["BrowseServiceParams", "transform_to_service_params"]
