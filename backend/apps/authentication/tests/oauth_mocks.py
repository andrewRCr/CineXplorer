"""Mock OAuth provider implementations for testing.

This module provides mock implementations of OAuth providers (Google, GitHub)
for testing OAuth flows without requiring real external API calls.
"""

from collections.abc import Generator
from contextlib import contextmanager
from unittest.mock import Mock, patch

from allauth.socialaccount.models import SocialApp

from apps.authentication.tests.fixtures import create_social_app


class MockOAuthProvider:
    """Base class for mock OAuth providers.

    Provides common functionality for simulating OAuth flows in tests.
    """

    provider_name: str = "base"

    def __init__(self, social_app: SocialApp | None = None) -> None:
        """Initialize the mock OAuth provider.

        Args:
            social_app: SocialApp instance (created if not provided)
        """
        self.social_app = social_app or create_social_app(self.provider_name)

    def create_oauth_response(
        self,
        user_email: str = "oauth@example.com",
        user_id: str = "123456789",
        **extra_data: object,
    ) -> dict[str, object]:
        """Create a mock OAuth provider response.

        Args:
            user_email: Email address from OAuth provider
            user_id: Unique user ID from OAuth provider
            **extra_data: Additional provider-specific data

        Returns:
            Mock OAuth response data
        """
        raise NotImplementedError("Subclasses must implement create_oauth_response")

    def create_callback_params(
        self, code: str = "mock_auth_code", state: str = "mock_state"
    ) -> dict[str, str]:
        """Create mock OAuth callback parameters.

        Args:
            code: Authorization code
            state: CSRF state token

        Returns:
            Callback parameters dict
        """
        return {"code": code, "state": state}

    def mock_token_exchange(self, access_token: str = "mock_access_token") -> Mock:
        """Create a mock for the OAuth token exchange.

        Args:
            access_token: Mock access token

        Returns:
            Mock object mimicking requests.Response for token exchange
        """
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.json.return_value = {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
        }
        mock_response.raise_for_status = Mock()  # No-op for 200 status
        return mock_response

    def mock_user_info_request(
        self,
        user_email: str = "oauth@example.com",
        user_id: str = "123456789",
        **extra_data: object,
    ) -> Mock:
        """Create a mock for the OAuth user info request.

        Args:
            user_email: User's email address
            user_id: Provider's user ID
            **extra_data: Additional user data

        Returns:
            Mock object mimicking requests.Response for user info request
        """
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.json.return_value = self.create_oauth_response(
            user_email=user_email, user_id=user_id, **extra_data
        )
        mock_response.raise_for_status = Mock()  # No-op for 200 status
        return mock_response


class MockGoogleOAuth(MockOAuthProvider):
    """Mock implementation of Google OAuth provider.

    Simulates Google's OAuth 2.0 flow for testing purposes.
    """

    provider_name = "google"

    def create_oauth_response(
        self,
        user_email: str = "google@example.com",
        user_id: str = "123456789",
        **extra_data: object,
    ) -> dict[str, object]:
        """Create a mock Google OAuth response.

        Simulates the response from Google's userinfo endpoint.

        Args:
            user_email: User's email address
            user_id: Google user ID (sub)
            **extra_data: Additional Google-specific data

        Returns:
            Mock Google userinfo response
        """
        response = {
            "sub": user_id,
            "email": user_email,
            "email_verified": True,
            "name": extra_data.get("name", "Test User"),
            "given_name": extra_data.get("given_name", "Test"),
            "family_name": extra_data.get("family_name", "User"),
            "picture": extra_data.get(
                "picture", "https://lh3.googleusercontent.com/a/default-user"
            ),
            "locale": extra_data.get("locale", "en"),
        }
        response.update(extra_data)
        return response

    def mock_complete_flow(
        self,
        user_email: str = "google@example.com",
        user_id: str = "123456789",
        access_token: str = "mock_google_token",
    ) -> tuple[Mock, Mock]:
        """Mock the complete Google OAuth flow.

        Returns mocks for both token exchange and user info requests.

        Args:
            user_email: User's email address
            user_id: Google user ID
            access_token: Mock access token

        Returns:
            Tuple of (token_exchange_mock, user_info_mock)
        """
        token_mock = self.mock_token_exchange(access_token)
        user_info_mock = self.mock_user_info_request(user_email, user_id)
        return token_mock, user_info_mock


class MockGitHubOAuth(MockOAuthProvider):
    """Mock implementation of GitHub OAuth provider.

    Simulates GitHub's OAuth 2.0 flow for testing purposes.
    """

    provider_name = "github"

    def create_oauth_response(
        self,
        user_email: str = "github@example.com",
        user_id: str = "987654321",
        **extra_data: object,
    ) -> dict[str, object]:
        """Create a mock GitHub OAuth response.

        Simulates the response from GitHub's user endpoint.

        Args:
            user_email: User's email address
            user_id: GitHub user ID
            **extra_data: Additional GitHub-specific data

        Returns:
            Mock GitHub user response
        """
        response = {
            "id": int(user_id),
            "login": extra_data.get("login", "testuser"),
            "email": user_email,
            "name": extra_data.get("name", "Test User"),
            "avatar_url": extra_data.get(
                "avatar_url", "https://avatars.githubusercontent.com/u/987654321"
            ),
            "bio": extra_data.get("bio", ""),
            "location": extra_data.get("location", ""),
            "blog": extra_data.get("blog", ""),
            "html_url": extra_data.get("html_url", "https://github.com/testuser"),
            "public_repos": extra_data.get("public_repos", 0),
            "followers": extra_data.get("followers", 0),
            "following": extra_data.get("following", 0),
        }
        response.update(extra_data)
        return response

    def mock_email_request(
        self, user_email: str = "github@example.com", verified: bool = True
    ) -> Mock:
        """Create a mock for GitHub's emails endpoint.

        GitHub requires a separate API call to fetch user emails.

        Args:
            user_email: User's email address
            verified: Whether the email is verified

        Returns:
            Mock object mimicking requests.Response for email request
        """
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "application/json"}
        mock_response.json.return_value = [
            {"email": user_email, "primary": True, "verified": verified, "visibility": "private"}
        ]
        mock_response.raise_for_status = Mock()  # No-op for 200 status
        return mock_response

    def mock_complete_flow(
        self,
        user_email: str = "github@example.com",
        user_id: str = "987654321",
        access_token: str = "mock_github_token",
    ) -> tuple[Mock, Mock, Mock]:
        """Mock the complete GitHub OAuth flow.

        Returns mocks for token exchange, user info, and email requests.

        Args:
            user_email: User's email address
            user_id: GitHub user ID
            access_token: Mock access token

        Returns:
            Tuple of (token_exchange_mock, user_info_mock, email_mock)
        """
        token_mock = self.mock_token_exchange(access_token)
        user_info_mock = self.mock_user_info_request(user_email, user_id)
        email_mock = self.mock_email_request(user_email)
        return token_mock, user_info_mock, email_mock


# Convenience functions for common test scenarios
def mock_google_oauth_success() -> MockGoogleOAuth:
    """Create a fully configured mock Google OAuth provider for successful flow.

    Returns:
        Configured MockGoogleOAuth instance

    Note:
        Use the returned provider's methods with custom email/user_id:
        provider.create_oauth_response(user_email='...', user_id='...')
    """
    return MockGoogleOAuth()


def mock_github_oauth_success() -> MockGitHubOAuth:
    """Create a fully configured mock GitHub OAuth provider for successful flow.

    Returns:
        Configured MockGitHubOAuth instance

    Note:
        Use the returned provider's methods with custom email/user_id:
        provider.create_oauth_response(user_email='...', user_id='...')
    """
    return MockGitHubOAuth()


@contextmanager
def patch_oauth_requests(provider: str = "google") -> Generator[tuple[Mock, Mock]]:
    """Context manager for patching OAuth HTTP requests.

    Use this to mock the external HTTP requests made during OAuth flow.

    Args:
        provider: OAuth provider name ('google' or 'github')

    Yields:
        Tuple of (mock_post, mock_get) for patched requests

    Example:
        with patch_oauth_requests('google') as (mock_post, mock_get):
            # OAuth requests will be mocked
            response = client.get('/accounts/google/login/callback/', {...})
    """
    if provider not in ("google", "github"):
        raise ValueError(f"Unsupported provider: {provider}")

    with patch("requests.post") as mock_post, patch("requests.get") as mock_get:
        yield mock_post, mock_get
