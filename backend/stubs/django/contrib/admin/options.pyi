"""
Type stub file for django.contrib.admin.options module.

Provides type definitions for ModelAdmin and related admin options classes.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: Django 5.2.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading Django or django-types:
1. Check Django release notes for ModelAdmin API changes
2. Check django-types release notes for admin.options coverage
3. Run tests - if runtime errors occur, check this stub file first
4. Verify signatures match Django's actual implementation
5. Update "Last verified" date above
"""
from __future__ import annotations

from collections.abc import Callable, Sequence

from django.contrib.admin.sites import AdminSite
from django.db.models import Model, QuerySet
from django.forms import ModelForm
from django.http import HttpRequest

class ModelAdmin:
    """
    Base class for model admin interfaces.

    Provides common admin functionality like list_display, list_filter,
    search_fields, ordering, etc.
    """

    # Display options
    list_display: Sequence[str]
    list_display_links: Sequence[str] | None
    list_filter: Sequence[str | type[object]]
    list_select_related: bool | Sequence[str]
    list_per_page: int
    list_max_show_all: int
    list_editable: Sequence[str]

    # Search options
    search_fields: Sequence[str]
    search_help_text: str | None

    # Ordering
    ordering: Sequence[str] | None
    sortable_by: Sequence[str] | None

    # Form options
    fieldsets: Sequence[tuple[str | None, dict[str, object]]] | None
    fields: Sequence[str] | None
    exclude: Sequence[str] | None
    filter_horizontal: Sequence[str]
    filter_vertical: Sequence[str]
    radio_fields: dict[str, int]
    prepopulated_fields: dict[str, Sequence[str]]
    formfield_overrides: dict[type[object], dict[str, object]]
    readonly_fields: Sequence[str]

    # Other options
    date_hierarchy: str | None
    save_as: bool
    save_as_continue: bool
    save_on_top: bool
    preserve_filters: bool
    inlines: Sequence[type[object]]

    # Actions
    actions: Sequence[str | Callable[..., object]] | None
    actions_on_top: bool
    actions_on_bottom: bool
    actions_selection_counter: bool

    def __init__(self, model: type[Model], admin_site: AdminSite) -> None:
        """Initialize ModelAdmin with model and admin site."""

    def get_queryset(self, request: HttpRequest) -> QuerySet[Model]:
        """Return QuerySet of all model instances for admin."""

    def get_form(
        self,
        request: HttpRequest,
        obj: Model | None = None,
        **kwargs: object
    ) -> type[ModelForm]:
        """Return ModelForm class for add/change forms."""

    def save_model(
        self,
        request: HttpRequest,
        obj: Model,
        form: ModelForm,
        change: bool
    ) -> None:
        """Save model instance (called after successful form submission)."""

    def delete_model(self, request: HttpRequest, obj: Model) -> None:
        """Delete model instance."""

    def has_view_permission(
        self,
        request: HttpRequest,
        obj: Model | None = None
    ) -> bool:
        """Return True if user can view this object."""

    def has_add_permission(self, request: HttpRequest) -> bool:
        """Return True if user can add objects."""

    def has_change_permission(
        self,
        request: HttpRequest,
        obj: Model | None = None
    ) -> bool:
        """Return True if user can change this object."""

    def has_delete_permission(
        self,
        request: HttpRequest,
        obj: Model | None = None
    ) -> bool:
        """Return True if user can delete this object."""

    def has_module_permission(self, request: HttpRequest) -> bool:
        """Return True if module should be displayed in admin index."""
