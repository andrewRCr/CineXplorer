"""The save body distinguishes omission, explicit clearing and invalid input."""

from datetime import date

import pytest
from pydantic import ValidationError

from apps.user_movie_data.schemas import UserMovieDataPatchSchema, UserMovieDataSchema


@pytest.mark.parametrize("field", ["user_watched", "user_on_watchlist", "user_liked"])
def test_null_flags_are_refused(field: str) -> None:
    with pytest.raises(ValidationError):
        UserMovieDataPatchSchema.model_validate({field: None})


@pytest.mark.parametrize(
    "fields",
    [
        {"user_rating": 0},
        {"user_rating": 11},
        {"user_review": "a" * 10001},
        {"user_review": "bad\x00review"},
    ],
)
def test_invalid_rating_and_review_are_refused(fields: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        UserMovieDataPatchSchema.model_validate(fields)


@pytest.mark.parametrize(
    ("review", "expected"),
    [("", None), (" \t\n", None), ("\u00a0\u2007", None), ("  Keep spaces  ", "  Keep spaces  ")],
)
def test_review_normalization_preserves_meaningful_text(review: str, expected: str | None) -> None:
    result = UserMovieDataPatchSchema.model_validate({"user_review": review})
    assert result.model_dump(exclude_unset=True) == {"user_review": expected}


def test_patch_only_contains_known_supplied_fields() -> None:
    assert (
        UserMovieDataPatchSchema.model_validate({"unknown": True}).model_dump(exclude_unset=True)
        == {}
    )
    result = UserMovieDataPatchSchema.model_validate(
        {"user_rating": None, "user_review": None, "watched_at": None}
    )
    assert result.model_dump(exclude_unset=True) == {
        "user_rating": None,
        "user_review": None,
        "watched_at": None,
    }


def test_patch_accepts_valid_values_and_any_calendar_date() -> None:
    payload = {
        "user_watched": True,
        "user_on_watchlist": False,
        "user_liked": True,
        "user_rating": 10,
        "user_review": "Review",
        "watched_at": "1900-01-01",
    }
    result = UserMovieDataPatchSchema.model_validate(payload)
    assert result.watched_at == date(1900, 1, 1)
    assert result.user_rating == 10
    assert result.user_watched is True


RESPONSE = {
    "tmdb_id": 550,
    "user_watched": False,
    "user_on_watchlist": False,
    "user_liked": False,
    "user_rating": None,
    "user_review": None,
    "watched_at": None,
}


@pytest.mark.parametrize("field", list(RESPONSE))
def test_every_response_field_is_required(field: str) -> None:
    incomplete = {key: value for key, value in RESPONSE.items() if key != field}
    with pytest.raises(ValidationError):
        UserMovieDataSchema.model_validate(incomplete)


def test_response_contains_exactly_the_shared_state_fields() -> None:
    assert UserMovieDataSchema.model_validate(RESPONSE).model_dump() == RESPONSE
