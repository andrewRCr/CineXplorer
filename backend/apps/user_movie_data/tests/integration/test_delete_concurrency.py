"""Record deletion and entry writes serialize before dependent rows are touched."""

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from django.db import close_old_connections, connection, transaction
from django.test import Client
from django.urls import reverse

from apps.core.models import Movie
from apps.core.tests.test_helpers import authenticate_client, create_user, get_csrf_token
from apps.user_movie_data.models import UserMovieData, UserMovieEntry
from apps.user_movie_data.schemas import UserMovieEntryWriteSchema
from apps.user_movie_data.services.user_movie_entry_service import UserMovieEntryService
from apps.user_movie_data.tests.test_helpers import create_movie, create_user_movie_data


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("deletion_path", ["api", "admin-single", "admin-bulk"])
@pytest.mark.parametrize("entry_operation", ["create", "edit"])
def test_record_delete_waits_for_entry_writer(deletion_path: str, entry_operation: str) -> None:
    user = create_user()
    user.is_staff = True
    user.is_superuser = True
    user.save()
    record = create_user_movie_data(user, user_watched=True)
    selected_ids = [record.pk]
    if deletion_path == "admin-bulk":
        other = create_user_movie_data(user, create_movie(551), user_watched=True)
        selected_ids.append(other.pk)
        UserMovieEntry.objects.create(record=other, review="Other film", made_on=date(2020, 1, 1))
    movie_id = record.movie.tmdb_id
    entry = (
        UserMovieEntry.objects.create(record=record, review="Original", made_on=date(2020, 1, 1))
        if entry_operation == "edit"
        else None
    )
    client = Client()
    assert client.login(username=user.username, password="testpass123")
    authenticate_client(client, user.username, "testpass123")
    client.defaults["HTTP_X_CSRFTOKEN"] = get_csrf_token(client)

    def delete_record() -> int:
        close_old_connections()
        try:
            if deletion_path == "api":
                response = client.delete(f"/api/user-movie-data/{movie_id}")
            elif deletion_path == "admin-single":
                response = client.post(
                    reverse("admin:user_movie_data_usermoviedata_delete", args=[record.pk]),
                    {"post": "yes"},
                )
            else:
                response = client.post(
                    reverse("admin:user_movie_data_usermoviedata_changelist"),
                    {
                        "action": "delete_selected",
                        "_selected_action": [str(pk) for pk in selected_ids],
                        "post": "yes",
                    },
                )
            return response.status_code
        finally:
            connection.close()

    def wait_for_deleter() -> None:
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_stat_clear_snapshot()")
                cursor.execute(
                    "SELECT count(*) FROM pg_stat_activity "
                    "WHERE datname = current_database() AND pid <> pg_backend_pid() "
                    "AND wait_event_type = 'Lock'"
                )
                row = cursor.fetchone()
            if row is not None and row[0] >= 1:
                return
            time.sleep(0.01)
        raise AssertionError("Record deletion did not wait for the entry writer")

    with ThreadPoolExecutor(max_workers=1) as pool:
        with transaction.atomic():
            UserMovieData.objects.select_for_update().get(pk=record.pk)
            pending_delete = pool.submit(delete_record)
            wait_for_deleter()
            service = UserMovieEntryService()
            payload = UserMovieEntryWriteSchema(
                review="Written while deletion waits", liked=False, time_zone="UTC"
            )
            if entry is None:
                service.create(user, movie_id, payload)
            else:
                service.edit(user, movie_id, entry.pk, payload)
        status = pending_delete.result(timeout=20)

    assert status == (204 if deletion_path == "api" else 302)
    assert not UserMovieData.objects.filter(pk__in=selected_ids).exists()
    assert not UserMovieEntry.objects.filter(record_id__in=selected_ids).exists()
    assert Movie.objects.filter(pk=movie_id).exists()
