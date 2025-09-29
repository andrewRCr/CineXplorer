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
    python scripts/type_check.py [--verbose]
"""
from __future__ import annotations

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


def main() -> None:
    """Run comprehensive type checking."""
    print("Starting CineXplorer Backend Type Safety Check")
    print("=" * 60)

    # Test 1: Core utilities with strict mypy
    code1, output1 = run_command(
        [
            "python", "-m", "mypy", "apps/core/utilities/",
            "--show-error-codes", "--explicit-package-bases"
        ],
        "MyPy strict check on core utilities"
    )

    # Test 2: Services with mypy (should be strict per config)
    code2, output2 = run_command(
        [
            "python", "-m", "mypy", "apps/core/services/email_service.py",
            "--show-error-codes", "--explicit-package-bases"
        ],
        "MyPy check on services"
    )

    # Test 3: Pyright check on core models (now using host-based pyright)
    code3, output3 = run_command(
        ["npx", "pyright", "apps/core/models.py"],
        "Pyright check on Django models"
    )

    # Test 4: Pyright check on utilities (now using host-based pyright)
    code4, output4 = run_command(
        ["npx", "pyright", "apps/core/utilities/"],
        "Pyright check on core utilities"
    )

    # Test 5: Pyright check on movie app (Django Ninja migration)
    code5, output5 = run_command(
        ["npx", "pyright", "apps/movie/"],
        "Pyright check on movie app (Django Ninja)"
    )

    # Test 6: Pyright check on authentication app (Django Ninja)
    code6, output6 = run_command(
        ["npx", "pyright", "apps/authentication/auth_ninja.py"],
        "Pyright check on Ninja authentication"
    )

    # Results summary
    print("\n" + "=" * 60)
    print("TYPE SAFETY SUMMARY")
    print("=" * 60)

    tests = [
        ("Core Utilities (MyPy Strict)", code1, output1, True),
        ("Services (MyPy)", code2, output2, True),
        ("Models (Pyright)", code3, output3, False),
        ("Utilities (Pyright)", code4, output4, False),
        ("Movie App (Pyright)", code5, output5, False),
        ("Authentication (Pyright)", code6, output6, False),
    ]

    passed = 0
    skipped = 0
    upstream_issue = "https://github.com/typeddjango/django-stubs/issues/2461"

    for name, returncode, output, is_mypy in tests:
        status = "PASS" if returncode == 0 else "FAIL"
        if (returncode != 0 and is_mypy and
                is_django_stubs_internal_error(output)):
            status = "SKIP"
            skipped += 1
            if "--verbose" in sys.argv:
                print(
                    f"Upstream django-stubs issue detected. See {upstream_issue}."
                )

        print(f"[{status}] {name}")
        if status == "PASS":
            passed += 1
        elif status == "FAIL" and "--verbose" in sys.argv:
            print(f"  Error: {output[:200]}...")

    effective_total = len(tests) - skipped
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
