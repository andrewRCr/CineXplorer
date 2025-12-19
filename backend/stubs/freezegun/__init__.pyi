"""
Type stubs for freezegun library.

Library: freezegun 1.5.1
Purpose: Time mocking for tests
Docs: https://github.com/spulec/freezegun
Last verified: 2025-10-20

Minimal stub providing freeze_time context manager for test usage.
Only includes commonly used features - extend as needed.

Maintenance:
- Update when upgrading freezegun
- Verify signatures match library version
- Run: pip show freezegun (check installed version)
"""

from __future__ import annotations

from contextlib import AbstractContextManager
from datetime import datetime
from typing import Any

def freeze_time(
    time_to_freeze: str | datetime | None = None,
    tz_offset: int = 0,
    ignore: list[str] | None = None,
    tick: bool = False,
    as_arg: bool = False,
    auto_tick_seconds: int = 0,
) -> AbstractContextManager[Any]:
    """
    Context manager/decorator to freeze time for testing.

    Args:
        time_to_freeze: Time to freeze to (ISO string or datetime)
        tz_offset: Timezone offset in hours
        ignore: List of modules to exclude from freezing
        tick: Whether time should auto-increment on each call
        as_arg: Whether to pass frozen time as argument to function
        auto_tick_seconds: Auto-increment by N seconds on each call

    Returns:
        Context manager that freezes time

    Example:
        with freeze_time("2025-01-01"):
            # time is frozen at 2025-01-01
            assert datetime.now().year == 2025
    """
