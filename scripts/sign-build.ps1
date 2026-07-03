param(
  [string]$CertPath = '',
  [string]$CertPassword = 'SionMediaBeta2026',
  [switch]$SkipSign
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

if (-not $CertPath) {
  $CertPath = Join-Path $ProjectRoot 'certs\sion-media-signing.pfx'
}

Write-Host ''
Write-Host '=================================================' -ForegroundColor Cyan
Write-Host '  SION Media — Signed Build Pipeline' -ForegroundColor Cyan
Write-Host '=================================================' -ForegroundColor Cyan
Write-Host ''

$willSign = $false

if ($SkipSign) {
  Write-Host '[i] Signing skipped (SkipSign flag set).' -ForegroundColor Yellow
} elseif (Test-Path -LiteralPath $CertPath) {
  Write-Host '[+] Certificate found: ' -NoNewline -ForegroundColor Green
  Write-Host $CertPath -ForegroundColor White
  $willSign = $true

  $env:CSC_LINK = $CertPath
  $env:CSC_KEY_PASSWORD = $CertPassword

  Write-Host '    CSC_LINK and CSC_KEY_PASSWORD environment variables set.' -ForegroundColor Gray
} else {
  Write-Host '[!] No certificate found at: ' -NoNewline -ForegroundColor Yellow
  Write-Host $CertPath -ForegroundColor White
  Write-Host '    Building WITHOUT code signing.' -ForegroundColor Yellow
  Write-Host ''
  Write-Host '    To generate a self-signed certificate, run:' -ForegroundColor White
  Write-Host '      .\scripts\generate-signing-cert.ps1' -ForegroundColor Cyan
  Write-Host ''

  $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}

$pkgJsonPath = Join-Path $ProjectRoot 'package.json'
$pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$version = $pkg.version

Write-Host ''
Write-Host '[*] Building SION Media Windows installer...' -ForegroundColor White
Write-Host "    Version: v$version" -ForegroundColor Gray
Write-Host ''

$buildStart = Get-Date

Push-Location $ProjectRoot
try {
  & npm run build:win
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$buildDuration = (Get-Date) - $buildStart
$distDir = Join-Path $ProjectRoot 'dist'
$installerPattern = "SION-Media-$version-Setup.exe"
$installerFile = Get-ChildItem -Path $distDir -Filter $installerPattern -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $installerFile) {
  Write-Host '[!] Installer not found: ' -NoNewline -ForegroundColor Red
  Write-Host $installerPattern -ForegroundColor White
  exit 1
}

Write-Host ''
Write-Host '[+] Installer compiled successfully: ' -NoNewline -ForegroundColor Green
Write-Host $installerFile.FullName -ForegroundColor White
Write-Host "    Size: $([math]::Round($installerFile.Length / 1MB, 2)) MB" -ForegroundColor Gray

if ($willSign) {
  Write-Host ''
  Write-Host '[*] Verifying digital signature...' -ForegroundColor White

  try {
    $sig = Get-AuthenticodeSignature -FilePath $installerFile.FullName
    $status = $sig.Status

    if ($status -eq 'Valid') {
      Write-Host '[+] SIGNED — Valid signature detected!' -ForegroundColor Green
      Write-Host "    Signer:    $($sig.SignerCertificate.Subject)" -ForegroundColor Gray
      Write-Host "    Algorithm: $($sig.SignerCertificate.SignatureAlgorithm.FriendlyName)" -ForegroundColor Gray
      Write-Host "    Valid:     $($sig.SignerCertificate.NotBefore.ToString('yyyy-MM-dd')) to $($sig.SignerCertificate.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    } elseif ($status -eq 'UnknownError' -and $sig.SignerCertificate) {
      Write-Host '[~] SIGNED (self-signed) — Signature is present but root CA is not trusted.' -ForegroundColor Yellow
      Write-Host '    This is expected behavior for local self-signed certs.' -ForegroundColor Yellow
      Write-Host "    Signer:    $($sig.SignerCertificate.Subject)" -ForegroundColor Gray
      Write-Host "    Valid:     $($sig.SignerCertificate.NotBefore.ToString('yyyy-MM-dd')) to $($sig.SignerCertificate.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    } else {
      Write-Host '[!] Signature status: ' -NoNewline -ForegroundColor Red
      Write-Host $status -ForegroundColor White
      if ($sig.StatusMessage) {
        Write-Host "    Details: $($sig.StatusMessage)" -ForegroundColor Gray
      }
    }
  } catch {
    Write-Host '[!] Failed to verify signature.' -ForegroundColor Red
  }
}

Remove-Item Env:\CSC_LINK -ErrorAction SilentlyContinue
Remove-Item Env:\CSC_KEY_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:\CSC_IDENTITY_AUTO_DISCOVERY -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '=================================================' -ForegroundColor Green
Write-Host '  Build Summary' -ForegroundColor Green
Write-Host '=================================================' -ForegroundColor Green
Write-Host "  Version:   v$version" -ForegroundColor White
Write-Host "  Installer: $($installerFile.Name)" -ForegroundColor White
Write-Host "  Signed:    $(if ($willSign) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "  Duration:  $([math]::Round($buildDuration.TotalSeconds, 1))s" -ForegroundColor White
Write-Host "  Output:    $distDir" -ForegroundColor White
Write-Host '=================================================' -ForegroundColor Green
Write-Host ''
