#!/usr/bin/env python3
"""
Stub Quality Gate - Check custom type stubs for quality issues.

This script validates custom .pyi stub files in backend/stubs/ for:
1. typing.Any usage (prohibited except for external library contracts)
2. Maintenance contract headers (required for all stubs)
3. Basic import sanity (unused imports)

Run from repository root: python backend/scripts/check_stub_quality.py

Exit codes:
0 - All checks passed
1 - Quality issues found
"""

import re
import sys
from collections.abc import Generator
from pathlib import Path
from typing import TypedDict


class StubIssue(TypedDict):
    """Type for reporting stub quality issues."""
    file: str
    line: int
    issue: str
    context: str

def find_stub_files(stubs_dir: Path) -> list[Path]:
    """Find all .pyi files in stubs directory."""
    return sorted(stubs_dir.rglob("*.pyi"))

def _iter_code_lines(lines: list[str]) -> Generator[tuple[int, str]]:
    """
    Yield (line_num, line) pairs, skipping docstrings and comments.

    Handles both triple-quoted docstrings and comment lines (#).
    Line numbers are 1-indexed for error reporting.
    """
    in_docstring = False
    docstring_delimiter: str | None = None

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # Track docstring boundaries
        if '"""' in stripped or '\'\'\'' in stripped:
            if not in_docstring:
                in_docstring = True
                docstring_delimiter = '"""' if '"""' in stripped else '\'\'\''
                # Single-line docstring (e.g., """text""")
                if stripped.count(docstring_delimiter) >= 2:
                    in_docstring = False
                    docstring_delimiter = None
            elif docstring_delimiter is not None and docstring_delimiter in stripped:
                # Ending a multi-line docstring
                in_docstring = False
                docstring_delimiter = None
            continue

        # Skip lines inside docstrings or comment-only lines
        if in_docstring or stripped.startswith("#"):
            continue

        yield i, line

def check_any_usage(file_path: Path) -> list[StubIssue]:
    """Check for typing.Any usage that isn't justified."""
    issues: list[StubIssue] = []
    content = file_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    # Patterns that indicate justified Any usage
    justified_patterns = [
        r"#.*external library",
        r"#.*third-party",
        r"#.*allauth",
        r"#.*External library contract",
    ]

    # First pass: check if file has global justification in header
    # Check first 30 lines for justification (covers typical file headers)
    # This includes docstrings and comments
    file_has_global_justification = False
    for line in lines[:30]:
        # Check for typing.Any mention with justification in file header
        # Look for patterns like "Uses typing.Any" + "external library" / "third-party"
        if 'typing.Any' in line or 'Any' in line:
            # Check if any justification keywords appear in this line or nearby lines
            header_context = '\n'.join(lines[:30]).lower()
            keywords = ['external library', 'third-party', 'allauth']
            if any(keyword in header_context for keyword in keywords):
                file_has_global_justification = True
                break
        # Also check standard justification patterns
        if any(re.search(pattern, line, re.IGNORECASE) for pattern in justified_patterns):
            file_has_global_justification = True
            break

    # Also check if file has ANY justified Any usage (for import acceptance)
    has_justified_any = file_has_global_justification
    if not has_justified_any:
        for _, line in _iter_code_lines(lines):
            if re.search(r'\bAny\b', line):
                code_part = line.split('#')[0] if '#' in line else line
                has_pattern = any(
                    re.search(pattern, line, re.IGNORECASE)
                    for pattern in justified_patterns
                )
                if 'Any' in code_part and has_pattern:
                    has_justified_any = True
                    break

    # Second pass: check individual Any usages
    for i, line in _iter_code_lines(lines):
        # Check if line uses typing.Any (not just the word "Any" in comments)
        # Look for actual type annotations with Any
        if re.search(r'\bAny\b', line):
            # Exclude lines where Any is only mentioned in inline comments
            code_part = line.split('#')[0] if '#' in line else line
            if 'Any' not in code_part:
                continue

            # Allow "from typing import Any" if file has justified uses
            if 'from typing import Any' in line and has_justified_any:
                continue

            # Check if it's justified:
            # 1. File has global justification in header
            is_justified = file_has_global_justification

            # 2. Or inline comment on same line
            if not is_justified:
                is_justified = any(
                    re.search(pattern, line, re.IGNORECASE)
                    for pattern in justified_patterns
                )

            # 3. Or previous line has justification comment
            if not is_justified and i > 1:
                prev_line = lines[i - 2]
                is_justified = any(
                    re.search(pattern, prev_line, re.IGNORECASE)
                    for pattern in justified_patterns
                )

            if not is_justified:
                issues.append({
                    "file": str(file_path),
                    "line": i,
                    "issue": "Unjustified typing.Any usage",
                    "context": line.strip()
                })

    return issues

def check_maintenance_header(file_path: Path) -> list[StubIssue]:
    """Check if stub has required maintenance contract header."""
    issues: list[StubIssue] = []
    content = file_path.read_text(encoding="utf-8")

    # Required elements in maintenance contract
    required_elements = {
        "MAINTENANCE CONTRACT": "Missing maintenance contract section",
        "Last verified": "Missing 'Last verified' date",
        "When upgrading": "Missing upgrade checklist",
    }

    for element, error_msg in required_elements.items():
        if element not in content:
            issues.append({
                "file": str(file_path),
                "line": 1,
                "issue": error_msg,
                "context": "File header missing required documentation"
            })

    return issues

def check_unused_imports(file_path: Path) -> list[StubIssue]:
    """Check for imports that aren't used in the file."""
    issues: list[StubIssue] = []
    content = file_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    # Find all imports
    imports: dict[str, int] = {}
    for i, line in enumerate(lines, start=1):
        # Match: from X import Y, Z
        match = re.match(r"from\s+[\w.]+\s+import\s+(.+)", line.strip())
        if match:
            imported_items = match.group(1).split(",")
            for item in imported_items:
                item = item.strip().split(" as ")[0].strip()  # Handle "X as Y"
                if item and not item.startswith("("):
                    imports[item] = i

    # Check if each import is used (simple heuristic)
    for import_name, line_num in imports.items():
        # Skip known imports that are needed but hard to detect
        # annotations is used by Python runtime for PEP 563 postponed evaluation
        if import_name == "annotations":
            continue

        # Look for usage after the import line
        usage_found = False
        for line in lines[line_num:]:  # Check lines after import
            # Skip the import line itself and comments
            if line.strip().startswith("#"):
                continue
            # Check if import_name appears (not perfect, but good enough)
            if import_name in line and f"import {import_name}" not in line:
                usage_found = True
                break

        if not usage_found:
            issues.append({
                "file": str(file_path),
                "line": line_num,
                "issue": f"Potentially unused import: {import_name}",
                "context": lines[line_num - 1].strip()
            })

    return issues

def main() -> int:
    """Run all stub quality checks."""
    stubs_dir = Path("backend/stubs")

    if not stubs_dir.exists():
        print(f"❌ Stubs directory not found: {stubs_dir}")
        return 1

    stub_files = find_stub_files(stubs_dir)

    if not stub_files:
        print(f"⚠️  No stub files found in {stubs_dir}")
        return 0

    print(f"🔍 Checking {len(stub_files)} stub files for quality issues...\n")

    all_issues: list[StubIssue] = []

    # Run all checks
    for stub_file in stub_files:
        all_issues.extend(check_any_usage(stub_file))
        all_issues.extend(check_maintenance_header(stub_file))
        all_issues.extend(check_unused_imports(stub_file))

    # Report results
    if not all_issues:
        print("✅ All stub quality checks passed!")
        print(f"   - {len(stub_files)} files checked")
        print("   - 0 Any violations")
        print("   - All maintenance headers present")
        print("   - No unused imports detected")
        return 0

    # Group issues by file
    issues_by_file: dict[str, list[StubIssue]] = {}
    for issue in all_issues:
        if issue["file"] not in issues_by_file:
            issues_by_file[issue["file"]] = []
        issues_by_file[issue["file"]].append(issue)

    # Print issues
    print(f"❌ Found {len(all_issues)} quality issues in {len(issues_by_file)} files:\n")

    for file_path, issues in sorted(issues_by_file.items()):
        print(f"📄 {file_path}")
        for issue in sorted(issues, key=lambda x: x["line"]):
            print(f"   Line {issue['line']}: {issue['issue']}")
            print(f"      → {issue['context']}")
        print()

    print("\n💡 Match library signatures; justify Any; update stub headers and imports.")
    return 1

if __name__ == "__main__":
    sys.exit(main())
