#!/bin/sh
# Regenerate the hashed lock files from the .in files beside this script.
# The flags are recorded in each lock's header, where Dependabot reads them.
set -eu
cd "$(dirname "$0")"
compile() {
    uv pip compile "$1" --universal --python-version 3.13 --generate-hashes \
        --output-file "$2" --quiet
}
compile req.in req.txt
compile req.prod.in req.prod.txt
compile req.dev.in req.dev.txt
