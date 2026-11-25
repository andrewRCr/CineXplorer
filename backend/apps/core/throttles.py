"""Rate limits for anonymous frontend log reports."""

from apps.authentication.throttles import TestAwareAnonThrottle


class FrontendLogThrottle(TestAwareAnonThrottle):
    """Keep frontend log history separate from authentication attempts.

    Reports are accepted while Redis is unavailable, when they matter most.
    """

    scope = "frontend_logs"
    allow_when_unavailable = True
