"""Enrichment reads persisted user state without mutating the supplied movies."""

from __future__ import annotations

from datetime import date

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.core.tests.test_helpers import create_user
from apps.movie.schemas import MovieListItemSchema
from apps.user_movie_data.services.movie_enrichment_service import MovieEnrichmentService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return create_user()


@pytest.fixture
def service() -> MovieEnrichmentService:
    return MovieEnrichmentService()


def movie_schema(tmdb_id: int = 550) -> MovieListItemSchema:
    return MovieListItemSchema(
        tmdb_id=tmdb_id,
        title=f"Movie {tmdb_id}",
        release_date=date(1982, 6, 25),
        poster_path="/blade_runner.jpg",
        vote_average=8.5,
        runtime=117,
        vote_count=100,
        genre_ids=[18],
        overview="A detective story.",
    )


def test_service_initialization(user: User) -> None:
    create_user_movie_data(user, user_watched=True)
    result = MovieEnrichmentService().enrich_movies_with_user_movie_data([movie_schema()], user)
    assert result[0].user_movie_data is not None
    assert result[0].user_movie_data.user_watched is True


def test_service_reads_only_the_requested_users_records(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(create_user(username="other"), user_watched=True, user_rating=9)
    result = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    assert result[0].user_movie_data is None


def test_enrich_with_authenticated_user_populates_user_movie_data(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True, user_liked=True, user_rating=9)
    result = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    data = result[0].user_movie_data
    assert data is not None
    assert data.model_dump() == {
        "has_entries": False,
        "last_logged_on": None,
        "tmdb_id": 550,
        "user_watched": True,
        "user_on_watchlist": False,
        "user_liked": True,
        "user_rating": 9,
    }


def test_enrich_multiple_movies_with_mixed_user_data(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, create_movie(111), user_watched=True, user_rating=9)
    create_user_movie_data(user, create_movie(222), user_on_watchlist=True)
    result = service.enrich_movies_with_user_movie_data(
        [movie_schema(i) for i in (111, 222, 333)], user
    )
    assert len(result) == 3
    assert result[0].user_movie_data is not None
    assert result[0].user_movie_data.user_rating == 9
    assert result[1].user_movie_data is not None
    assert result[1].user_movie_data.user_on_watchlist is True
    assert result[1].user_movie_data.user_watched is False
    assert result[1].user_movie_data.user_rating is None
    assert result[2].user_movie_data is None


def test_enrich_with_unauthenticated_user_returns_same_list(
    service: MovieEnrichmentService,
) -> None:
    movies = [movie_schema()]
    result = service.enrich_movies_with_user_movie_data(movies, None)
    assert result is movies
    assert result[0].user_movie_data is None


def test_enrich_empty_movie_list_returns_same_empty_list(
    service: MovieEnrichmentService, user: User
) -> None:
    movies: list[MovieListItemSchema] = []
    assert service.enrich_movies_with_user_movie_data(movies, user) is movies
    assert movies == []


def test_movies_without_user_data_have_none_field(
    service: MovieEnrichmentService, user: User
) -> None:
    result = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    assert len(result) == 1
    assert result[0].user_movie_data is None


def test_user_isolation_with_different_state(service: MovieEnrichmentService, user: User) -> None:
    movie = create_movie()
    create_user_movie_data(user, movie, user_watched=True, user_rating=3)
    create_user_movie_data(create_user(username="other"), movie, user_watched=True, user_rating=9)
    result = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    assert result[0].user_movie_data is not None
    assert result[0].user_movie_data.user_rating == 3


def test_enrichment_preserves_original_movie_data(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True)
    result = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    assert (result[0].tmdb_id, result[0].title, result[0].vote_average, result[0].runtime) == (
        550,
        "Movie 550",
        8.5,
        117,
    )
    assert result[0].user_movie_data is not None


def test_enrichment_does_not_mutate_input_list(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True)
    movies = [movie_schema()]
    before = movies[0].model_dump()
    service.enrich_movies_with_user_movie_data(movies, user)
    assert len(movies) == 1
    assert movies[0].model_dump() == before


def test_enrichment_returns_new_list_with_new_instances(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True)
    movies = [movie_schema(), movie_schema(111)]
    result = service.enrich_movies_with_user_movie_data(movies, user)
    assert result is not movies
    assert all(enriched is not original for enriched, original in zip(result, movies, strict=True))
    assert result[0].user_movie_data is not None
    assert movies[0].user_movie_data is None


def test_enrichment_preserves_all_fields_in_new_instances(
    service: MovieEnrichmentService, user: User
) -> None:
    create_user_movie_data(user, user_watched=True)
    movies = [movie_schema()]
    result = service.enrich_movies_with_user_movie_data(movies, user)
    assert result[0].model_dump(exclude={"user_movie_data"}) == movies[0].model_dump(
        exclude={"user_movie_data"}
    )
    assert result[0].user_movie_data is not None
    assert movies[0].user_movie_data is None


def test_enrichment_reads_all_requested_movie_ids_in_one_query(
    service: MovieEnrichmentService, user: User
) -> None:
    for movie_id in (111, 222, 333):
        create_user_movie_data(
            user, create_movie(movie_id), user_watched=True, user_rating=movie_id // 100
        )
    create_user_movie_data(user, create_movie(444), user_watched=True, user_rating=9)
    with CaptureQueriesContext(connection) as queries:
        result = service.enrich_movies_with_user_movie_data(
            [movie_schema(i) for i in (111, 222, 333)], user
        )
    assert len(queries) == 1
    assert [movie.tmdb_id for movie in result] == [111, 222, 333]
    assert [
        movie.user_movie_data.user_rating if movie.user_movie_data else None for movie in result
    ] == [1, 2, 3]


def test_no_query_for_none_user(service: MovieEnrichmentService) -> None:
    with CaptureQueriesContext(connection) as queries:
        result = service.enrich_movies_with_user_movie_data([movie_schema()], None)
    assert len(queries) == 0
    assert result[0].user_movie_data is None


def test_no_query_for_empty_movies(service: MovieEnrichmentService, user: User) -> None:
    with CaptureQueriesContext(connection) as queries:
        result = service.enrich_movies_with_user_movie_data([], user)
    assert len(queries) == 0
    assert result == []


@pytest.mark.parametrize("history", ["empty", "undated", "dated"])
def test_enrichment_log_summary_in_one_query(
    service: MovieEnrichmentService, user: User, history: str
) -> None:
    from apps.user_movie_data.models import UserMovieEntry

    record = create_user_movie_data(user, user_watched=True)
    if history != "empty":
        UserMovieEntry.objects.create(record=record, review="Review", made_on=date(2020, 1, 3))
    if history == "dated":
        for day in [2, 1]:
            UserMovieEntry.objects.create(
                record=record, watched_on=date(2020, 1, day), made_on=date(2020, 1, 3)
            )
    with CaptureQueriesContext(connection) as queries:
        movies = service.enrich_movies_with_user_movie_data([movie_schema()], user)
    assert len(queries) == 1
    state = movies[0].user_movie_data
    assert state is not None
    assert state.has_entries is (history != "empty")
    assert state.last_logged_on == (date(2020, 1, 2) if history == "dated" else None)
