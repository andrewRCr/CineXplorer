"""Tests for the custom Django management commands module."""

import json
import os
import subprocess
import sys
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.utils import OperationalError
from django.test import override_settings

from apps.core.tests.mock_paths import WAIT_FOR_DB_CONNECTIONS

# ============================================================================
# Management Command Tests
# ============================================================================


@pytest.mark.django_db
@patch(WAIT_FOR_DB_CONNECTIONS)
def test_wait_for_db_ready(patched_connections: MagicMock) -> None:
    """Tests waiting for the database.

    Case: database is ready.
    """
    # Mock the default connection's ensure_connection to succeed immediately
    patched_connections.__getitem__.return_value.ensure_connection = MagicMock()

    call_command("wait_for_db")

    # Verify ensure_connection was called
    patched_connections.__getitem__.assert_called_with("default")
    patched_connections.__getitem__.return_value.ensure_connection.assert_called_once()


@pytest.mark.django_db
@patch("time.sleep")
@patch(WAIT_FOR_DB_CONNECTIONS)
def test_wait_for_db_delay(
    patched_connections: MagicMock,
    patched_sleep: MagicMock,
) -> None:
    """Tests waiting for the database.

    Case: receiving an OperationalError.
    """
    # Mock to raise OperationalError 5 times, then succeed
    patched_connections.__getitem__.return_value.ensure_connection.side_effect = (
        [OperationalError] * 5 + [None]  # Success on 6th attempt
    )

    call_command("wait_for_db")

    # Verify ensure_connection was called 6 times
    assert patched_connections.__getitem__.return_value.ensure_connection.call_count == 6
    # Verify sleep was called 5 times (once per OperationalError retry)
    assert patched_sleep.call_count == 5


@pytest.mark.parametrize("log_level", ["DEBUG", "INVALID_LEVEL"])
def test_export_openapi_schema_writes_only_json_to_stdout(log_level: str) -> None:
    """The schema export's stdout is the schema alone, even with debug logging on stdout.

    The development stack runs with DEBUG on and a DEBUG console handler writing to stdout,
    and building the API logs while the command loads, so anything logged then would
    corrupt the schema that type generation reads. A fresh interpreter loads the API the
    way a real invocation does; inside this test process it is already imported.
    """
    env = {
        **os.environ,
        "DEBUG": "True",
        "DJANGO_LOG_LEVEL": log_level,
        "DJANGO_CONSOLE_LOG_LEVEL": "DEBUG",
    }
    env.pop("TESTING", None)

    result = subprocess.run(
        [sys.executable, "manage.py", "export_openapi_schema"],
        cwd=Path(__file__).resolve().parents[3],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    schema = json.loads(result.stdout)
    assert schema["openapi"].startswith("3.")
    if log_level == "INVALID_LEVEL":
        assert "Invalid DJANGO_LOG_LEVEL" in result.stderr


@pytest.mark.django_db
@override_settings(SITE_DOMAIN="staging.example.com")
def test_configure_site_updates_the_deployment_site_and_is_idempotent() -> None:
    Site.objects.update_or_create(
        pk=settings.SITE_ID, defaults={"domain": "old.example.com", "name": "Old name"}
    )
    first = StringIO()
    call_command("configure_site", stdout=first)
    site = Site.objects.get(pk=settings.SITE_ID)
    assert site.domain == "staging.example.com"
    assert site.name == "CineXplorer"
    assert first.getvalue().startswith("CHANGED:")
    second = StringIO()
    call_command("configure_site", stdout=second)
    assert second.getvalue().startswith("UNCHANGED:")


@pytest.mark.django_db
@override_settings(ENVIRONMENT="staging", SITE_DOMAIN=None)
def test_configure_site_requires_deployed_site_domain() -> None:
    before = list(Site.objects.values_list("id", "domain", "name"))
    with pytest.raises(CommandError, match="SITE_DOMAIN"):
        call_command("configure_site")
    assert list(Site.objects.values_list("id", "domain", "name")) == before


@pytest.mark.parametrize(
    ("environment", "expected"), [("development", "localhost:8444"), ("staging", None)]
)
def test_site_domain_settings_default(environment: str, expected: str | None) -> None:
    from apps.core.tests.test_helpers import load_settings

    values = load_settings(
        {
            "ENVIRONMENT": environment,
            "DEBUG": "False",
            "DJANGO_ALLOWED_HOSTS": "testserver",
            "SITE_DOMAIN": None,
            "GOOGLE_CLIENT_ID": None,
            "GOOGLE_CLIENT_SECRET": None,
            "GITHUB_CLIENT_ID": None,
            "GITHUB_CLIENT_SECRET": None,
        },
        ["SITE_DOMAIN"],
    )
    assert "error" not in values
    assert "SITE_DOMAIN" in values
    assert values["SITE_DOMAIN"] == expected
