"""
Type stubs for django-environ.

Library: django-environ==0.12.0
Last verified: 2025-10-08
Upgrade checklist:
- Check release notes for API changes
- Run full test suite
- Update this file if signatures change
"""

from typing import Any, overload

class NoValue:
    """Sentinel value for missing environment variables."""
    ...

NOTSET: NoValue

class Env:
    """Environment variable reader with type conversion."""

    def __init__(self, **schema: Any) -> None: ...

    def __call__(
        self,
        var: str,
        default: str | bytes | NoValue = NOTSET,
        cast: Any = None,
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
        **overrides: Any,
    ) -> None: ...
