# PowerShell script to generate self-signed cert with SANs for Docker/Caddy
$certDir = "."
$cnfPath = "$certDir/localhost.cnf"
$keyPath = "$certDir/key.pem"
$certPath = "$certDir/cert.pem"

if (!(Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir }

openssl req -x509 -nodes -newkey rsa:4096 -keyout $keyPath -out $certPath -days 365 -config $cnfPath -extensions req_ext -subj "/CN=localhost"
Write-Host "Certificate and key generated at $certDir"
