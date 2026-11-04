"""Django admin interface customization for core models."""

from django.contrib import admin

from apps.core import models

admin.site.register(models.Movie)
