"""
Django management command to export OpenAPI schema for CI/CD workflows.

This command provides a reliable way to export the OpenAPI schema in CI environments
where direct Python imports might have Django settings configuration issues.
"""
import json
import logging
import sys
from typing import Any

from django.core.management.base import BaseCommand

from config.api import api


class Command(BaseCommand):
    """Export OpenAPI schema to stdout for CI/CD type generation workflows."""

    help = "Export the OpenAPI schema as JSON to stdout"

    def add_arguments(self, parser: Any) -> None:
        """Add command arguments."""
        parser.add_argument(
            "--indent",
            type=int,
            default=2,
            help="JSON indentation level (default: 2)"
        )
        parser.add_argument(
            "--minify",
            action="store_true",
            help="Output minified JSON (no indentation)"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        """Export the OpenAPI schema."""
        # Temporarily disable all logging to prevent output corruption
        original_level = logging.root.level
        logging.root.setLevel(logging.CRITICAL + 1)

        # Also disable any custom loggers that might interfere
        django_logger = logging.getLogger('django')
        original_django_level = django_logger.level
        django_logger.setLevel(logging.CRITICAL + 1)

        try:
            # Get the OpenAPI schema from the Django Ninja API instance
            schema = api.get_openapi_schema()

            # Format JSON output based on options
            if options["minify"]:
                output = json.dumps(schema, separators=(",", ":"))
            else:
                indent = options["indent"]
                output = json.dumps(schema, indent=indent)

            # Validate JSON before outputting
            try:
                json.loads(output)
            except json.JSONDecodeError as json_error:
                # Re-enable logging for error output
                logging.root.setLevel(original_level)
                django_logger.setLevel(original_django_level)
                self.stderr.write(
                    self.style.ERROR(f"Generated invalid JSON: {json_error}")
                )
                raise

            # Output ONLY the JSON directly to stdout
            # Use sys.stdout.write to bypass any Django management command formatting
            sys.stdout.write(output)
            sys.stdout.flush()

        except Exception as e:
            # Re-enable logging for error output
            logging.root.setLevel(original_level)
            django_logger.setLevel(original_django_level)
            self.stderr.write(
                self.style.ERROR(f"Failed to export OpenAPI schema: {e}")
            )
            raise
        finally:
            # Always restore original logging levels
            logging.root.setLevel(original_level)
            django_logger.setLevel(original_django_level)