"""The featured lookup selects one film and preserves lookup failures."""

from collections.abc import Sequence

import pytest
from django.test import override_settings

from apps.core.exceptions import NotFoundError, UpstreamError
from apps.core.services.api_response import ApiResponse
from apps.movie.featured import FEATURED_FILM_IDS
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail


def choose_last(ids: Sequence[int]) -> int:
    assert ids == FEATURED_FILM_IDS
    return ids[-1]


def test_selected_film_is_returned_without_credits() -> None:
    stub = TMDBStub()
    selected = FEATURED_FILM_IDS[-1]
    stub.add_movie(
        create_tmdb_movie_detail(
            selected,
            "Chosen film",
            "1962-12-11",
            8.0,
            backdrop_path="/still.jpg",
            tagline="An epic.",
        )
    )
    result = MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert result.model_dump(mode="json") == {
        "tmdb_id": selected,
        "title": "Chosen film",
        "release_date": "1962-12-11",
        "backdrop_path": "/still.jpg",
        "tagline": "An epic.",
    }
    assert stub.requested_endpoints == [f"movie/{selected}"]


@pytest.mark.parametrize("debug", [True, False])
@pytest.mark.parametrize("listed", [True, False])
def test_override_only_in_debug(debug: bool, listed: bool) -> None:
    selected = FEATURED_FILM_IDS[-1]
    override = FEATURED_FILM_IDS[0] if listed else max(FEATURED_FILM_IDS) + 1
    expected = override if debug else selected
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(expected, "Expected film", "1954-04-26", 8.0))
    with override_settings(DEBUG=debug):
        result = MovieService(stub, choose_film=choose_last).get_featured_movie(override)
    assert result.tmdb_id == expected
    assert stub.requested_endpoints == [f"movie/{expected}"]


@pytest.mark.parametrize("tagline", [None, "", "   "])
def test_missing_art_and_empty_tagline_are_null(tagline: str | None) -> None:
    stub = TMDBStub()
    selected = FEATURED_FILM_IDS[-1]
    stub.add_movie(create_tmdb_movie_detail(selected, "Film", "1954-04-26", 8.0, tagline=tagline))
    result = MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert result.backdrop_path is None
    assert result.tagline is None


@pytest.mark.parametrize(
    ("status", "timeout", "error"),
    [
        (500, False, UpstreamError),
        (504, True, UpstreamError),
        (404, False, NotFoundError),
    ],
)
def test_failed_lookup_does_not_try_another_film(
    status: int, timeout: bool, error: type[Exception]
) -> None:
    stub = TMDBStub()
    selected = FEATURED_FILM_IDS[-1]
    stub.add_error(selected, status, timeout=timeout)
    with pytest.raises(error):
        MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert stub.requested_endpoints == [f"movie/{selected}"]


def test_invalid_success_body_is_an_upstream_error() -> None:
    stub = TMDBStub()
    selected = FEATURED_FILM_IDS[-1]
    stub.details[selected] = ApiResponse(status_code=200, data={"id": selected})
    with pytest.raises(UpstreamError):
        MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert stub.requested_endpoints == [f"movie/{selected}"]
