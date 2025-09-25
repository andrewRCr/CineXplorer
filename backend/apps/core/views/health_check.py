from __future__ import annotations

from django.http import HttpRequest, JsonResponse
from django.views import View


class HealthCheckView(View):
    def get(self, request: HttpRequest) -> JsonResponse:
        return JsonResponse({'status': 'ok'})
