"""Real test-settings logging configuration and emitted output."""

import pytest

from apps.core.tests.test_helpers import load_settings

_EMIT_LOGS = """
import contextlib
import io
import logging
import logging.config

stdout = io.StringIO()
stderr = io.StringIO()
with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
    test_settings = importlib.import_module("config.settings_test")
    logging.config.dictConfig(test_settings.LOGGING)
    logging.getLogger("cinexplorer").info("application-info-marker")
    logging.getLogger("cinexplorer").error("application-error-marker")
    logging.getLogger("django.db.backends").error("database-error-marker")
    logging.getLogger("django.db.backends").critical("database-critical-marker")
    logging.getLogger("cinexplorer.requests").error("request-error-marker")
    logging.getLogger("cinexplorer.requests").critical("request-critical-marker")
captured_stdout = stdout.getvalue()
captured_stderr = stderr.getvalue()
logging.shutdown()
"""


def _read_logging(console_level: str = "ERROR") -> dict[str, object]:
    return load_settings(
        {
            "ENVIRONMENT": "development",
            "DEBUG": "False",
            "TESTING": "True",
            "DJANGO_LOG_LEVEL": "DEBUG",
            "DJANGO_CONSOLE_LOG_LEVEL": console_level,
        },
        ["config.settings_test.LOGGING", "captured_stdout", "captured_stderr"],
        before_import=_EMIT_LOGS,
    )


def test_logging_configuration_exists() -> None:
    config = _read_logging()["config.settings_test.LOGGING"]
    assert isinstance(config, dict)
    assert config["version"] == 1
    for name in ["handlers", "loggers", "formatters"]:
        assert isinstance(config[name], dict)


@pytest.mark.parametrize(("console_level", "info_visible"), [("ERROR", False), ("INFO", True)])
def test_console_level_controls_info_output(console_level: str, info_visible: bool) -> None:
    values = _read_logging(console_level)
    stdout, stderr = values["captured_stdout"], values["captured_stderr"]
    assert isinstance(stdout, str)
    assert isinstance(stderr, str)
    assert "application-error-marker" in stdout
    assert ("application-info-marker" in stdout) is info_visible
    assert "application-info-marker" not in stderr


@pytest.mark.parametrize("prefix", ["database", "request"])
def test_noisy_loggers_are_suppressed(prefix: str) -> None:
    values = _read_logging()
    stdout, stderr = values["captured_stdout"], values["captured_stderr"]
    assert isinstance(stdout, str)
    assert isinstance(stderr, str)
    assert "application-error-marker" in stdout
    assert prefix + "-error-marker" not in stdout + stderr
    assert prefix + "-critical-marker" not in stdout + stderr


def test_testing_flag_is_set() -> None:
    values = load_settings(
        {"ENVIRONMENT": "development", "DEBUG": "False"}, ["config.settings_test.TESTING"]
    )
    assert values["config.settings_test.TESTING"] is True
