# PowerShell script to generate self-signed cert with SANs for Docker/Caddy
$certDir = "."
$cnfPath = "$certDir/localhost.cnf"
$keyPath = "$certDir/key.pem"
$certPath = "$certDir/cert.pem"

if (!(Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir }

# Verify OpenSSL is available
$opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslCmd) {
    Write-Error "OpenSSL is not installed or not in PATH. Please install OpenSSL and try again."
    exit 1
}

# Verify configuration file exists
if (!(Test-Path $cnfPath)) {
    Write-Error "Configuration file not found: $cnfPath`nPlease ensure localhost.cnf exists in the same directory as this script."
    exit 1
}

# Generate certificate with error handling
try {
    $output = & openssl req -x509 -nodes -newkey rsa:4096 -keyout $keyPath -out $certPath -days 365 -config $cnfPath -extensions req_ext -subj "/CN=localhost" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error "OpenSSL command failed with exit code $LASTEXITCODE`nOutput: $output"
        # Clean up partial files if created
        if (Test-Path $keyPath) { Remove-Item $keyPath -Force }
        if (Test-Path $certPath) { Remove-Item $certPath -Force }
        exit 1
    }

    Write-Host "Certificate and key generated successfully at $certDir" -ForegroundColor Green
} catch {
    Write-Error "Failed to generate certificate: $_"
    # Clean up partial files if created
    if (Test-Path $keyPath) { Remove-Item $keyPath -Force }
    if (Test-Path $certPath) { Remove-Item $certPath -Force }
    exit 1
}
