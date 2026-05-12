# Plan — Management Mode Refactor v10 (Enterprise Content Hub)

## Phase 0 — Audit & Planning (Stability First)

### Scope

Management Mode (`src/renderer/src/screens/modes/ManagementMode.tsx`) akan ditransformasi dari UI linear menjadi **Enterprise Content Hub** dengan **Bento-Grid Dashboard**, sekaligus memperkuat jalur data SQLite (WAL discipline), impor/ekspor yang hardened, dan editor lagu menjadi **Professional Lyric Studio**.

### Current State Snapshot (What exists today)

#### UI

- `ManagementMode.tsx`
  - Sudah punya:
    - Selector hymnal.
    - Statistik coverage lirik (empty vs filled).
    - List lagu dengan virtualisasi manual (scrollTop + slice) dan row height konstan.
    - Quick edit untuk metadata dasar.
    - Navigasi ke `SongEditorScreen`.
  - Belum punya:
    - Bento grid dashboard (modul dipisah menjadi kartu-kartu).
    - Bulk actions (multi-select, move/copy/delete).
    - High-density admin table yang konsisten (zebra striping + action affordance hover).
    - Conflict resolution UI saat impor hymnal.

- `SongEditorScreen.tsx`
  - Sudah ada:
    - Auto-format (via `autoFormatLyrics`) dan generate slides (preview data).
    - Hot swap ke proyektor saat update.
  - Gap besar:
    - Layout masih satu form + textarea + preview sederhana (belum 3 kolom).
    - Tidak ada slide strip thumbnails.
    - Tidak ada live preview 16:9 yang benar-benar “projection-accurate”.
    - Tidak ada dirty-state guard saat keluar.
    - Validasi metadata masih minimal (key/tempo/time signature belum guarded).

- `ImportExportScreen.tsx`
  - Sudah ada:
    - Import JSON dan Excel via `window.api.file.parseExcel`.
    - Deteksi duplikat sederhana (berdasarkan title/number di `songs` state), bisa skip.
  - Gap:
    - Tidak ada limit keamanan (size/rows/cols).
    - Konflik hanya “skip duplicates” (tidak ada Overwrite / Merge).
    - Deteksi duplikat tidak hymnal-aware (harusnya per hymnal/induk).

#### Backend (Main Process)

- `src/main/database.ts`
  - Sudah set `journal_mode=WAL` dan `foreign_keys=ON`.
  - Ada legacy handling yang **destruktif** jika `hymnals` table tidak ada (wipe DB). Ini tidak sesuai target “non-destructive migration” untuk masa depan.
  - Belum ada disiplin **WAL checkpoint** setelah operasi write.

- `src/main/migrations.ts`
  - Sudah ada:
    - `ON DELETE CASCADE` untuk hymnal->songs dan relations.
    - FTS5 (`songs_fts`) dengan triggers insert/update/delete untuk sync instan.
  - Gap:
    - Belum ada migrasi untuk kolom baru seperti `time_signature` (di UI sudah dipakai), perlu dicek versi schema aktual.
    - Belum ada indeks tambahan untuk operasi admin skala besar (mis. hymnal_id + number/title).

## Gap Analysis vs Requirements

### 1) Data Integrity (SQLite)

- **WAL Checkpoint setelah write**: belum ada.
- **Migrasi non-destruktif**: sudah ada sistem migrasi, tetapi masih ada jalur “wipe DB” untuk schema lama.
- **Relasi ON DELETE CASCADE**: sudah ada pada migration v1.

### 2) Hardened Import/Export

- **Excel safety limits** (10MB, 5000 rows, 50 cols): belum ada.
- **Conflict resolution UI**: belum ada (baru skip duplicates).
- **Hymnal conflict semantics**: belum jelas/tepat (dupe check saat ini global di `songs` state, bukan scoped hymnal + opsi merge).

### 3) FTS5 Synchronization

- Sudah ada triggers `songs_ai/songs_au/songs_ad` untuk sync instan.
- Perlu audit bahwa semua update lirik terjadi via table `songs` (bukan bypass) agar trigger selalu terpanggil.

### 4) UI/UX Premium 2026

- Management hub harus bento dashboard dan admin console style.
- Lyric Studio 3 kolom + slide strip thumbnails + live 16:9 preview.
- Action affordance hover dan depth layering konsisten.
- Transisi layout `framer-motion` durasi 0.4s, easing `[0.22, 1, 0.36, 1]`.

### 5) Edge Cases & Performance

- Large library: requirement minta `@tanstack/react-virtual` (saat ini virtualisasi manual).
- Unsaved changes: belum ada.
- IPC listener cleanup: sebagian API sudah return unsubscribe (mis. `window.api.window.onMaximizedChanged`), perlu cek implementasi layar manajemen/editor apakah ada listener yang belum dibersihkan.

## Proposed Architecture (v10)

### A. Management Hub (Bento Grid)

`ManagementMode.tsx` akan dipecah menjadi:

- **ManagementHubScreen**: bento grid container.
- **HymnalManagerCard**: statistik, create/edit/delete hymnal, official/custom badge.
- **SongLibraryAdminCard**:
  - high-density virtual list (tanstack virtual).
  - zebra striping.
  - row actions (edit/delete) dengan affordance.
  - bulk select + bulk actions.
- **QuickDatabaseToolsCard**: backup/restore/reseed + integrity check.
- **SystemConfigurationCard**: theme applier + display profile.

### B. Professional Lyric Studio

Refactor `SongEditorScreen.tsx` menjadi studio 3 kolom:

1. **Metadata Panel**
   - number, title ID/EN, key, time signature, tempo.
   - Guard rails:
     - Key: `A-G` (+ opsi minor/flat/sharp jika sudah ada standar).
     - Tempo: numeric BPM (range disepakati).
     - Time signature: pattern `^\d{1,2}/\d{1,2}$`.
2. **Slide Strip View**
   - thumbnails per slide (hasil `generateSlides`) dengan selection state.
   - tools: Insert Chorus, Split Slide (`---`), Auto-balance lines.
3. **Live Presentation Preview (16:9)**
   - renderer preview yang menggunakan aturan yang sama dengan Projection (font, max lines, alignment) agar 100% akurat.

### C. Backend Stability Enhancements

- Tambahkan util `checkpointWal()` dipanggil setelah:
  - add/update/delete song
  - add/update/delete hymnal
  - import batch write
  - reseed/restore
- Pilih strategi checkpoint:
  - default: `PRAGMA wal_checkpoint(PASSIVE)` per write kecil.
  - untuk batch: `PRAGMA wal_checkpoint(TRUNCATE)` setelah transaksi selesai.

### D. Import/Export Hardened + Conflict Resolution

- Pindahkan validasi file Excel ke main process saat parsing:
  - **size** <= 10MB
  - **rows** <= 5000
  - **cols** <= 50
- Tambahkan mode konflik:
  - **Skip**: abaikan item konflik.
  - **Overwrite**: update song existing.
  - **Merge**: merge field tertentu (mis. lyrics_raw append/replace, tags union).
- UI: step tambahan sebelum commit write:
  - table konflik dengan pilihan per-item + pilihan “apply to all”.

## Milestones (Implementation Plan)

1. **Database hardening**
   - Add WAL checkpoint helper dan integrasikan ke semua write path.
   - Tambahkan migrasi non-destruktif untuk kolom yang dipakai UI tetapi belum ada di schema (mis. `time_signature`).
   - Pastikan indeks yang diperlukan untuk admin list + dupe detection.

2. **Import/Export hardened + conflict resolution**
   - Implement limits di parser.
   - Tambah endpoint IPC untuk “upsert with policy” (skip/overwrite/merge).
   - Update UI ImportExportScreen untuk workflow konflik.

3. **Management Hub UI (Bento + Admin Console)**
   - Refactor ManagementMode menjadi bento dashboard.
   - Implement `@tanstack/react-virtual` untuk Song Library Admin.
   - Bulk actions (move hymnal, delete) dengan konfirmasi.

4. **Lyric Studio (3-column) + framer-motion transitions**
   - Implement studio layout dan preview 16:9.
   - Smart tools (insert chorus / split / auto-balance) dengan UX cepat.
   - Dirty-state guard.

## Open Questions (Need your confirmation)

- Key signature format yang diinginkan:
  - Apakah cukup `A-G` saja, atau perlu `A#m`, `Bb`, `Cm`, dll?
- Merge policy untuk konflik import:
  - Lyrics: overwrite vs append? (mis. pilih yang lebih panjang, atau tampilkan diff?)
- Time signature/tempo constraints:
  - Range BPM default?

## Definition of Done (Acceptance Criteria Mapping)

- Tidak ada orphan data; delete hymnal menghapus songs via cascade.
- FTS5 tetap sinkron setelah edit lirik dan bulk ops.
- Search tetap instan (<100ms) untuk library besar.
- Management hub tampil premium (bento, depth layering, affordance hover) + editor preview akurat.
