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
    path('discover/', views.DiscoverMoviesView.as_view(), name='discover'),
    path('genres/', views.MovieGenresView.as_view(), name='genres'),
    path('keywords/popular/', views.PopularKeywordsView.as_view(), name='popular-keywords'),
    path('keywords/search/', views.SearchKeywordsView.as_view(), name='search-keywords'),
    path('people/popular/', views.PopularPeopleView.as_view(), name='popular-people'),
    path('people/search/', views.SearchPeopleView.as_view(), name='search-people'),
]
