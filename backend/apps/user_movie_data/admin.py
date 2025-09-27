"""
Django admin interface customization for user movie data.
"""

from django.contrib import admin
from user_movie_data import models


admin.site.register(models.UserMovieData)