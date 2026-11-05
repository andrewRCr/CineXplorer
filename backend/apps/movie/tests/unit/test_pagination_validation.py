"""Request schemas accept only pages that TMDB serves."""

import pytest
from ninja import Schema
from pydantic import ValidationError

from apps.movie.schemas import (
    MovieDiscoverFilterSchema,
    MovieSearchParamsSchema,
    PaginationParamsSchema,
)


@pytest.mark.parametrize(
    ("schema_type", "field", "required"),
    [
        (MovieSearchParamsSchema, "page", {"query": "Example"}),
        (MovieSearchParamsSchema, "tmdb_page_start", {"query": "Example"}),
        (PaginationParamsSchema, "page", {}),
        (MovieDiscoverFilterSchema, "page", {}),
        (MovieDiscoverFilterSchema, "tmdb_page_start", {}),
    ],
)
def test_page_fields_accept_available_pages_and_reject_out_of_range_values(
    schema_type: type[Schema], field: str, required: dict[str, str]
) -> None:
    assert schema_type.model_validate(required).model_dump()[field] is None
    for value, expected in [
        (1, 1),
        (500, 500),
        ("1", 1),
        ("500", 500),
        (None, None),
        ("", None),
        ("   ", None),
    ]:
        assert (
            schema_type.model_validate({**required, field: value}).model_dump()[field] == expected
        )

    for value in [0, -1, 501, "0", "501"]:
        with pytest.raises(ValidationError) as error:
            schema_type.model_validate({**required, field: value})
        assert error.value.errors()[0]["loc"] == (field,)
