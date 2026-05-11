---
version: 11
title: Log — Implementasi Import Lagu via JSON (Management Mode)
date: 2026-05-10
status: implemented
---

# Phase 2 — Implementation Log

## Ringkasan
Fitur **Import Lagu via JSON** telah ditambahkan ke **Management Mode** untuk mendukung import massal ribuan lagu dengan:

- IPC handler `db:import-json`
- Bulk write atomik via `better-sqlite3` transaction (`db.transaction()`)
- WAL checkpoint `PRAGMA wal_checkpoint(FULL)` sebelum & sesudah operasi besar
- Rebuild index FTS5: `INSERT INTO songs_fts(songs_fts) VALUES('rebuild')`
- Hardening:
  - Limit 10MB
  - Validasi field wajib
  - Normalisasi `number` (leading zeros) untuk digit-only
- Multi-Hymnal:
  - Default hymnal untuk item tanpa `hymnal_id`
  - Remap untuk `hymnal_id` yang tidak ada di database
- UI Wizard:
  - Drag-and-drop file JSON
  - Preview summary (total, konflik, missing hymnal)
  - Conflict policy global + override per konflik
  - Progress bar (Framer Motion)

Enhancement tambahan (enterprise-grade):

- Import Session Report (summary + error list) ditampilkan setelah proses selesai dan dipersist ke `app_state`.
- Dry Run mode (**Validate Only**) untuk validasi dataset tanpa write ke database.
- Schema wrapper support: JSON boleh berupa array langsung atau wrapper `{ schema_version, exported_at, songs: [...] }` (backward compatible).

## Files Changed
- `src/main/database.ts`
  - Tambah `importSongsFromJson()`
  - Tambah `rebuildSongsFts()`
  - Hardening `normalizeSongNumber()` agar tidak merusak nomor seperti `100A`
- `src/main/ipc-handlers.ts`
  - Register IPC `db:import-json`
- `src/preload/index.ts`
  - Expose `window.api.songs.importJson(payload)`
- `src/preload/index.d.ts`
  - Update typing `SongsAPI.importJson()`
- `src/shared/ipc-channels.ts`
  - Tambah konstanta `IPC_SONGS.IMPORT_JSON`
- `src/renderer/src/screens/modes/ManagementMode.tsx`
  - Tambah **Import JSON Wizard** (Step 1-3)

## Cara Pakai (Operator)
1. Masuk ke **Management Mode**.
2. Klik tombol **Import JSON**.
3. Drag & drop file `.json` (maks 10MB) atau klik untuk memilih file.
4. Di halaman preview:
   - Pilih **Default Hymnal** jika ada item tanpa `hymnal_id`.
   - Jika ada `hymnal_id` yang tidak dikenal, lakukan **mapping** ke hymnal yang tersedia.
   - Tentukan **Default Conflict Policy**:
     - `SKIP`
     - `OVERWRITE`
     - `APPEND`
   - Opsional: override per konflik pada tabel.
5. Klik **Mulai Import**.
6. Setelah selesai, library akan refresh otomatis dan lagu langsung bisa dicari di **Library Mode** (FTS rebuild).

## Format JSON (Enterprise Standard)
Top-level JSON bisa berupa:

- Array langsung (legacy / simple)
- Wrapper object (recommended)

- Field wajib:
  - `number` (string)
  - `title` (string)
  - `lyrics_raw` (string)
  - `hymnal_id` (number) — boleh kosong per item, namun harus di-resolve via Default Hymnal
- Metadata yang didukung:
  - `alternate_title`, `author`, `composer`, `key_note`, `time_signature`, `tempo`, `category`, `tags`

### Contoh
```json
{
  "schema_version": 1,
  "exported_at": "2026-05-10T10:00:00Z",
  "songs": [
    {
      "hymnal_id": 1,
      "number": "1",
      "title": "Di Hadapan Hadirat-Mu",
      "alternate_title": "Before Jehovah's Awful Throne",
      "author": "Isaac Watts",
      "composer": "John Hatton",
      "key_note": "D",
      "time_signature": "4/4",
      "tempo": 100,
      "category": "Pujian",
      "lyrics_raw": "[VERSE]\nDi hadapan hadirat-Mu\nKami umat-Mu menyembah\nMengakui Engkau Tuhan\nAllah kekal, Maha kuasa.\n\n[CHORUS]\nSembah sujud, puji Dia\nSelamanya.",
      "tags": "pembukaan, agung"
    },
    {
      "hymnal_id": 1,
      "number": "5",
      "title": "Kasih Surga Yang Terindah",
      "alternate_title": "Love Divine",
      "author": "Charles Wesley",
      "composer": "John Zundel",
      "key_note": "Ab",
      "time_signature": "4/4",
      "tempo": 90,
      "category": "Kasih Allah",
      "lyrics_raw": "[VERSE]\nKasih Surga yang terindah\nTurunlah pada kami\nDalam kami bertakhtalah\nDan sucikanlah hati.",
      "tags": "kasih, penyerahan"
    }
  ]
}
```

## Dry Run (Validate Only)
Di wizard import, operator dapat mengaktifkan opsi **Dry Run**.

Yang dilakukan:

- Parse JSON + schema validation
- Resolve hymnal (default / remap)
- Deteksi konflik `(hymnal_id, number)`

Yang tidak dilakukan:

- Tidak ada write ke DB
- Tidak ada FTS rebuild

Hasil dry run tetap menghasilkan **Import Session Report**.

## Import Session Report
Setelah proses selesai (import ataupun dry run), aplikasi menampilkan report summary dan menyediakan tombol **Download Report**.

Report juga dipersist ke `app_state` dengan key:

- `last_json_import_report`

## Aturan Normalisasi `number`
- Jika `number` digit-only (`^[0-9]+$`), leading zeros dihapus otomatis:
  - `"001" -> "1"`
  - `"000" -> "0"`
- Jika mengandung huruf (mis. `100A`), value dipertahankan (hanya trim whitespace).

## Catatan Konflik
Konflik dihitung berbasis:

- `(resolved_hymnal_id, normalized_number)`

Policy:

- `SKIP`: tidak mengubah lagu existing
- `OVERWRITE`: replace konten existing dengan konten JSON
- `APPEND`: append `lyrics_raw` baru di bawah lirik lama dipisah `\n\n`

## Verifikasi
- `npm run typecheck`: OK
- `npm run lint`: OK (0 errors; warnings Prettier tetap ada)
