"""
Django admin interface customization for core models.
"""

from apps.core import models
from django.contrib import admin

admin.site.register(models.Movie)
