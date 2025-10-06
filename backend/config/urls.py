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

from core.views.health_check import HealthCheckView
from django.contrib import admin
from django.urls import include, path

from .api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("__debug__/", include("debug_toolbar.urls")),
    # django-allauth
    # Provides: email verification, password reset, OAuth callbacks
    path("accounts/", include("allauth.urls")),
    # Django Ninja API (modern, type-safe endpoints)
    # All authentication, movie, and user data endpoints provided by Django Ninja
    path("api/", api.urls),
    path("api/health-check/", HealthCheckView.as_view(), name="health-check"),
]
