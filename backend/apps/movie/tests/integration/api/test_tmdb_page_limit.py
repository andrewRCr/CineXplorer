"""Browse pagination ends at the last page TMDB serves."""

from collections.abc import Iterator
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.test import Client

from apps.core.services.api_response import ApiResponse
from apps.core.tests.test_helpers import HTTPStatus
from apps.core.tmdb_models.tmdb_responses import TMDBMovieBase
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET
from apps.movie.tests.test_helpers import create_mock_paginated_response
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie

pytestmark = pytest.mark.django_db
BROWSE_URL = "/api/movies/browse"


def _movies(page: int, complete: int = 20) -> list[TMDBMovieBase]:
    return [
        create_tmdb_movie(
            page * 20 + index + 1,
            f"Movie {page}-{index}",
            "2023-01-01",
            8.0,
            poster_path=None if index < complete else "",
        )
        for index in range(20)
    ]


@pytest.fixture
def tmdb_pages() -> Iterator[dict[int, list[TMDBMovieBase]]]:
    pages: dict[int, list[TMDBMovieBase]] = {}

    def tmdb_page(endpoint: str, params: dict[str, object] | None = None) -> ApiResponse:
        page = (params or {}).get("page")
        assert isinstance(page, int)
        if not 1 <= page <= 500:
            return ApiResponse(
                status_code=400,
                data={"success": False, "status_code": 22, "status_message": "Invalid page"},
            )
        return create_mock_paginated_response(
            pages[page], page=page, total_pages=1000, total_results=20000
        )

    with patch(TMDB_CLIENT_GET, side_effect=tmdb_page):
        yield pages


def test_full_last_page_ends_the_cursor_after_page_499(
    api_client: Client, tmdb_pages: dict[int, list[TMDBMovieBase]]
) -> None:
    tmdb_pages[499] = _movies(499)
    tmdb_pages[500] = _movies(500)
    context = str(uuid4())

    response = api_client.get(BROWSE_URL, {"page": 499, "context_id": context})
    assert response.status_code == HTTPStatus.OK
    assert response.json()["next_tmdb_page_start"] == 500

    response = api_client.get(BROWSE_URL, {"tmdb_page_start": 500, "context_id": context})
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert [movie["tmdb_id"] for movie in data["results"]] == list(range(10001, 10021))
    assert data["next_tmdb_page_start"] is None
    assert data["total_pages"] == 1000


def test_sparse_last_page_returns_its_titles_without_fetching_page_501(
    api_client: Client, tmdb_pages: dict[int, list[TMDBMovieBase]]
) -> None:
    tmdb_pages[500] = _movies(500, complete=19)

    response = api_client.get(BROWSE_URL, {"page": 500, "context_id": str(uuid4())})

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert [movie["tmdb_id"] for movie in data["results"]] == list(range(10001, 10020))
    assert data["next_tmdb_page_start"] is None


def test_top_up_keeps_all_39_titles_when_it_reaches_page_500(
    api_client: Client, tmdb_pages: dict[int, list[TMDBMovieBase]]
) -> None:
    tmdb_pages[499] = _movies(499, complete=19)
    tmdb_pages[500] = _movies(500)

    response = api_client.get(BROWSE_URL, {"tmdb_page_start": 499, "context_id": str(uuid4())})

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert [movie["tmdb_id"] for movie in data["results"]] == [
        *range(9981, 10000),
        *range(10001, 10021),
    ]
    assert data["next_tmdb_page_start"] is None


@pytest.mark.parametrize("last_page_titles", [0, 5])
def test_short_top_up_ends_at_page_500_with_the_remaining_titles(
    api_client: Client,
    tmdb_pages: dict[int, list[TMDBMovieBase]],
    last_page_titles: int,
) -> None:
    tmdb_pages[499] = _movies(499, complete=5)
    tmdb_pages[500] = _movies(500, complete=last_page_titles)

    response = api_client.get(BROWSE_URL, {"tmdb_page_start": 499, "context_id": str(uuid4())})

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert [movie["tmdb_id"] for movie in data["results"]] == [
        *range(9981, 9986),
        *range(10001, 10001 + last_page_titles),
    ]
    assert data["next_tmdb_page_start"] is None
