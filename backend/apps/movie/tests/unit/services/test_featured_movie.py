"""The featured lookup selects one film and preserves lookup failures."""

from collections.abc import Sequence

import pytest
from django.test import override_settings

from apps.core.exceptions import NotFoundError, UpstreamError
from apps.core.services.api_response import ApiResponse
from apps.movie.featured import FEATURED_FILMS, FeaturedFilm, FilmFocusPoint
from apps.movie.services.movie_service import MovieService
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail


def choose_last(films: Sequence[FeaturedFilm]) -> FeaturedFilm:
    return films[-1]


def test_selected_film_uses_one_detail_request() -> None:
    stub = TMDBStub()
    films = (FeaturedFilm(101),)
    selected = films[-1].tmdb_id
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
    result = MovieService(stub, choose_film=choose_last, featured_films=films).get_featured_movie()
    assert result.model_dump(mode="json") == {
        "tmdb_id": selected,
        "title": "Chosen film",
        "release_date": "1962-12-11",
        "backdrop_path": "/still.jpg",
        "tagline": "An epic.",
        "focus_point": None,
        "mirrored": False,
        "directors": [],
    }
    assert stub.requested_endpoints == [f"movie/{selected}"]


@pytest.mark.parametrize("debug", [True, False])
@pytest.mark.parametrize("listed", [True, False])
def test_override_only_in_debug(debug: bool, listed: bool) -> None:
    selected = FEATURED_FILMS[-1].tmdb_id
    override = (
        FEATURED_FILMS[0].tmdb_id if listed else max(entry.tmdb_id for entry in FEATURED_FILMS) + 1
    )
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
    films = (FeaturedFilm(101),)
    selected = films[-1].tmdb_id
    stub.add_movie(create_tmdb_movie_detail(selected, "Film", "1954-04-26", 8.0, tagline=tagline))
    result = MovieService(stub, choose_film=choose_last, featured_films=films).get_featured_movie()
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
    selected = FEATURED_FILMS[-1].tmdb_id
    stub.add_error(selected, status, timeout=timeout)
    with pytest.raises(error):
        MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert stub.requested_endpoints == [f"movie/{selected}"]


def test_invalid_success_body_is_an_upstream_error() -> None:
    stub = TMDBStub()
    selected = FEATURED_FILMS[-1].tmdb_id
    stub.details[selected] = ApiResponse(status_code=200, data={"id": selected})
    with pytest.raises(UpstreamError):
        MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert stub.requested_endpoints == [f"movie/{selected}"]


@pytest.mark.parametrize("debug", [False, True])
@pytest.mark.parametrize("candidate", [None, 101, 102, 103])
def test_selected_entry_carries_its_focus(debug: bool, candidate: int | None) -> None:
    films = (
        FeaturedFilm(101, FilmFocusPoint(x=0, y=100)),
        FeaturedFilm(102, FilmFocusPoint(x=91, y=12)),
    )
    selected_id = candidate if debug and candidate is not None else 102
    expected_point = next(
        (entry.focus_point for entry in films if entry.tmdb_id == selected_id), None
    )
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(selected_id, "Selected film", "1968-04-02", 8.0))
    with override_settings(DEBUG=debug):
        result = MovieService(
            stub, choose_film=choose_last, featured_films=films
        ).get_featured_movie(candidate)
    assert result.tmdb_id == selected_id
    assert result.focus_point == expected_point
    assert stub.requested_endpoints == [f"movie/{selected_id}"]


@pytest.mark.parametrize("debug", [False, True])
@pytest.mark.parametrize("candidate", [None, 201, 202, 203])
@pytest.mark.parametrize("primary", ["/new-primary.jpg", None])
def test_selected_entry_preserves_checked_backdrop(
    debug: bool, candidate: int | None, primary: str | None
) -> None:
    films = (
        FeaturedFilm(201, backdrop_path="/checked-artwork.jpg"),
        FeaturedFilm(202),
    )
    selected_id = candidate if debug and candidate is not None else 201
    stub = TMDBStub()
    stub.add_movie(
        create_tmdb_movie_detail(
            selected_id, "Selected film", "1968-04-02", 8.0, backdrop_path=primary
        )
    )
    with override_settings(DEBUG=debug):
        result = MovieService(
            stub, choose_film=lambda entries: entries[0], featured_films=films
        ).get_featured_movie(candidate)
    assert result.tmdb_id == selected_id
    assert result.backdrop_path == ("/checked-artwork.jpg" if selected_id == 201 else primary)
    assert stub.requested_endpoints == [f"movie/{selected_id}"]


@pytest.mark.parametrize("debug", [False, True])
@pytest.mark.parametrize("candidate", [None, 301, 302, 303])
def test_selected_entry_uses_its_short_title(debug: bool, candidate: int | None) -> None:
    full_title = "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb"
    films = (FeaturedFilm(301, title="Dr. Strangelove"), FeaturedFilm(302))
    selected_id = candidate if debug and candidate is not None else 301
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(selected_id, full_title, "1964-01-29", 8.0))
    with override_settings(DEBUG=debug):
        result = MovieService(
            stub, choose_film=lambda entries: entries[0], featured_films=films
        ).get_featured_movie(candidate)
    assert result.tmdb_id == selected_id
    assert result.title == ("Dr. Strangelove" if selected_id == 301 else full_title)
    assert stub.requested_endpoints == [f"movie/{selected_id}"]


@pytest.mark.parametrize("debug", [False, True])
@pytest.mark.parametrize("candidate", [None, 401, 402, 403])
def test_selected_entry_carries_its_mirroring(debug: bool, candidate: int | None) -> None:
    films = (FeaturedFilm(401, mirrored=True), FeaturedFilm(402))
    selected_id = candidate if debug and candidate is not None else 401
    stub = TMDBStub()
    stub.add_movie(create_tmdb_movie_detail(selected_id, "Selected film", "1968-04-02", 8.0))
    with override_settings(DEBUG=debug):
        result = MovieService(
            stub, choose_film=lambda entries: entries[0], featured_films=films
        ).get_featured_movie(candidate)
    assert result.tmdb_id == selected_id
    assert result.mirrored is (selected_id == 401)
    assert stub.requested_endpoints == [f"movie/{selected_id}"]


@pytest.mark.parametrize(
    ("crew", "expected"),
    [
        (None, []),
        ([], []),
        ([{"id": 1, "name": "Writer", "job": "Writer"}], []),
        ([{"id": 1, "name": "  ", "job": "Director"}], []),
        (
            [
                {"id": 1, "name": "Director One", "job": "Director"},
                {"id": 2, "name": "Director Two", "job": "Director"},
                {"id": 1, "name": "Director One", "job": "Director"},
                {"id": 3, "name": "Writer", "job": "Writer"},
            ],
            ["Director One", "Director Two"],
        ),
    ],
)
def test_featured_projects_directors_from_appended_credits(
    crew: list[dict[str, object]] | None, expected: list[str]
) -> None:
    stub = TMDBStub()
    movie_id = FEATURED_FILMS[-1].tmdb_id
    stub.add_movie(create_tmdb_movie_detail(movie_id, "Film", "1968-04-02", 8.0))
    if crew is None:
        del stub.credits[movie_id]
    else:
        stub.credits[movie_id] = ApiResponse(status_code=200, data={"cast": [], "crew": crew})
    result = MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert result.model_dump().get("directors") == expected
    assert stub.requested_endpoints == [f"movie/{movie_id}"]


def test_malformed_appended_director_data_is_an_upstream_error() -> None:
    stub = TMDBStub()
    movie_id = FEATURED_FILMS[-1].tmdb_id
    stub.add_movie(create_tmdb_movie_detail(movie_id, "Film", "1968-04-02", 8.0))
    stub.credits[movie_id] = ApiResponse(
        status_code=200, data={"crew": [{"id": 1, "name": None, "job": "Director"}]}
    )
    with pytest.raises(UpstreamError):
        MovieService(stub, choose_film=choose_last).get_featured_movie()
    assert stub.requested_endpoints == [f"movie/{movie_id}"]
