# Implementation Plan - Bible Pack External SQLite Schema Fix

Abaikan kegagalan pencarian Alkitab lama karena perbedaan skema SQLite hasil scraper. Dokumen ini mendeskripsikan perbaikan untuk database schema mismatch pada `bibleExternalSqliteRepository.ts`.

## User Review Required

> [!IMPORTANT]
> **Penyelarasan Skema**: Kolom pada tabel database eksternal hasil scraper (`tb_lai_1974.sqlite`) berbeda dengan asumsi awal kode. Kita akan memetakan kolom-kolom baru (`book_code`, `book_order`, `chapters_count`) menggunakan alias SQL agar tetap kompatibel dengan frontend tanpa perlu merombak tipe data frontend.

## Proposed Changes

### Main Process

#### [MODIFY] [bibleExternalSqliteRepository.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/services/bible/bibleExternalSqliteRepository.ts)

- Menambahkan fungsi diagnosik skema tabel (`PRAGMA table_info`) untuk mencatat skema database yang aktif saat inisialisasi.
- Menyesuaikan query di `getBibleBooks()` untuk memetakan kolom database scraper ke alias yang diharapkan frontend.
- Menyesuaikan query di `getBibleChapter()` untuk menggunakan query `LEFT JOIN` yang aman dan referensi kolom `book_code`.
- Menyesuaikan query di `getBibleVerseRange()` untuk menggunakan format range query yang aman dengan `LEFT JOIN` dan filter `book_code`.
- Menyesuaikan query di `searchBibleVerses()` untuk menggunakan `LEFT JOIN` yang kompatibel dengan kolom `book_code` dan menambahkan sanitasi keyword pencarian untuk menghindari error parser FTS5.
- Menambahkan penanganan error spesifik jika skema kolom tidak sesuai dengan menampilkan pesan kesalahan yang ramah kepada user.

## Verification Plan

### Automated Tests

- Menjalankan compile TypeScript:
  ```bash
  npx tsc --noEmit
  ```
- Menjalankan build aplikasi:
  ```bash
  npm run build
  ```

### Manual Verification

1. Buka View > Bible, pastikan daftar kitab di panel kiri muncul tanpa error.
2. Buka Kejadian 1, Mazmur 23, Yohanes 3, dan Wahyu 22.
3. Lakukan pencarian teks: "kasih", "sabat", "iman".
4. Lakukan parsing referensi: "Yoh 3:16", "Mzm 23", "Why 14:6-12", "1 Kor 13:1-13".
