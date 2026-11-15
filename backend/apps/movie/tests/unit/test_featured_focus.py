"""The hero focus is a paired, bounded percentage value."""

import pytest
from pydantic import ValidationError

from apps.movie.schemas import FeaturedMovieSchema


@pytest.mark.parametrize("point", [{"x": 0, "y": 100}, {"x": 100, "y": 0}, {"x": 41.5, "y": 28}])
def test_featured_focus_preserves_percentage_coordinates(point: dict[str, float]) -> None:
    result = FeaturedMovieSchema.model_validate(
        {"tmdb_id": 62, "title": "Film", "focus_point": point}
    )
    assert result.model_dump()["focus_point"] == point


@pytest.mark.parametrize(
    "point",
    [
        {"x": 50},
        {"y": 28},
        {"x": -1, "y": 28},
        {"x": 50, "y": 101},
        {"x": float("nan"), "y": 28},
        {"x": 50, "y": float("inf")},
        {"x": float("-inf"), "y": 28},
    ],
)
def test_featured_focus_rejects_partial_or_invalid_coordinates(point: dict[str, float]) -> None:
    with pytest.raises(ValidationError):
        FeaturedMovieSchema.model_validate({"tmdb_id": 62, "title": "Film", "focus_point": point})


def test_curated_film_ids_are_unique() -> None:
    from apps.movie.featured import FEATURED_FILMS

    ids = [entry.tmdb_id for entry in FEATURED_FILMS]
    assert len(ids) == len(set(ids))
