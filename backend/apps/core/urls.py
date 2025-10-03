"""
URL configuration for core app.

This module defines URL patterns for core application functionality
including logging APIs and health checks.
"""

from django.urls import path

from .views.logging import FrontendLogAPIView, LogHealthCheckView

app_name = 'core'

urlpatterns = [
    # Frontend logging API endpoint
    path('logs/', FrontendLogAPIView.as_view(), name='frontend-logs'),

    # Logging system health check
    path('logs/health/', LogHealthCheckView.as_view(), name='logging-health-check'),
]
