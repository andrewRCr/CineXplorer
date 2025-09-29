from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views import View


class HealthCheckView(View):
    def get(self, request: HttpRequest, *args: object, **kwargs: object) -> JsonResponse:
        return JsonResponse({'status': 'ok'})
