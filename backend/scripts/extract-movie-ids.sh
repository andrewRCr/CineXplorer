#!/bin/bash
# extract-movie-ids.sh - Extract movie IDs from URLs, output as comma-separated list
#
# Usage:
#   bash extract-movie-ids.sh urls.txt           # From file
#   bash extract-movie-ids.sh                    # Paste directly, Ctrl+D when done
#   printf '%s\n' 'https://localhost:8444/movie/197644' | bash extract-movie-ids.sh
# To read from a clipboard, pipe the output of your clipboard reader into the script.
#
# Example:
#   Input:  https://localhost:8444/movie/197644?from=browse
#   Output: 197644
#
#   Multiple URLs become comma-separated: 197644,123456,789012

# Extract IDs using portable grep + sed (works on GNU and BSD/macOS)
ids=$(grep -oE '/movie/[0-9]+' "$@" | sed 's#/movie/##' | paste -sd,)

if [ -z "$ids" ]; then
    echo "No movie IDs found in input" >&2
    exit 1
fi

echo "$ids"
