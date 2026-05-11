---
version: 11
title: Plan — Import Lagu via JSON (Management Mode)
status: draft
---

# Phase 0 — Plan

## Scope
Fitur **Import Lagu via JSON** di **Management Mode** (`ManagementMode.tsx`) dengan:

- IPC handler baru `db:import-json` (main process)
- Bulk import berbasis `better-sqlite3` transaction (`db.transaction()`)
- Hardening:
  - Limit ukuran file 10MB
  - Validasi skema minimal: `number`, `title`, `lyrics_raw`, `hymnal_id`
  - Normalisasi `number` (hapus leading zeros) tanpa mengubah dukungan nomor non-numerik (mis. `100A`)
- Multi-Hymnal:
  - Mapping `hymnal_id` yang tidak ditemukan
  - Jika item tidak punya `hymnal_id`, operator memilih target hymnal
- Auto search sync:
  - `PRAGMA wal_checkpoint(FULL)` sebelum & sesudah operasi besar
  - FTS5 re-index: `INSERT INTO songs_fts(songs_fts) VALUES('rebuild')` setelah import selesai
- UI/UX:
  - Import Wizard (FilePicker drag-drop + preview)
  - Conflict resolution dialog (SKIP / OVERWRITE / APPEND)
  - Progress tracking async (linear progress bar + Framer Motion)

## JSON Contract (Enterprise Standard)
Top-level JSON **wajib** berupa array of song objects.

Field yang didukung (subset minimum + metadata):

- Wajib:
  - `number` (string)
  - `title` (string)
  - `lyrics_raw` (string)
  - `hymnal_id` (number) — boleh kosong per-item, tetapi harus di-resolve sebelum import
- Opsional:
  - `alternate_title` (string)
  - `author` (string)
  - `composer` (string)
  - `key_note` (string)
  - `time_signature` (string)
  - `tempo` (number | string)
  - `category` (string)
  - `tags` (string)

Catatan:

- `number` diperlakukan sebagai string (mendukung `100A`).
- `lyrics_raw` menggunakan `\n` untuk baris baru dan `\n\n` untuk pemisah bait.

## Validation Spec (Renderer + Main)
Validasi dilakukan **dua lapis** untuk keamanan:

### 1) Renderer (sebelum IPC)
- Validasi ukuran file: `file.size <= 10MB`
- Validasi JSON parse:
  - Harus `Array.isArray(json)`
- Validasi sampling cepat untuk preview:
  - `number`, `title`, `lyrics_raw` ada dan bertipe string-ish
  - `hymnal_id` jika ada harus number-ish
- Hitung preview summary:
  - total item
  - missing `hymnal_id`
  - hymnal_id tidak dikenal (berdasarkan `hymnals` dari store)
  - potensi duplikat (berdasarkan key `(hymnal_id, number)` setelah normalisasi)

### 2) Main (authoritative)
Main process mengulangi validasi karena renderer bisa dimodifikasi.

- Reject jika payload byte size > 10MB (guard tambahan)
- Validasi setiap item:
  - required fields exist
  - `number` normalized
  - `hymnal_id` resolved (per-item atau default hymnal)

## Leading Zeros Normalization (V7.0 Prompt)
Aturan normalisasi `number`:

- Jika `number` berupa digit-only (regex `^[0-9]+$`), hapus leading zeros:
  - `"001" -> "1"`
  - `"000" -> "0"`
- Jika mengandung huruf/simbol (mis. `100A`), **jangan** strip secara agresif; hanya trim whitespace.

Implementasi utama memakai fungsi yang sudah ada di backend (`normalizeSongNumber`) bila cocok, atau tambahan util baru yang konsisten.

## Conflict Definition
Konflik terjadi bila ada lagu existing dengan:

- `songs.hymnal_id == resolved_hymnal_id` AND `songs.number == normalized_number`

Catatan:

- Konflik berbasis `(hymnal_id, number)` (bukan title) untuk lebih deterministik dan sesuai acceptance criteria.

## Conflict Resolution Modes
Untuk tiap konflik:

- `SKIP`:
  - tidak insert / tidak update
- `OVERWRITE`:
  - `UPDATE songs SET ...` replace field yang didukung dari JSON
- `APPEND`:
  - `lyrics_raw = old.lyrics_raw + "\n\n" + new.lyrics_raw` (dengan separator yang aman)
  - metadata lain dapat di-overwrite selektif (ditentukan pada implementasi; default: isi field kosong saja)

## Bulk Insert / Update Algorithm (Main)
Target: 1000 lagu < 2 detik.

### Strategy
- Gunakan prepared statements untuk insert/update/select.
- Proses dalam satu `db.transaction()`.
- Jalankan WAL checkpoint sebelum & sesudah operasi besar.
- Setelah transaction sukses, trigger FTS memang ada, tetapi requirement mewajibkan full rebuild untuk memastikan konsistensi.

### Pseudocode
1. `checkpointWal(FULL)`
2. `tx(() => {`
   - build map hymnal ids available
   - for each item:
     - resolve hymnal_id (item.hymnal_id ?? defaultHymnalId)
     - validate required fields
     - normalize number
     - find existing song id by `(hymnal_id, number)`
     - apply resolution:
       - skip
       - overwrite -> update stmt
       - append -> update lyrics stmt
       - new -> insert stmt
   `})`
3. `checkpointWal(FULL)`
4. `rebuildFTS()`

### Return Payload
Return summary untuk UI:

- `total`
- `inserted`
- `updated_overwrite`
- `updated_append`
- `skipped`
- `errors` (array terbatas; mis. max 50) untuk avoid payload bloat
- `unknownHymnalIds` (untuk warning)

## UI/UX Design (Professional Hub Style)
Implementasi di `ManagementMode.tsx` sebagai wizard modal/panel:

### Step 1 — Pick File
- FilePicker drag-drop (JSON only)
- Info limit 10MB

### Step 2 — Preview Summary
- Metrics:
  - total lagu
  - duplicate count (by `(hymnal, number)`)
  - hymnal distribution
  - missing/unknown hymnal id
- Dropdown `Default Hymnal` untuk item tanpa `hymnal_id` atau untuk mapping unknown hymnal

### Step 3 — Conflict Resolution Dialog
- Tabel konflik:
  - existing song (number/title)
  - incoming song (number/title)
  - per-item resolution: SKIP/OVERWRITE/APPEND
- Bulk action buttons:
  - set all to SKIP / OVERWRITE / APPEND

### Step 4 — Import Progress
- Start import via `window.api.db.importJson(...)` (IPC async)
- Progress bar + label status
- Disable interactions while importing

## Renderer/Main Data Contract
Renderer mengirim payload ke IPC `db:import-json`:

- `items`: array of song-like objects
- `defaultHymnalId`: number | null
- `hymnalIdRemap`: Record<number, number> (unknown hymnal remapping)
- `conflictPolicy`: 'skip' | 'overwrite' | 'append'
- `perItemPolicy`: Record<string, 'skip' | 'overwrite' | 'append'> keyed by `${resolvedHymnalId}:${normalizedNumber}`

Main akan:

- melakukan resolve final
- menjalankan import atomik
- mengembalikan summary

## Race Condition & Stability Notes
- Semua operasi write ada di main process pada single sqlite connection.
- Transaction memastikan atomicity.
- Renderer tidak melakukan write per-item; hanya 1 IPC call untuk import.
- Rebuild FTS dilakukan setelah commit.

## Files to Change (Phase 1)
- `src/shared/ipc-channels.ts` (tambahkan channel `db:import-json`)
- `src/main/ipc-handlers.ts` (register `ipcMain.handle('db:import-json', ...)`)
- `src/main/database.ts` (function `importSongsFromJson` + WAL checkpoint + FTS rebuild)
- `src/preload/index.ts` (expose `window.api.songs.importJson` atau `window.api.db.importJson`)
- `src/renderer/src/screens/modes/ManagementMode.tsx` (wizard UI)
- Optional: shared types untuk request/response

