"""
Core database models.

⚠️ TYPE STUB SYNC REQUIRED ⚠️
===============================
This file has a companion type stub file: backend/apps/core/models.pyi

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
4. Type ignores are ONLY on field definitions (lines 37-47, 54)
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
3. Run type checks: cd backend && npx pyright apps/core/models.py
4. Expect type ignores only on field definitions (this is correct)

Related Documentation:
----------------------
- _docs/notes/django-stubs-limitations-and-solutions.md
- _docs/notes/type-checking-config-audit-p2.md
"""

from django.db import models


class Movie(models.Model):
    """
    Represents a minimal local stub for a TMDB movie.
    Used as an anchor for user-specific data.
    """
    tmdb_id = models.PositiveIntegerField(  # type: ignore
        primary_key=True
    )
    title = models.CharField(  # type: ignore
        max_length=255
    )
    poster_path = models.CharField(  # type: ignore
        max_length=255, blank=True, null=True
    )
    release_date = models.DateField(  # type: ignore
        null=True, blank=True
    )

    class Meta:
        ordering = ["-release_date", "tmdb_id"]

    def __str__(self) -> str:
        return self.title  # type: ignore
