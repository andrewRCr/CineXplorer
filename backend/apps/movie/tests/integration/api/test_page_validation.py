"""Out-of-range requests fail validation before becoming TMDB requests."""

from unittest.mock import Mock, patch

import pytest
from django.test import Client

from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("url", "field", "required"),
    [
        ("/api/movies/search", "page", {"query": "Example"}),
        ("/api/movies/search", "tmdb_page_start", {"query": "Example"}),
        ("/api/movies/browse", "page", {}),
        ("/api/movies/browse", "tmdb_page_start", {}),
        ("/api/movies/now-playing", "page", {}),
        ("/api/movies/now-playing", "tmdb_page_start", {}),
        ("/api/movies/upcoming", "page", {}),
        ("/api/movies/upcoming", "tmdb_page_start", {}),
        ("/api/keywords", "page", {}),
        ("/api/people", "page", {}),
    ],
)
@patch(TMDB_CLIENT_GET)
def test_out_of_range_page_returns_local_validation_error(
    mock_tmdb_get: Mock,
    api_client: Client,
    url: str,
    field: str,
    required: dict[str, str],
) -> None:
    mock_tmdb_get.return_value = ApiResponse(
        status_code=400,
        data={"success": False, "status_code": 22, "status_message": "Invalid page"},
    )

    response = api_client.get(url, {**required, field: 501})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    data = response.json()
    assert data["code"] == "validation_error"
    assert field in data["detail"]
