"""Read an owner's private timeline from stored entries, changes and movie cards."""

from datetime import date
from math import ceil
from typing import cast

from django.contrib.auth.models import AbstractBaseUser
from pydantic import TypeAdapter

from apps.core.utils.schemas import PaginatedResponse
from apps.user_movie_data.schemas import (
    HistoryChangeFilmSchema,
    HistoryChangesSchema,
    HistoryQuerySchema,
    HistoryRowSchema,
)
from apps.user_movie_data.services.history_queries import (
    COUNT_HISTORY,
    PAGE_HISTORY,
    fetch_rows,
    sample_changes,
)

row_adapter = TypeAdapter[HistoryRowSchema](HistoryRowSchema)
film_adapter = TypeAdapter(HistoryChangeFilmSchema)
group_key_adapter = TypeAdapter(tuple[date, str])


class UserMovieHistoryService:
    """Page one stable timeline and sample its change groups in one additional query."""

    def get_history(
        self, user: AbstractBaseUser, query: HistoryQuerySchema
    ) -> PaginatedResponse[HistoryRowSchema]:
        parameters = [user.pk, user.pk]
        # COUNT(*) has one integer column; the SQL driver cannot encode this contract.
        total = cast(int, fetch_rows(COUNT_HISTORY, parameters)[0][0])
        values = fetch_rows(
            PAGE_HISTORY, [*parameters, query.page_size, (query.page - 1) * query.page_size]
        )
        rows = [
            row_adapter.validate_json(value)
            if isinstance(value, str)
            else row_adapter.validate_python(value)
            for (value,) in values
        ]
        groups = {
            (row.day, row.field): row for row in rows if isinstance(row, HistoryChangesSchema)
        }
        if groups:
            sample_parameters: list[int | str] = [user.pk]
            for day, field in groups:
                sample_parameters.extend([day.isoformat(), field])
            for day, field, value in fetch_rows(sample_changes(len(groups)), sample_parameters):
                film = (
                    film_adapter.validate_json(value)
                    if isinstance(value, str)
                    else film_adapter.validate_python(value)
                )
                group = groups[group_key_adapter.validate_python((day, field))]
                group.films.append(film)
        return PaginatedResponse[HistoryRowSchema](
            page=query.page,
            total_pages=ceil(total / query.page_size),
            total_results=total,
            results=rows,
        )
