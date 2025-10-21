"""
Response validation utilities for type-safe API response processing.

This module provides validators that bridge the gap between generic ApiResponse
objects and specific Pydantic model validation, ensuring type safety throughout
the service layer.
"""

from __future__ import annotations

import logging

from ninja.errors import HttpError
from pydantic import BaseModel, ValidationError

from .api_response import ApiResponse

logger = logging.getLogger(__name__)


def validate_tmdb_response[T: BaseModel](
    response: ApiResponse,
    model: type[T]
) -> T:
    """
    Type-safe validation of TMDB API responses.

    Bridges the gap between generic ApiResponse.data and specific Pydantic models
    by performing proper type narrowing and validation.

    Args:
        response: ApiResponse object from TMDB API call
        model: Pydantic model class to validate against

    Returns:
        Validated Pydantic model instance

    Raises:
        HttpError: If response failed, data format invalid, or validation failed
    """
    # Check if the API call was successful
    if not response.is_success():
        raise HttpError(
            response.status_code,
            response.error_message or "TMDB API request failed"
        )

    # Type narrowing - ensure we have dict data
    if not isinstance(response.data, dict):
        raise HttpError(
            502,
            f"Expected dict response from TMDB API, got {type(response.data)}"
        )

    # Validate with Pydantic model
    try:
        return model.model_validate(response.data)
    except ValidationError as e:
        logger.error(
            "TMDB response validation failed",
            extra={
                "model": model.__name__,
                "validation_errors": e.errors(),
                "response_data_keys": list(response.data.keys())
            }
        )
        raise HttpError(
            502,
            "TMDB response validation failed"
        ) from e


def validate_tmdb_list_response[T: BaseModel](
    response: ApiResponse,
    item_model: type[T]
) -> list[T]:
    """
    Type-safe validation of TMDB API list responses.

    Validates responses that contain lists of items, ensuring each item
    conforms to the expected Pydantic model.

    Args:
        response: ApiResponse object from TMDB API call
        item_model: Pydantic model class for list items

    Returns:
        List of validated Pydantic model instances

    Raises:
        HttpError: If response failed, data format invalid, or validation failed
    """
    # Check if the API call was successful
    if not response.is_success():
        raise HttpError(
            response.status_code,
            response.error_message or "TMDB API request failed"
        )

    # Type narrowing - ensure we have list data
    if not isinstance(response.data, list):
        raise HttpError(
            502,
            f"Expected list response from TMDB API, got {type(response.data)}"
        )

    # Validate each item in the list
    try:
        return [item_model.model_validate(item) for item in response.data]
    except ValidationError as e:
        logger.error(
            "TMDB list response validation failed",
            extra={
                "item_model": item_model.__name__,
                "validation_errors": e.errors(),
                "list_length": len(response.data)
            }
        )
        raise HttpError(
            502,
            "TMDB list response validation failed"
        ) from e


def validate_tmdb_paginated_response[T: BaseModel](
    response: ApiResponse,
    model: type[T]
) -> T:
    """
    Type-safe validation of TMDB paginated responses.

    Specifically for TMDB responses that contain pagination metadata
    along with results (like search results, discover results, etc.).

    Args:
        response: ApiResponse object from TMDB API call
        model: Pydantic model class for the paginated response structure

    Returns:
        Validated Pydantic model instance containing results and pagination

    Raises:
        HttpError: If response failed, data format invalid, or validation failed
    """
    # Check if the API call was successful
    if not response.is_success():
        raise HttpError(
            response.status_code,
            response.error_message or "TMDB API request failed"
        )

    # Type narrowing - ensure we have dict data
    if not isinstance(response.data, dict):
        raise HttpError(
            502,
            f"Expected dict response from TMDB API, got {type(response.data)}"
        )

    # Validate the paginated response structure
    try:
        return model.model_validate(response.data)
    except ValidationError as e:
        logger.error(
            "TMDB paginated response validation failed",
            extra={
                "model": model.__name__,
                "validation_errors": e.errors(),
                "response_data_keys": list(response.data.keys())
            }
        )
        raise HttpError(
            502,
            "TMDB paginated response validation failed"
        ) from e


__all__ = [
    'validate_tmdb_list_response',
    'validate_tmdb_paginated_response',
    'validate_tmdb_response',
]
