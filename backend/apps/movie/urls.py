"""
URL mappings for the movie API.
"""

from django.urls import path
from django.urls.resolvers import URLPattern

from movie import views


app_name = 'movie'

# urlpatterns: list[URLPattern] = [
#     path('findbyid/', views.FindMovieById.as_view(), name='findbyid'),
# ]

urlpatterns: list[URLPattern] = [
    path('movie-detail/<tmdb_id>/', views.movie_detail_view),
]
