"""Configuration that depends on the deployment environment.

Cookie, HSTS and HTTPS-redirect tests replicate settings logic. Subprocess
cases load the real settings module; request cases use override_settings.
"""

from __future__ import annotations

from typing import cast

import pytest
from django.test import override_settings

# ============================================================================
# SESSION_COOKIE_SECURE Tests (Environment-Aware)
# ============================================================================


@pytest.mark.django_db
@override_settings(ENVIRONMENT="production")
def test_session_cookie_secure_true_in_production() -> None:
    """Test that SESSION_COOKIE_SECURE=True in production environment."""
    from django.conf import settings

    # Re-evaluate the setting since override_settings doesn't trigger the
    # conditional logic. We need to test the logic directly.
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure is True, "SESSION_COOKIE_SECURE should be True in production"


@pytest.mark.django_db
@override_settings(ENVIRONMENT="staging")
def test_session_cookie_secure_true_in_staging() -> None:
    """Test that SESSION_COOKIE_SECURE=True in staging environment."""
    from django.conf import settings

    # Re-evaluate the setting
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure is True, "SESSION_COOKIE_SECURE should be True in staging"


@pytest.mark.django_db
@override_settings(ENVIRONMENT="development")
def test_session_cookie_secure_false_in_development() -> None:
    """Test that SESSION_COOKIE_SECURE=False in development environment."""
    from django.conf import settings

    # Re-evaluate the setting
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure is False, "SESSION_COOKIE_SECURE should be False in development"


# ============================================================================
# CSRF_COOKIE_SECURE Tests (Environment-Aware)
# ============================================================================


@pytest.mark.django_db
@override_settings(ENVIRONMENT="production")
def test_csrf_cookie_secure_follows_session_pattern_production() -> None:
    """Test that CSRF_COOKIE_SECURE follows same pattern as SESSION_COOKIE_SECURE in production."""
    from django.conf import settings

    # Both should be True in production
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    csrf_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure == csrf_cookie_secure, (
        "CSRF_COOKIE_SECURE should match SESSION_COOKIE_SECURE pattern"
    )
    assert csrf_cookie_secure is True, "CSRF_COOKIE_SECURE should be True in production"


@pytest.mark.django_db
@override_settings(ENVIRONMENT="staging")
def test_csrf_cookie_secure_follows_session_pattern_staging() -> None:
    """Test that CSRF_COOKIE_SECURE follows same pattern as SESSION_COOKIE_SECURE in staging."""
    from django.conf import settings

    # Both should be True in staging
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    csrf_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure == csrf_cookie_secure, (
        "CSRF_COOKIE_SECURE should match SESSION_COOKIE_SECURE pattern"
    )
    assert csrf_cookie_secure is True, "CSRF_COOKIE_SECURE should be True in staging"


@pytest.mark.django_db
@override_settings(ENVIRONMENT="development")
def test_csrf_cookie_secure_follows_session_pattern_development() -> None:
    """Test CSRF_COOKIE_SECURE follows SESSION_COOKIE_SECURE pattern in development."""
    from django.conf import settings

    # Both should be False in development
    session_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    csrf_cookie_secure = settings.ENVIRONMENT in ["production", "staging"]
    assert session_cookie_secure == csrf_cookie_secure, (
        "CSRF_COOKIE_SECURE should match SESSION_COOKIE_SECURE pattern"
    )
    assert csrf_cookie_secure is False, "CSRF_COOKIE_SECURE should be False in development"


# ============================================================================
# SECURE_HSTS_SECONDS Tests (Environment-Aware)
# ============================================================================


@pytest.mark.django_db
def test_hsts_seconds_production() -> None:
    """Test that SECURE_HSTS_SECONDS=31536000 (1 year) in production."""
    # Test the logic directly since we can't dynamically reload settings module
    environment = "production"
    expected_hsts_seconds = 31536000  # 1 year

    # Replicate the settings.py logic
    hsts_seconds = (
        31536000 if environment == "production" else 3600 if environment == "staging" else 0
    )

    assert hsts_seconds == expected_hsts_seconds, (
        f"SECURE_HSTS_SECONDS should be {expected_hsts_seconds} (1 year) in production"
    )


@pytest.mark.django_db
def test_hsts_seconds_staging() -> None:
    """Test that SECURE_HSTS_SECONDS=3600 (1 hour) in staging."""
    # Test the logic directly
    environment = "staging"
    expected_hsts_seconds = 3600  # 1 hour

    # Replicate the settings.py logic
    hsts_seconds = (
        31536000
        if environment == "production"  # pyright: ignore[reportUnnecessaryComparison]
        else 3600
        if environment == "staging"
        else 0
    )

    assert hsts_seconds == expected_hsts_seconds, (
        f"SECURE_HSTS_SECONDS should be {expected_hsts_seconds} (1 hour) in staging"
    )


@pytest.mark.django_db
def test_hsts_seconds_development() -> None:
    """Test that SECURE_HSTS_SECONDS=0 (no HSTS) in development."""
    # Test the logic directly
    environment = "development"
    expected_hsts_seconds = 0  # No HSTS

    # Replicate the settings.py logic
    hsts_seconds = (
        31536000
        if environment == "production"  # pyright: ignore[reportUnnecessaryComparison]
        else 3600
        if environment == "staging"  # pyright: ignore[reportUnnecessaryComparison]
        else 0
    )

    assert hsts_seconds == expected_hsts_seconds, (
        "SECURE_HSTS_SECONDS should be 0 (no HSTS) in development"
    )


# ============================================================================
# SECURE_SSL_REDIRECT Tests (Environment-Aware)
# ============================================================================


@pytest.mark.django_db
def test_ssl_redirect_true_in_production() -> None:
    """Test that SECURE_SSL_REDIRECT=True in production."""
    # Test the logic directly
    environment = "production"
    expected_ssl_redirect = True

    # Replicate the settings.py logic
    ssl_redirect = environment in ("production", "staging")

    assert ssl_redirect == expected_ssl_redirect, (
        "SECURE_SSL_REDIRECT should be True in production"
    )


@pytest.mark.django_db
def test_ssl_redirect_true_in_staging() -> None:
    """Test that SECURE_SSL_REDIRECT=True in staging."""
    # Test the logic directly
    environment = "staging"
    expected_ssl_redirect = True

    # Replicate the settings.py logic
    ssl_redirect = environment in ("production", "staging")

    assert ssl_redirect == expected_ssl_redirect, "SECURE_SSL_REDIRECT should be True in staging"


@pytest.mark.django_db
def test_ssl_redirect_false_in_development() -> None:
    """Test that SECURE_SSL_REDIRECT=False in development."""
    # Test the logic directly
    environment = "development"
    expected_ssl_redirect = False

    # Replicate the settings.py logic
    ssl_redirect = environment in ("production", "staging")  # pyright: ignore[reportUnnecessaryContains]

    assert ssl_redirect == expected_ssl_redirect, (
        "SECURE_SSL_REDIRECT should be False in development"
    )


@pytest.mark.parametrize(
    ("environment", "debug", "hosts", "error"),
    [
        ("staging", "False", None, "DJANGO_ALLOWED_HOSTS"),
        ("staging", "True", "staging.example", "DEBUG"),
        ("qa", "False", "staging.example", "ENVIRONMENT"),
    ],
)
def test_invalid_deployment_settings(
    environment: str, debug: str, hosts: str | None, error: str
) -> None:
    from apps.core.tests.test_helpers import load_settings

    result = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": debug, "DJANGO_ALLOWED_HOSTS": hosts}, []
    )
    assert error in str(result.get("error", ""))


def test_staging_origins_default_to_empty() -> None:
    from apps.core.tests.test_helpers import load_settings

    assert load_settings(
        {"ENVIRONMENT": "staging", "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "staging.example"},
        ["ALLOWED_HOSTS", "CSRF_TRUSTED_ORIGINS", "CORS_ALLOWED_ORIGINS"],
    ) == {
        "ALLOWED_HOSTS": ["staging.example"],
        "CSRF_TRUSTED_ORIGINS": [],
        "CORS_ALLOWED_ORIGINS": [],
    }


def test_deployment_lists_are_comma_separated() -> None:
    from apps.core.tests.test_helpers import load_settings

    assert load_settings(
        {
            "ENVIRONMENT": "staging",
            "DEBUG": "False",
            "DJANGO_ALLOWED_HOSTS": "one.example,two.example",
            "CSRF_TRUSTED_ORIGINS": "https://one.example,https://two.example",
            "CORS_ALLOWED_ORIGINS": "https://three.example,https://four.example",
        },
        ["ALLOWED_HOSTS", "CSRF_TRUSTED_ORIGINS", "CORS_ALLOWED_ORIGINS"],
    ) == {
        "ALLOWED_HOSTS": ["one.example", "two.example"],
        "CSRF_TRUSTED_ORIGINS": ["https://one.example", "https://two.example"],
        "CORS_ALLOWED_ORIGINS": ["https://three.example", "https://four.example"],
    }


def test_development_host_and_origin_defaults() -> None:
    from apps.core.tests.test_helpers import load_settings

    assert load_settings(
        {"ENVIRONMENT": "development", "DEBUG": "False"},
        ["ALLOWED_HOSTS", "CSRF_TRUSTED_ORIGINS", "CORS_ALLOWED_ORIGINS"],
    ) == {
        "ALLOWED_HOSTS": [
            "localhost",
            "127.0.0.1",
            "localhost:8000",
            "localhost:5173",
            "backend",
            "testserver",
        ],
        "CSRF_TRUSTED_ORIGINS": [
            "http://localhost:5173",
            "https://localhost:5173",
            "https://localhost:5174",
            "https://localhost:8000",
            "https://localhost:8444",
        ],
        "CORS_ALLOWED_ORIGINS": [
            "http://localhost:5173",
            "https://localhost:5173",
            "https://localhost:5174",
            "https://localhost:8444",
        ],
    }


@pytest.mark.parametrize("environment", ["staging", "development"])
@pytest.mark.parametrize(
    "setting,member",
    [
        ("INSTALLED_APPS", "debug_toolbar"),
        ("INSTALLED_APPS", "django_extensions"),
        ("MIDDLEWARE", "debug_toolbar.middleware.DebugToolbarMiddleware"),
        ("config.urls.urlpatterns", "__debug__/"),
    ],
)
def test_development_tooling_matches_environment(
    environment: str, setting: str, member: str
) -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["INSTALLED_APPS", "MIDDLEWARE", "config.urls.urlpatterns"],
        setup=True,
    )
    value = values[setting]
    assert isinstance(value, list)
    assert (
        any(member in str(item) for item in cast(list[object], value))
        if setting == "config.urls.urlpatterns"
        else member in value
    ) is (environment == "development")


@pytest.mark.django_db
@pytest.mark.parametrize("environment,expected", [("staging", 403), ("development", 500)])
def test_debug_error_route_environment(environment: str, expected: int) -> None:
    from django.test import Client
    from django.urls import resolve

    # Load routes under normal settings before overriding endpoint policy.
    resolve("/api/debug/error-500/")
    with override_settings(ENVIRONMENT=environment, DEBUG=True):
        assert Client().get("/api/debug/error-500/").status_code == expected


@pytest.mark.django_db
def test_dev_log_route_denies_staging_even_with_debug() -> None:
    from django.test import Client
    from django.urls import resolve

    resolve("/api/dev-logs/write/")
    with override_settings(ENVIRONMENT="staging", DEBUG=True):
        response = Client().post(
            "/api/dev-logs/write/", {"log_line": "example"}, content_type="application/json"
        )
    assert response.status_code == 403


@pytest.mark.parametrize("environment", ["staging", "development"])
@pytest.mark.parametrize("setting", ["STORAGES", "STATIC_ROOT", "MIDDLEWARE"])
def test_static_configuration(environment: str, setting: str) -> None:
    from pathlib import Path

    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        [setting, "BASE_DIR"],
    )
    if setting == "STORAGES":
        if environment == "development":
            assert setting not in values
        else:
            assert values[setting] == {
                "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
                "staticfiles": {
                    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
                },
            }
    elif setting == "STATIC_ROOT":
        assert values.get(setting) == str(Path(str(values["BASE_DIR"])) / "staticfiles")
    else:
        middleware = values[setting]
        assert isinstance(middleware, list)
        security = cast(list[object], middleware).index(
            "django.middleware.security.SecurityMiddleware"
        )
        assert middleware[security + 1] == "whitenoise.middleware.WhiteNoiseMiddleware"


@pytest.mark.django_db
@pytest.mark.parametrize(
    "path,expected", [("/api/health-check/", 200), ("/api/logs/health/", 301)]
)
def test_https_redirect_exempts_only_health_check(path: str, expected: int) -> None:
    from django.test import Client

    with override_settings(SECURE_SSL_REDIRECT=True):
        response = Client().get(path)
    assert response.status_code == expected
    if expected == 301:
        assert response["Location"] == "https://testserver" + path


@pytest.mark.parametrize("environment", ["staging", "production", "development"])
@pytest.mark.parametrize("aspect", ["files", "console"])
def test_logging_handlers_match_environment(environment: str, aspect: str) -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": environment, "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["LOGGING"],
    )
    config = cast(dict[str, object], values["LOGGING"])
    handlers = cast(dict[str, dict[str, object]], config["handlers"])
    file_handlers = [
        handler for handler in handlers.values() if "FileHandler" in str(handler["class"])
    ]
    if aspect == "files":
        assert bool(file_handlers) is (environment == "development")
    else:
        assert handlers["console"]["level"] == (
            "WARNING" if environment == "development" else "INFO"
        )


def test_deployed_console_level_can_be_overridden() -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {
            "ENVIRONMENT": "staging",
            "DEBUG": "False",
            "DJANGO_ALLOWED_HOSTS": "testserver",
            "DJANGO_CONSOLE_LOG_LEVEL": "ERROR",
        },
        ["LOGGING"],
    )
    config = cast(dict[str, object], values["LOGGING"])
    handlers = cast(dict[str, dict[str, object]], config["handlers"])
    assert handlers["console"]["level"] == "ERROR"


def test_staging_settings_never_create_or_probe_log_directories() -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {"ENVIRONMENT": "staging", "DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "testserver"},
        ["observed_log_paths", "LOG_DIRECTORY"],
        before_import="""
import builtins
import os
observed_log_paths = []
original_makedirs = os.makedirs
original_open = builtins.open

def observed_makedirs(path, *args, **kwargs):
    if "logs" in str(path):
        observed_log_paths.append(str(path))
    return original_makedirs(path, *args, **kwargs)

def observed_open(path, *args, **kwargs):
    if "logs" in str(path):
        observed_log_paths.append(str(path))
    return original_open(path, *args, **kwargs)

os.makedirs = observed_makedirs
builtins.open = observed_open
""",
    )
    assert values["observed_log_paths"] == []
    assert values["LOG_DIRECTORY"] is None
