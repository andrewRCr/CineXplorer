"""
URL mappings for the user API.
"""

from authentication import views
from django.urls import path
from django.urls.resolvers import URLPattern

app_name = 'authentication'

urlpatterns: list[URLPattern] = [
    path('me/', views.ManageUserView.as_view(), name='me'),
    path('verify-email/<str:token>/', views.EmailVerificationView.as_view(),
         name='verify-email'),
    path('resend-verification/', views.ResendVerificationView.as_view(),
         name='resend-verification'),
]
