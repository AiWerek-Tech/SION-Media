# Rancangan Implementasi & Eksekusi Database Multi-Hymnal SION Media

Dokumen ini merupakan panduan teknis mendetail yang siap dieksekusi per fase untuk melakukan perombakan total pada arsitektur database (SQLite) SION Media, beralih dari aplikasi buku lagu tunggal menjadi **Platform Enterprise Multi-Hymnal**.

Berdasarkan kesepakatan arsitektur dan keputusan strategis, **kita akan melakukan *wipe-out* (penghapusan total) struktur database lama** dan membangun struktur yang benar-benar *fresh*, bersih, dan sangat profesional untuk masa depan. Semua data lama akan dihapus agar tidak tumpang tindih, dan data resmi (Lagu Sion Edisi Lengkap) akan di-import/seed kembali dengan skema baru.

---

## Tinjauan Skema Database (Fresh Schema)

### 1. Tabel `hymnals` (Koleksi Buku Lagu)
Membuat tabel baru untuk menampung master buku lagu (sebagai "Folder/Koleksi").
* `id` (INTEGER PRIMARY KEY)
* `code` (TEXT UNIQUE) - Contoh: `LS` (Lagu Sion Lengkap), `LSLama` (Lagu Sion Edisi Lama), `SDAH` (SDA Hymnal)
* `name` (TEXT) - Nama lengkap buku (e.g., "Lagu Sion Edisi Lengkap")
* `language` (TEXT) - Bahasa dominan
* `region` (TEXT)
* `version` (TEXT) - Versi buku atau revisi
* `publisher` (TEXT)
* `is_official` (INTEGER) - 1 = Bawaan sistem (read-only), 0 = Custom/Lokal
* `created_at` (TEXT), `updated_at` (TEXT)

### 2. Tabel `songs` (Master Data Lagu)
Dirombak total dengan relasi ke `hymnals`.
* `id` (INTEGER PRIMARY KEY)
* `hymnal_id` (INTEGER) - Foreign key ke `hymnals(id)`
* `number` (TEXT) - Menggantikan `song_number` (menjadi string agar mendukung nomor seperti "100A")
* `title` (TEXT)
* `alternate_title` (TEXT) - Menggantikan `title_en`
* `language` (TEXT)
* `category` (TEXT)
* `author` (TEXT) - Menggantikan `writer`
* `composer` (TEXT)
* `lyrics_raw` (TEXT)
* `tags` (TEXT)
* `theme` (TEXT)
* `scripture_reference` (TEXT)
* `key_note`, `tempo`, `is_favorite`, `created_at`, `updated_at`

### 3. FTS5 Virtual Table `songs_fts`
* Tambahkan parameter `hymnal_id` dan struktur baru ke dalam virtual table FTS5 agar hasil pencarian bisa mengidentifikasi lagu ini dari buku mana.

### 4. Tabel `song_relations` (Song Relation System - Linked Songs)
Mendukung arsitektur di mana satu lagu memiliki relasi dengan versi bahasanya di buku lain (Misal: "Kudus, Kudus" [LS] terhubung ke "Holy, Holy" [SDAH]).
* `id` (INTEGER PRIMARY KEY)
* `source_song_id` (INTEGER) - Relasi ke `songs(id)`
* `target_song_id` (INTEGER) - Relasi ke `songs(id)`
* `relation_type` (TEXT) - Contoh: "translation", "alternate_version", "medley"

### 5. Pembaruan Tabel `playlists` & `playlist_items`
* Tidak ada perubahan skema yang masif, namun karena `playlist_items` merujuk ke `song_id` secara langsung, maka sistem secara otomatis mendukung **Mixed-Hymnal Playlist** (mampu menggabungkan lagu LS, SDAH, dll dalam 1 ibadah tanpa error).

---

## Tahapan Eksekusi (Proposed Changes)

### PHASE 1: Fresh Database Initialization & Schema Revamp
*Fokus: Mengubah struktur SQLite lama agar mendukung Multi-Hymnal melalui wipe-out dan re-seeding.*

**Aksi Eksekusi (`src/main/database.ts`):**
1. **Drop & Recreate**: Hapus (DROP) semua tabel lama saat inisialisasi ulang, membersihkan file `sion.db` untuk memastikan database fresh.
2. **Create Table `hymnals`**: Eksekusi query pembuatan tabel `hymnals`.
3. **Alter/Create Table `songs` (Skema Baru)**: Eksekusi query pembuatan tabel `songs` dengan foreign key ke `hymnals`.
4. **Update `songs_fts` (Full-Text Search)**: Sesuaikan trigger `INSERT/UPDATE/DELETE` FTS5.
5. **Fresh Migration Script (Lagu Sion Lengkap)**:
   * Insert record di tabel `hymnals`: `(code: 'LS', name: 'Lagu Sion Edisi Lengkap', is_official: 1)`.
   * Insert data dari `initialSongs` (di `seed-data.ts`) dan kaitkan semuanya ke `hymnal_id` milik LS tersebut secara bersih tanpa tumpang tindih.

### PHASE 2: Data Access Layer (DAL) & Backend Operations
*Fokus: Menyesuaikan fungsi-fungsi eksekusi database di Electron Main Process.*

**Aksi Eksekusi (`src/main/database.ts`):**
1. **Hymnal Operations**:
   * Tambahkan fungsi `getHymnals()`, `addHymnal()`, `updateHymnal()`.
2. **Song Operations Update**:
   * Ubah `getSongs()` untuk menerima opsional parameter `hymnalId` (sehingga jika mode baca/Personal Mode aktif, user bisa memfilter buku lagu).
   * Ubah `searchSongs()` agar query me-return juga *hymnal code/name* hasil JOIN dengan tabel `hymnals` (penting untuk fitur Global Search Engine).
   * Update validasi payload di `addSong()` dan `updateSong()` untuk menerima *schema* baru.
3. **Reseed Logic Update**:
   * Pastikan `reseedDatabase()` juga menghapus dan mengatur ulang tabel `hymnals`.

### PHASE 3: Electron IPC Handlers
*Fokus: Membuka jalur komunikasi antara Backend (SQLite) dan Frontend (React).*

**Aksi Eksekusi (`src/main/index.ts`):**
1. Daftarkan IPC channels baru untuk CRUD Hymnals (contoh: `get-hymnals`).
2. Sesuaikan *return type* dari IPC `get-songs` dan `search-songs` yang sekarang mengandung relasi hymnal.

### PHASE 4: State Management & UI Adaptation (Front-End)
*Fokus: Mengadaptasi tampilan ke Arsitektur Multi-Mode.*

1. **Mode 4 (Content Management Mode)**:
   * Antarmuka (UI) untuk menambah `Hymnal` baru (Buku custom).
   * Antarmuka form tambah lagu yang memuat opsi dropdown "Masukkan lagu ke buku mana?".
2. **Mode 1 (Library Mode)**:
   * **Hymnal Sidebar**: UI Panel kiri untuk berpindah antar *Hymnal*.
   * **Song List (Tabel)**: Kolom baru untuk menampilkan "Badge" asal buku (Misal: badge kecil bertuliskan `[LS]` atau `[SDAH]`).

---

## Verification Plan

### Database Integrity Verification
- [ ] Menjalankan aplikasi dan memastikan database SQLite terbuat dari awal tanpa error.
- [ ] Mengecek tabel menggunakan *DB Browser for SQLite* untuk memastikan tabel `hymnals` dan `songs` terbentuk dengan relasi yang benar.
- [ ] Memastikan ratusan data lagu awal (Initial Songs) berhasil disisipkan ulang dan dikaitkan ke `hymnal_id` untuk "Lagu Sion Edisi Lengkap" (LS).

### Search & Feature Verification
- [ ] Menguji query `searchSongs('kudus')` langsung dari sisi *main process* untuk memastikan output menampilkan info *hymnal*.
- [ ] Memastikan fitur *Playlist* diatur ulang untuk menampung format database baru.
