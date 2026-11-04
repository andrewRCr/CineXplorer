"""Django management command to export OpenAPI schema for CI/CD workflows.

This command provides a reliable way to export the OpenAPI schema in CI environments
where direct Python imports might have Django settings configuration issues.
"""

import json
import logging
import sys
import warnings
from typing import Any

from django.core.management.base import BaseCommand
from django.utils.functional import Promise


class LazyTranslationEncoder(json.JSONEncoder):
    """JSON encoder that handles Django's lazy translation proxies.

    Django's gettext_lazy() returns __proxy__ objects that aren't directly
    JSON serializable. This encoder converts them to strings before serialization.
    """

    def default(self, o: Any) -> Any:
        """Convert Django Promise (lazy translation) objects to strings."""
        if isinstance(o, Promise):
            return str(o)
        return super().default(o)


class Command(BaseCommand):
    """Export OpenAPI schema to stdout for CI/CD type generation workflows."""

    help = "Export the OpenAPI schema as JSON to stdout"

    def add_arguments(self, parser: Any) -> None:  # Any: Django ArgumentParser not typed
        """Add command arguments."""
        parser.add_argument(
            "--indent", type=int, default=2, help="JSON indentation level (default: 2)"
        )
        parser.add_argument(
            "--minify", action="store_true", help="Output minified JSON (no indentation)"
        )

    def execute(self, *args: Any, **options: Any) -> str | None:  # Any: Django command signature
        """Run the command with logging off, so stdout carries only the schema.

        Logging is off from before the system checks: they load the URLconf, and with it the
        API, whose setup logs. A console handler on stdout would put those lines in the schema.
        """
        logging.disable(logging.CRITICAL)
        try:
            return super().execute(*args, **options)
        finally:
            logging.disable(logging.NOTSET)

    def handle(self, *args: Any, **options: Any) -> None:  # Any: Django command signature
        """Export the OpenAPI schema."""
        # Imported here, not at module level: loading this command must not build the API
        # before execute() has turned logging off.
        from config.api import api

        # Disable Django warnings that might corrupt JSON output
        warnings.filterwarnings("ignore")

        try:
            # Get the OpenAPI schema from the Django Ninja API instance
            schema = api.get_openapi_schema()

            # Format JSON output based on options
            if options["minify"]:
                output = json.dumps(
                    schema, separators=(",", ":"), ensure_ascii=False, cls=LazyTranslationEncoder
                )
            else:
                indent = options["indent"]
                output = json.dumps(
                    schema, indent=indent, ensure_ascii=False, cls=LazyTranslationEncoder
                )

            # Output ONLY the JSON directly to stdout
            # Use sys.stdout.write to bypass any Django management command formatting
            sys.stdout.write(output)
            sys.stdout.flush()

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to export OpenAPI schema: {e}"))
            raise
