from django.conf import settings


def global_settings(request):
    """ Puts selected settings variables into the default template context. """

    return {
        'TMDB_API_KEY': settings.TMDB_API_KEY,
    }
