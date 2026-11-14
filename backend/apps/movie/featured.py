"""Hand-selected classic films for the homepage."""

from dataclasses import dataclass

from pydantic import BaseModel, Field


class FilmFocusPoint(BaseModel):
    """An image anchor expressed as paired percentages."""

    x: float = Field(ge=0, le=100, allow_inf_nan=False)
    y: float = Field(ge=0, le=100, allow_inf_nan=False)


@dataclass(frozen=True)
class FeaturedFilm:
    """A curated film and its optional image anchor."""

    tmdb_id: int
    focus_point: FilmFocusPoint | None = None
    backdrop_path: str | None = None


# Add only films approved through artwork and credit review.
FEATURED_FILMS = (
    FeaturedFilm(289),
    FeaturedFilm(567),
    FeaturedFilm(346),
    FeaturedFilm(426),
    FeaturedFilm(213),
    FeaturedFilm(947),
    FeaturedFilm(62),
    FeaturedFilm(238),
    FeaturedFilm(829),
    FeaturedFilm(578),
    FeaturedFilm(348),
    FeaturedFilm(78),
)
