"""
URL mappings for the User Movie Data app.
"""

from django.urls import path, include

from rest_framework.routers import DefaultRouter

from user_movie_data import views


router = DefaultRouter()
router.register('user-movie-data', views.UserMovieDataViewSet, 'user-movie-data')
# router.register('manage', views.UserMovieDataViewSet)
router.register('find-by-movie', views.UserMovieDataFindByMovie, basename='test')

app_name = 'user_movie_data'

urlpatterns = [
    path('', include(router.urls)),
    # path('find-by-movie/<int:tmdb_id>', views.UserMovieDataFindByMovie.as_view())
]
