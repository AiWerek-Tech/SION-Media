# Song Import Documentation

## Overview

Dokumentasi untuk proses import lagu Lagu Sion (LS) ke database SION Media menggunakan Python scraper.

## Perubahan Penting (2026-05-12)

### 1. Penghapusan Sistem Scraper Internal

**Status**: ✅ Selesai

Sistem scraper internal telah dihapus sepenuhnya dari aplikasi untuk mengurangi ukuran dan kompleksitas aplikasi.

**Yang dihapus:**

- Dependencies: `cheerio`, `playwright`
- Backend: `src/main/scraper/` (seluruh direktori)
- Frontend: `src/renderer/src/components/scraper/` (seluruh direktori)
- Types: `src/shared/contracts/scraper.ts`, `src/shared/errors/scraperErrors.ts`
- IPC: semua `IPC_SCRAPER` channels dan handlers
- Database: semua fungsi audit scraper
- Preload: scraper API di `preload/index.ts` dan `index.d.ts`
- Pages: `SongScraperPage.tsx`
- Menu: Song Scraper dari TitleBarMenu

**Alasan penghapusan:**

- Mengurangi ukuran aplikasi
- Mengurangi kompleksitas kode
- Scraper Python lebih fleksibel dan mudah dimaintain
- Scraper internal tidak digunakan secara aktif

### 2. Import Lagu LS 1-525

**Status**: ✅ Selesai

Total 525 lagu Lagu Sion Edisi Lengkap (LS) telah diimpor ke database dengan lirik lengkap.

**Struktur Lirik:**

- Menggunakan section markers `[VERSE N]` dan `[CHORUS]`
- Section markers memungkinkan slide engine mengelompokkan baris menjadi slide yang tepat
- Setiap section dipisahkan dengan baris kosong
- Verse diberi nomor berurutan (VERSE 1, VERSE 2, dst)

**Batch Import:**

1. LS 1-5: Import awal untuk testing
2. LS 6-100: 94 lagu
3. LS 101-200: 100 lagu
4. LS 201-500: 300 lagu
5. LS 501-525: 25 lagu

**Total**: 525 lagu

### 3. Default Database untuk Fresh Install

**Status**: ✅ Selesai

Database dengan 525 lagu telah diset sebagai default untuk fresh install.

**Implementasi:**

- Database saat ini dicopy ke `resources/sion.db`
- `initDatabase()` dimodifikasi untuk copy database dari resources jika belum ada di userData
- `package.json` sudah include `resources/**/*` di build configuration

**Cara kerja:**

- Saat aplikasi diinstall pertama kali, database dari `resources/sion.db` akan dicopy ke userData
- User baru akan otomatis punya semua 525 lagu tanpa perlu import manual

## File yang Tersedia

### Python Scraper

- `scraper.py`: Script Python untuk scrape lagu dari website
- Menggunakan Playwright dan BeautifulSoup
- Menghasilkan JSON dengan struktur yang sesuai untuk database

### Import Script

- `import-to-db.js`: Script Node.js untuk import JSON ke database
- Menggunakan `better-sqlite3` untuk akses database
- Mendukung OS-specific database path (Windows, macOS, Linux)

### JSON Files

- `songs-import-6-100.json`: Lagu LS 6-100 (94 lagu)
- `songs-import-101-200.json`: Lagu LS 101-200 (100 lagu)
- `songs-import-201-500.json`: Lagu LS 201-500 (300 lagu)
- `songs-import-501-525.json`: Lagu LS 501-525 (25 lagu)

## Cara Menggunakan Python Scraper

### Prerequisites

```bash
pip install playwright beautifulsoup4
playwright install
```

### Menjalankan Scraper

```bash
cd .docs/07-song-scraper
python scraper.py
```

### Output

Scraper akan menghasilkan file JSON dengan struktur:

```json
{
  "hymnal_id": 9,
  "number": "1",
  "title": "DI HADAPAN HADIRAT-MU",
  "lyrics_raw": "[VERSE 1]\nDi hadapan hadirat -Mu\n...\n\n[CHORUS]\n...",
  "alternate_title": "",
  "author": "",
  "composer": "",
  "key_note": "",
  "time_signature": "",
  "tempo": "",
  "category": "Lagu Sion",
  "tags": "Lagu Sion, LS, GMAHK"
}
```

## Cara Menggunakan Import Script

### Update Script untuk JSON Baru

Edit `import-to-db.js`:

```javascript
const jsonPath = path.join(__dirname, 'songs-import-XXX.json')
```

### Update Query untuk Range Lagu

```javascript
const existingSongs = db
  .prepare(
    'SELECT id, hymnal_id, number, title FROM songs WHERE hymnal_id = 9 AND CAST(number AS INTEGER) BETWEEN X AND Y'
  )
  .all()
```

### Rebuild better-sqlite3 untuk Node.js

```bash
npm rebuild better-sqlite3
```

### Jalankan Import Script

```bash
node .docs/07-song-scraper/import-to-db.js
```

### Rebuild better-sqlite3 untuk Electron

```bash
npx electron-rebuild -f -w better-sqlite3
```

## Struktur Lirik yang Benar

### Format yang Benar

```
[VERSE 1]
Baris pertama verse 1
Baris kedua verse 1
Baris ketiga verse 1

[CHORUS]
Baris pertama chorus
Baris kedua chorus
Baris ketiga chorus

[VERSE 2]
Baris pertama verse 2
Baris kedua verse 2
```

### Aturan Penting

- Section markers menggunakan huruf kapital: `[VERSE N]`, `[CHORUS]`
- Setiap section dipisahkan dengan baris kosong
- Verse diberi nomor berurutan
- Tidak ada leading zeros pada nomor verse (VERSE 1, bukan VERSE 01)

## Database Path

### Windows

```
C:\Users\[USER]\AppData\Roaming\sion-media\sion.db
```

### macOS

```
~/Library/Application Support/sion-media/sion.db
```

### Linux

```
~/.config/sion-media/sion.db
```

## Troubleshooting

### Error: NODE_MODULE_VERSION Mismatch

**Masalah**: better-sqlite3 dikompilasi untuk Node.js versi berbeda

**Solusi**:

```bash
# Untuk import script (Node.js)
npm rebuild better-sqlite3

# Untuk aplikasi Electron
npx electron-rebuild -f -w better-sqlite3
```

### Error: Database Locked

**Masalah**: Database sedang digunakan oleh aplikasi

**Solusi**: Tutup aplikasi SION Media sebelum menjalankan import script

### Error: File Not Found

**Masalah**: Path JSON atau database salah

**Solusi**: Cek path di `import-to-db.js` dan pastikan file JSON ada

## Status Saat Ini

- ✅ Scraper internal dihapus
- ✅ 525 lagu LS diimpor
- ✅ Default database diset
- ✅ Aplikasi lebih ringan tanpa scraper
- ✅ Python scraper tersedia untuk import tambahan

## Catatan Penting

- Scraper Python lebih fleksibel dan mudah dimodifikasi
- Import lagu tambahan dapat dilakukan kapan saja menggunakan Python scraper
- Database default akan diupdate saat build baru jika ada perubahan
- Lirik dengan section markers memastikan slide segmentation yang benar
