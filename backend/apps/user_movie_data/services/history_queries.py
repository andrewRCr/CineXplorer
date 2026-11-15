"""PostgreSQL selections for the private, mixed-kind timeline."""

from collections.abc import Sequence
from typing import cast

from django.db import connection
from psycopg.sql import SQL, Composable

# Keep selection before grouping so every film contributes once per day and field.
SHOWN_CHANGES = SQL("""
WITH owner_changes AS (
    SELECT c.*, r.movie_id
    FROM user_movie_data_usermoviechange c
    JOIN user_movie_data_usermoviedata r ON r.id = c.record_id
    WHERE r.user_id = %s
), saves AS (
    SELECT record_id, created_at,
           lead(created_at) OVER (PARTITION BY record_id ORDER BY created_at) AS next_at
    FROM owner_changes
    WHERE NOT (from_entry AND field = 'rating')
    GROUP BY record_id, created_at
), candidates AS (
    SELECT c.*
    FROM owner_changes c
    JOIN saves s ON s.record_id = c.record_id AND s.created_at = c.created_at
    WHERE NOT c.from_entry AND c.turned_on
      AND NOT EXISTS (
          SELECT 1 FROM owner_changes reversal
          WHERE reversal.record_id = c.record_id AND reversal.field = c.field
            AND reversal.created_at = s.next_at AND NOT reversal.turned_on
      )
), shown AS (
    SELECT DISTINCT ON (record_id, made_on, field) *
    FROM candidates
    ORDER BY record_id, made_on, field, created_at DESC, id DESC
)
""")

TIMELINE = SQL(""",
groups AS (
    SELECT made_on AS day, field, count(*) AS count, max(created_at) AS created_at
    FROM shown
    GROUP BY made_on, field
), timeline AS (
    SELECT COALESCE(e.watched_on, e.made_on) AS day, e.created_at,
           CASE WHEN e.watched_on IS NOT NULL THEN 0 ELSE 1 END AS kind_rank,
           e.id AS entry_id, 0 AS field_rank,
           jsonb_build_object(
               'kind', CASE WHEN e.watched_on IS NOT NULL THEN 'viewing' ELSE 'review' END,
               'day', COALESCE(e.watched_on, e.made_on), 'id', e.id,
               'tmdb_id', m.tmdb_id, 'watched_on', e.watched_on,
               'rating', e.rating, 'review', e.review, 'rewatch', e.rewatch,
               'title', m.title, 'release_date', m.release_date, 'poster_path', m.poster_path
           ) AS payload
    FROM user_movie_data_usermovieentry e
    JOIN user_movie_data_usermoviedata r ON r.id = e.record_id
    JOIN core_movie m ON m.tmdb_id = r.movie_id
    WHERE r.user_id = %s AND (e.watched_on IS NOT NULL OR e.review IS NOT NULL)
    UNION ALL
    SELECT day, created_at, 2, NULL::bigint,
           CASE field WHEN 'watchlist' THEN 0 WHEN 'watched' THEN 1 WHEN 'liked' THEN 2 ELSE 3 END,
           jsonb_build_object('kind', 'changes', 'day', day, 'field', field,
                              'count', count, 'films', '[]'::jsonb)
    FROM groups
)
""")

COUNT_HISTORY = SHOWN_CHANGES + TIMELINE + SQL("SELECT count(*) FROM timeline")
PAGE_HISTORY = (
    SHOWN_CHANGES
    + TIMELINE
    + SQL("""
SELECT payload FROM timeline
ORDER BY day DESC, created_at DESC, kind_rank, entry_id DESC, field_rank
LIMIT %s OFFSET %s
""")
)


CHANGE_FILM = SQL("""jsonb_build_object(
        'tmdb_id', m.tmdb_id, 'title', m.title, 'release_date', m.release_date,
        'poster_path', m.poster_path,
        'rating', CASE WHEN s.field = 'rating' THEN s.rating ELSE NULL END
    )""")
GROUP_SCOPE = SQL(" WHERE s.made_on = %s::date AND s.field = %s")
COUNT_GROUP = SHOWN_CHANGES + SQL("SELECT count(*) FROM shown s") + GROUP_SCOPE
PAGE_GROUP = (
    SHOWN_CHANGES
    + SQL("SELECT {film} FROM shown s JOIN core_movie m ON m.tmdb_id = s.movie_id").format(
        film=CHANGE_FILM
    )
    + GROUP_SCOPE
    + SQL(" ORDER BY s.created_at DESC, s.id DESC LIMIT %s OFFSET %s")
)


def sample_changes(pair_count: int) -> Composable:
    """Compose placeholders for exact page groups; values remain query parameters."""
    pairs = SQL(", ").join([SQL("(%s::date, %s::text)")] * pair_count)
    return SHOWN_CHANGES + SQL(""",
    page_groups(day, field) AS (VALUES {pairs}),
    ranked AS (
        SELECT s.*, row_number() OVER (
            PARTITION BY made_on, s.field ORDER BY created_at DESC, id DESC
        ) AS position
        FROM shown s JOIN page_groups p ON p.day = s.made_on AND p.field = s.field
    )
    SELECT s.made_on, s.field, {film}
    FROM ranked s JOIN core_movie m ON m.tmdb_id = s.movie_id
    WHERE s.position <= 8
    ORDER BY s.made_on DESC, s.field, s.position
    """).format(pairs=pairs, film=CHANGE_FILM)


def fetch_rows(sql: Composable, params: Sequence[int | str]) -> list[tuple[object, ...]]:
    with connection.cursor() as cursor:
        cursor.execute(sql.as_string(), params)
        # The driver's return type cannot express the columns of these SELECT statements.
        return cast(list[tuple[object, ...]], cursor.fetchall())
