# Script PowerShell para gerar certificados SSL para desenvolvimento
# Baseado na documentação oficial do Facebook: https://developers.facebook.com/docs/facebook-login/security

Write-Host "🔐 Gerando certificados SSL para desenvolvimento..." -ForegroundColor Green

# Criar diretório para certificados
if (!(Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" -Force
}

# Gerar certificado SSL auto-assinado usando PowerShell
Write-Host "📜 Gerando certificado SSL auto-assinado..." -ForegroundColor Yellow

$cert = New-SelfSignedCertificate `
    -DnsName "localhost", "127.0.0.1" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
    -KeyExportPolicy Exportable `
    -KeyUsage DigitalSignature, KeyEncipherment `
    -Type SSLServerAuthentication `
    -ValidityPeriod Years `
    -ValidityPeriodUnits 1

# Exportar certificado para arquivo
$certPath = "certs\cert.pem"
$keyPath = "certs\key.pem"

Write-Host "💾 Exportando certificado..." -ForegroundColor Yellow

# Exportar certificado público
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($certPath, $certBytes)

# Exportar chave privada
$keyBytes = $cert.PrivateKey.ExportCspBlob($true)
[System.IO.File]::WriteAllBytes($keyPath, $keyBytes)

Write-Host "✅ Certificados gerados com sucesso!" -ForegroundColor Green
Write-Host "📁 Certificados criados em: ./certs/" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Para iniciar o servidor HTTPS:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Acesse: https://localhost:5173" -ForegroundColor Cyan
Write-Host "⚠️  Aceite o certificado auto-assinado no navegador" -ForegroundColor Yellow 