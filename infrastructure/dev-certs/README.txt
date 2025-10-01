This folder contains SSL certificates for local development ONLY.

⚠️  SECURITY WARNING: These are self-signed certificates for development.
    NEVER use these certificates in production environments.

To regenerate certs with SANs for 'localhost', 'frontend', and 'backend', run:

    Windows:       pwsh ./generate-cert.ps1
    Linux/macOS:   ./generate-cert.sh

Both scripts use the config in localhost.cnf to ensure Docker/Caddy can proxy securely.

The generated certificate includes Subject Alternative Names (SANs) for:
- localhost (external access)
- frontend (Docker service name)
- backend (Docker service name)

This allows Caddy to verify TLS connections to backend without tls_insecure_skip_verify.
