---
title: Log — Implementasi Song Number Normalization (Remove Leading Zeros)
phase: 2-log
status: implemented
---

# Ringkasan
Perubahan ini menormalkan nomor lagu agar **tidak lagi menampilkan leading zeros** (contoh: `001 -> 1`, `010 -> 10`, `001A -> 1A`) dengan prioritas **DB-first**.

# Perubahan DB (Single Source of Truth)
## `src/main/migrations.ts`
- Menambahkan **Migration v9**: `normalize_song_numbers_remove_leading_zeros`.
- Migrasi melakukan:
  - `UPDATE songs` untuk menghapus nol di depan menggunakan `LTRIM(number, '0')`.
  - Menjaga edge case:
    - jika hasil `LTRIM` kosong, set menjadi `'0'`.
  - Menjalankan rebuild FTS5 (best-effort):
    - `INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`

Efek:
- Trigger `songs_au` memastikan `songs_fts` ikut tersinkron saat update.
- Rebuild memastikan indeks FTS5 konsisten untuk pencarian angka tanpa nol.

# Prevent Regression (Normalize on Write)
## `src/main/database.ts`
- Menambahkan helper `normalizeSongNumber()`.
- Dipakai di jalur:
  - `seedDatabase()`
  - `reseedDatabase()`
  - `addSong()`
  - `updateSong()` (hanya saat field `number` di-update)

Efek:
- Import/copy/create/update yang melewati `addSong/updateSong` tidak akan mengembalikan format padded.

# View Layer (UI)
Walaupun DB akan jadi sumber kebenaran setelah migrasi, UI juga dibuat tolerant untuk data lama:

## `src/renderer/src/components/library/LibraryNumberView.tsx`
- Nomor pada grid ditampilkan melalui `normalizeDisplayNumber()`.

## `src/renderer/src/components/SongCard.tsx`
- Badge nomor pada kartu lagu menampilkan nomor tanpa nol di depan.

## `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
- Header metadata nomor lagu menampilkan nomor tanpa nol di depan.

# Dampak terhadap Search (FTS5)
- Setelah migrasi v9, pencarian numeric seperti `1` akan matching ke `songs.number = '1'`.
- Rebuild FTS5 membantu memastikan hasil pencarian instan & akurat.

# Verifikasi
- `npm run typecheck`: lulus (manual verif).

# Catatan
- Jika di dalam satu hymnal terdapat duplikasi yang baru terlihat setelah normalisasi (mis. `001` dan `1`), migrasi tidak menghapus data; konflik tersebut perlu resolusi domain (di luar scope perubahan ini).
