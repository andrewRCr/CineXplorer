"""Staff can inspect and delete records without bypassing the save rules."""

import pytest
from django.test import Client
from django.urls import reverse

from apps.core.models import Movie
from apps.core.tests.test_helpers import create_user
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.tests.test_helpers import create_user_movie_data

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_record(client: Client) -> tuple[Client, UserMovieData]:
    user = create_user()
    user.is_staff = True
    user.is_superuser = True
    user.save()
    assert client.login(username=user.username, password="testpass123")
    return client, create_user_movie_data(user)


def test_admin_lists_records(admin_record: tuple[Client, UserMovieData]) -> None:
    client, record = admin_record
    response = client.get(reverse("admin:user_movie_data_usermoviedata_changelist"))
    assert response.status_code == 200
    assert record.movie.title.encode() in response.content


def test_admin_shows_record_read_only(admin_record: tuple[Client, UserMovieData]) -> None:
    client, record = admin_record
    response = client.get(reverse("admin:user_movie_data_usermoviedata_change", args=[record.pk]))
    assert response.status_code == 200
    assert record.movie.title.encode() in response.content
    assert b'name="user_liked"' not in response.content
    assert b'name="_save"' not in response.content


@pytest.mark.parametrize("method", ["get", "post"])
def test_admin_refuses_add(admin_record: tuple[Client, UserMovieData], method: str) -> None:
    client, record = admin_record
    url = reverse("admin:user_movie_data_usermoviedata_add")
    response = client.get(url) if method == "get" else client.post(url, {})
    assert response.status_code == 403
    assert list(UserMovieData.objects.values_list("pk", flat=True)) == [record.pk]


def test_admin_refuses_change(admin_record: tuple[Client, UserMovieData]) -> None:
    client, record = admin_record
    response = client.post(
        reverse("admin:user_movie_data_usermoviedata_change", args=[record.pk]),
        {"user": record.user.pk, "movie": record.movie.pk, "user_liked": "on", "_save": "Save"},
    )
    assert response.status_code == 403
    record.refresh_from_db()
    assert not record.user_liked


def test_admin_deletes_record_and_keeps_movie(admin_record: tuple[Client, UserMovieData]) -> None:
    client, record = admin_record
    movie_id = record.movie.pk
    response = client.post(
        reverse("admin:user_movie_data_usermoviedata_delete", args=[record.pk]), {"post": "yes"}
    )
    assert response.status_code == 302
    assert not UserMovieData.objects.filter(pk=record.pk).exists()
    assert Movie.objects.filter(pk=movie_id).exists()
