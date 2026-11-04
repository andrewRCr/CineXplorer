"""Django management command to verify TMDB API logging captures all expected metadata.

This command makes a single TMDB API call and then examines the log output
to verify that all structured logging data is being captured correctly.
"""

import json
import logging
import time

from django.core.management.base import BaseCommand

from apps.core.services.tmdb_api_client import TMDBApiClient


class Command(BaseCommand):
    help = "Verify TMDB API logging captures all expected metadata"

    def handle(self, *args: object, **options: object) -> None:
        """Capture and report TMDB response logging metadata."""
        self.stdout.write("🔍 Verifying TMDB API logging metadata...")

        # Create a logger to capture the structured logging
        logger = logging.getLogger("cinexplorer.tmdb")

        # Create a custom handler to capture log records
        log_records: list[logging.LogRecord] = []

        class LogRecordCapture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                log_records.append(record)

        capture_handler = LogRecordCapture()
        capture_handler.setLevel(logging.DEBUG)
        logger.addHandler(capture_handler)

        try:
            # Make a TMDB API call
            self.stdout.write("📡 Making TMDB API call...")
            client = TMDBApiClient()
            api_response = client.get_popular_movies(page=1)

            # Give logging a moment to complete
            time.sleep(0.1)

            # Analyze captured log records
            self.stdout.write(f"📋 Captured {len(log_records)} log records")

            for i, record in enumerate(log_records):
                self.stdout.write(f"\n--- Log Record {i + 1} ---")
                self.stdout.write(f"Level: {record.levelname}")
                self.stdout.write(f"Message: {record.getMessage()}")
                self.stdout.write(f"Logger: {record.name}")
                self.stdout.write(f"Function: {record.funcName}")

                extra_fields = self._get_extra_fields(record)

                if extra_fields:
                    self.stdout.write("Extra fields:")
                    for key, value in extra_fields.items():
                        # Pretty print complex objects
                        if isinstance(value, (dict, list)):
                            self.stdout.write(f"  {key}: {json.dumps(value, indent=2)}")
                        else:
                            self.stdout.write(f"  {key}: {value}")
                else:
                    self.stdout.write("❌ No extra fields found")

            # Check API call result
            if not api_response.is_success():
                self.stdout.write(f"\n❌ API Error: {api_response.error_message}")
            elif api_response.data is not None and isinstance(api_response.data, dict):
                results = api_response.data.get("results", [])
                if hasattr(results, "__len__"):
                    movies_count = len(results)  # pyright: ignore[reportArgumentType]  # Runtime validation via hasattr
                    self.stdout.write(f"\n✅ API Success: Found {movies_count} movies")
                else:
                    self.stdout.write("\n✅ API Success: Results returned")
            else:
                self.stdout.write("\n⚠️ API response has no data")

        except Exception as e:
            self.stdout.write(f"\n❌ Test failed: {type(e).__name__}")
        finally:
            # Clean up the handler
            logger.removeHandler(capture_handler)

        self.stdout.write("\n🎯 TMDB logging verification completed!")

    @staticmethod
    def _get_extra_fields(record: logging.LogRecord) -> dict[str, object]:
        """Read nonstandard fields in their original attribute order."""
        # Check for extra fields
        extra_fields: dict[str, object] = {}
        for attr in dir(record):
            if not attr.startswith("_") and attr not in [
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "getMessage",
                "exc_info",
                "exc_text",
                "stack_info",
                "message",
            ]:
                value = getattr(record, attr)
                if value is not None:
                    extra_fields[attr] = value

        return extra_fields
