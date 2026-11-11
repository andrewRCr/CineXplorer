"""Atomic fixed-window counters for each authenticated user's saves."""

from __future__ import annotations

import logging
import math
import time
from threading import local

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from django.http import HttpRequest
from ninja.throttling import BaseThrottle

logger = logging.getLogger(__name__)


class _SaveRequestState(local):
    wait_seconds: int


class SaveThrottle(BaseThrottle):
    """Count every attempt; allow saves through when the counter store is unavailable."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._state = _SaveRequestState()

    def allow_request(self, request: HttpRequest) -> bool:
        if getattr(settings, "TESTING", False) and not getattr(
            request, "_test_enable_throttling", False
        ):
            return True
        user = getattr(request, "auth", None)
        if not isinstance(user, AbstractBaseUser):
            return True
        now = time.time()
        start = int(now // self.window_seconds) * self.window_seconds
        remaining = max(1, math.ceil(start + self.window_seconds - now))
        self._state.wait_seconds = remaining
        key = f"movie-save:{self.window_seconds}:{start}:{user.pk}"
        try:
            for attempt in range(2):
                cache.add(key, 0, timeout=remaining)
                try:
                    count = cache.incr(key)
                    return count <= self.limit
                except ValueError:
                    # Expiry or eviction can remove a key after add and before incr.
                    if attempt:
                        raise
        except Exception as error:  # noqa: BLE001 - this boundary must never raise
            # Throttle evaluation is outside Ninja's error handler. Cache errors must
            # never escape; their text can contain connection credentials.
            logger.error("Save counter unavailable: %s", type(error).__name__)  # noqa: TRY400 - credentials may appear in the traceback
        return True

    def wait(self) -> float:
        return self._state.wait_seconds
