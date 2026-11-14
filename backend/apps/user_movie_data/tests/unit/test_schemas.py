"""The save body distinguishes omission, explicit clearing and invalid input."""

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
    ],
)
def test_invalid_rating_and_review_are_refused(fields: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        UserMovieDataPatchSchema.model_validate(fields)


def test_patch_only_contains_known_supplied_fields() -> None:
    assert (
        UserMovieDataPatchSchema.model_validate({"unknown": True}).model_dump(exclude_unset=True)
        == {}
    )
    result = UserMovieDataPatchSchema.model_validate({"user_rating": None})
    assert result.model_dump(exclude_unset=True) == {
        "user_rating": None,
    }


def test_patch_accepts_valid_values() -> None:
    payload = {
        "user_watched": True,
        "user_on_watchlist": False,
        "user_liked": True,
        "user_rating": 10,
    }
    result = UserMovieDataPatchSchema.model_validate(payload)
    assert result.user_rating == 10
    assert result.user_watched is True


RESPONSE = {
    "has_entries": False,
    "last_logged_on": None,
    "tmdb_id": 550,
    "user_watched": False,
    "user_on_watchlist": False,
    "user_liked": False,
    "user_rating": None,
}


@pytest.mark.parametrize("field", list(RESPONSE))
def test_every_response_field_is_required(field: str) -> None:
    incomplete = {key: value for key, value in RESPONSE.items() if key != field}
    with pytest.raises(ValidationError):
        UserMovieDataSchema.model_validate(incomplete)


def test_response_contains_exactly_the_shared_state_fields() -> None:
    assert UserMovieDataSchema.model_validate(RESPONSE).model_dump() == RESPONSE
