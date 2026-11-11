"""Movie detail reads refresh existing cards and translate invalid upstream payloads."""

from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from django.test import Client
from django.utils import timezone
from freezegun import freeze_time

from apps.core.models import Movie
from apps.core.services.api_response import ApiResponse
from apps.core.tmdb_models.tmdb_responses import TMDBGenre
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.mock_paths import TMDB_CLIENT_GET, TMDB_CLIENT_GET_MOVIE_DETAILS
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.tests.test_helpers import create_movie

pytestmark = pytest.mark.django_db


@pytest.fixture
def tmdb() -> TMDBStub:
    stub = TMDBStub()
    stub.add_movie(
        create_tmdb_movie_detail(
            550,
            "Refreshed title",
            "2020-01-01",
            8.5,
            runtime=117,
            overview="Refreshed overview",
            genres=[TMDBGenre(id=18, name="Drama")],
        )
    )
    return stub


def test_detail_refreshes_existing_card_and_update_time(tmdb: TMDBStub) -> None:
    with freeze_time("2026-11-01 12:00:00"):
        movie = create_movie(title="Old title", runtime=80, refreshed_at=timezone.now())
        created = movie.created_at
    with freeze_time("2026-11-10 12:00:00"):
        detail = MovieService(tmdb_client=tmdb).get_movie_by_id(550)
        movie.refresh_from_db()
        assert detail.title == "Refreshed title"
        assert movie.title == detail.title
        assert (
            movie.runtime,
            movie.overview,
            movie.genre_ids,
            movie.vote_average,
            movie.vote_count,
        ) == (117, "Refreshed overview", [18], 8.5, 100)
        assert movie.release_date == datetime(2020, 1, 1, tzinfo=UTC).date()
        assert movie.refreshed_at == timezone.now()
        assert movie.updated_at == timezone.now()
        assert movie.created_at == created


def test_detail_of_unstored_movie_creates_no_row(tmdb: TMDBStub) -> None:
    result = MovieService(tmdb_client=tmdb).get_movie_by_id(550)
    assert result.tmdb_id == 550
    assert not Movie.objects.exists()


@pytest.mark.parametrize("invalid_part", ["details", "credits", "detail_schema", "empty"])
def test_invalid_detail_payload_is_502_and_keeps_stored_card(
    tmdb: TMDBStub, invalid_part: str
) -> None:
    movie = create_movie(title="Keep card", runtime=80)
    if invalid_part == "details":
        tmdb.details[550] = ApiResponse(status_code=200, data={"id": 550})
    elif invalid_part == "credits":
        tmdb.credits[550] = ApiResponse(status_code=200, data={"cast": "invalid", "crew": []})
    elif invalid_part == "detail_schema":
        payload = create_tmdb_movie_detail(550, "Bad date", "invalid", 8.0).model_dump()
        tmdb.details[550] = ApiResponse(status_code=200, data=payload)
    else:
        tmdb.details[550] = ApiResponse(status_code=200, data=None)
    with (
        patch(TMDB_CLIENT_GET_MOVIE_DETAILS, side_effect=tmdb.get_movie_details),
        patch(TMDB_CLIENT_GET, side_effect=tmdb.get),
    ):
        response = Client().get("/api/movies/550")
    assert response.status_code == 502
    assert isinstance(response.json()["detail"], str)
    movie.refresh_from_db()
    assert movie.title == "Keep card"
    assert movie.runtime == 80
    assert movie.refreshed_at is None
