"""
Type stubs for django-environ.

Provides type annotations for django-environ's Env class.
NO official type stubs exist for django-environ.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: django-environ 0.12.0 + django-types 0.22.0 (as of 2025-10-09)
Last verified with django-types: 2025-10-09

When upgrading django-environ or django-types:
1. Check django-environ release notes for API changes
2. Check for official environ type stubs (none exist as of 0.12.0)
3. Run tests - if runtime errors occur, check this stub file first
4. Verify method signatures match runtime behavior
5. Update "Last verified" date above

Trade-off: This stub provides IDE support for environment variable access (~60 lines to maintain).
For a stable library like django-environ, API changes are rare.

Purpose: Eliminates type errors on env() calls throughout config/settings
Pattern: Custom stubs for third-party libraries without complete type information
Status: NO official environ stubs exist - this is REQUIRED (not a supplement)
"""

from typing import overload

class NoValue:
    """Sentinel value for missing environment variables."""

NOTSET: NoValue

class Env:
    """Environment variable reader with type conversion."""

    def __init__(self, **schema: object) -> None: ...
    def __call__(
        self,
        var: str,
        default: str | bytes | NoValue = NOTSET,
        cast: object = None,
        parse_default: bool = False,
    ) -> str | bytes: ...
    @overload
    def bool(self, var: str, default: bool) -> bool: ...
    @overload
    def bool(self, var: str, default: NoValue = NOTSET) -> bool: ...
    def str(
        self,
        var: str,
        default: str | NoValue = NOTSET,
        multiline: bool = False,
    ) -> str: ...
    def int(
        self,
        var: str,
        default: int | NoValue = NOTSET,
    ) -> int: ...
    @staticmethod
    def read_env(
        env_file: str | None = None,
        overwrite: bool = False,
        parse_comments: bool = False,
        encoding: str = "utf8",
        **overrides: object,
    ) -> None: ...
