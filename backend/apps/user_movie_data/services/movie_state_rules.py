"""Keep a film's facts consistent while its record is locked by the caller."""

from datetime import date
from zoneinfo import ZoneInfo

from apps.core.exceptions import ConflictError
from apps.user_movie_data.models import UserMovieData, UserMovieEntry


def apply_record_save(record: UserMovieData, changes: dict[str, object]) -> None:
    """Apply supplied fields first, then derive only fields the request omitted."""
    was_watched = record.user_watched
    for field, value in changes.items():
        setattr(record, field, value)
    if changes.get("user_watched") is False:
        has_rating = record.user_rating is not None
        has_entries = UserMovieEntry.objects.filter(record=record).exists()
        if has_rating and has_entries:
            raise ConflictError(
                "Clear the rating and delete this film's entries "
                "before marking this film unwatched"
            )
        if has_rating:
            raise ConflictError("Clear the rating before marking this film unwatched")
        if has_entries:
            raise ConflictError("Delete this film's entries before marking it unwatched")
    if "user_watched" not in changes and changes.get("user_rating") is not None:
        record.user_watched = True
    if not was_watched and record.user_watched and "user_on_watchlist" not in changes:
        record.user_on_watchlist = False


LIST_TIMES = (
    ("user_watched", "watched_added_at"),
    ("user_on_watchlist", "watchlist_added_at"),
    ("user_liked", "liked_added_at"),
)


def stamp_list_joins(
    record: UserMovieData, previous: dict[str, bool], *, undo: bool = False
) -> None:
    """Keep departure times and stamp only transitions into a list."""
    from django.utils import timezone

    now = timezone.now()
    for flag, stamp in LIST_TIMES:
        if (
            getattr(record, flag)
            and not previous[flag]
            and not (undo and getattr(record, stamp) is not None)
        ):
            setattr(record, stamp, now)


def apply_entry_create(record: UserMovieData, watched_on: date | None, zone: ZoneInfo) -> None:
    """A new log marks watched and removes only a viewing due from the watchlist."""
    was_watched = record.user_watched
    record.user_watched = True
    if not record.user_on_watchlist:
        return
    if watched_on is None:
        if not was_watched:
            record.user_on_watchlist = False
    elif (
        record.watchlist_added_at is not None
        and watched_on >= record.watchlist_added_at.astimezone(zone).date()
    ):
        record.user_on_watchlist = False
