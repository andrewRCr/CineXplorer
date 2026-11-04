"""Type stubs for django-allauth sessionkit module.

Maintenance Contract:
Synchronized with: django-allauth v65.12.0
Last verified: 2025-10-09

When upgrading django-allauth:
1. Verify session_store function signature unchanged
2. Check if SessionBase return type still correct
3. Update "Last verified" date above

Purpose: Provides type information for allauth's session utilities
"""

from django.contrib.sessions.backends.base import SessionBase

def session_store(session_key: str | None = None) -> SessionBase:
    """Get Django session store instance.

    Args:
        session_key: Optional session key to load specific session

    Returns:
        SessionBase instance from configured SESSION_ENGINE
    """
