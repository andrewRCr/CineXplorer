#!/usr/bin/env python3
"""Comprehensive type checking script for CineXplorer backend.

Type Safety Approach: Pyright-only with django-types
- Uses Pyright for all type checking (local + CI)
- Uses django-types 0.22.0 for Pyright-compatible Django stubs
- Checks ENTIRE apps (not selective files) for comprehensive coverage
- Provides clear per-app error reporting for baseline tracking

Configuration:
- Pyright: backend/pyrightconfig.json
- Django stubs: django-types (installed in venv)
- Custom stubs: backend/stubs/ (allauth, ninja_jwt, environ)

Usage:
    python scripts/type_check.py [--verbose] [--only CHECK1 CHECK2 ...]

Options:
    --verbose       Show detailed error messages (first 5 per app)
    --only CHECKS   Run only specified checks (space-separated)
                   Available: core authentication movie user_movie_data accounts config
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> tuple[int, str]:
    """Run a command and return (returncode, combined stdout/stderr)."""
    print(f"\n> {description}...")
    try:
        # Determine if we need shell mode (for npx on Windows)
        use_shell = sys.platform == "win32" and cmd[0] in ("npx", "npm")

        # Convert list to string for shell=True on Windows
        if use_shell:
            cmd_str = " ".join(cmd)
            result = subprocess.run(
                cmd_str,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent,
                shell=True,
            )
        else:
            result = subprocess.run(
                cmd, capture_output=True, text=True, cwd=Path(__file__).parent.parent, shell=False
            )

        output = result.stdout + result.stderr
        return result.returncode, output
    except Exception as e:
        return 1, str(e)


def count_errors(output: str) -> int:
    """Count errors from Pyright output."""
    # Pyright outputs summary like "5 errors, 0 warnings, 0 informations"
    for line in output.split("\n"):
        if "error" in line.lower() and (
            "warning" in line.lower() or "information" in line.lower()
        ):
            # Parse "X errors, Y warnings, Z informations"
            parts = line.split(",")
            for part in parts:
                if "error" in part.lower():
                    try:
                        count = int(part.strip().split()[0])
                        return count
                    except (ValueError, IndexError):
                        pass
    return 0


def get_error_preview(output: str, max_errors: int = 5) -> str:
    """Extract first N errors from Pyright output for preview."""
    lines = output.split("\n")
    error_lines = [line for line in lines if " - error:" in line or " - warning:" in line]
    preview = error_lines[:max_errors]
    if len(error_lines) > max_errors:
        preview.append(f"... and {len(error_lines) - max_errors} more errors")
    return "\n  ".join(preview) if preview else "No type errors or warnings"


def main() -> None:
    """Run comprehensive type checking."""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Run Pyright type checking on CineXplorer backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Available checks: core, authentication, movie, user_movie_data, accounts, config",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed error messages (first 5 errors per app)",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        metavar="CHECK",
        help="Run only specified checks (e.g., --only core movie)",
    )
    args = parser.parse_args()

    print("CineXplorer Backend Type Safety Check (Pyright + django-types)")
    print("=" * 70)

    # Define all available checks - ENTIRE apps for comprehensive coverage
    # Format: (check_id, description, pyright_command)
    all_checks = [
        ("core", "Core App", ["npx", "pyright", "apps/core/", "--project", "."]),
        (
            "authentication",
            "Authentication App",
            ["npx", "pyright", "apps/authentication/", "--project", "."],
        ),
        ("movie", "Movie App", ["npx", "pyright", "apps/movie/", "--project", "."]),
        (
            "user_movie_data",
            "UserMovieData App",
            ["npx", "pyright", "apps/user_movie_data/", "--project", "."],
        ),
        (
            "accounts",
            "Accounts App",
            ["npx", "pyright", "apps/accounts/", "--project", "."],
        ),
        (
            "config",
            "Config Module",
            ["npx", "pyright", "config/", "--project", "."],
        ),
    ]

    # Filter checks if --only specified
    if args.only:
        only_set = set(args.only)
        checks_to_run = [check for check in all_checks if check[0] in only_set]
        if not checks_to_run:
            print(f"Warning: No matching checks found for: {', '.join(args.only)}")
            print("Available: core, authentication, movie, user_movie_data, accounts, config")
            sys.exit(1)
    else:
        checks_to_run = all_checks

    # Run the selected checks
    results = []
    for check_id, description, cmd in checks_to_run:
        code, output = run_command(cmd, description)
        error_count = count_errors(output) if code != 0 else 0
        results.append((check_id, description, code, output, error_count))

    # Results summary
    print("\n" + "=" * 70)
    print("TYPE SAFETY SUMMARY (Per-App Error Counts)")
    print("=" * 70)

    passed = 0
    total_errors = 0

    for _check_id, description, returncode, output, error_count in results:
        status = "PASS" if returncode == 0 else "FAIL"
        if status == "PASS":
            print(f"✅ [{status}] {description}: 0 errors")
            passed += 1
        else:
            print(f"❌ [{status}] {description}: {error_count} errors")
            total_errors += error_count
            if args.verbose:
                print("  Preview (first 5 errors):")
                print(f"  {get_error_preview(output)}\n")

    print(f"\nResults: {passed}/{len(results)} apps passed")
    print(f"Total errors across all apps: {total_errors}")

    if passed == len(results):
        print("\n✅ All type safety checks passed!")
        print("Code is ready with excellent type safety")
    else:
        print(f"\n⚠️  {len(results) - passed} apps need attention")
        print("Run with --verbose to see error previews")
        print("\nNext steps:")
        print("  1. Review errors in apps with highest error counts")
        print("  2. Use object for unknown data and validate external payloads with typed models")
        print("  3. Use custom stubs (backend/stubs/) or pyright ignores as needed")

    print("\nType Safety Status:")
    print("  ✅ Pyright-only approach (simpler, faster, Python 3.13 compatible)")
    print("  ✅ django-types 0.22.0 (Pyright-compatible Django stubs)")
    print("  ✅ Comprehensive app coverage (not selective files)")
    print("  ✅ Strict type checking with documented Django ORM exceptions")


if __name__ == "__main__":
    main()
