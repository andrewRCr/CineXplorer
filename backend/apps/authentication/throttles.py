"""Test-aware throttle classes for authentication endpoints.

These classes implement lazy evaluation of settings.TESTING to enable proper
test isolation with Django's @override_settings decorator. The standard approach
of checking settings at module import time prevents testing throttling behavior
because module-level evaluation happens before test settings are applied.

Design Pattern:
    Instead of: _THROTTLE = [] if settings.TESTING else [AnonRateThrottle('5/m')]
    We use: Request-time evaluation in allow_request() method

This enables:
    - Normal tests bypass throttling automatically (fast test suite)
    - Selective throttling tests via @pytest.mark.enable_throttling
    - Production behavior remains identical (settings.TESTING always False)

References:
    - Django Settings Best Practices: https://docs.djangoproject.com/en/5.2/topics/settings/
    - External Research Report: 2025-10-13 throttling testing patterns
"""

from threading import local

from django.conf import settings
from django.http import HttpRequest
from ninja.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class _RequestState(local):
    key: str | None
    history: list[float]
    now: float


class _RequestStateMixin(SimpleRateThrottle):
    """Keep mutable state in the thread handling allow_request and wait."""

    def __init__(self, rate: str | None = None) -> None:
        self._request_state = _RequestState()
        super().__init__(rate)

    @property
    def key(self) -> str | None:
        return self._request_state.key

    @key.setter
    def key(self, value: str | None) -> None:
        self._request_state.key = value

    @property
    def history(self) -> list[float]:
        return self._request_state.history

    @history.setter
    def history(self, value: list[float]) -> None:
        self._request_state.history = value

    @property
    def now(self) -> float:
        return self._request_state.now

    @now.setter
    def now(self, value: float) -> None:
        self._request_state.now = value


class TestAwareAnonThrottle(_RequestStateMixin, AnonRateThrottle):
    """Anonymous rate throttle that respects test mode configuration.

    In test mode (settings.TESTING=True), bypasses throttling unless explicitly
    enabled via request._test_enable_throttling attribute. This allows:
        - Fast test execution (no Redis cache overhead)
        - Selective throttling tests when needed
        - Production behavior unchanged (TESTING always False)

    Usage in API:
        @router.post("/login", throttle=[TestAwareAnonThrottle('5/m')])

    Usage in tests:
        # Default: throttling bypassed
        response = client.post('/api/login', data)

        # Enable throttling for specific test
        @pytest.mark.enable_throttling
        def test_rate_limiting():
            # Fixture sets request._test_enable_throttling = True
            ...
    """

    def allow_request(self, request: HttpRequest) -> bool:
        """Determine if request should be throttled.

        Args:
            request: Django HTTP request object

        Returns:
            True if request is allowed, False if throttled (429 response)

        Behavior:
            - Production (TESTING=False): Always apply throttling
            - Test mode (TESTING=True):
                - Default: Bypass throttling (return True)
                - With request._test_enable_throttling=True: Apply throttling
        """
        # Check settings at request time (lazy evaluation)
        if getattr(settings, "TESTING", False):
            # Test mode - check if throttling explicitly enabled
            enable = getattr(request, "_test_enable_throttling", False)
            if not enable:
                return True  # Bypass throttling in normal tests

        # Production mode or test with throttling enabled
        return super().allow_request(request)


class TestAwareUserThrottle(_RequestStateMixin, UserRateThrottle):
    """Authenticated user rate throttle that respects test mode configuration.

    Identical behavior to TestAwareAnonThrottle but for authenticated endpoints.
    Uses user ID as throttle key instead of IP address.

    Usage in API:
        @router.post("/refresh", throttle=[TestAwareUserThrottle('10/m')])

    Usage in tests:
        # Default: throttling bypassed
        response = authenticated_client.post('/api/refresh', data)

        # Enable throttling for specific test
        @pytest.mark.enable_throttling
        def test_refresh_rate_limiting():
            # Fixture sets request._test_enable_throttling = True
            ...
    """

    def allow_request(self, request: HttpRequest) -> bool:
        """Determine if request should be throttled.

        Args:
            request: Django HTTP request object

        Returns:
            True if request is allowed, False if throttled (429 response)

        Behavior:
            - Production (TESTING=False): Always apply throttling
            - Test mode (TESTING=True):
                - Default: Bypass throttling (return True)
                - With request._test_enable_throttling=True: Apply throttling
        """
        # Check settings at request time (lazy evaluation)
        if getattr(settings, "TESTING", False):
            # Test mode - check if throttling explicitly enabled
            enable = getattr(request, "_test_enable_throttling", False)
            if not enable:
                return True  # Bypass throttling in normal tests

        # Production mode or test with throttling enabled
        return super().allow_request(request)


class RegistrationThrottle(TestAwareAnonThrottle):
    """Count registration attempts independently of other authentication requests."""

    scope = "auth_register"


class LoginThrottle(TestAwareAnonThrottle):
    """Count password sign-in attempts independently of other authentication requests."""

    scope = "auth_login"


class ResendVerificationThrottle(TestAwareAnonThrottle):
    """Count verification resend attempts independently of other authentication requests."""

    scope = "auth_resend_verification"
