"""
Core database models.

Type Checking Notes:
====================
This file contains Django model definitions which use Django's
metaclass-based model system. Pyright (our development type checker) has
limited understanding of Django's dynamic model field system, even with
django-stubs installed. The following type: ignore patterns are used:

- Django model fields (CharField, IntegerField, etc.): These show as
  "partially unknown" types because Pyright cannot fully resolve Django's
  field metaclass magic. This is a known limitation.
- Django model field access (self.field_name): Field values accessed on
  model instances may show as "unknown" types because they're dynamically
  generated.
- Django manager/QuerySet methods: Some Django ORM operations show type
  issues due to generic type complexity.

All type: ignore comments in this file are documented with the pattern
"# Django [category]" to indicate they're related to Django framework
limitations, not code quality issues.

This is the recommended approach per Django + Pyright community best practices.
"""

from django.db import models


class Movie(models.Model):
    """
    Represents a minimal local stub for a TMDB movie.
    Used as an anchor for user-specific data.
    """
    tmdb_id = models.IntegerField(
        primary_key=True
    )  # type: ignore[misc]  # Django field
    title = models.CharField(
        max_length=255
    )  # type: ignore[misc]  # Django field
    poster_path = models.CharField(
        max_length=255, blank=True, null=True
    )  # type: ignore[misc]  # Django field
    release_date = models.DateField(
        null=True, blank=True
    )  # type: ignore[misc]  # Django field

    def __str__(self) -> str:
        return self.title  # type: ignore[attr-defined]  # Django field access
