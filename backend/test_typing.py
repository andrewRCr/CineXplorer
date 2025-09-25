#!/usr/bin/env python3
"""
Test script to check if our core utility functions pass strict typing.
This bypasses Django imports to focus on our pure application logic.
"""
from __future__ import annotations

# Test our core utilities without Django dependencies
from apps.core.utilities import coalesce

def test_coalesce() -> None:
    """Test our coalesce function with proper typing."""
    result1: str | None = coalesce(None, "hello", "world")
    result2: int | None = coalesce(None, None, 42)
    result3: str | None = coalesce(None, None, None)

    assert result1 == "hello"
    assert result2 == 42
    assert result3 is None

if __name__ == "__main__":
    test_coalesce()
    print("✅ All tests passed with strict typing!")