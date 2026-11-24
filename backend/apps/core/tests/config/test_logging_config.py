"""Logging configuration, validation and environment contracts."""

from typing import cast

import pytest

from apps.core.tests.test_helpers import load_settings
from config.logging import DB_QUERY_PERFORMANCE, LOG_ROTATION_CONFIG, validate_log_level


def _object_dict(value: object) -> dict[str, object]:
    assert isinstance(value, dict)
    return cast(dict[str, object], value)


@pytest.mark.parametrize("level", ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
def test_validation(level: str) -> None:
    assert validate_log_level(level) == level
    assert validate_log_level(level.lower()) == level


@pytest.mark.parametrize("level", ["invalid", "", None])
def test_invalid_level_defaults_to_info(level: str | None) -> None:
    assert validate_log_level(level) == "INFO"


@pytest.mark.parametrize(
    ("debug", "log_level", "console_level"),
    [("False", "WARNING", "ERROR"), ("True", "ERROR", "INFO")],
)
def test_environment_variables(debug: str, log_level: str, console_level: str) -> None:
    values = load_settings(
        {
            "ENVIRONMENT": "development",
            "DEBUG": debug,
            "TESTING": "True",
            "DJANGO_LOG_LEVEL": log_level,
            "DJANGO_CONSOLE_LOG_LEVEL": console_level,
        },
        ["config.settings_test.LOGGING"],
    )
    config = _object_dict(values["config.settings_test.LOGGING"])
    loggers = _object_dict(config["loggers"])
    handlers = _object_dict(config["handlers"])
    assert _object_dict(loggers["cinexplorer"])["level"] == log_level
    assert _object_dict(handlers["console"])["level"] == console_level


def test_rotation_configuration() -> None:
    assert LOG_ROTATION_CONFIG["max_bytes"] == 10 * 1024 * 1024
    assert LOG_ROTATION_CONFIG["backup_count_default"] == 5
    assert LOG_ROTATION_CONFIG["backup_count_errors"] == 10

    values = load_settings({"ENVIRONMENT": "development", "DEBUG": "False"}, ["LOGGING"])
    config = _object_dict(values["LOGGING"])
    handlers = _object_dict(config["handlers"])
    expected_backups = {
        "file_app": 5,
        "file_django": 5,
        "file_requests": 5,
        "file_errors": 10,
        "file_database": 5,
    }
    assert expected_backups.keys() <= handlers.keys()
    for name, backups in expected_backups.items():
        handler = _object_dict(handlers[name])
        assert handler["class"] == "logging.handlers.RotatingFileHandler"
        assert handler["maxBytes"] == 10 * 1024 * 1024
        assert handler["backupCount"] == backups
        assert handler["encoding"] == "utf8"


def test_database_logging_configuration() -> None:
    assert DB_QUERY_PERFORMANCE["slow_query_threshold"] > 0
    assert DB_QUERY_PERFORMANCE["warning_threshold"] > DB_QUERY_PERFORMANCE["slow_query_threshold"]
    assert DB_QUERY_PERFORMANCE["critical_threshold"] > DB_QUERY_PERFORMANCE["warning_threshold"]

    values = load_settings({"ENVIRONMENT": "development", "DEBUG": "False"}, ["LOGGING"])
    config = _object_dict(values["LOGGING"])
    handler = _object_dict(_object_dict(config["handlers"])["file_database"])
    assert handler["class"] == "logging.handlers.RotatingFileHandler"
    filename = handler["filename"]
    assert isinstance(filename, str)
    assert filename.endswith("/database.log")
    assert handler["level"] == "DEBUG"
    loggers = _object_dict(config["loggers"])
    for name in ["django.db.backends", "django.db.backends.schema", "django.db.migrations"]:
        assert name in loggers
        assert "handlers" in _object_dict(loggers[name])
    assert _object_dict(loggers["django.db.migrations"])["handlers"]


def test_test_environment_logging() -> None:
    values = load_settings(
        {
            "ENVIRONMENT": "development",
            "DEBUG": "False",
            "TESTING": "True",
            "DJANGO_CONSOLE_LOG_LEVEL": "ERROR",
        },
        ["config.settings_test.LOGGING"],
    )
    config = _object_dict(values["config.settings_test.LOGGING"])
    assert config["version"] == 1
    handlers = _object_dict(config["handlers"])
    assert _object_dict(handlers["console"])["class"] == "logging.StreamHandler"
    assert _object_dict(handlers["console"])["level"] == "ERROR"
    assert _object_dict(handlers["null"])["class"] == "logging.NullHandler"
    for value in handlers.values():
        handler = _object_dict(value)
        handler_class = handler["class"]
        assert isinstance(handler_class, str)
        assert "FileHandler" not in handler_class
        assert "filename" not in handler


def _development_access_log(
    path: str, status: int, *, version: str = "HTTP/1.1", server: str = "werkzeug"
) -> str:
    """Render one development access record through the development logging configuration.

    runserver_plus replaces Werkzeug's log method with one that formats the line itself.
    """
    values = load_settings(
        {"ENVIRONMENT": "development", "DEBUG": "True", "CI": "true"},
        ["captured"],
        before_import=f"""
import contextlib
import io
import logging
import logging.config
from werkzeug.serving import WSGIRequestHandler

stdout = io.StringIO()
extra = io.StringIO()
with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stdout):
    settings = importlib.import_module("config.settings")
    logging.config.dictConfig(settings.LOGGING)
    if {server!r} == "runserver_plus":
        import django
        from django_extensions.management.commands.runserver_plus import set_werkzeug_log_color
        django.setup()
        set_werkzeug_log_color()
    # runserver_plus adds its own handler to this logger after the configuration loads.
    logging.getLogger("werkzeug").addHandler(logging.StreamHandler(extra))
    handler = WSGIRequestHandler.__new__(WSGIRequestHandler)
    handler.client_address = ("127.0.0.1", 12345)
    handler.command = "GET"
    handler.path = {path!r}
    handler.request_version = {version!r}
    handler.requestline = "GET " + {path!r}
    handler.log_request({status}, 512)
    logging.shutdown()
captured = stdout.getvalue() + extra.getvalue()
""",
    )
    captured = values["captured"]
    assert isinstance(captured, str)
    return captured


@pytest.mark.parametrize("server", ["werkzeug", "runserver_plus"])
@pytest.mark.parametrize("status", [200, 302, 404, 500])
@pytest.mark.parametrize(
    "query",
    [
        "q=private-search",
        "q=private-search&_changelist_filters=q%3Dprivate-nested&page=2",
        # Werkzeug decodes non-ASCII characters first, so a query can hold a Unicode space.
        "q=private-search%E3%80%80private-tail",
        "next=/admin/?q=private-search",
    ],
)
def test_development_access_log_omits_the_query(status: int, query: str, server: str) -> None:
    output = _development_access_log(f"/admin/auth/user/?{query}", status, server=server)

    assert "private-" not in output
    # Both the configured handlers and one added later get the cut record.
    lines = [line for line in output.splitlines() if "/admin/auth/user/" in line]
    assert len(lines) == 2
    for line in lines:
        assert "GET /admin/auth/user/ HTTP/1.1" in line
        assert f" {status} 512" in line


def test_development_access_log_without_a_version_still_omits_the_query() -> None:
    output = _development_access_log("/admin/?q=private-search", 400, version="")

    assert "private-" not in output
    assert "GET /admin/" in output


@pytest.mark.parametrize("server", ["werkzeug", "runserver_plus"])
def test_development_access_log_keeps_a_request_without_a_query(server: str) -> None:
    output = _development_access_log("/api/movies/", 200, server=server)

    lines = [line for line in output.splitlines() if "/api/movies/" in line]
    assert len(lines) == 2
    for line in lines:
        assert '"GET /api/movies/ HTTP/1.1" 200 512' in line


def test_development_error_traceback_is_logged_whole() -> None:
    message = "Error on request:\\nTraceback: raise ValueError('why? really')\\nlast line"
    values = load_settings(
        {"ENVIRONMENT": "development", "DEBUG": "True", "CI": "true"},
        ["captured"],
        before_import=f"""
import contextlib
import io
import logging
import logging.config

stdout = io.StringIO()
with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stdout):
    settings = importlib.import_module("config.settings")
    logging.config.dictConfig(settings.LOGGING)
    logging.getLogger("werkzeug").error({message!r})
    logging.shutdown()
captured = stdout.getvalue()
""",
    )
    captured = values["captured"]
    assert isinstance(captured, str)
    assert "why? really" in captured
    assert "last line" in captured
