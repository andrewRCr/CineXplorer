"""The stored card mapping validates TMDB details and preserves unknown values."""

from datetime import date

import pytest

from apps.core.exceptions import UpstreamError
from apps.core.tmdb_models.tmdb_responses import TMDBGenre
from apps.movie.services.tmdb_api_boundary.response_factories import movie_card_fields
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail


def test_card_fields_derive_genres_and_preserve_values() -> None:
    detail = create_tmdb_movie_detail(
        550,
        "Test Movie",
        "2023-01-01",
        8.0,
        runtime=117,
        overview="Overview",
        genres=[TMDBGenre(id=18, name="Drama")],
        genre_ids=[99],
    )
    assert movie_card_fields(detail.model_dump()) == {
        "title": "Test Movie",
        "poster_path": "/poster_550.jpg",
        "release_date": date(2023, 1, 1),
        "vote_average": 8.0,
        "vote_count": 100,
        "runtime": 117,
        "overview": "Overview",
        "genre_ids": [18],
    }


@pytest.mark.parametrize(("runtime", "overview"), [(0, ""), (None, None)])
def test_card_unknowns_are_null(runtime: int | None, overview: str | None) -> None:
    detail = create_tmdb_movie_detail(550, "Test Movie", "", 8.0).model_dump()
    detail.update(runtime=runtime, overview=overview)
    fields = movie_card_fields(detail)
    assert fields["release_date"] is None
    assert fields["runtime"] is None
    assert fields["overview"] is None
    assert fields["genre_ids"] == []


@pytest.mark.parametrize(
    "payload",
    [
        {"id": 550},
        {"id": "bad", "title": "Title"},
        {"id": 550, "title": "Title", "release_date": "invalid"},
    ],
)
def test_invalid_card_details_raise_upstream_error(payload: dict[str, object]) -> None:
    with pytest.raises(UpstreamError) as error:
        movie_card_fields(payload)
    assert error.value.status_code == 502


@pytest.mark.parametrize("field", ["title", "poster_path"])
def test_card_text_accepts_storage_length_boundary(field: str) -> None:
    payload = create_tmdb_movie_detail(550, "Title", "2020-01-01", 8.0).model_dump()
    payload[field] = "x" * 255
    assert movie_card_fields(payload)[field] == "x" * 255


@pytest.mark.parametrize("field", ["title", "poster_path"])
def test_card_text_over_storage_length_raises_upstream_error(field: str) -> None:
    payload = create_tmdb_movie_detail(550, "Title", "2020-01-01", 8.0).model_dump()
    payload[field] = "x" * 256
    with pytest.raises(UpstreamError) as error:
        movie_card_fields(payload)
    assert error.value.status_code == 502
    assert error.value.detail == "Invalid movie data from external API"


def test_card_poster_can_remain_unknown() -> None:
    payload = create_tmdb_movie_detail(550, "Title", "2020-01-01", 8.0).model_dump()
    payload["poster_path"] = None
    assert movie_card_fields(payload)["poster_path"] is None
