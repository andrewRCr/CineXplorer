#!/usr/bin/env python3
"""
Comprehensive type checking script for CineXplorer backend.

This script implements our hybrid approach:
1. Uses mypy for Django-compatible checking with relaxed rules
2. Uses Pyright for strict modern type checking (host-based)
3. Provides clear reporting on type safety status

Usage:
    python scripts/type_check.py [--verbose]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> tuple[bool, str]:
    """Run a command and return success status and output."""
    print(f"\n> {description}...")
    try:
        # Set up Django environment for MyPy commands
        import os
        env = os.environ.copy()
        env["DJANGO_SETTINGS_MODULE"] = "config.settings"

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,  # Run from backend/ directory
            env=env,
            shell=True  # Required for Windows compatibility with npx
        )
        success = result.returncode == 0
        output = result.stdout + result.stderr
        return success, output
    except Exception as e:
        return False, str(e)


def main() -> None:
    """Run comprehensive type checking."""
    print("Starting CineXplorer Backend Type Safety Check")
    print("=" * 60)

    # Test 1: Core utilities with strict mypy
    success1, output1 = run_command(
        ["python", "-m", "mypy", "apps/core/utilities/", "--show-error-codes", "--explicit-package-bases"],
        "MyPy strict check on core utilities"
    )

    # Test 2: Services with mypy (should be strict per config)
    success2, output2 = run_command(
        ["python", "-m", "mypy", "apps/core/services/email_service.py", "--show-error-codes", "--explicit-package-bases"],
        "MyPy check on services"
    )

    # Test 3: Pyright check on core models (now using host-based pyright)
    success3, output3 = run_command(
        ["npx", "pyright", "apps/core/models.py"],
        "Pyright check on Django models"
    )

    # Test 4: Pyright check on utilities (now using host-based pyright)
    success4, output4 = run_command(
        ["npx", "pyright", "apps/core/utilities/"],
        "Pyright check on core utilities"
    )


    # Results summary
    print("\n" + "=" * 60)
    print("TYPE SAFETY SUMMARY")
    print("=" * 60)

    tests = [
        ("Core Utilities (MyPy Strict)", success1, output1),
        ("Services (MyPy)", success2, output2),
        ("Models (Pyright)", success3, output3),
        ("Utilities (Pyright)", success4, output4),
    ]

    passed = 0
    for name, success, output in tests:
        status = "PASS" if success else "FAIL"
        print(f"[{status}] {name}")
        if not success and "--verbose" in sys.argv:
            print(f"  Error: {output[:200]}...")
        passed += success

    print(f"\nResults: {passed}/{len(tests)} tests passed")

    if passed == len(tests):
        print("\nAll type safety checks passed!")
        print("Code is ready for production with excellent type safety")
    else:
        print(f"\n{len(tests) - passed} checks need attention")
        print("Run with --verbose to see detailed error messages")

    print("\nHybrid Approach Status:")
    print("   Development: Use Pyright for fast, strict type checking")
    print("   CI/CD: Use MyPy for Django-compatible validation")
    print("   Coverage: Core utilities and services have strict type safety")
    print("   Host-based: Pyright runs on host system for better performance")


if __name__ == "__main__":
    main()