"""Database readiness for the public health endpoint."""

from django.db import DatabaseError, connection

from apps.core.exceptions import UpstreamError


def check_database_connection() -> None:
    """Require a working query without exposing driver failures to the caller."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        raise UpstreamError("Service unavailable.", status_code=503) from None
