"""Django logging configuration for CineXplorer.

This module provides logging configuration that supports:
- Environment-based log levels (DJANGO_LOG_LEVEL)
- Multiple optimized formatters for different use cases:
  * console: Clean terminal output for development
  * development: Human-readable with timestamps
  * detailed: Verbose debugging information
  * production: Structured JSON for parsing/monitoring
  * error: Enhanced context for error tracking
- File rotation to manage disk usage
- Separate log files for apps, Django, requests, and errors
- Console + file dual logging for development workflow
- Stdout-only logging in staging and production, defaulting to INFO

Environment Variables:
    DJANGO_LOG_LEVEL: Set file logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
                     Controls verbosity of log files
                     Example: DJANGO_LOG_LEVEL=DEBUG

    DJANGO_CONSOLE_LOG_LEVEL: Set console logging level (separate from file level)
                             Controls verbosity of console output during development
                             Defaults to INFO when deployed or in debug mode; WARNING otherwise
                             Example: DJANGO_CONSOLE_LOG_LEVEL=WARNING

    DEBUG: Django debug mode (True/False)
          When True: defaults to DEBUG file level, INFO console level
          When False in development: INFO file level, WARNING console level

Usage Examples:
    # Clean console with detailed files
    DEBUG=True docker-compose up  # INFO console, DEBUG files

    # Very quiet console, normal file logging
    DEBUG=True DJANGO_CONSOLE_LOG_LEVEL=WARNING docker-compose up

    # Debug everything (noisy console)
    DEBUG=True DJANGO_CONSOLE_LOG_LEVEL=DEBUG docker-compose up

    # Production-like logging
    DEBUG=False DJANGO_LOG_LEVEL=INFO docker-compose up
"""

import logging
import os
import sys
from typing import TypedDict


class HealthCheckFilter(logging.Filter):
    """Custom filter to suppress health check requests from console output.

    This filter detects health check requests and prevents them from
    cluttering the console during development while preserving them
    in log files for debugging purposes.

    However, unhealthy health checks (4xx/5xx status codes) are allowed
    through as they indicate real problems that should be visible.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Check if this is a health check related message
        message = getattr(record, "getMessage", lambda: str(record.msg))()

        # Common health check patterns to detect
        health_check_patterns = [
            "/api/health-check/",
            "health-check",
            "GET /api/health-check",
            '"GET /api/health-check/',  # Werkzeug format
            "api/health-check",  # Our new format patterns
        ]

        # Check if this message is about a health check
        is_health_check = any(pattern in message for pattern in health_check_patterns)

        if not is_health_check:
            return True  # Not a health check, allow it through

        # This is a health check - only allow it if it indicates an error
        # Look for error status codes (4xx, 5xx) or error indicators
        error_indicators = [
            "❌",  # Our error emoji
            "⚠️",  # Our warning emoji
            " 4",  # Status codes 4xx
            " 5",  # Status codes 5xx
            "ERROR",
            "EXCEPTION",
            "CRITICAL",
            "WARNING",
        ]

        # Allow through if this health check message indicates an error
        # Return True if error indicators found, False otherwise (suppress healthy checks)
        return any(indicator in message for indicator in error_indicators)


# Valid log levels for environment variable validation
VALID_LOG_LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


# Type-safe log rotation configuration
class LogRotationConfig(TypedDict):
    """Type definition for log rotation configuration."""

    max_bytes: int
    backup_count_default: int
    backup_count_errors: int
    encoding: str


# Log rotation configuration with precise types
LOG_ROTATION_CONFIG: LogRotationConfig = {
    "max_bytes": 10 * 1024 * 1024,  # 10MB per file
    "backup_count_default": 5,  # Keep 5 backup files for most logs
    "backup_count_errors": 10,  # Keep 10 backup files for errors (more important)
    "encoding": "utf8",  # UTF-8 encoding for all log files
}

# Database query performance thresholds (in seconds)
DB_QUERY_PERFORMANCE = {
    "slow_query_threshold": 0.1,  # 100ms - log queries slower than this
    "warning_threshold": 0.5,  # 500ms - warn about very slow queries
    "critical_threshold": 2.0,  # 2s - critical slow queries
}

# Estimated storage usage per log type (for documentation)
LOG_STORAGE_ESTIMATES = {
    "cinexplorer.log": "~55MB (5 backups x 10MB + current)",
    "django.log": "~55MB (5 backups x 10MB + current)",
    "requests.log": "~55MB (5 backups x 10MB + current)",
    "database.log": "~55MB (5 backups x 10MB + current)",
    "errors.log": "~110MB (10 backups x 10MB + current)",
    "total_estimated": "~330MB maximum storage for all log files",
}


def validate_log_level(level: str | None) -> str:
    """Validate and normalize log level from environment variable.

    Args:
        level (str): Log level string to validate

    Returns:
        str: Valid log level or default 'INFO'
    """
    if level and level.upper() in VALID_LOG_LEVELS:
        return level.upper()

    # Log invalid level (but use print since logging isn't configured yet)
    if level:
        levels_str = ", ".join(VALID_LOG_LEVELS)
        print(
            f"Warning: Invalid DJANGO_LOG_LEVEL '{level}'. Using 'INFO'. "
            f"Valid levels: {levels_str}",
            file=sys.stderr,
        )

    return "INFO"


def _get_handlers_config(
    log_level: str,
    console_log_level: str,
    debug_mode: bool,
    disable_files: bool,
    is_testing: bool,
    log_dir: str,
) -> dict[str, dict[str, object]]:
    """Get handlers configuration, excluding file handlers in CI or minimal in testing."""
    handlers: dict[str, dict[str, object]] = {
        "console": {
            "class": "logging.StreamHandler",
            "level": console_log_level,
            "formatter": "console" if debug_mode else "production",
            "stream": "ext://sys.stdout",
            "filters": ["health_check_filter"],
        },
    }

    # Add null handler for testing environment (complete suppression)
    if is_testing:
        handlers["null"] = {
            "class": "logging.NullHandler",
        }
    # Only add file handlers if not in CI or testing environment
    if not disable_files and not is_testing:
        handlers.update(
            {
                "file_app": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": log_level,
                    "formatter": "production" if not debug_mode else "detailed",
                    "filename": f"{log_dir}/cinexplorer.log",
                    "maxBytes": LOG_ROTATION_CONFIG["max_bytes"],
                    "backupCount": LOG_ROTATION_CONFIG["backup_count_default"],
                    "encoding": LOG_ROTATION_CONFIG["encoding"],
                },
                "file_django": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "WARNING",
                    "formatter": "production" if not debug_mode else "detailed",
                    "filename": f"{log_dir}/django.log",
                    "maxBytes": LOG_ROTATION_CONFIG["max_bytes"],
                    "backupCount": LOG_ROTATION_CONFIG["backup_count_default"],
                    "encoding": LOG_ROTATION_CONFIG["encoding"],
                },
                "file_requests": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "INFO",
                    "formatter": "production" if not debug_mode else "detailed",
                    "filename": f"{log_dir}/requests.log",
                    "maxBytes": LOG_ROTATION_CONFIG["max_bytes"],
                    "backupCount": LOG_ROTATION_CONFIG["backup_count_default"],
                    "encoding": LOG_ROTATION_CONFIG["encoding"],
                },
                "file_errors": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "ERROR",
                    "formatter": "error",
                    "filename": f"{log_dir}/errors.log",
                    "maxBytes": LOG_ROTATION_CONFIG["max_bytes"],
                    "backupCount": LOG_ROTATION_CONFIG["backup_count_errors"],
                    "encoding": LOG_ROTATION_CONFIG["encoding"],
                },
                "file_database": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "DEBUG",
                    "formatter": "database" if debug_mode else "production",
                    "filename": f"{log_dir}/database.log",
                    "maxBytes": LOG_ROTATION_CONFIG["max_bytes"],
                    "backupCount": LOG_ROTATION_CONFIG["backup_count_default"],
                    "encoding": LOG_ROTATION_CONFIG["encoding"],
                },
            }
        )

    return handlers


def _get_loggers_config(
    log_level: str,
    console_log_level: str,
    debug_mode: bool,
    disable_files: bool,
    is_testing: bool,
) -> dict[str, dict[str, object]]:
    """Get loggers configuration, with console-only/minimal handlers based on environment."""
    loggers: dict[str, dict[str, object]] = {
        # Root logger - catches everything not specifically configured
        "": {
            "handlers": ["console"],
            "level": console_log_level,
            "propagate": False,
        },
        # CineXplorer application logger
        "cinexplorer": {
            "handlers": (
                ["console"]
                + (["file_app", "file_errors"] if not disable_files and not is_testing else [])
            ),
            "level": log_level,
            "propagate": False,
        },
        # Django framework loggers
        "django": {
            "handlers": (
                ["console"] + (["file_django"] if not disable_files and not is_testing else [])
            ),
            "level": "WARNING",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": (
                ["null"]
                if is_testing
                else (
                    (
                        ["console"]
                        + (["file_database"] if not disable_files and not is_testing else [])
                    )
                    if debug_mode
                    else []
                )
            ),
            "level": "DEBUG" if debug_mode else "WARNING",
            "propagate": False,
        },
        "django.db.backends.schema": {
            "handlers": (
                ["null"]
                if is_testing
                else (
                    (
                        ["console"]
                        + (["file_database"] if not disable_files and not is_testing else [])
                    )
                    if debug_mode
                    else []
                )
            ),
            "level": "INFO" if debug_mode else "WARNING",
            "propagate": False,
        },
        "django.db.migrations": {
            "handlers": (
                ["console"] + (["file_database"] if not disable_files and not is_testing else [])
            ),
            "level": "INFO",
            "propagate": False,
        },
        # Request/response logging
        "cinexplorer.requests": {
            "handlers": (
                ["null"]
                if is_testing
                else (
                    ["console"]
                    + (["file_requests"] if not disable_files and not is_testing else [])
                )
            ),
            "level": "INFO",
            "propagate": False,
        },
        # TMDB API logging
        "cinexplorer.tmdb": {
            "handlers": (
                ["console"] + (["file_app"] if not disable_files and not is_testing else [])
            ),
            # Enable DEBUG in development for detailed TMDB diagnostics
            "level": "DEBUG" if debug_mode else "INFO",
            "propagate": False,
        },
        # Movie service logging (including rating filter debugging)
        "cinexplorer.movie": {
            "handlers": (
                ["console"] + (["file_app"] if not disable_files and not is_testing else [])
            ),
            # Enable DEBUG in development for detailed service diagnostics
            "level": "DEBUG" if debug_mode else "INFO",
            "propagate": False,
        },
        # Werkzeug server logs
        "werkzeug": {
            "handlers": (
                ["console"] + (["file_app"] if not disable_files and not is_testing else [])
            ),
            "level": "INFO",
            "propagate": False,
            "filters": ["health_check_filter"] if debug_mode else [],
        },
    }

    # Add suppressed loggers only if not in CI or testing
    # (to avoid referencing non-existent file handlers)
    if not disable_files and not is_testing:
        loggers.update(
            {
                "watchdog": {
                    "handlers": ["file_app"],
                    "level": "WARNING",
                    "propagate": False,
                },
                "watchdog.observers": {
                    "handlers": [],
                    "level": "CRITICAL",
                    "propagate": False,
                },
                "debug_toolbar": {
                    "handlers": ["file_django"],
                    "level": "WARNING",
                    "propagate": False,
                },
                "urllib3": {
                    "handlers": ["file_app"],
                    "level": "WARNING",
                    "propagate": False,
                },
                "requests": {
                    "handlers": ["file_app"],
                    "level": "WARNING",
                    "propagate": False,
                },
            }
        )

    return loggers


def get_logging_config(
    log_dir: str | None = None, *, environment: str = "development"
) -> dict[str, object]:
    """Return Django logging configuration dictionary.

    Args:
        log_dir (str, optional): Directory for log files. If None, uses default.
        environment: Validated deployment environment from settings.

    Environment Variables:
    - DJANGO_LOG_LEVEL: Override default log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - DEBUG: Django debug mode affects some logging behavior
    - CI: If 'true', disables file logging to avoid permission issues

    Default Behavior:
    - DEBUG=True: Uses DEBUG level logging with detailed console output
    - DEBUG=False: Uses INFO level logging with production formatting
    - DJANGO_LOG_LEVEL always takes precedence if set
    - CI=True, staging and production: Only console logging, no file handlers
    - Staging and production: Console defaults to INFO
    """
    # Get environment variables with multiple environment detection methods
    debug_mode = os.getenv("DEBUG", "False").lower() == "true"

    # Check if we're in testing environment (takes precedence over CI)
    is_testing = (
        "test" in sys.argv
        or os.getenv("TESTING", "False").lower() == "true"
        or "pytest" in sys.modules
        or "unittest" in sys.modules
    )

    # Multiple ways to detect CI environment
    is_ci = (
        os.getenv("CI", "False").lower() == "true"
        or os.getenv("GITHUB_ACTIONS", "False").lower() == "true"
        or os.getenv("CONTINUOUS_INTEGRATION", "False").lower() == "true"
        or bool(os.getenv("BUILD_NUMBER"))  # Jenkins
    ) and not is_testing  # CI detection only applies if not testing

    disable_files = is_ci or environment in ("staging", "production")

    # Debug output for CI/testing detection (only when relevant to avoid noise in dev)
    # Use stderr to avoid corrupting stdout-based outputs (e.g., OpenAPI schema export)
    if is_testing:
        print(
            "Testing environment detected. Using minimal logging for clean test output.",
            file=sys.stderr,
        )
    elif is_ci:
        print("CI environment detected. Environment variables:", file=sys.stderr)
        print(f"  CI={os.getenv('CI')}", file=sys.stderr)
        print(f"  GITHUB_ACTIONS={os.getenv('GITHUB_ACTIONS')}", file=sys.stderr)
        print("  Disabling file logging handlers.", file=sys.stderr)
    default_level = "DEBUG" if debug_mode else "INFO"
    raw_log_level = os.getenv("DJANGO_LOG_LEVEL", default_level)
    log_level = validate_log_level(raw_log_level)

    # Console log level - more conservative for development usability
    # Can be overridden with DJANGO_CONSOLE_LOG_LEVEL for specific console control
    console_default = (
        "INFO" if debug_mode or environment in ("staging", "production") else "WARNING"
    )
    raw_console_level = os.getenv("DJANGO_CONSOLE_LOG_LEVEL", console_default)
    console_log_level = validate_log_level(raw_console_level)

    # Base directory for log files (not used in CI or testing)
    if log_dir is None:
        log_dir = "/backend/logs"

    # Ensure log directory exists before creating handlers (unless in CI/testing)
    if not disable_files and not is_testing:
        os.makedirs(log_dir, mode=0o755, exist_ok=True)

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            # Development formatter - human-readable, colorful output for terminal
            "development": {
                "format": "[{asctime}] {levelname:8s} {name}: {message}",
                "style": "{",
                "datefmt": "%H:%M:%S",  # Shorter time format for development
            },
            # Production formatter - structured JSON for parsing and monitoring
            "production": {
                "format": (
                    '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
                    '"logger": "%(name)s", "message": "%(message)s", '
                    '"module": "%(module)s", "function": "%(funcName)s", "line": %(lineno)d}'
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            # Detailed formatter - verbose output for debugging
            "detailed": {
                "format": (
                    "[{asctime}] {levelname:8s} {name} | "
                    "{funcName}() in {filename}:{lineno} | {message}"
                ),
                "style": "{",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            # Console formatter - clean output optimized for terminal reading
            "console": {
                "format": "{levelname:8s} | {name:20s} | {message}",
                "style": "{",
            },
            # Error formatter - includes extra context for errors
            "error": {
                "format": (
                    "[{asctime}] {levelname:8s} {name} | "
                    "{pathname}:{lineno} in {funcName}() | {message}"
                ),
                "style": "{",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            # Database formatter - optimized for SQL query logging
            "database": {
                "format": "[{asctime}] DB-{levelname:5s} | {message}",
                "style": "{",
                "datefmt": "%H:%M:%S",  # Simple time format for database logs
            },
        },
        "filters": {
            "health_check_filter": {
                "()": "config.logging.HealthCheckFilter",
            },
        },
        "handlers": _get_handlers_config(
            log_level, console_log_level, debug_mode, disable_files, is_testing, log_dir
        ),
        "loggers": _get_loggers_config(
            log_level, console_log_level, debug_mode, disable_files, is_testing
        ),
    }


# Create logger instances for easy import
def get_logger(name: str = "cinexplorer") -> logging.Logger:
    """Get a logger instance for the specified name.

    Args:
        name (str): Logger name, defaults to 'cinexplorer'

    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)


# Convenience loggers for common use cases
app_logger = get_logger("cinexplorer")
request_logger = get_logger("cinexplorer.requests")
tmdb_logger = get_logger("cinexplorer.tmdb")
db_logger = get_logger("django.db.backends")


def demo_formatters():
    """Demonstrate different formatter outputs.

    This function can be called during development to see how different
    formatters render the same log message. Useful for testing and
    formatter configuration validation.
    """
    import logging

    # Create test message
    test_record = logging.LogRecord(
        name="cinexplorer.test",
        level=logging.INFO,
        pathname="/backend/apps/test.py",
        lineno=42,
        msg="Sample log message for formatter demonstration",
        args=(),
        exc_info=None,
        func="demo_function",
    )

    config = get_logging_config()
    formatters = config["formatters"]
    print("\n=== Formatter Demonstration ===")
    for formatter_name, formatter_config in formatters.items():
        # Create formatter instance
        if "style" in formatter_config:
            formatter = logging.Formatter(
                formatter_config["format"],
                formatter_config.get("datefmt"),
                formatter_config["style"],
            )
        else:
            formatter = logging.Formatter(
                formatter_config["format"], formatter_config.get("datefmt")
            )

        # Format the test record
        formatted_message = formatter.format(test_record)
        print(f"\n{formatter_name.upper()}:")
        print(f"  {formatted_message}")
    print("\n=== End Demonstration ===\n")


def get_log_file_info(log_dir: str = "/backend/logs") -> dict[str, object]:
    """Get information about current log files and their sizes.

    Args:
        log_dir (str): Directory containing log files

    Returns:
        dict: Dictionary containing log file information
    """
    import glob
    import os

    info: dict[str, object] = {
        "log_directory": log_dir,
        "files": [],
        "total_size_mb": 0,
        "rotation_config": LOG_ROTATION_CONFIG,
        "storage_estimates": LOG_STORAGE_ESTIMATES,
    }
    if not os.path.exists(log_dir):
        info["status"] = "Log directory does not exist yet"
        return info
    # Find all log files (including rotated ones)
    log_patterns = ["*.log", "*.log.*"]
    all_files = []

    for pattern in log_patterns:
        all_files.extend(glob.glob(os.path.join(log_dir, pattern)))
    total_size: float = 0.0
    for file_path in sorted(all_files):
        try:
            size_bytes = os.path.getsize(file_path)
            size_mb = size_bytes / (1024 * 1024)
            total_size += size_mb
            info["files"].append(
                {
                    "name": os.path.basename(file_path),
                    "size_mb": round(size_mb, 2),
                    "size_bytes": size_bytes,
                    "is_current": "." not in os.path.basename(file_path)[4:],
                }
            )
        except OSError:
            continue
    info["total_size_mb"] = round(total_size, 2)
    files_list = info["files"]
    if not isinstance(files_list, list):
        raise TypeError("files should be a list")
    info["file_count"] = len(files_list)
    return info


def print_log_status(log_dir: str = "/backend/logs") -> None:
    """Print a formatted summary of log file status.

    Args:
        log_dir (str): Directory containing log files
    """
    info = get_log_file_info(log_dir)
    print("\n=== Log File Status ===")
    print(f"Directory: {info['log_directory']}")
    if "status" in info:
        print(f"Status: {info['status']}")
        return
    print(f"Total Files: {info['file_count']}")
    print(f"Total Size: {info['total_size_mb']:.2f} MB")
    # Group files by type
    file_groups: dict[str, list[dict[str, object]]] = {}
    files_list = info["files"]
    if not isinstance(files_list, list):
        raise TypeError("files should be a list")
    for file_info in files_list:
        base_name = file_info["name"].split(".")[0] + ".log"
        if base_name not in file_groups:
            file_groups[base_name] = []
        file_groups[base_name].append(file_info)
    print("\nFiles by type:")
    for base_name, files in file_groups.items():
        current_files = [f for f in files if f["is_current"]]
        rotated_files = [f for f in files if not f["is_current"]]
        total_size = sum(
            float(f["size_mb"]) if isinstance(f["size_mb"], (int, float)) else 0.0 for f in files
        )
        print(f"  {base_name}:")
        print(f"    Total size: {total_size:.2f} MB")
        print(f"    Current: {len(current_files)} file(s)")
        print(f"    Rotated: {len(rotated_files)} backup(s)")
    print("\nRotation Configuration:")
    max_bytes = LOG_ROTATION_CONFIG["max_bytes"]
    print(f"  Max file size: {max_bytes / (1024 * 1024):.0f} MB")
    print(f"  Default backups: {LOG_ROTATION_CONFIG['backup_count_default']}")
    print(f"  Error log backups: {LOG_ROTATION_CONFIG['backup_count_errors']}")
    print("\nEstimated maximum storage:")
    for log_type, estimate in LOG_STORAGE_ESTIMATES.items():
        if log_type != "total_estimated":
            print(f"  {log_type}: {estimate}")
    total_est = LOG_STORAGE_ESTIMATES["total_estimated"]
    print(f"\nTotal estimated maximum: {total_est}")
    print("=========================\n")


def log_slow_query(
    query_sql: str, query_time: float, params: tuple[object, ...] | None = None
) -> None:
    """Log slow database queries with performance analysis.

    Args:
        query_sql (str): The SQL query that was executed
        query_time (float): Query execution time in seconds
        params (tuple): Query parameters (optional)
    """
    import logging

    db_logger = logging.getLogger("django.db.backends")
    # Determine log level based on query performance
    if query_time >= DB_QUERY_PERFORMANCE["critical_threshold"]:
        level = logging.CRITICAL
        category = "CRITICAL SLOW"
    elif query_time >= DB_QUERY_PERFORMANCE["warning_threshold"]:
        level = logging.WARNING
        category = "SLOW"
    elif query_time >= DB_QUERY_PERFORMANCE["slow_query_threshold"]:
        level = logging.INFO
        category = "SLOW"
    else:
        level = logging.DEBUG
        category = "FAST"
    # Clean up SQL for logging (remove extra whitespace, limit length)
    clean_sql = " ".join(query_sql.split())
    if len(clean_sql) > 200:
        clean_sql = clean_sql[:200] + "..."
    # Format query time
    time_ms = query_time * 1000
    # Create log message
    log_message = f"{category} QUERY ({time_ms:.2f}ms): {clean_sql}"
    if params:
        # Only log first few parameters to avoid noise
        param_str = str(params)[:100]
        if len(str(params)) > 100:
            param_str += "..."
        log_message += f" | PARAMS: {param_str}"
    db_logger.log(level, log_message)


def get_database_performance_summary():
    """Get summary of database performance thresholds for monitoring.

    Returns:
        dict: Database performance configuration and thresholds
    """
    return {
        "thresholds_ms": {
            "slow_query": DB_QUERY_PERFORMANCE["slow_query_threshold"] * 1000,
            "warning": DB_QUERY_PERFORMANCE["warning_threshold"] * 1000,
            "critical": DB_QUERY_PERFORMANCE["critical_threshold"] * 1000,
        },
        "thresholds_seconds": DB_QUERY_PERFORMANCE,
        "logging_levels": {
            "fast_queries": "DEBUG (not logged by default)",
            "slow_queries": (
                f"INFO (>{DB_QUERY_PERFORMANCE['slow_query_threshold'] * 1000:.0f}ms)"
            ),
            "warning_queries": (
                f"WARNING (>{DB_QUERY_PERFORMANCE['warning_threshold'] * 1000:.0f}ms)"
            ),
            "critical_queries": (
                f"CRITICAL (>{DB_QUERY_PERFORMANCE['critical_threshold'] * 1000:.0f}ms)"
            ),
        },
        "recommendations": {
            "development": "Enable DEBUG logging to see all queries",
            "production": "Use INFO or WARNING to only log slow queries",
            "optimization": "Queries over 100ms should be reviewed for optimization",
        },
    }


def print_database_logging_info():
    """Print formatted information about database logging configuration."""
    perf_summary = get_database_performance_summary()
    print("\n=== Database Logging Configuration ===")
    print("Performance Thresholds:")
    for category, time_ms in perf_summary["thresholds_ms"].items():
        formatted_name = category.replace("_", " ").title()
        print(f"  {formatted_name}: {time_ms:.0f}ms")
    print("\nLogging Levels:")
    for category, description in perf_summary["logging_levels"].items():
        formatted_name = category.replace("_", " ").title()
        print(f"  {formatted_name}: {description}")
    print("\nRecommendations:")
    for context, recommendation in perf_summary["recommendations"].items():
        print(f"  {context.title()}: {recommendation}")
    print("\nTo enable database query logging:")
    print("  DEBUG=True docker-compose up  # Enables all query logging")
    print("  DJANGO_LOG_LEVEL=INFO docker-compose up  # Logs slow queries only")
    print("\nDatabase log files:")
    print("  database.log - All database queries and operations")
    print("  django.log - Django framework database warnings/errors")
    print("=======================================\n")
