"""The admin preserves review text and normalizes empty reviews."""

import pytest
from django.contrib.admin import AdminSite
from django.test import RequestFactory

from apps.core.tests.test_helpers import create_user
from apps.user_movie_data.admin import UserMovieDataAdmin
from apps.user_movie_data.models import UserMovieData
from apps.user_movie_data.tests.test_helpers import create_movie

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("review", "expected"),
    [("", None), (" \t\n", None), ("  A good movie.  ", "  A good movie.  ")],
)
def test_admin_cleans_review_and_preserves_surrounding_whitespace(
    review: str, expected: str | None
) -> None:
    user = create_user()
    user.is_staff = True
    user.is_superuser = True
    user.save()
    movie = create_movie()
    request = RequestFactory().get("/admin/")
    request.user = user
    form_class = UserMovieDataAdmin(UserMovieData, AdminSite()).get_form(request)
    form = form_class(data={"user": user.pk, "movie": movie.pk, "user_review": review})
    assert form.is_valid(), form.errors
    record = form.save()
    record.refresh_from_db()
    assert record.user_review == expected


@pytest.mark.parametrize("review", ["a" * 10001, "bad\x00review"], ids=["too-long", "nul"])
def test_admin_refuses_invalid_review(review: str) -> None:
    user = create_user()
    user.is_staff = True
    user.is_superuser = True
    user.save()
    movie = create_movie()
    request = RequestFactory().get("/admin/")
    request.user = user
    form_class = UserMovieDataAdmin(UserMovieData, AdminSite()).get_form(request)
    form = form_class(data={"user": user.pk, "movie": movie.pk, "user_review": review})
    assert not form.is_valid()
    assert "user_review" in form.errors
