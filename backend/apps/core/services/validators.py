"""Response validation utilities for type-safe API response processing.

This module provides validators that bridge the gap between generic ApiResponse
objects and specific Pydantic model validation, ensuring type safety throughout
the service layer.
"""

from __future__ import annotations

import logging
from typing import NoReturn

from pydantic import BaseModel, ValidationError

from apps.core.exceptions import InvalidInputError, NotFoundError, UpstreamError

from .api_response import ApiResponse

logger = logging.getLogger(__name__)


def raise_upstream_error(response: ApiResponse, *, lookup: bool = False) -> NoReturn:
    """Raise the client-facing error for a failed upstream response.

    Neither TMDB's status nor its error text reaches the client; every error carries a
    fixed message. TMDB rejecting the request's parameters (400 or 422) is a 400, and
    on a lookup by ID its 404 is a 404. TMDB rate limiting the server's shared key is a
    503, a timeout is a 504, and every other failure is a 502, including TMDB rejecting
    the API key: passed through, that 401 would read as the visitor's own session
    expiring.

    Args:
        response: Failed ApiResponse from the TMDB client
        lookup: True when the request fetched one resource by ID, so a 404 means that
            resource does not exist rather than that the integration is broken

    Raises:
        NotFoundError: 404, for a lookup TMDB answered with 404
        InvalidInputError: 400, when TMDB rejected the request's parameters
        UpstreamError: 503 when TMDB is busy, 504 on a timeout, 502 otherwise
    """
    status = response.status_code
    if status == 404 and lookup:
        raise NotFoundError("Resource not found")
    if status in (400, 422):
        raise InvalidInputError("Invalid request")
    if status == 429:
        raise UpstreamError("External API is busy, please try again later", status_code=503)
    if status == 504:
        raise UpstreamError("External API timed out", status_code=504)
    raise UpstreamError("External API error")


def validate_tmdb_response[T: BaseModel](response: ApiResponse, model: type[T]) -> T:
    """Type-safe validation of TMDB API responses.

    Bridges the gap between generic ApiResponse.data and specific Pydantic models
    by performing proper type narrowing and validation.

    Args:
        response: ApiResponse object from TMDB API call
        model: Pydantic model class to validate against

    Returns:
        Validated Pydantic model instance

    Raises:
        InvalidInputError: If TMDB rejected the request's parameters (see raise_upstream_error)
        UpstreamError: If the response failed otherwise, or its data has the wrong format or
            fails validation
    """
    # Check if the API call was successful
    if not response.is_success():
        raise_upstream_error(response)

    # Type narrowing - ensure we have dict data
    if not isinstance(response.data, dict):
        raise UpstreamError(f"Expected dict response from TMDB API, got {type(response.data)}")

    # Validate with Pydantic model
    try:
        return model.model_validate(response.data)
    except ValidationError as e:
        logger.error(
            "TMDB response validation failed",
            extra={
                "model": model.__name__,
                "validation_errors": e.errors(),
                "response_data_keys": list(response.data.keys()),
            },
        )
        raise UpstreamError("TMDB response validation failed") from e


def validate_tmdb_list_response[T: BaseModel](
    response: ApiResponse, item_model: type[T]
) -> list[T]:
    """Type-safe validation of TMDB API list responses.

    Validates responses that contain lists of items, ensuring each item
    conforms to the expected Pydantic model.

    Args:
        response: ApiResponse object from TMDB API call
        item_model: Pydantic model class for list items

    Returns:
        List of validated Pydantic model instances

    Raises:
        InvalidInputError: If TMDB rejected the request's parameters (see raise_upstream_error)
        UpstreamError: If the response failed otherwise, or its data has the wrong format or
            fails validation
    """
    # Check if the API call was successful
    if not response.is_success():
        raise_upstream_error(response)

    # Type narrowing - ensure we have list data
    if not isinstance(response.data, list):
        raise UpstreamError(f"Expected list response from TMDB API, got {type(response.data)}")

    # Validate each item in the list
    try:
        return [item_model.model_validate(item) for item in response.data]
    except ValidationError as e:
        logger.error(
            "TMDB list response validation failed",
            extra={
                "item_model": item_model.__name__,
                "validation_errors": e.errors(),
                "list_length": len(response.data),
            },
        )
        raise UpstreamError("TMDB list response validation failed") from e


def validate_tmdb_paginated_response[T: BaseModel](response: ApiResponse, model: type[T]) -> T:
    """Type-safe validation of TMDB paginated responses.

    Specifically for TMDB responses that contain pagination metadata
    along with results (like search results, discover results, etc.).

    Args:
        response: ApiResponse object from TMDB API call
        model: Pydantic model class for the paginated response structure

    Returns:
        Validated Pydantic model instance containing results and pagination

    Raises:
        InvalidInputError: If TMDB rejected the request's parameters (see raise_upstream_error)
        UpstreamError: If the response failed otherwise, or its data has the wrong format or
            fails validation
    """
    # Check if the API call was successful
    if not response.is_success():
        raise_upstream_error(response)

    # Type narrowing - ensure we have dict data
    if not isinstance(response.data, dict):
        raise UpstreamError(f"Expected dict response from TMDB API, got {type(response.data)}")

    # Validate the paginated response structure
    try:
        return model.model_validate(response.data)
    except ValidationError as e:
        logger.error(
            "TMDB paginated response validation failed",
            extra={
                "model": model.__name__,
                "validation_errors": e.errors(),
                "response_data_keys": list(response.data.keys()),
            },
        )
        raise UpstreamError("TMDB paginated response validation failed") from e


__all__ = [
    "raise_upstream_error",
    "validate_tmdb_list_response",
    "validate_tmdb_paginated_response",
    "validate_tmdb_response",
]
