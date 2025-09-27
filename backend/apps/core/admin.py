"""
Django admin interface customization for core models.
"""

from django.contrib import admin
from core import models


admin.site.register(models.Movie)
