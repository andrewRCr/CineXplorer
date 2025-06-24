"""
Views for the movie API.
"""

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render

import tmdbsimple as tmdb
tmdb.API_KEY = settings.TMDB_API_KEY


def movie_detail_view(request, tmdb_id) -> HttpResponse:
    """ Basic movie detail info view, pulled from TMDB by id. """

    tmdb_movie = tmdb.Movies(tmdb_id)
    tmdb_movie.info()

    return render(request, 'movie-detail.html', {'movie_detail_data': tmdb_movie})
