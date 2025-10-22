from django.conf import settings
from django.http import HttpRequest


def global_settings(request: HttpRequest) -> dict[str, object]:
    """Puts selected settings variables into the default template context."""
    return {
        'TMDB_API_KEY': settings.TMDB_API_KEY,
    }
