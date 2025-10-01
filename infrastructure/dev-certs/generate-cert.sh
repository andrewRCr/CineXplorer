#!/bin/sh
# Shell script to generate self-signed cert with SANs for Docker/Caddy

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CNF_PATH="$SCRIPT_DIR/localhost.cnf"
KEY_PATH="$SCRIPT_DIR/key.pem"
CERT_PATH="$SCRIPT_DIR/cert.pem"

# Validate that the config file exists
if [ ! -f "$CNF_PATH" ]; then
    echo "Error: Configuration file not found at $CNF_PATH"
    exit 1
fi

# Generate certificate with SANs from localhost.cnf
openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout "$KEY_PATH" \
  -out "$CERT_PATH" \
  -days 365 \
  -config "$CNF_PATH" \
  -extensions req_ext \
  -subj "/CN=localhost"

echo "Certificate and key generated in $SCRIPT_DIR"