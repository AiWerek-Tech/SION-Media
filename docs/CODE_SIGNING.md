# Code Signing — SION Media

Dokumentasi lengkap tentang penandatanganan digital (code signing) untuk installer SION Media pada Windows.

---

## Mengapa Code Signing Penting?

Windows SmartScreen memfilter aplikasi berdasarkan **reputasi digital**. Tanpa tanda tangan:
- SmartScreen menampilkan "Windows protected your PC"
- User harus klik "More info" → "Run anyway"
- Kepercayaan terhadap aplikasi berkurang

Dengan tanda tangan dari **CA terpercaya** (Certificate Authority):
- SmartScreen tidak akan memblokir installer
- Dialog "Properties" menampilkan nama publisher
- User dapat memverifikasi keaslian software

---

## Status Saat Ini

| Item | Status |
|---|---|
| Infrastructure (scripts, config) | ✅ Siap |
| Self-Signed Certificate | ✅ Tersedia |
| Trusted CA Certificate | ❌ Belum dibeli |
| SmartScreen bypass otomatis | ❌ Perlu CA cert |

---

## Quick Start — Self-Signed Certificate

### 1. Generate Certificate

```powershell
cd sion-media-desktop
.\scripts\generate-signing-cert.ps1
```

Ini akan:
- Membuat certificate RSA-4096 SHA-256 dengan EKU Code Signing
- Export ke `certs/sion-media-signing.pfx`
- Berlaku 3 tahun
- Install ke Windows Certificate Store (`CurrentUser\My`)

### 2. Build dengan Signing

```powershell
.\scripts\sign-build.ps1
```

Atau secara manual:

```powershell
$env:CSC_LINK = ".\certs\sion-media-signing.pfx"
$env:CSC_KEY_PASSWORD = "SionMediaBeta2026"
npm run build:win
```

### 3. Verifikasi Signature

```powershell
# Cek signature di EXE
Get-AuthenticodeSignature ".\dist\SION-Media-1.0.0-beta.2-Setup.exe"
```

---

## Upgrade ke CA Certificate

Saat siap untuk rilis stabil, beli certificate dari salah satu CA berikut:

| CA | Tipe | Harga (±) | SmartScreen |
|---|---|---|---|
| [SSL.com](https://ssl.com) | OV Code Signing | ~$70/tahun | ✅ Reputasi bertahap |
| [Sectigo](https://sectigo.com) | OV Code Signing | ~$90/tahun | ✅ Reputasi bertahap |
| [DigiCert](https://digicert.com) | EV Code Signing | ~$400/tahun | ✅ Langsung trusted |

> **Catatan**: EV (Extended Validation) certificate memberikan reputasi SmartScreen **langsung** tanpa masa tunggu. OV certificate memerlukan waktu beberapa minggu untuk membangun reputasi.

### Langkah Upgrade

1. Beli certificate dari CA
2. Download file `.pfx` atau `.p12`
3. Letakkan di `certs/` (git-ignored)
4. Update password di `sign-build.ps1` atau gunakan parameter:

```powershell
.\scripts\sign-build.ps1 -CertPath ".\certs\my-ca-cert.pfx" -CertPassword "CAPassword"
```

5. Update `electron-builder.yml`:
```yaml
forceCodeSigning: true  # Sekarang wajib — gagal build jika cert tidak ada
```

---

## Environment Variables

electron-builder mengenali variabel berikut secara otomatis:

| Variable | Deskripsi |
|---|---|
| `CSC_LINK` | Path ke file `.pfx` atau `.p12` |
| `CSC_KEY_PASSWORD` | Password untuk membuka PFX |
| `CSC_IDENTITY_AUTO_DISCOVERY` | Set `false` untuk menonaktifkan auto-discovery |

Script `sign-build.ps1` mengatur variabel ini secara otomatis.

---

## Konfigurasi electron-builder

File `electron-builder.yml` telah dikonfigurasi dengan:

```yaml
# Identitas publisher — ditampilkan di Windows
win:
  publisherName: "AiWerek Tech"
  verifyUpdateCodeSignature: false   # Beta: skip untuk auto-update
  requestedExecutionLevel: asInvoker # Tidak perlu UAC elevation

# Jangan gagalkan build jika cert tidak ada (beta)
forceCodeSigning: false
```

---

## Struktur File

```
sion-media-desktop/
├── certs/                              ← Git-ignored!
│   └── sion-media-signing.pfx          ← Certificate (JANGAN commit!)
├── scripts/
│   ├── generate-signing-cert.ps1       ← Generate self-signed cert
│   └── sign-build.ps1                  ← Build + sign wrapper
├── build/
│   └── installer.nsh                   ← NSIS customization + SmartScreen page
├── docs/
│   └── CODE_SIGNING.md                 ← Dokumentasi ini
└── electron-builder.yml                ← Signing configuration
```

---

## Troubleshooting

### SmartScreen masih muncul setelah signing?

Self-signed certificate **tidak menghilangkan** peringatan SmartScreen. Hanya certificate dari CA terpercaya yang dapat menghilangkannya. Self-signed cert tetap berguna karena:
- Menambahkan metadata publisher ke EXE
- Membuktikan integritas file (tidak dimodifikasi pihak ketiga)
- Menyiapkan infrastruktur untuk CA cert di masa depan

### Build gagal dengan error signing?

```powershell
# Build tanpa signing
.\scripts\sign-build.ps1 -SkipSign

# Atau nonaktifkan auto-discovery
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run build:win
```

### Certificate expired?

```powershell
# Hapus cert lama dan generate baru
Remove-Item .\certs\sion-media-signing.pfx
.\scripts\generate-signing-cert.ps1
```

---

## Keamanan

> ⚠️ **PENTING**: File `.pfx` berisi private key. **JANGAN PERNAH** commit ke Git!

- `certs/` sudah ada di `.gitignore`
- Jangan share file PFX melalui chat/email tanpa enkripsi
- Gunakan password yang kuat untuk CA certificate
- Untuk CI/CD: gunakan GitHub Actions Secrets (`CSC_LINK` base64-encoded)

---

© 2026 AiWerek Tech
