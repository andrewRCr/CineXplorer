"""Type stub file for django.contrib.admin module.

This file SUPPLEMENTS django-types 0.22.0 for Django admin functionality. django-types
has incomplete coverage for django.contrib.admin, leading to ~100 type errors across
admin.py files in our apps.

Maintenance Contract:
Synchronized with: Django 5.2.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading Django or django-types:
1. Check Django release notes for admin API changes
2. Check django-types release notes for admin coverage improvements
3. Run tests - if runtime errors occur, check this stub file first
4. Verify signatures match Django's actual implementation
5. Update "Last verified" date above

Trade-off: django-types has incomplete django.contrib.admin coverage. This stub provides
essential types for ModelAdmin, AdminSite, and the register decorator to eliminate type
errors in admin.py files.

Note: This is a SUPPLEMENT to django-types. If django-types improves admin coverage,
this stub may become redundant and can be removed.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TypeVar

from django.contrib.admin.options import ModelAdmin
from django.contrib.admin.sites import AdminSite, site
from django.db.models import Model

__all__ = ["AdminSite", "ModelAdmin", "register", "site"]

_ModelAdminT = TypeVar("_ModelAdminT", bound=ModelAdmin)

def register(
    *models: type[Model], site: AdminSite | None = None
) -> Callable[[type[_ModelAdminT]], type[_ModelAdminT]]:
    """Register model(s) with the admin site.

    Can be used as a decorator:
        @admin.register(MyModel)
        class MyModelAdmin(admin.ModelAdmin):
            pass

    Or with multiple models:
        @admin.register(Model1, Model2)
        class MultiModelAdmin(admin.ModelAdmin):
            pass

    Args:
        *models: One or more model classes to register
        site: Optional AdminSite instance (defaults to admin.site)

    Returns:
        Decorator function that registers the admin class
    """
