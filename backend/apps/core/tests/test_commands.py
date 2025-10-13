"""
Tests for the custom Django management commands module.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.db.utils import OperationalError

# ============================================================================
# Management Command Tests
# ============================================================================


@pytest.mark.django_db
@patch("core.management.commands.wait_for_db.connections")
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
@patch("core.management.commands.wait_for_db.connections")
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
    assert (
        patched_connections.__getitem__.return_value.ensure_connection.call_count == 6
    )
