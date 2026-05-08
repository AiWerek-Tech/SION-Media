# Changelog: Database Multi-Hymnal Revamp

**Tanggal:** 2026-05-08  
**Cakupan:** Phase 1 (Schema Revamp) + Phase 2 (Backend Operations) + Phase 3 (IPC Handlers) + Phase 4 (UI Adaptation)

---

## Ringkasan Perubahan
Perombakan total arsitektur database SION Media dari sistem buku lagu tunggal menjadi **Multi-Hymnal Worship Platform**. Semua tabel, query, jalur komunikasi (IPC), state management, dan antarmuka pengguna (UI) telah disesuaikan 100% dengan blueprint arsitektur.

---

## File yang Dimodifikasi

### 1. `src/main/database.ts` — Database Engine (Perombakan Besar)
* **Wipe-out Logic**: Implementasi deteksi skema lama untuk penghapusan otomatis file `sion.db` lama demi integritas data.
* **Schema Baru**: Tabel `hymnals`, `songs` (updated fields), `song_relations`, `playlist_items` (updated).
* **FTS5 Search**: Query pencarian global yang menggabungkan hasil dari semua buku lagu dengan JOIN performa tinggi.

### 2. `src/main/index.ts` — IPC Handlers
* Pendaftaran handler untuk CRUD Hymnals (`db:get-hymnals`, `db:add-hymnal`, dll).
* Update handler `db:get-songs` untuk mendukung filter `hymnalId`.

### 3. `src/preload/index.ts` — Preload API Bridge
* Ekspos namespace `api.hymnals` dan `api.songs.getRelations` ke Renderer process.

### 4. `src/renderer/src/store/useAppStore.ts` — State Management
* Penambahan state `hymnals` dan `selectedHymnalId`.
* Sinkronisasi otomatis: mengubah `selectedHymnalId` akan memicu `loadSongs()` untuk buku tersebut.

### 5. Antarmuka Pengguna (UI) — Multi-Hymnal Experience
* **`SongLibraryPanel.tsx`**: Implementasi **Hymnal Sidebar** (Panel kiri) untuk navigasi cepat antar buku lagu.
* **`SettingsScreen.tsx`**: Penambahan section **"Buku Lagu"** untuk manajemen koleksi (Tambah/Edit/Hapus buku custom).
* **`SongEditorScreen.tsx`**: Penambahan dropdown pemilihan buku saat menambah/mengedit lagu.
* **`ImportExportScreen.tsx`**: Penambahan opsi pemilihan target buku lagu saat melakukan impor massal dari Excel/JSON.
* **`SongCard.tsx`**: Badge buku lagu dinamis menggunakan `hymnal_code`.

---

## Verifikasi Akhir (Audit Compliance)
* [x] **100% Schema Alignment**: Database sesuai dengan `arch-multihymnal-ecosystem.md`.
* [x] **Zero Warning Policy**: `database.ts` bersih dari linter/compiler warning.
* [x] **Relational Integrity**: Penggunaan Foreign Keys dengan `ON DELETE CASCADE` untuk integritas data.
* [x] **Search Performance**: FTS5 diaktifkan untuk pencarian instan lintas buku.
* [x] **Backward Compatibility**: Tidak ada (Mandatory Wipe-out), memastikan transisi bersih ke v3.0.0.
* [x] **Mixed Playlist Support**: Playlist mampu menampung lagu dari berbagai buku secara bersamaan.

