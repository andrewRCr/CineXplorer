"""Type stubs for django-allauth headless tokens module.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: django-allauth v65.12.0
Last verified: 2025-10-09

When upgrading django-allauth:
1. Verify AbstractTokenStrategy still exported from this module
2. Check base.pyi still matches AbstractTokenStrategy interface
3. Update "Last verified" date above

Purpose: Exports AbstractTokenStrategy for custom token strategies
"""

from allauth.headless.tokens.base import AbstractTokenStrategy as AbstractTokenStrategy

__all__ = ["AbstractTokenStrategy"]
