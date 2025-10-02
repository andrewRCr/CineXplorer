"""
Django admin interface customization for accounts.

This module previously contained custom User and EmailVerificationToken admin
configurations. These have been removed as part of the authentication
modernization migration to django-allauth and Django's default User model.

Migration Context:
==================
- Custom UserAdmin removed: Django's default UserAdmin is used
- EmailVerificationToken admin removed: Now using allauth's EmailAddress admin
- User model is now managed by django.contrib.auth (automatically registered)
- Email verification is managed by django-allauth (automatically registered)

To customize user admin interface, extend django.contrib.auth.admin.UserAdmin
in the authentication app if needed.

Migration Date: 2025-10-01
Related PRD: _docs/sub-prds/prd-authentication-modernization.md
"""

# This file intentionally left empty after migration to django-allauth.
# Django's default User admin and allauth's EmailAddress admin are automatically
# registered when their respective apps are included in INSTALLED_APPS.
