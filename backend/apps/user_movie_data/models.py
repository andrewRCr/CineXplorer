"""
User movie data models.

This module contains models related to user interactions with movies,
including watchlist status, ratings, reviews, and viewing history.

⚠️ TYPE STUB SYNC REQUIRED ⚠️
===============================
This file has a companion type stub file: backend/apps/user_movie_data/models.pyi

When adding, removing, or modifying model fields in this file, you MUST
update the corresponding .pyi stub file to maintain type safety.

The stub file provides explicit type annotations for Django model fields,
enabling perfect type inference in Pyright/Pylance and eliminating
"unknown type" warnings.

Type Ignore Usage:
------------------
This file uses `# type: ignore` comments on Django model field definitions.

**Why this is justified:**
1. Django uses metaclass magic to transform field definitions at runtime
2. Pyright cannot infer the runtime types from class-level field definitions
3. The companion .pyi stub file provides complete type information for CONSUMERS
4. Type ignores are ONLY on field definitions (lines 43-65, 74)
5. All API/consumer code gets perfect type safety via the .pyi stub

**What gets type safety:**
- ✅ API endpoints using these models (100% type-safe via .pyi)
- ✅ Schemas accessing model fields (100% type-safe via .pyi)
- ✅ Any code importing and using these models (100% type-safe via .pyi)
- ⚠️ Only the field definitions themselves show as "unknown" (unavoidable)

This is the recommended approach per our type safety strategy.
See: _docs/reference/type-safety-strategy.md

Maintenance Checklist:
----------------------
When modifying this file:
1. Update the model definition here (models.py)
2. Update the type stub file (models.pyi)
3. Run type checks: cd backend && npx pyright apps/user_movie_data/models.py
4. Expect type ignores only on field definitions (this is correct)
"""

from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models


class UserMovieData(models.Model):
    """ Represents a user's data about a particular movie. """

    user = models.ForeignKey(  # type: ignore
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    movie = models.ForeignKey(  # type: ignore
        'core.Movie',
        on_delete=models.CASCADE,
        related_name='user_movie_data'
    )
    user_watched = models.BooleanField(  # type: ignore
        default=False, db_index=True
    )
    user_on_watchlist = models.BooleanField(  # type: ignore
        default=False, db_index=True
    )
    user_liked = models.BooleanField(  # type: ignore
        default=False, db_index=True
    )
    user_rating = models.IntegerField(  # type: ignore
        null=True, blank=True, default=None,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    user_review = models.TextField(  # type: ignore
        blank=True, null=True
    )

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self) -> str:
        # ForeignKey attribute access - django-types limitation with related field access
        # Pyright cannot infer .username and .title through the stub file
        return f"{self.user.username} - {self.movie.title}"  # type: ignore[reportUnknownMemberType]
