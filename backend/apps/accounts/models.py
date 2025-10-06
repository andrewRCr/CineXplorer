"""
User account models.

This module previously contained custom User and EmailVerificationToken models.
These have been removed as part of the authentication modernization migration
to django-allauth and Django's default User model.

Migration Context:
==================
- Custom User model removed: Now using django.contrib.auth.models.User
- Custom EmailVerificationToken removed: Now using allauth.account.models.EmailAddress
- Custom UserManager removed: Django's default UserManager is sufficient
- AUTH_USER_MODEL setting removed: Using Django's default

For email verification functionality, see:
- django-allauth's EmailAddress and EmailConfirmation models

Migration Date: 2025-10-01
Related PRD: _docs/sub-prds/prd-authentication-modernization.md
"""

# This file intentionally left empty after migration to django-allauth.
# The accounts app may be repurposed for user profile extensions in the future.
