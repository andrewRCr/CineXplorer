"""
Django management command to verify sensitive data is excluded from log output.

This command tests that API keys and other sensitive information are properly
sanitized from log files and console output for security compliance.
"""

import json
import logging
import time
from collections.abc import Mapping, Sized
from pathlib import Path

from apps.core.services.api_response import ApiResponse
from apps.core.services.tmdb_api_client import TMDBApiClient
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Verify sensitive data (API keys) are excluded from log output'

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write("🔐 Starting sensitive data exclusion verification...")

        # Get the actual API key to search for
        api_key = settings.TMDB_API_KEY
        if not api_key:
            self.stdout.write("❌ No TMDB_API_KEY found in settings")
            return

        partial_key = self._get_partial_key(api_key)
        self.stdout.write(f"🔍 Testing exclusion of API key: {partial_key}")

        self._run_security_test(api_key, partial_key)

    def _get_partial_key(self, api_key: str) -> str:
        """Create partial key pattern for safe display."""
        if len(api_key) >= 8:
            return f"{api_key[:4]}...{api_key[-4:]}"
        else:
            return "***REDACTED***"

    def _run_security_test(self, api_key: str, partial_key: str) -> None:
        """Run the complete security test suite.

        Note: This method has high complexity (C901) due to comprehensive
        security testing logic that validates API key exclusion across
        multiple log handlers, record attributes, and file outputs.
        The complexity is acceptable for this security verification utility.
        """
        # Capture log records
        log_records: list[logging.LogRecord] = []

        class SecurityLogCapture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                log_records.append(record)

        # Set up log capture on multiple loggers (including upstream libraries)
        loggers_to_test = [
            'cinexplorer.tmdb',
            'cinexplorer',
            'cinexplorer.requests',
            'django',           # Django framework logging
            'urllib3',          # HTTP transport layer
            'requests',         # Requests library
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
            result2 = client.search_movies(query='Inception', page=1)

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
                # Get the formatted message
                message = record.getMessage()

                # Check all attributes of the record
                violation_found = False

                # Check main message for API key
                if api_key in message:
                    security_violations.append({
                        'type': 'message',
                        'record': i + 1,
                        'logger': record.name,
                        'function': record.funcName,
                        'violation': "API key found in log message"
                    })
                    violation_found = True

                # Check extra fields
                for attr_name in dir(record):
                    if attr_name.startswith('_'):
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

                        # Search for API key in attribute
                        if api_key in attr_str:
                            security_violations.append({
                                'type': 'attribute',
                                'record': i + 1,
                                'logger': record.name,
                                'function': record.funcName,
                                'attribute': attr_name,
                                'violation': f"API key found in attribute '{attr_name}'"
                            })
                            violation_found = True

                    except Exception:
                        # Skip attributes that can't be converted
                        continue

                # Show progress for detailed records
                if i < 5 or violation_found:
                    self.stdout.write(f"\n  📋 Record {i + 1}: {record.levelname} - {record.name}")
                    self.stdout.write(f"       Message: {message[:100]}...")
                    if violation_found:
                        self.stdout.write("       ❌ SECURITY VIOLATION DETECTED!")
                    else:
                        self.stdout.write("       ✅ No sensitive data found")

            # Report results
            self.stdout.write("\n🎯 Security Verification Results")
            self.stdout.write("=" * 50)
            self.stdout.write(f"Total log records analyzed: {total_records_checked}")
            self.stdout.write(f"Security violations found: {len(security_violations)}")

            if security_violations:
                self.stdout.write("\n❌ SECURITY VIOLATIONS DETECTED:")
                for violation in security_violations:
                    self.stdout.write(
                        f"  - Record {violation['record']}: {violation['violation']}"
                    )
                    self.stdout.write(f"    Logger: {violation['logger']}")
                    self.stdout.write(f"    Function: {violation['function']}")
                    if 'attribute' in violation:
                        self.stdout.write(f"    Attribute: {violation['attribute']}")
                self.stdout.write("\n🚨 CRITICAL: API key found in logs! Security issue detected.")
            else:
                self.stdout.write("\n✅ SECURITY PASSED: No API keys found in any log output")
                self.stdout.write("✅ Sensitive data properly excluded from logging")

            # Verify API calls succeeded
            self.stdout.write("\n📊 API Call Results:")
            api_results: list[tuple[str, ApiResponse]] = [
                ("get_popular_movies", result1),
                ("search_movies", result2),
                ("get_movie_details", result3)
            ]

            for endpoint, api_response in api_results:
                # ApiResponse.data is Mapping[str, object] | Sequence[object] | str | None
                if not api_response.is_success():
                    self.stdout.write(f"  ❌ {endpoint}: {api_response.error_message}")
                elif api_response.data is not None and isinstance(api_response.data, Mapping):
                    # For list endpoints (popular, search), check 'results' array
                    if 'results' in api_response.data:
                        results = api_response.data['results']
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

            # Check log files for API key presence
            self.stdout.write("\n📁 Log File Security Check:")
            self._check_log_files_security(api_key, partial_key)

        except Exception as e:
            self.stdout.write(f"\n❌ Security test failed: {e}")

        finally:
            # Clean up handlers and restore original logger levels
            for logger, handler, original_level in capture_handlers:
                logger.removeHandler(handler)
                logger.setLevel(original_level)

        self.stdout.write("\n🔐 Sensitive data exclusion verification completed!")

    def _check_log_files_security(self, api_key: str, partial_key: str) -> None:
        """Check actual log files for API key presence."""
        # Get log directory from settings, with fallback to BASE_DIR / "logs"
        log_dir = getattr(settings, 'LOG_DIR', None)
        log_dir = Path(settings.BASE_DIR) / "logs" if log_dir is None else Path(log_dir)

        log_files = [
            "cinexplorer.log",
            "django.log",
            "requests.log",
            "database.log",
            "errors.log"
        ]

        for log_file in log_files:
            file_path = log_dir / log_file
            try:
                if file_path.exists():
                    with open(file_path, encoding='utf-8') as f:
                        # Read last 100 lines to check recent entries
                        lines = f.readlines()[-100:]
                        content = ''.join(lines)

                    if api_key in content:
                        self.stdout.write(f"  ❌ {log_file}: API key found in file!")
                    else:
                        self.stdout.write(f"  ✅ {log_file}: No API key found")
                else:
                    self.stdout.write(f"  ⚠️ {log_file}: File not found")

            except Exception as e:
                self.stdout.write(f"  ❌ {log_file}: Error reading file - {e}")
