"""Pydantic schemas for the user movie data API.

This module defines schemas for UserMovieData CRUD operations following
the ModelSchema pattern established in the movie domain.

Pattern Guidelines:
- Use ModelSchema for Django model CRUD (automatic type inference with django-stubs)
- Use manual Schema for input DTOs with non-model fields (create/update operations)
"""
from __future__ import annotations

from ninja import Schema
from ninja.orm import ModelSchema
from pydantic import Field
from apps.user_movie_data.models import UserMovieData


class UserMovieDataModelSchema(ModelSchema):
    """Base ModelSchema for UserMovieData model.

    Uses ninja.orm.ModelSchema for automatic type inference with django-stubs.
    This eliminates the need for type: ignore comments on model attributes.
    """

    class Meta:
        model = UserMovieData
        fields = [
            "id",
            "user_watched",
            "user_on_watchlist",
            "user_liked",
            "user_rating",
            "user_review",
        ]


class UserMovieDataDetailSchema(ModelSchema):
    """Extended ModelSchema with computed movie context fields.

    Includes tmdb_id and title computed from the related Movie object.
    These fields are populated at runtime in the API layer.
    """

    tmdb_id: int | None = Field(
        None,
        description="TMDB ID of the associated movie (computed from obj.movie.tmdb_id)"
    )
    title: str | None = Field(
        None,
        description="Title of the associated movie (computed from obj.movie.title)"
    )

    class Meta:
        model = UserMovieData
        fields = [
            "id",
            "user_watched",
            "user_on_watchlist",
            "user_liked",
            "user_rating",
            "user_review",
        ]

    @classmethod
    def from_orm_with_movie(cls, obj: UserMovieData) -> UserMovieDataDetailSchema:
        """Create schema from ORM object with movie fields populated.

        This method provides type-safe conversion from Django ORM to Pydantic schema
        including computed fields from the related Movie object.

        Note on type checking: Django model field access shows as "unknown" in Pyright
        due to django-stubs generic field type limitations (documented in
        _docs/notes/type-safety-status-auth-modernization.md lines 32-47).
        MyPy with django-stubs validates these correctly at runtime.

        Args:
            obj: UserMovieData instance (should have movie prefetched via select_related)

        Returns:
            UserMovieDataDetailSchema with all fields including tmdb_id and title
        """
        # Use ModelSchema's from_orm for base fields
        instance = cls.from_orm(obj)

        # Populate computed fields from related Movie (ForeignKey)
        # With .pyi stub files, Pyright correctly infers obj.movie is never None
        # (ForeignKey has no null=True, so it's required)
        instance.tmdb_id = obj.movie.tmdb_id
        instance.title = obj.movie.title

        return instance


class UserMovieDataCreateSchema(Schema):
    """Schema for creating new user movie data entries.

    Uses manual Schema (not ModelSchema) because it includes movie_id field
    which is not directly on the UserMovieData model (requires FK lookup).
    """

    movie_id: int = Field(
        ...,
        description="ID of the Movie object (database ID, not TMDB ID)"
    )
    user_watched: bool = Field(
        default=False,
        description="Whether the user has marked this movie as watched"
    )
    user_on_watchlist: bool = Field(
        default=False,
        description="Whether the movie is on the user's watchlist"
    )
    user_liked: bool = Field(
        default=False,
        description="Whether the user has liked this movie"
    )
    user_rating: int | None = Field(
        default=None,
        ge=1,
        le=10,
        description="User's rating of the movie (1-10)"
    )
    user_review: str | None = Field(
        default=None,
        description="User's text review of the movie"
    )


class UserMovieDataUpdateSchema(Schema):
    """Schema for updating existing user movie data entries.

    Uses manual Schema (not ModelSchema) with all optional fields
    to support partial updates (PATCH operations).
    """

    user_watched: bool | None = Field(
        default=None,
        description="Whether the user has marked this movie as watched"
    )
    user_on_watchlist: bool | None = Field(
        default=None,
        description="Whether the movie is on the user's watchlist"
    )
    user_liked: bool | None = Field(
        default=None,
        description="Whether the user has liked this movie"
    )
    user_rating: int | None = Field(
        default=None,
        ge=1,
        le=10,
        description="User's rating of the movie (1-10)"
    )
    user_review: str | None = Field(
        default=None,
        description="User's text review of the movie"
    )


__all__ = [
    "UserMovieDataCreateSchema",
    "UserMovieDataDetailSchema",
    "UserMovieDataModelSchema",
    "UserMovieDataUpdateSchema",
]
