---
title: Plan — Song Number Normalization (Remove Leading Zeros)
phase: implemented
status: done
---

> **Status:** ✅ IMPLEMENTED — Lihat `04-implementation/23-log-impl-song-number-normalization.md`

# Objective

Menghilangkan _leading zeros_ pada `songs.number` secara **konsisten** di:

- SQLite (single source of truth)
- FTS5 (`songs_fts`) dan query pencarian
- Seluruh UI renderer (Library Mode + metadata player)
- Jalur import/copy/create/update lagu (agar tidak reintroduce padding)

# Audit Findings (Baseline)

## Data source

- `src/main/seed-data.ts` memasok `song.song_number` ke DB saat seeding (`database.ts`). Indikasi kuat nilai `song_number` berformat padded (mis. `"001"`).

## Penyimpanan DB

- Kolom `songs.number` bertipe `TEXT` dan dipakai juga sebagai kolom FTS5 (`songs_fts.number`).
- Triggers `songs_ai/songs_au/songs_ad` menjaga sinkronisasi FTS5 untuk insert/update/delete.

## Tampilan UI

- `LibraryNumberView.tsx` menampilkan `song.number` langsung.
- `SongCard.tsx` menampilkan `song.number` langsung.
- `LibraryLyricsViewer.tsx` header menampilkan `song.number` langsung.

Kesimpulan: **padded number berasal dari data/DB**, bukan dari formatter renderer.

# Strategy

## 1) DB-first normalization (Migration v9)

Tambahkan migrasi baru di `src/main/migrations.ts`:

- Update semua `songs.number` yang memiliki awalan `0`.
- Rule:
  - `LTRIM(number, '0')` untuk menghapus nol di depan.
  - Edge case nomor `"0"` atau semua nol: hasil `LTRIM` bisa kosong `""`, harus menjadi `"0"`.
  - Nomor dengan suffix alfabet dipertahankan: `"001A" -> "1A"`.

SQL (inti):

- `UPDATE songs SET number = CASE WHEN LTRIM(number, '0') = '' THEN '0' ELSE LTRIM(number, '0') END WHERE number LIKE '0%';`

FTS5 consistency:

- Karena update akan memicu trigger `songs_au`, `songs_fts` akan ikut ter-update.
- Namun untuk memastikan indeks bersih, jalankan rebuild FTS5 (best-effort):
  - `INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`

## 2) Prevent regression (normalize on write)

Tambahkan helper normalisasi di `src/main/database.ts` dan pakai pada:

- `seedDatabase()`
- `reseedDatabase()`
- `addSong()`
- `updateSong()` (hanya bila `song.number` diberikan)

Dengan ini, jalur import/copy yang memanggil `addSong/updateSong` otomatis aman.

## 3) Renderer audit

Karena renderer tidak melakukan padding, perubahan UI minimal:

- Tidak menambahkan formatter baru.
- Jika ada tempat yang melakukan masking/padding (mis. `padStart`), hapus.

# Verification Plan

## Manual checks

- Library Number Grid:
  - `001` menjadi `1`
  - `010` menjadi `10`
  - `001A` menjadi `1A`
- Search Palette:
  - ketik `1` mengembalikan lagu nomor `1`.

## Dev checks

- `npm run typecheck`
- `npm run lint`

# Rollback / Safety

- Migrasi hanya memodifikasi kolom `songs.number`.
- Karena tipe tetap `TEXT`, tidak ada perubahan schema.
- Jika ada konflik duplikasi nomor setelah normalisasi (mis. `001` dan `1` dalam hymnal sama), perlu ditangani manual (di luar scope v9) — migrasi ini tetap dijalankan untuk konsistensi UI/UX.
