"""
Tests for the custom Django management commands module.
"""

from unittest.mock import patch
from psycopg import OperationalError as PsycopgError
from django.db.utils import OperationalError
from django.core.management import call_command
from django.test import SimpleTestCase


@patch("core.management.commands.wait_for_db.Command.check")
class CommandTests(SimpleTestCase):
    """ Tests commands. """

    def test_wait_for_db_ready(self, patched_check):
        """ Tests waiting for the database.
            Case: database is ready. """

        patched_check.return_value = True
        call_command("wait_for_db")

        patched_check.assert_called_once_with(databases=["default"])

    @patch("time.sleep")
    def test_wait_for_db_delay(self, patched_sleep, patched_check):
        """ Tests waiting for the database.
            Case: receiving an OperationalError (both types). """

        # simulates the first five attempts to connect to the database.
        # first two attempts: database likely not yet initialized; raise PsycopgError
        # next three attempts: db can accept connections, but test db not yet setup;
        # raise Django OperationalError
        # finally, sixth attempt succeeds.
        patched_check.side_effect = (
            [PsycopgError] * 2 +
            [OperationalError] * 3 +
            [True]
        )
        call_command("wait_for_db")

        self.assertEqual(patched_check.call_count, 6)
        patched_check.assert_called_with(databases=["default"])
