"""
Type stubs for django-allauth sessionkit module.

Synchronized with: django-allauth v65.12.0
Last verified: 2025-10-08
"""

from django.contrib.sessions.backends.base import SessionBase

def session_store(session_key: str | None = None) -> SessionBase:
    """
    Get Django session store instance.

    Args:
        session_key: Optional session key to load specific session

    Returns:
        SessionBase instance from configured SESSION_ENGINE
    """
    ...
