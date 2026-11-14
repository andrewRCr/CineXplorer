"""Keep a film's facts consistent while its record is locked by the caller."""

from apps.core.exceptions import ConflictError
from apps.user_movie_data.models import UserMovieData


def apply_record_save(record: UserMovieData, changes: dict[str, object]) -> None:
    """Apply supplied fields first, then derive only fields the request omitted."""
    was_watched = record.user_watched
    for field, value in changes.items():
        setattr(record, field, value)
    if changes.get("user_watched") is False and record.user_rating is not None:
        raise ConflictError("Clear the rating before marking this film unwatched")
    if "user_watched" not in changes and changes.get("user_rating") is not None:
        record.user_watched = True
    if not was_watched and record.user_watched and "user_on_watchlist" not in changes:
        record.user_on_watchlist = False
