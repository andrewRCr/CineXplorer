"""
Email service for sending transactional emails via Zeptomail.
"""

import requests
import secrets
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from core.models import User, EmailVerificationToken


class ZeptomailService:
    """Service for sending emails via Zeptomail API."""

    def __init__(self):
        self.api_key = settings.ZEPTOMAIL_API_KEY
        self.base_url = "https://api.zeptomail.com/v1.1"
        # Development mode flag
        self.dev_mode = not self.api_key or self.api_key == ""

    def _get_headers(self):
        """Get headers for Zeptomail API requests."""
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': f'Zoho-enczapikey {self.api_key}'
        }

    def send_verification_email(self, user: User) -> bool:
        """
        Send email verification link to user.

        Args:
            user: User instance to send verification email to

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        # Development mode - simulate successful email sending
        if self.dev_mode:
            print(f"DEV MODE: Would send verification email to {user.email}")
            print(
                f"DEV MODE: Verification URL would be: {settings.FRONTEND_URL}/verify-email/[token]")
            return True

        try:
            # Generate or get existing verification token
            token, created = EmailVerificationToken.objects.get_or_create(
                user=user,
                defaults={
                    'token': secrets.token_urlsafe(32),
                    'expires_at': timezone.now() + settings.EMAIL_VERIFICATION_TOKEN_EXPIRY
                }
            )

            # If token exists but is expired, update it
            if not created and token.is_expired:
                token.token = secrets.token_urlsafe(32)
                token.expires_at = timezone.now() + settings.EMAIL_VERIFICATION_TOKEN_EXPIRY
                token.save()

            # Generate verification URL
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{token.token}"

            # Prepare email content
            subject = "Verify Your CineXplorer Account"
            html_body = render_to_string('emails/verify_email.html', {
                'user': user,
                'verification_url': verification_url,
                'frontend_url': settings.FRONTEND_URL
            })

            # Zeptomail API payload
            payload = {
                "from": {
                    "address": settings.ZEPTOMAIL_SENDER_EMAIL,
                    "name": "CineXplorer"
                },
                "to": [{
                    "email_address": {
                        "address": user.email,
                        "name": user.username
                    }
                }],
                "subject": subject,
                "htmlbody": html_body,
                "track_clicks": True,
                "track_opens": True
            }

            # Send email via Zeptomail
            response = requests.post(
                f"{self.base_url}/email",
                json=payload,
                headers=self._get_headers()
            )

            if response.status_code == 201:
                print(f"Verification email sent successfully to {user.email}")
                return True
            else:
                error_msg = f"Failed to send verification email: {response.status_code}"
                print(f"{error_msg} - {response.text}")

                # Try to parse error response
                try:
                    error_data = response.json()
                    print(f"Error details: {error_data}")
                except ValueError:
                    print(f"Raw response: {response.text}")

                # Additional debugging info
                print(f"Request URL: {response.request.url}")
                print(f"Request headers: {dict(response.request.headers)}")
                print(f"Response headers: {dict(response.headers)}")

                return False

        except Exception as e:
            print(f"Error sending verification email: {str(e)}")
            return False

    def send_welcome_email(self, user: User) -> bool:
        """
        Send welcome email after successful verification.

        Args:
            user: User instance to send welcome email to

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            subject = "Welcome to CineXplorer!"
            html_body = render_to_string('emails/welcome.html', {
                'user': user,
                'frontend_url': settings.FRONTEND_URL
            })

            payload = {
                "from": {
                    "address": settings.ZEPTOMAIL_SENDER_EMAIL,
                    "name": "CineXplorer"
                },
                "to": [{
                    "email_address": {
                        "address": user.email,
                        "name": user.username
                    }
                }],
                "subject": subject,
                "htmlbody": html_body,
                "track_clicks": True,
                "track_opens": True
            }

            response = requests.post(
                f"{self.base_url}/email",
                json=payload,
                headers=self._get_headers()
            )

            if response.status_code == 201:
                print(f"Welcome email sent successfully to {user.email}")
                return True
            else:
                print(
                    f"Failed to send welcome email: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"Error sending welcome email: {str(e)}")
            return False


# Global service instance
email_service = ZeptomailService()
