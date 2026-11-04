"""Tests for mapping failed TMDB responses to client-facing errors."""

from __future__ import annotations

from collections.abc import Callable

import pytest
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.core.services.api_response import ApiResponse
from apps.core.services.validators import (
    raise_upstream_error,
    validate_tmdb_list_response,
    validate_tmdb_paginated_response,
    validate_tmdb_response,
)


class Item(BaseModel):
    """Minimal model for the validators' success type."""

    id: int


@pytest.mark.parametrize(
    ("upstream_status", "client_status", "message"),
    [
        (404, 404, "Resource not found"),
        (429, 429, "Rate limit exceeded, please try again later"),
        (504, 504, "External API timed out"),
        (401, 502, "External API error"),
        (403, 502, "External API error"),
        (400, 502, "External API error"),
        (500, 502, "External API error"),
        (502, 502, "External API error"),
    ],
)
def test_raise_upstream_error_maps_status_to_a_fixed_error(
    upstream_status: int, client_status: int, message: str
) -> None:
    response = ApiResponse(status_code=upstream_status, error_message="api_key=SECRET failed")

    with pytest.raises(HttpError) as exc_info:
        raise_upstream_error(response)

    assert exc_info.value.status_code == client_status
    assert exc_info.value.message == message


@pytest.mark.parametrize(
    "validate",
    [validate_tmdb_response, validate_tmdb_list_response, validate_tmdb_paginated_response],
)
def test_validators_do_not_echo_upstream_status_or_text(
    validate: Callable[[ApiResponse, type[Item]], object],
) -> None:
    response = ApiResponse(status_code=401, error_message="request failed: api_key=SECRET")

    with pytest.raises(HttpError) as exc_info:
        validate(response, Item)

    assert exc_info.value.status_code == 502
    assert "SECRET" not in str(exc_info.value.message)
