"""
URL mappings for the movie API.
"""

from django.urls import path

from movie import views

app_name = 'movie'

urlpatterns = [
    path('find/<int:tmdb_id>/', views.MovieDetailView.as_view(), name='movie-detail'),
    path('search/', views.SearchMoviesView.as_view(), name='search'),
    path('now-playing/', views.NowPlayingMoviesView.as_view(), name='now-playing'),
    path('upcoming/', views.UpcomingMoviesView.as_view(), name='upcoming'),
]
