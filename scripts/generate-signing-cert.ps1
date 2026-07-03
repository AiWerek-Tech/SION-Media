param(
  [string]$Password = 'SionMediaBeta2026',
  [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot 'certs'
}

$PfxPath = Join-Path $OutputDir 'sion-media-signing.pfx'

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  Write-Host '[+] Created directory: ' -NoNewline -ForegroundColor Cyan
  Write-Host $OutputDir -ForegroundColor White
}

if (Test-Path -LiteralPath $PfxPath) {
  Write-Host ''
  Write-Host '[!] Certificate already exists: ' -NoNewline -ForegroundColor Yellow
  Write-Host $PfxPath -ForegroundColor White
  Write-Host '    Delete it manually if you want to regenerate.' -ForegroundColor Yellow
  Write-Host ''
  Write-Host '    Environment variables for electron-builder:' -ForegroundColor Green
  Write-Host "    CSC_LINK: $PfxPath" -ForegroundColor White
  Write-Host "    CSC_KEY_PASSWORD: $Password" -ForegroundColor White
  Write-Host ''
  exit 0
}

Write-Host ''
Write-Host '=========================================' -ForegroundColor Cyan
Write-Host '  SION Media — Code Signing Certificate  ' -ForegroundColor Cyan
Write-Host '=========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '[*] Generating self-signed code signing certificate...' -ForegroundColor White

$certParams = @{
  Subject           = 'CN=AiWerek Tech, O=AiWerek Tech, L=Indonesia'
  Type              = 'CodeSigningCert'
  KeyAlgorithm      = 'RSA'
  KeyLength         = 4096
  KeyUsage          = 'DigitalSignature'
  KeyExportPolicy   = 'Exportable'
  CertStoreLocation = 'Cert:\CurrentUser\My'
  NotAfter          = (Get-Date).AddYears(3)
  HashAlgorithm     = 'SHA256'
  FriendlyName      = 'SION Media Code Signing (Self-Signed)'
}

$cert = New-SelfSignedCertificate @certParams

$subject = $cert.Subject
$thumbprint = $cert.Thumbprint
$validUntil = $cert.NotAfter.ToString('yyyy-MM-dd')

Write-Host '[+] Certificate created successfully' -ForegroundColor Green
Write-Host "    Subject:     $subject" -ForegroundColor Gray
Write-Host "    Thumbprint:  $thumbprint" -ForegroundColor Gray
Write-Host "    Valid Until: $validUntil" -ForegroundColor Gray

Write-Host ''
Write-Host '[*] Exporting to PFX...' -ForegroundColor White

$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $securePassword | Out-Null

Write-Host '[+] Exported: ' -NoNewline -ForegroundColor Green
Write-Host $PfxPath -ForegroundColor White
Write-Host ''
Write-Host '=========================================' -ForegroundColor Green
Write-Host '  Certificate Ready!' -ForegroundColor Green
Write-Host '=========================================' -ForegroundColor Green
Write-Host ''
Write-Host '  To sign your builds, set these environment variables:' -ForegroundColor White
Write-Host "  CSC_LINK = $PfxPath" -ForegroundColor White
Write-Host "  CSC_KEY_PASSWORD = $Password" -ForegroundColor White
Write-Host ''
Write-Host '  Or use the convenience script:' -ForegroundColor Cyan
Write-Host '  .\scripts\sign-build.ps1' -ForegroundColor White
Write-Host ''
Write-Host 'Done.' -ForegroundColor Cyan
