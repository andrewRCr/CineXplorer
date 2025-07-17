"""
URL mappings for the movie API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from movie import views


# urlpatterns: list[URLPattern] = [
#     path('movie-detail/<tmdb_id>/', views.movie_detail_view),
# ]


# router = DefaultRouter()
# router.register('find-by-id', views.FindMovieByIdViewSet,
#                 basename='find-by-id')
# router.register('movies', views.MovieViewSet)

app_name = 'movie'

urlpatterns = [
    # path('', include(router.urls)),
    # path('find/<int:tmdb_id>/', views.movie_detail_view),
    path('find/<int:tmdb_id>/', views.MovieDetailView.as_view()),
    path('search/<str:queryStr>/', views.movie_search_view),
]
