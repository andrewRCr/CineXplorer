"""Development seeding through the command, database and sign-in endpoint."""

from io import StringIO

import pytest
from allauth.account.models import EmailAddress
from django.core.management import CommandError, call_command
from django.test import Client, override_settings

from apps.core.tests.test_helpers import HTTPStatus, json_post
from apps.movie.models import BlacklistedMovie
from apps.movie.services.data_quality.blacklist_file import BLACKLIST_FILE, read_blacklist
from apps.users.models import User

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("environment", ["staging", "production"])
def test_refuses_outside_development_without_changing_data(environment: str) -> None:
    BlacklistedMovie.objects.create(tmdb_id=2147483647, reason="Keep this row")
    with (
        override_settings(ENVIRONMENT=environment),
        pytest.raises(CommandError, match="development"),
    ):
        call_command("seed_dev_data")
    assert not User.objects.exists()
    assert not EmailAddress.objects.exists()
    assert list(BlacklistedMovie.objects.values_list("tmdb_id", "reason")) == [
        (2147483647, "Keep this row")
    ]


@override_settings(ENVIRONMENT="development")
def test_creates_one_verified_account_that_can_sign_in(api_client: Client) -> None:
    output = StringIO()
    call_command("seed_dev_data", stdout=output)
    assert User.objects.count() == 1
    user = User.objects.get(username="dev")
    assert user.email == "dev@example.com"
    assert EmailAddress.objects.count() == 1
    address = EmailAddress.objects.get(user=user)
    assert (address.email, address.verified, address.primary) == ("dev@example.com", True, True)
    payload: dict[str, object] = {"login": "dev", "password": "cinexplorer-dev"}
    response = json_post(api_client, "/api/token/", payload)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["access_token"]
    address.verified = False
    address.save()
    assert json_post(api_client, "/api/token/", payload).status_code == HTTPStatus.FORBIDDEN
    address.verified = True
    address.save()
    before = User.objects.values().get(pk=user.pk)
    repeated_output = StringIO()
    call_command("seed_dev_data", stdout=repeated_output)
    assert User.objects.count() == 1
    assert EmailAddress.objects.count() == 1
    assert User.objects.values().get(pk=user.pk) == before
    assert "Created dev account" in output.getvalue()
    assert "already exists" in repeated_output.getvalue()
    assert "Blacklist synced:" in output.getvalue()


@override_settings(ENVIRONMENT="development")
def test_leaves_an_existing_dev_account_and_its_missing_email_address_unchanged() -> None:
    user = User.objects.create_user(username="dev", email="existing@example.com", password="other")
    before = User.objects.values().get(pk=user.pk)
    output = StringIO()
    call_command("seed_dev_data", stdout=output)
    assert User.objects.values().get(pk=user.pk) == before
    assert User.objects.count() == 1
    assert not EmailAddress.objects.exists()
    assert "already exists" in output.getvalue()


@override_settings(ENVIRONMENT="development")
def test_refuses_a_case_insensitive_email_conflict_before_writing_anything() -> None:
    user = User.objects.create_user(username="other", email="DEV@Example.com", password="other")
    before = User.objects.values().get(pk=user.pk)
    BlacklistedMovie.objects.create(tmdb_id=2147483647, reason="Keep this row")
    with pytest.raises(CommandError, match=r"dev@example\.com.*another user"):
        call_command("seed_dev_data")
    assert User.objects.count() == 1
    assert User.objects.values().get(pk=user.pk) == before
    assert not User.objects.filter(username="dev").exists()
    assert not EmailAddress.objects.exists()
    assert list(BlacklistedMovie.objects.values_list("tmdb_id", "reason")) == [
        (2147483647, "Keep this row")
    ]


@override_settings(ENVIRONMENT="development")
def test_syncs_the_blacklist_from_the_tracked_file_and_resyncs_on_repeat() -> None:
    expected = {entry.tmdb_id: entry.reason for entry in read_blacklist(BLACKLIST_FILE)}
    assert not BlacklistedMovie.objects.exists()
    output = StringIO()
    call_command("seed_dev_data", stdout=output)
    assert dict(BlacklistedMovie.objects.values_list("tmdb_id", "reason")) == expected
    assert f"Blacklist synced: {len(expected)} entries" in output.getvalue()
    BlacklistedMovie.objects.create(tmdb_id=2147483647, reason="Stale row")
    BlacklistedMovie.objects.filter(tmdb_id=min(expected)).update(reason="Stale reason")
    call_command("seed_dev_data", stdout=StringIO())
    assert dict(BlacklistedMovie.objects.values_list("tmdb_id", "reason")) == expected


@override_settings(ENVIRONMENT="development")
def test_seeds_fixture_cards_without_user_records_and_preserves_existing_cards() -> None:
    from apps.core.models import Movie
    from apps.user_movie_data.models import UserMovieData

    ids = (2000000001, 2000000002)
    call_command("seed_dev_data", stdout=StringIO())
    for tmdb_id in ids:
        film = Movie.objects.get(tmdb_id=tmdb_id)
        assert film.title
        assert film.release_date
        assert film.poster_path is None
    Movie.objects.filter(tmdb_id=ids[0]).update(title="Preserve my title")
    call_command("seed_dev_data", stdout=StringIO())
    assert Movie.objects.get(tmdb_id=ids[0]).title == "Preserve my title"
    assert not UserMovieData.objects.filter(movie_id__in=ids).exists()


@override_settings(ENVIRONMENT="development")
@pytest.mark.parametrize("tmdb_id", [2000000001, 2000000002])
def test_saving_fixture_cards_never_reads_tmdb(api_client: Client, tmdb_id: int) -> None:
    from unittest.mock import patch

    from apps.core.tests.test_helpers import authenticate_client, get_csrf_token, json_patch
    from apps.movie.tests.mock_paths import TMDB_CLIENT_GET_MOVIE_DETAILS

    call_command("seed_dev_data", stdout=StringIO())
    authenticate_client(api_client, "dev", "cinexplorer-dev")
    csrf = get_csrf_token(api_client)
    with patch(TMDB_CLIENT_GET_MOVIE_DETAILS, side_effect=AssertionError("Unexpected TMDB read")):
        response = json_patch(
            api_client,
            f"/api/user-movie-data/{tmdb_id}",
            {"user_on_watchlist": True},
            HTTP_X_CSRFTOKEN=csrf,
        )
    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["user_on_watchlist"] is True
