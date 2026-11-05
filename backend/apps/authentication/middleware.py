"""Django CSRF protection and the public allauth endpoint boundary."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable

from django.http import HttpRequest, HttpResponseForbidden, HttpResponseNotFound, JsonResponse
from django.middleware.csrf import CsrfViewMiddleware
from django.utils.deprecation import MiddlewareMixin

from apps.authentication.adapters import EMAIL_DELIVERY_FAILURE_MESSAGE, EmailDeliveryError

logger = logging.getLogger("cinexplorer.auth")


class CsrfProtectionMiddleware(CsrfViewMiddleware):
    """Apply Django's checks even when the API view declares itself exempt."""

    def process_view(
        self,
        request: HttpRequest,
        callback: Callable[..., object] | None,
        callback_args: tuple[object, ...],
        callback_kwargs: dict[str, object],
    ) -> HttpResponseForbidden | None:
        if (
            request.method == "POST" and request.path in {"/api/logs/", "/api/dev-logs/write/"}
        ) or request.path.startswith("/__debug__/"):
            return None
        # Django uses the callback only to read csrf_exempt. Hiding it preserves all
        # request checks while preventing Ninja's view exemption from bypassing them.
        return super().process_view(request, None, callback_args, callback_kwargs)

    def _reject(self, request: HttpRequest, reason: str) -> HttpResponseForbidden:
        logger.warning("CSRF validation failed for %s %s", request.method, request.path)
        return HttpResponseForbidden(
            json.dumps({"detail": "CSRF token missing or invalid."}),
            content_type="application/json",
        )


class AllauthEndpointMiddleware(MiddlewareMixin):
    """Expose only the headless browser operations used by the frontend."""

    allowed_methods = {
        "/_allauth/browser/v1/auth/session": {"GET", "DELETE"},
        "/_allauth/browser/v1/auth/password/request": {"POST"},
        "/_allauth/browser/v1/auth/password/reset": {"POST"},
        "/_allauth/browser/v1/auth/provider/redirect": {"POST"},
    }

    def process_request(self, request: HttpRequest) -> HttpResponseNotFound | None:
        if request.path.startswith(
            "/_allauth/"
        ) and request.method not in self.allowed_methods.get(request.path, set()):
            return HttpResponseNotFound()
        return None


class AllauthEmailDeliveryMiddleware(MiddlewareMixin):
    """Give allauth's mail failures the same retryable response as the API."""

    def process_exception(self, request: HttpRequest, exception: Exception) -> JsonResponse | None:
        if request.path.startswith("/_allauth/") and isinstance(exception, EmailDeliveryError):
            logger.error("%s | endpoint=%s", EMAIL_DELIVERY_FAILURE_MESSAGE, request.path)
            return JsonResponse({"detail": EMAIL_DELIVERY_FAILURE_MESSAGE}, status=503)
        return None
