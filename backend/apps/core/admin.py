"""
Django admin interface customization for core models.
"""

from core import models
from django.contrib import admin

admin.site.register(models.Movie)
