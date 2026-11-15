"""Keep a film's facts consistent while its record is locked by the caller."""

from collections.abc import Mapping
from datetime import date, datetime
from zoneinfo import ZoneInfo

from apps.core.exceptions import ConflictError
from apps.user_movie_data.models import UserMovieChange, UserMovieData, UserMovieEntry


def apply_record_save(record: UserMovieData, changes: dict[str, object]) -> None:
    """Likes and ratings mark watched; an allowed un-mark clears an omitted like."""
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
    if "user_watched" not in changes and (
        changes.get("user_rating") is not None or changes.get("user_liked") is True
    ):
        record.user_watched = True
    if changes.get("user_watched") is False and "user_liked" not in changes:
        record.user_liked = False
    if not was_watched and record.user_watched and "user_on_watchlist" not in changes:
        record.user_on_watchlist = False


LIST_TIMES = (
    ("user_watched", "watched_added_at"),
    ("user_on_watchlist", "watchlist_added_at"),
    ("user_liked", "liked_added_at"),
)


def stamp_list_joins(
    record: UserMovieData, previous: Mapping[str, object], now: datetime, *, undo: bool = False
) -> None:
    """Keep departure times and stamp only transitions into a list."""
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


CHANGE_FIELDS = (
    ("watchlist", "user_on_watchlist"),
    ("watched", "user_watched"),
    ("liked", "user_liked"),
    ("rating", "user_rating"),
)


def record_changes(
    record: UserMovieData,
    previous: Mapping[str, object],
    supplied: set[str],
    now: datetime,
    made_on: date,
    *,
    from_entry: bool = False,
    undo: bool = False,
) -> None:
    """Record changes and reversals; Undo erases a supplied field's differing latest row."""
    changes: list[UserMovieChange] = []
    for field, attribute in CHANGE_FIELDS:
        current: bool | int | None = getattr(record, attribute)
        if current == previous[attribute]:
            continue
        if undo and attribute in supplied:
            latest = (
                UserMovieChange.objects.filter(record=record, field=field)
                .order_by("-created_at", "-pk")
                .first()
            )
            if latest is not None:
                value = latest.rating if field == "rating" else latest.turned_on
                if value != current:
                    latest.delete()
            continue
        if attribute in supplied or (not current and field != "watchlist"):
            changes.append(
                UserMovieChange(
                    record=record,
                    field=field,
                    turned_on=bool(current),
                    rating=record.user_rating if field == "rating" else None,
                    from_entry=from_entry,
                    created_at=now,
                    made_on=made_on,
                )
            )
    UserMovieChange.objects.bulk_create(changes)
