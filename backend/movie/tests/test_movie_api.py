"""
Tests for the movie API.
"""

from django.conf import settings
from django.http import HttpResponse
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APIClient

import tmdbsimple as tmdb
tmdb.API_KEY = settings.TMDB_API_KEY


class MovieApiTests(TestCase):
    """ Tests for the features of the movie API. """

    def test_get_movie_info(self) -> None:
        """ Tests getting the top level details of a movie by TMBD ID. """

        movie_id: int = 78
        tmdb_movie = tmdb.Movies(movie_id)
        tmdb_movie.info()
        # response = tmdb_movie.info()

        self.assertEqual(tmdb_movie.id, movie_id)
        self.assertEqual(tmdb_movie.title, 'Blade Runner')  # type: ignore
