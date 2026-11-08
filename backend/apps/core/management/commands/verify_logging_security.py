"""Django management command to verify sensitive data is excluded from log output.

This command tests that read access tokens and other sensitive information are properly
sanitized from log files and console output for security compliance.
"""

import json
import logging
import time
from collections.abc import Mapping, Sized
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient


class Command(BaseCommand):
    help = "Verify sensitive data (read access tokens) are excluded from log output"

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write("🔐 Starting sensitive data exclusion verification...")

        # Get the configured read access token to search for
        access_token = settings.TMDB_READ_ACCESS_TOKEN
        if not access_token:
            self.stdout.write("❌ No TMDB_READ_ACCESS_TOKEN found in settings")
            return

        self.stdout.write("🔍 Testing exclusion of the configured TMDB read access token")
        self._run_security_test(access_token)

    def _run_security_test(self, access_token: str) -> None:
        """Capture API diagnostics and report sensitive-data violations."""
        # Capture log records
        log_records: list[logging.LogRecord] = []

        class SecurityLogCapture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                log_records.append(record)

        # Set up log capture on multiple loggers (including upstream libraries)
        loggers_to_test = [
            "cinexplorer.tmdb",
            "cinexplorer",
            "cinexplorer.requests",
            "django",  # Django framework logging
            "urllib3",  # HTTP transport layer
            "requests",  # Requests library
        ]

        capture_handlers: list[tuple[logging.Logger, SecurityLogCapture, int]] = []

        for logger_name in loggers_to_test:
            logger = logging.getLogger(logger_name)
            original_level = logger.level  # Save original level
            handler = SecurityLogCapture()
            handler.setLevel(logging.DEBUG)
            logger.setLevel(logging.DEBUG)  # Ensure DEBUG messages are captured
            logger.addHandler(handler)
            capture_handlers.append((logger, handler, original_level))

        try:
            self.stdout.write("📡 Making TMDB API calls with security monitoring...")

            # Initialize TMDB client
            client = TMDBApiClient()

            # Test 1: Get popular movies
            self.stdout.write("  🎬 Testing get_popular_movies...")
            result1 = client.get_popular_movies(page=1)

            # Test 2: Search movies
            self.stdout.write("  🔍 Testing search_movies...")
            result2 = client.search_movies(query="Inception", page=1)

            # Test 3: Movie details
            self.stdout.write("  📄 Testing get_movie_details...")
            result3 = client.get_movie_details(movie_id=550)  # Fight Club

            # Give logging time to complete
            time.sleep(0.2)

            self.stdout.write("\n🔍 Security Analysis Results")
            self.stdout.write("=" * 50)

            # Analyze all captured log records
            security_violations: list[dict[str, object]] = []
            total_records_checked = len(log_records)

            for i, record in enumerate(log_records):
                message = record.getMessage()
                violations = self._find_record_violations(record, i + 1, access_token, message)
                security_violations.extend(violations)
                violation_found = bool(violations)

                # Show progress for detailed records
                if i < 5 or violation_found:
                    self.stdout.write(f"\n  📋 Record {i + 1}: {record.levelname} - {record.name}")
                    safe_message = message.replace(access_token, "[REDACTED]")
                    self.stdout.write(f"       Message: {safe_message[:100]}...")
                    if violation_found:
                        self.stdout.write("       ❌ SECURITY VIOLATION DETECTED!")
                    else:
                        self.stdout.write("       ✅ No sensitive data found")

            self._report_security_violations(security_violations, total_records_checked)

            # Verify API calls succeeded
            self.stdout.write("\n📊 API Call Results:")
            api_results: list[tuple[str, ApiResponse]] = [
                ("get_popular_movies", result1),
                ("search_movies", result2),
                ("get_movie_details", result3),
            ]

            for endpoint, api_response in api_results:
                self._report_api_result(endpoint, api_response)

            # Check log files for read access token presence
            self.stdout.write("\n📁 Log File Security Check:")
            self._check_log_files_security(access_token)

        except Exception as e:
            self.stdout.write(f"\n❌ Security test failed: {type(e).__name__}")

        finally:
            # Clean up handlers and restore original logger levels
            for logger, handler, original_level in capture_handlers:
                logger.removeHandler(handler)
                logger.setLevel(original_level)

        self.stdout.write("\n🔐 Sensitive data exclusion verification completed!")

    def _find_record_violations(
        self,
        record: logging.LogRecord,
        record_number: int,
        access_token: str,
        message: str,
    ) -> list[dict[str, object]]:
        """Collect message and attribute violations without discarding duplicates."""
        # Check all attributes of the record
        violations: list[dict[str, object]] = []

        # Check main message for read access token
        if access_token in message:
            violations.append(
                {
                    "type": "message",
                    "record": record_number,
                    "logger": record.name,
                    "function": record.funcName,
                    "violation": "read access token found in log message",
                }
            )

        # Check extra fields
        for attr_name in dir(record):
            if attr_name.startswith("_"):
                continue

            try:
                attr_value = getattr(record, attr_name)
                if attr_value is None:
                    continue

                # Convert to string for searching
                if isinstance(attr_value, (dict, list)):
                    attr_str = json.dumps(attr_value)
                else:
                    attr_str = str(attr_value)

                # Search for read access token in attribute
                if access_token in attr_str:
                    violations.append(
                        {
                            "type": "attribute",
                            "record": record_number,
                            "logger": record.name,
                            "function": record.funcName,
                            "attribute": attr_name,
                            "violation": f"read access token found in attribute '{attr_name}'",
                        }
                    )

            except Exception as exc:
                self.stderr.write(f"Skipped unreadable log attribute ({type(exc).__name__})")

        return violations

    def _report_security_violations(
        self,
        security_violations: list[dict[str, object]],
        total_records_checked: int,
    ) -> None:
        """Report counts and each detected log-field violation."""
        # Report results
        self.stdout.write("\n🎯 Security Verification Results")
        self.stdout.write("=" * 50)
        self.stdout.write(f"Total log records analyzed: {total_records_checked}")
        self.stdout.write(f"Security violations found: {len(security_violations)}")

        if security_violations:
            self.stdout.write("\n❌ SECURITY VIOLATIONS DETECTED:")
            for violation in security_violations:
                self.stdout.write(f"  - Record {violation['record']}: {violation['violation']}")
                self.stdout.write(f"    Logger: {violation['logger']}")
                self.stdout.write(f"    Function: {violation['function']}")
                if "attribute" in violation:
                    self.stdout.write(f"    Attribute: {violation['attribute']}")
            self.stdout.write(
                "\n🚨 CRITICAL: read access token found in logs! Security issue detected."
            )
        else:
            self.stdout.write(
                "\n✅ SECURITY PASSED: No read access tokens found in any log output"
            )
            self.stdout.write("✅ Sensitive data properly excluded from logging")

    def _report_api_result(self, endpoint: str, api_response: ApiResponse) -> None:
        """Report one endpoint result without altering the captured response."""
        if not api_response.is_success():
            self.stdout.write(f"  ❌ {endpoint}: {api_response.error_message}")
        elif api_response.data is not None and isinstance(api_response.data, Mapping):
            # For list endpoints (popular, search), check 'results' array
            if "results" in api_response.data:
                results = api_response.data["results"]
                # Use isinstance(Sized) for type narrowing
                if isinstance(results, Sized):
                    count = len(results)
                    self.stdout.write(f"  ✅ {endpoint}: {count} item(s) returned")
                else:
                    self.stdout.write(f"  ✅ {endpoint}: Results returned (count unknown)")
            else:
                # For detail endpoints (get_movie_details), single item
                self.stdout.write(f"  ✅ {endpoint}: 1 item returned")
        else:
            status = api_response.status_code
            self.stdout.write(f"  ⚠️ {endpoint}: No data returned (status {status})")

    def _check_log_files_security(self, access_token: str) -> None:
        """Check actual log files for read access token presence."""
        # Get log directory from settings, with fallback to BASE_DIR / "logs"
        log_dir = getattr(settings, "LOG_DIR", None)
        log_dir = Path(settings.BASE_DIR) / "logs" if log_dir is None else Path(log_dir)

        log_files = ["cinexplorer.log", "django.log", "requests.log", "database.log", "errors.log"]

        for log_file in log_files:
            file_path = log_dir / log_file
            try:
                if file_path.exists():
                    with open(file_path, encoding="utf-8") as f:
                        # Read last 100 lines to check recent entries
                        lines = f.readlines()[-100:]
                        content = "".join(lines)

                    if access_token in content:
                        self.stdout.write(f"  ❌ {log_file}: read access token found in file!")
                    else:
                        self.stdout.write(f"  ✅ {log_file}: No read access token found")
                else:
                    self.stdout.write(f"  ⚠️ {log_file}: File not found")

            except (OSError, UnicodeError) as e:
                self.stderr.write(f"  ❌ {log_file}: Error reading file ({type(e).__name__})")
