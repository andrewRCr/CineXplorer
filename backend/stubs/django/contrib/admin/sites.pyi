"""Type stub file for django.contrib.admin.sites module.

Provides type definitions for AdminSite and the global admin.site instance.

Maintenance Contract:
Synchronized with: Django 5.2.x + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading Django or django-types:
1. Check Django release notes for AdminSite API changes
2. Check django-types release notes for admin.sites coverage
3. Run tests - if runtime errors occur, check this stub file first
4. Verify signatures match Django's actual implementation
5. Update "Last verified" date above
"""

from __future__ import annotations

from django.contrib.admin.options import ModelAdmin
from django.db.models import Model
from django.http import HttpRequest, HttpResponse

class AdminSite:
    """Django admin site - central registry for model admin classes.

    The default instance is available at django.contrib.admin.site.
    """

    site_header: str
    site_title: str
    site_url: str | None
    index_title: str
    index_template: str | None
    app_index_template: str | None
    empty_value_display: str
    login_template: str | None
    login_form: type[object] | None
    logout_template: str | None
    password_change_template: str | None
    password_change_done_template: str | None

    def __init__(self, name: str = "admin") -> None:
        """Initialize AdminSite with optional name."""

    def register(
        self,
        model_or_iterable: type[Model] | list[type[Model]],
        admin_class: type[ModelAdmin] | None = None,
        **options: object,
    ) -> None:
        """Register model(s) with this admin site.

        Usage:
            admin.site.register(MyModel)
            admin.site.register(MyModel, MyModelAdmin)
            admin.site.register([Model1, Model2], MultiModelAdmin)

        Args:
            model_or_iterable: Model class or list of model classes
            admin_class: Optional ModelAdmin subclass
            **options: Additional admin options
        """

    def unregister(self, model_or_iterable: type[Model] | list[type[Model]]) -> None:
        """Unregister model(s) from this admin site.

        Args:
            model_or_iterable: Model class or list of model classes to unregister
        """

    def is_registered(self, model: type[Model]) -> bool:
        """Check if a model is registered with this admin site.

        Args:
            model: Model class to check

        Returns:
            True if model is registered, False otherwise
        """

    def get_urls(self) -> list[object]:
        """Get URL patterns for this admin site."""

    @property
    def urls(self) -> tuple[list[object], str, str]:
        """URL patterns for this admin site (for URL configuration)."""

    def each_context(self, request: HttpRequest) -> dict[str, object]:
        """Return common context variables for all admin views.

        Args:
            request: HTTP request object

        Returns:
            Dictionary of context variables
        """

    def index(
        self, request: HttpRequest, extra_context: dict[str, object] | None = None
    ) -> HttpResponse:
        """Display admin index page.

        Args:
            request: HTTP request object
            extra_context: Optional additional context variables

        Returns:
            HTTP response with rendered admin index
        """

    def app_index(
        self, request: HttpRequest, app_label: str, extra_context: dict[str, object] | None = None
    ) -> HttpResponse:
        """Display admin index page for a specific app.

        Args:
            request: HTTP request object
            app_label: Application label
            extra_context: Optional additional context variables

        Returns:
            HTTP response with rendered app index
        """

# Global admin site instance
site: AdminSite
