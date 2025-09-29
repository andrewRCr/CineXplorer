"""
Django management command to export OpenAPI schema for CI/CD workflows.

This command provides a reliable way to export the OpenAPI schema in CI environments
where direct Python imports might have Django settings configuration issues.
"""
import json
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
        try:
            # Get the OpenAPI schema from the Django Ninja API instance
            schema = api.get_openapi_schema()

            # Format JSON output based on options
            if options["minify"]:
                output = json.dumps(schema, separators=(",", ":"))
            else:
                indent = options["indent"]
                output = json.dumps(schema, indent=indent)

            # Output to stdout for capture by shell redirection
            self.stdout.write(output)

        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f"Failed to export OpenAPI schema: {e}")
            )
            raise