"""A Library page has fixed query cost and no external catalogue dependency."""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.core.tests.test_helpers import create_user
from apps.movie.tests.tmdb_stub import TMDBStub
from apps.movie.tests.tmdb_test_builders import create_tmdb_movie_detail
from apps.user_movie_data.services.user_movie_data_service import UserMovieDataService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data


@pytest.mark.django_db
def test_library_of_two_hundred_movies_uses_two_queries() -> None:
    user = create_user()
    stub = TMDBStub()
    for movie_id in range(1, 201):
        create_user_movie_data(
            user,
            create_movie(movie_id, runtime=117, overview="Stored overview"),
            user_on_watchlist=True,
        )
        stub.add_movie(create_tmdb_movie_detail(movie_id, f"Movie {movie_id}", "2023-01-01", 8.0))
    service = UserMovieDataService(tmdb_client=stub)
    with CaptureQueriesContext(connection) as queries:
        result = service.get_library(user)
    assert len(queries) == 2
    assert result.total_results == 200
    assert len(result.results) == 20
    assert result.results[0].runtime == 117
    assert result.results[0].overview == "Stored overview"
    assert stub.requested_ids == []
