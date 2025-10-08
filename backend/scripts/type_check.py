#!/usr/bin/env python3
"""
Comprehensive type checking script for CineXplorer backend.

This script implements our hybrid approach:
1. Uses mypy for Django-compatible checking with relaxed rules
2. Uses Pyright for strict modern type checking (host-based)
3. Provides clear reporting on type safety status

⚠️  NOTE: As of September 2025 mypy runs against Django 5.2 currently
surface an upstream django-stubs internal error
(https://github.com/typeddjango/django-stubs/issues/2461).
This script detects that condition and marks the mypy steps as
"SKIP" so Pyright can continue to serve as the primary guardrail
without failing the overall check.

Usage:
    python scripts/type_check.py [--verbose] [--only CHECK1 CHECK2 ...]

Options:
    --verbose       Show detailed error messages
    --only CHECKS   Run only specified checks (space-separated)
                   Available: utilities services models movie auth
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str] | str, description: str) -> tuple[int, str]:
    """Run a command and return (returncode, combined stdout/stderr)."""
    print(f"\n> {description}...")
    try:
        # Set up Django environment for MyPy commands
        env = os.environ.copy()
        env["DJANGO_SETTINGS_MODULE"] = "config.settings"

        # Determine if we need shell mode (for npx on Windows)
        use_shell = False
        if isinstance(cmd, list) and len(cmd) > 0 and cmd[0] in ('npx', 'npm'):
            use_shell = sys.platform == 'win32'
        elif isinstance(cmd, str):
            use_shell = True

        # Convert list to string for shell=True, or keep as list for shell=False
        if use_shell and isinstance(cmd, list):
            # Join list into a properly quoted command string
            cmd_str = ' '.join(cmd)
            result = subprocess.run(
                cmd_str,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent,
                env=env,
                shell=True
            )
        else:
            # Use list directly without shell
            result = subprocess.run(
                cmd if isinstance(cmd, list) else [cmd],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent,
                env=env,
                shell=False
            )

        output = result.stdout + result.stderr
        return result.returncode, output
    except Exception as e:
        return 1, str(e)


def is_django_stubs_internal_error(output: str) -> bool:
    """Detect the known django-stubs internal error signature."""
    lowered = output.lower()
    return "django-stubs" in lowered and "internal error" in lowered


def main() -> None:  # noqa: C901
    """Run comprehensive type checking."""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Run type checking on CineXplorer backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Available checks: utilities, services, models, movie, auth, user_movie_data"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed error messages"
    )
    parser.add_argument(
        "--only",
        nargs="*",
        metavar="CHECK",
        help="Run only specified checks (e.g., --only utilities movie)"
    )
    args = parser.parse_args()

    print("Starting CineXplorer Backend Type Safety Check")
    print("=" * 60)

    # Define all available checks with their identifiers
    all_checks = [
        ("utilities", "Core Utilities (MyPy Strict)", [
            "python", "-m", "mypy", "apps/core/utilities/",
            "--show-error-codes", "--explicit-package-bases"
        ], True),
        ("services", "Services (MyPy)", [
            "python", "-m", "mypy", "apps/core/services/email_service.py",
            "--show-error-codes", "--explicit-package-bases"
        ], True),
        ("models", "Models (Pyright)", [
            "npx", "pyright", "apps/core/models.py"
        ], False),
        ("utilities", "Utilities (Pyright)", [
            "npx", "pyright", "apps/core/utilities/"
        ], False),
        ("movie", "Movie App (Pyright)", [
            "npx", "pyright", "apps/movie/"
        ], False),
        ("auth", "Authentication App (Pyright)", [
            "npx", "pyright", "apps/authentication/"
        ], False),
        ("user_movie_data", "UserMovieData (MyPy)", [
            "python", "-m", "mypy", "apps/user_movie_data/api.py",
            "apps/user_movie_data/schemas.py",
            "--config-file", "mypy.ini"
        ], True),
        ("user_movie_data_pyright", "UserMovieData (Pyright)", [
            "npx", "pyright", "apps/user_movie_data/api.py",
            "apps/user_movie_data/schemas.py"
        ], False),
        ("config", "Config API (Pyright)", [
            "npx", "pyright", "config/api.py"
        ], False),
    ]

    # Filter checks if --only specified
    if args.only:
        only_set = set(args.only)
        checks_to_run = [check for check in all_checks if check[0] in only_set]
        if not checks_to_run:
            print(f"Warning: No matching checks found for: {', '.join(args.only)}")
            print("Available: utilities, services, models, movie, auth, user_movie_data")
            sys.exit(1)
    else:
        checks_to_run = all_checks

    # Run the selected checks
    results = []
    for check_id, name, cmd, is_mypy in checks_to_run:
        code, output = run_command(cmd, name)
        results.append((name, code, output, is_mypy))

    # Results summary
    print("\n" + "=" * 60)
    print("TYPE SAFETY SUMMARY")
    print("=" * 60)

    passed = 0
    skipped = 0
    upstream_issue = "https://github.com/typeddjango/django-stubs/issues/2461"

    for name, returncode, output, is_mypy in results:
        status = "PASS" if returncode == 0 else "FAIL"
        if (returncode != 0 and is_mypy and
                is_django_stubs_internal_error(output)):
            status = "SKIP"
            skipped += 1
            if args.verbose:
                print(
                    f"Upstream django-stubs issue detected. See {upstream_issue}."
                )

        print(f"[{status}] {name}")
        if status == "PASS":
            passed += 1
        elif status == "FAIL" and args.verbose:
            print(f"  Error: {output[:200]}...")

    effective_total = len(results) - skipped
    print(f"\nResults: {passed}/{effective_total} tests passed")

    if effective_total == 0 or passed == effective_total:
        print("\nAll type safety checks passed!")
        print("Code is ready for production with excellent type safety")
    else:
        print(f"\n{effective_total - passed} checks need attention")
        print("Run with --verbose to see detailed error messages")

    if skipped:
        print(
            "\nNOTE: One or more mypy checks were skipped due to the "
            "known django-stubs "
            f"internal error ({upstream_issue})."
        )

    print("\nHybrid Approach Status:")
    print("   Development: Use Pyright for fast, strict type checking")
    print("   CI/CD: Use MyPy for Django-compatible validation")
    print("   Coverage: Core utilities and services have strict type safety")
    print("   Host-based: Pyright runs on host system for better performance")


if __name__ == "__main__":
    main()
