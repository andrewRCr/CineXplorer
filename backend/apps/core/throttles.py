"""Rate limits for anonymous frontend log reports."""

from apps.authentication.throttles import TestAwareAnonThrottle


class FrontendLogThrottle(TestAwareAnonThrottle):
    """Keep frontend log history separate from authentication attempts."""

    scope = "frontend_logs"
