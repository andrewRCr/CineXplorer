"""Pydantic field validators for common data transformations.

This module provides reusable Pydantic validators that can be applied
across different schemas in the application.
"""


def empty_str_to_none(v: object) -> object:
    """Convert empty strings to None for optional fields.

    Useful for query parameters and form fields where empty strings
    should be treated as None/null for database queries.

    Args:
        v: The value to validate (can be any type)

    Returns:
        None if v is an empty string, otherwise returns v unchanged

    Example:
        >>> from pydantic import BaseModel, field_validator
        >>> from apps.core.utils.validators import empty_str_to_none
        >>>
        >>> class SearchParams(BaseModel):
        ...     query: str | None = None
        ...
        ...     @field_validator('query', mode='before')
        ...     @classmethod
        ...     def validate_query(cls, v: object) -> object:
        ...         return empty_str_to_none(v)
        >>>
        >>> params = SearchParams(query="")
        >>> assert params.query is None
    """
    if isinstance(v, str) and v.strip() == "":
        return None
    return v
