"""API boundary layer for HTTP parameter handling.

This package handles the transformation of HTTP request parameters into
service layer data structures. It mirrors tmdb_api_boundary/ which handles
the outbound transformation to TMDB API parameters.

Modules:
    service_params: ServiceParams model (data contract between API and service layers)
    param_transformer: HTTP → ServiceParams transformation logic
"""

from .param_transformer import transform_to_service_params
from .service_params import ServiceParams

__all__ = ["ServiceParams", "transform_to_service_params"]
