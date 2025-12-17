#!/bin/bash
# extract-movie-ids.sh - Extract movie IDs from URLs, output as comma-separated list
#
# Usage:
#   ./extract-movie-ids.sh urls.txt              # From file
#   powershell.exe Get-Clipboard | ./extract-movie-ids.sh  # From clipboard (WSL)
#   ./extract-movie-ids.sh                       # Paste directly, Ctrl+D when done
#
# Example:
#   Input:  https://localhost:8444/movie/197644?from=browse
#   Output: 197644
#
#   Multiple URLs become comma-separated: 197644,123456,789012

grep -oP '(?<=/movie/)\d+' "$@" | paste -sd,
