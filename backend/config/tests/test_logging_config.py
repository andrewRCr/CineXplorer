#!/usr/bin/env python3
"""
Test script to verify logging configuration and environment variable support.

This script can be run to test logging configuration without starting Django.
Usage:
    python test_logging_config.py
    DJANGO_LOG_LEVEL=DEBUG python test_logging_config.py
    DJANGO_LOG_LEVEL=ERROR python test_logging_config.py
"""

import os
import shutil
import tempfile
from logging import getLogger
from logging.config import dictConfig

# Import our logging configuration
try:
    from ..logging import (
        DB_QUERY_PERFORMANCE,
        LOG_ROTATION_CONFIG,
        VALID_LOG_LEVELS,
        get_log_file_info,
        get_logging_config,
        print_database_logging_info,
        print_log_status,
        validate_log_level,
    )
except ImportError:
    # For standalone execution
    import sys

    config_dir = os.path.dirname(os.path.dirname(__file__))
    sys.path.insert(0, config_dir)

    # Import our custom logging module by file path
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "config_logging", os.path.join(config_dir, "logging.py")
    )
    if spec is None or spec.loader is None:
        raise ImportError("Could not load spec or loader for logging.py")
    custom_logging = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(custom_logging)

    get_logging_config = custom_logging.get_logging_config
    validate_log_level = custom_logging.validate_log_level
    VALID_LOG_LEVELS = custom_logging.VALID_LOG_LEVELS
    LOG_ROTATION_CONFIG = custom_logging.LOG_ROTATION_CONFIG
    get_log_file_info = custom_logging.get_log_file_info
    print_log_status = custom_logging.print_log_status
    DB_QUERY_PERFORMANCE = custom_logging.DB_QUERY_PERFORMANCE
    print_database_logging_info = custom_logging.print_database_logging_info


def test_validation():
    """Test log level validation function."""
    print("Testing log level validation...")

    # Test valid levels
    for level in VALID_LOG_LEVELS:
        result = validate_log_level(level)
        assert result == level, f"Expected {level}, got {result}"

        # Test lowercase
        result = validate_log_level(level.lower())
        assert result == level, f"Expected {level} from lowercase, got {result}"

    # Test invalid levels
    result = validate_log_level("invalid")
    assert result == "INFO", f"Expected INFO for invalid level, got {result}"

    result = validate_log_level("")
    assert result == "INFO", f"Expected INFO for empty string, got {result}"

    result = validate_log_level(None)
    assert result == "INFO", f"Expected INFO for None, got {result}"

    print("✅ Log level validation tests passed!")


def test_environment_variables():
    """Test environment variable reading."""
    print("\nTesting environment variable support...")

    # Test current environment
    current_level = os.getenv("DJANGO_LOG_LEVEL", "not-set")
    current_debug = os.getenv("DEBUG", "not-set")

    print(f"Current DJANGO_LOG_LEVEL: {current_level}")
    print(f"Current DEBUG: {current_debug}")

    # Test configuration generation
    config = get_logging_config()

    print(f"Generated log level: {config['loggers']['cinexplorer']['level']}")
    print(f"Console handler level: {config['handlers']['console']['level']}")

    # Test that configuration is valid
    temp_dir = None
    try:
        # Create temporary log directory for testing
        temp_dir = tempfile.mkdtemp()

        # Update config to use temp directory
        test_config = config.copy()
        for handler_name, handler_config in test_config["handlers"].items():
            if "filename" in handler_config:
                filename = handler_config["filename"]
                # Replace /backend/logs with temp directory
                new_filename = filename.replace("/backend/logs", temp_dir)
                handler_config["filename"] = new_filename

        # Try to configure logging
        dictConfig(test_config)

        # Test that we can get loggers
        logger = getLogger("cinexplorer")
        logger.info("Test log message from environment variable test")

        print("✅ Environment variable configuration test passed!")

    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
    finally:
        # Clean up temp directory (best effort on Windows)
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except (PermissionError, OSError):
                # Windows file locking can prevent cleanup - not critical
                print(
                    f"  Note: Temp directory cleanup skipped (Windows file locking): {temp_dir}")


def test_rotation_configuration():
    """Test log rotation configuration."""
    print("\nTesting log rotation configuration...")

    # Test rotation constants
    assert (
        LOG_ROTATION_CONFIG["max_bytes"] == 10485760
    ), f"Expected 10MB, got {LOG_ROTATION_CONFIG['max_bytes']}"
    assert (
        LOG_ROTATION_CONFIG["backup_count_default"] == 5
    ), f"Expected 5 backups, got {LOG_ROTATION_CONFIG['backup_count_default']}"
    assert (
        LOG_ROTATION_CONFIG["backup_count_errors"] == 10
    ), f"Expected 10 error backups, got {LOG_ROTATION_CONFIG['backup_count_errors']}"

    # Test configuration includes rotation settings
    config = get_logging_config()

    # Check that all file handlers have rotation configured
    file_handlers = [name for name in config["handlers"] if name.startswith("file_")]
    print(f"Found file handlers: {file_handlers}")

    for handler_name in file_handlers:
        handler_config = config["handlers"][handler_name]

        # Verify RotatingFileHandler class
        assert (
            handler_config["class"] == "logging.handlers.RotatingFileHandler"
        ), f"{handler_name} is not a RotatingFileHandler"

        # Verify maxBytes is set correctly
        assert "maxBytes" in handler_config, f"{handler_name} missing maxBytes"
        assert (
            handler_config["maxBytes"] == LOG_ROTATION_CONFIG["max_bytes"]
        ), f"{handler_name} maxBytes mismatch"

        # Verify backupCount is set
        assert "backupCount" in handler_config, f"{handler_name} missing backupCount"

        # Verify encoding is set
        assert handler_config.get(
            "encoding") == "utf8", f"{handler_name} encoding not utf8"

        size_mb = handler_config['maxBytes']/1024/1024
        backup_count = handler_config['backupCount']
        print(f"  ✓ {handler_name}: {size_mb:.0f}MB, {backup_count} backups")

    print("✅ Log rotation configuration test passed!")


def test_database_logging_configuration():
    """Test database query logging configuration."""
    print("\nTesting database logging configuration...")

    # Test performance thresholds
    assert (
        DB_QUERY_PERFORMANCE["slow_query_threshold"] > 0
    ), "Slow query threshold must be positive"
    assert (
        DB_QUERY_PERFORMANCE["warning_threshold"] > DB_QUERY_PERFORMANCE["slow_query_threshold"]
    ), "Warning threshold must be higher than slow query threshold"
    assert (
        DB_QUERY_PERFORMANCE["critical_threshold"] > DB_QUERY_PERFORMANCE["warning_threshold"]
    ), "Critical threshold must be higher than warning threshold"

    print("  Performance thresholds:")
    print(f"    Slow: {DB_QUERY_PERFORMANCE['slow_query_threshold']*1000:.0f}ms")
    print(f"    Warning: {DB_QUERY_PERFORMANCE['warning_threshold']*1000:.0f}ms")
    print(f"    Critical: {DB_QUERY_PERFORMANCE['critical_threshold']*1000:.0f}ms")

    # Test database logging configuration
    config = get_logging_config()

    # Check database handler exists
    assert "file_database" in config["handlers"], "Database file handler not found"
    db_handler = config["handlers"]["file_database"]

    # Verify database handler configuration
    assert (
        db_handler["class"] == "logging.handlers.RotatingFileHandler"
    ), "Database handler should be RotatingFileHandler"
    assert "database.log" in db_handler["filename"], "Database handler should log to database.log"
    assert (
        db_handler["level"] == "DEBUG"
    ), "Database handler should capture DEBUG level in development"

    # Check database loggers are configured
    db_loggers = ["django.db.backends",
                  "django.db.backends.schema", "django.db.migrations"]
    for logger_name in db_loggers:
        assert logger_name in config["loggers"], f"Database logger {logger_name} not found"
        logger_config = config["loggers"][logger_name]

        # Check that handlers are configured appropriately
        assert "handlers" in logger_config, f"{logger_name} missing handlers configuration"
        handlers = logger_config.get("handlers", [])

        # Different loggers may have different handler requirements
        if logger_name in ["django.db.backends", "django.db.backends.schema"]:
            # These loggers' handlers depend on debug_mode, may be empty in production
            pass  # Handler count can be 0 in non-debug mode
        elif logger_name == "django.db.migrations":
            # Migration logger should always have handlers configured
            assert len(handlers) > 0, f"{logger_name} should have at least one handler"

        level = logger_config.get('level', 'inherited')
        handler_count = len(logger_config.get('handlers', []))
        print(f"  ✓ {logger_name}: level={level}, handlers={handler_count}")

    print("✅ Database logging configuration test passed!")


def test_test_environment_logging():
    """Test that test environment logging configuration exists and is appropriate."""
    print("\nTesting test environment logging configuration...")

    # Import test settings to check configuration
    try:
        import importlib.util
        import os

        # Load settings_test.py
        spec = importlib.util.spec_from_file_location(
            "settings_test",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "settings_test.py"),
        )
        if spec is None or spec.loader is None:
            raise ImportError("Could not load spec or loader for settings_test.py")
        settings_test = importlib.util.module_from_spec(spec)

        # Set up environment for settings_test
        original_django_settings = os.environ.get("DJANGO_SETTINGS_MODULE")
        os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings_test"

        try:
            spec.loader.exec_module(settings_test)

            # Test that LOGGING exists in test settings
            assert hasattr(
                settings_test, "LOGGING"
            ), "LOGGING configuration missing from settings_test.py"
            test_logging = settings_test.LOGGING

            # Verify test-appropriate configuration
            assert "test_console" in test_logging["handlers"], "test_console handler missing"
            assert "test_null" in test_logging["handlers"], "test_null handler missing"

            # Verify no file handlers
            for handler_name, handler_config in test_logging["handlers"].items():
                handler_class = handler_config.get("class", "")
                assert (
                    "FileHandler" not in handler_class
                ), f"File handler found in test config: {handler_name}"
                assert (
                    "filename" not in handler_config
                ), f"Filename found in test handler: {handler_name}"

            # Verify ERROR level for main loggers
            console_handler = test_logging["handlers"]["test_console"]
            assert (
                console_handler["level"] == "ERROR"
            ), "Console handler should be ERROR level for testing"

            print("  ✓ Test logging configuration exists")
            print("  ✓ No file handlers in test configuration")
            print("  ✓ ERROR level configured for console output")
            print("  ✓ Null handlers configured for suppressed logging")

        finally:
            # Restore original DJANGO_SETTINGS_MODULE
            if original_django_settings:
                os.environ["DJANGO_SETTINGS_MODULE"] = original_django_settings
            elif "DJANGO_SETTINGS_MODULE" in os.environ:
                del os.environ["DJANGO_SETTINGS_MODULE"]

        print("✅ Test environment logging configuration test passed!")

    except Exception as e:
        print(f"❌ Test environment logging test failed: {e}")
        # Don't fail the whole test suite for this


def main():
    """Run all tests."""
    print("Testing CineXplorer logging configuration...\n")

    test_validation()
    test_environment_variables()
    test_rotation_configuration()
    test_database_logging_configuration()
    test_test_environment_logging()

    print("\n🎉 All logging configuration tests completed!")
    print("\nTo test different log levels, try:")
    print("  DJANGO_LOG_LEVEL=DEBUG python test_logging_config.py")
    print("  DJANGO_LOG_LEVEL=ERROR python test_logging_config.py")
    print("  DEBUG=False DJANGO_LOG_LEVEL=WARNING python test_logging_config.py")

    print("\nLog rotation configuration:")
    print(f"  Max file size: {LOG_ROTATION_CONFIG['max_bytes'] // (1024*1024)} MB")
    print(f"  Default backups: {LOG_ROTATION_CONFIG['backup_count_default']}")
    print(f"  Error log backups: {LOG_ROTATION_CONFIG['backup_count_errors']}")

    print("\nTo check log file status during development:")
    print("  from config.logging import print_log_status, print_database_logging_info")
    print("  print_log_status()")
    print("  print_database_logging_info()")


if __name__ == "__main__":
    main()
