"""Tests for mapping failed TMDB responses to client-facing errors."""

from __future__ import annotations

from collections.abc import Callable

import pytest
from pydantic import BaseModel

from apps.core.exceptions import DomainError, InvalidInputError, NotFoundError, UpstreamError
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
    ("upstream_status", "error_class", "client_status", "message"),
    [
        (400, InvalidInputError, 400, "Invalid request"),
        (422, InvalidInputError, 400, "Invalid request"),
        (404, UpstreamError, 502, "External API error"),
        (429, UpstreamError, 503, "External API is busy, please try again later"),
        (504, UpstreamError, 504, "External API timed out"),
        (401, UpstreamError, 502, "External API error"),
        (403, UpstreamError, 502, "External API error"),
        (500, UpstreamError, 502, "External API error"),
        (502, UpstreamError, 502, "External API error"),
    ],
)
def test_raise_upstream_error_maps_status_to_a_fixed_error(
    upstream_status: int, error_class: type[DomainError], client_status: int, message: str
) -> None:
    response = ApiResponse(status_code=upstream_status, error_message="api_key=SECRET failed")

    with pytest.raises(error_class) as exc_info:
        raise_upstream_error(response)

    assert exc_info.value.status_code == client_status
    assert exc_info.value.detail == message


def test_raise_upstream_error_keeps_not_found_on_a_lookup() -> None:
    response = ApiResponse(status_code=404, error_message="TMDB request failed: 404")

    with pytest.raises(NotFoundError) as exc_info:
        raise_upstream_error(response, lookup=True)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Resource not found"


@pytest.mark.parametrize(
    "validate",
    [validate_tmdb_response, validate_tmdb_list_response, validate_tmdb_paginated_response],
)
def test_validators_do_not_echo_upstream_status_or_text(
    validate: Callable[[ApiResponse, type[Item]], object],
) -> None:
    response = ApiResponse(status_code=401, error_message="request failed: api_key=SECRET")

    with pytest.raises(UpstreamError) as exc_info:
        validate(response, Item)

    assert exc_info.value.status_code == 502
    assert "SECRET" not in exc_info.value.detail
