"""
URL mappings for the User Movie Data app.
"""

from django.urls import path, include

from rest_framework.routers import DefaultRouter

from user_movie_data import views


router = DefaultRouter()
router.register('', views.UserMovieDataViewSet, 'user-movie-data')

app_name = 'user_movie_data'

urlpatterns = [
    path('', include(router.urls)),
]
