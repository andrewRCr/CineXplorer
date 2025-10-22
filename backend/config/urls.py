"""
URL configuration for app project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

from .api import api

urlpatterns = [
    path("admin/", admin.site.urls),  # pyright: ignore[reportCallIssue,reportArgumentType]  # django-types limitation: admin.site.urls type inference incomplete
    path("__debug__/", include("debug_toolbar.urls")),
    # django-allauth Headless Mode (SPA/API-only)
    # Provides JSON API endpoints for OAuth, email verification, password reset
    # Browser API: /_allauth/browser/v1/...
    path("_allauth/", include("allauth.headless.urls")),
    # django-allauth Traditional URLs (needed for OAuth callbacks)
    # OAuth providers redirect to /accounts/<provider>/login/callback/
    # These are still needed even in headless mode for OAuth flow completion
    path("accounts/", include("allauth.urls")),
    # Django Ninja API (modern, type-safe endpoints)
    # All authentication, movie, core, and user data endpoints provided by Django Ninja
    path("api/", api.urls),
]
