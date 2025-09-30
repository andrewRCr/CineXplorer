"""
Django management command to verify sensitive data is excluded from log output.

This command tests that API keys and other sensitive information are properly
sanitized from log files and console output for security compliance.
"""

import json
import logging
import time
from collections.abc import Mapping
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from movie.services.movie_service import tmdb_get


class Command(BaseCommand):
    help = 'Verify sensitive data (API keys) are excluded from log output'

    def handle(self, *args, **options):
        self.stdout.write("🔐 Starting sensitive data exclusion verification...")

        # Get the actual API key to search for
        api_key = settings.TMDB_API_KEY
        if not api_key:
            self.stdout.write("❌ No TMDB_API_KEY found in settings")
            return

        partial_key = self._get_partial_key(api_key)
        self.stdout.write(f"🔍 Testing exclusion of API key: {partial_key}")

        self._run_security_test(api_key, partial_key)

    def _get_partial_key(self, api_key):
        """Create partial key pattern for safe display."""
        if len(api_key) >= 8:
            return f"{api_key[:4]}...{api_key[-4:]}"
        else:
            return "***REDACTED***"

    def _run_security_test(self, api_key, partial_key):  # noqa: C901
        """Run the complete security test suite.

        Note: This method has high complexity (C901) due to comprehensive
        security testing logic that validates API key exclusion across
        multiple log handlers, record attributes, and file outputs.
        The complexity is acceptable for this security verification utility.
        """
        # Capture log records
        log_records = []

        class SecurityLogCapture(logging.Handler):
            def emit(self, record):
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

        capture_handlers = []

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

            # Test 1: Standard API call
            self.stdout.write("  🎬 Testing movie/popular...")
            result1 = tmdb_get('movie/popular', {'page': 1})

            # Test 2: API call with additional parameters
            self.stdout.write("  🔍 Testing search/movie...")
            result2 = tmdb_get('search/movie', {'query': 'Inception', 'page': 1})

            # Test 3: Movie details call
            self.stdout.write("  📄 Testing movie/{id}...")
            result3 = tmdb_get('movie/550')  # Fight Club

            # Give logging time to complete
            time.sleep(0.2)

            self.stdout.write("\n🔍 Security Analysis Results")
            self.stdout.write("=" * 50)

            # Analyze all captured log records
            security_violations = []
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
            api_results = [
                ("movie/popular", result1),
                ("search/movie", result2),
                ("movie/550", result3)
            ]

            for endpoint, result in api_results:
                # Safely handle result which might not be a dict
                if isinstance(result, Mapping):
                    if 'error' in result:
                        self.stdout.write(f"  ❌ {endpoint}: {result.get('error')}")
                    else:
                        count = len(result.get('results', [result])) if 'results' in result else 1
                        self.stdout.write(f"  ✅ {endpoint}: {count} item(s) returned")
                else:
                    # Handle non-mapping results
                    result_type = type(result).__name__
                    try:
                        item_count = len(result) if hasattr(result, '__len__') else 1
                        self.stdout.write(  # noqa: E501
                            f"  ⚠️ {endpoint}: Non-dict result ({result_type}, {item_count} items)"
                        )
                    except (TypeError, AttributeError):
                        self.stdout.write(f"  ⚠️ {endpoint}: Non-dict result ({result_type})")

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

    def _check_log_files_security(self, api_key, partial_key):
        """Check actual log files for API key presence."""
        # Get log directory from settings, with fallback to BASE_DIR / "logs"
        log_dir = getattr(settings, 'LOG_DIR', None)
        if log_dir is None:
            log_dir = Path(settings.BASE_DIR) / "logs"
        else:
            log_dir = Path(log_dir)

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
                    with open(file_path, 'r', encoding='utf-8') as f:
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
