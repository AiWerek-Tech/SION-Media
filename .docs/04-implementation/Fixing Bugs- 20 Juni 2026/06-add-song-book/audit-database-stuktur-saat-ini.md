I will start by analyzing the directory structure of the project `SION-Media` to locate the desktop application and understand its components. This will help us find the database, song configurations, and where the song data is processed.

Listed directory SION-Media

I will now check the contents of the `sion-media-desktop` folder to understand its structure, build tools, databases, and general architecture.

Listed directory sion-media-desktop

I will look inside the `src` directory of the desktop application to identify the main modules (like main, renderer, shared, database etc.).

Listed directory src

I will list the contents of the `src/main` directory to see how the backend of the Electron application handles database operations, files, or local storage.

Listed directory main

I will list the contents of `src/shared` to see the TypeScript types, interfaces, or constants related to songs and databases that are shared between the main and renderer processes.

Listed directory shared

I will view the shared types in `src/shared/types.ts` to understand how songs and songbooks (buku lagu) are modeled.

Viewed types.ts:1-589

I will examine the `src/main/migrations.ts` file to see the database schema definitions (specifically the `hymnals` and `songs` tables) and understand their structure and relationships.

Viewed migrations.ts:1-767

I will examine the seed data in `src/main/seed-data.ts` to see how the songbooks are initialized and how the lyrics and song data are formatted when populated into the SQLite database.

Viewed seed-data.ts:1-800

I will search for references to `initialSongs` and see how it is imported and inserted into the database. This will lead us to the seeding code and show where the actual lyrics are loaded from.

Searched for "initialSongs"

I will read the initial lines of `src/main/database.ts` to locate the database setup, initialization, and seeding process.

Viewed database.ts:1-300

I will check the end of the `src/main/database.ts` file where initialization, connection, and seed loading functions are likely located.

Viewed database.ts:2200-2744

I will now view lines 301 to 700 of `src/main/database.ts` to locate database initialization and understand how the SQLite connection is opened and seeded.

Viewed database.ts:301-700

I will list the contents of the `resources` directory in the desktop project to see if there are pre-populated database files (`sion.db`), JSON dumps, or configuration files that store the actual lyrics and data for SION.

Listed directory resources

I will look inside `resources/content-packs` to see if there are pre-packaged databases or JSON configs for additional books or Bibles.

Listed directory content-packs

I will list the contents of `resources/content-packs/hymnals` to see how the system supports adding extra hymnals/songbooks as content packs.

Listed directory hymnals

I will list the contents of `src/main/services` to understand what backend services are implemented and how they interact with content packs, songbooks, and database queries.

Listed directory services

I will check the files inside `src/main/services/content-packs` to see how content packs (like hymnals or Bibles) are loaded, registered, or read.

Listed directory content-packs

I will view the `contentPackPaths.ts` file to see where content pack folders and files are located on the system and how they are identified.

Viewed contentPackPaths.ts:1-83

I will view the `contentPackManager.ts` file to see how a content pack (such as a Bible or a Hymnal) is registered, parsed, validated, and loaded. This will give us direct insight into the file structure expected for new songbooks or content packs.

Viewed contentPackManager.ts:1-290

I will view `src/main/ipc-handlers.ts` to examine the IPC handlers that manage operations on songs (`songs` table) and songbooks (`hymnals` table). This shows how the frontend interacts with the backend database.

Viewed ipc-handlers.ts:1-400

I will inspect the contents of `src/main/services/excel` to see how Excel or CSV file import is handled for songbooks. This will be very useful for the user because adding a new songbook is often done by importing an Excel/CSV file containing song numbers, titles, and lyrics.

Listed directory excel

I will view the Excel parsing service in `src/main/services/excel/index.ts` to see what columns and data format are expected when importing a songbook via Excel/CSV.

Viewed index.ts:1-140

I will view the rest of `src/main/ipc-handlers.ts` to locate the registration of the Excel/file import handlers and find any other import-related features.

Viewed ipc-handlers.ts:400-669

I will check the directory structure of the `src/renderer` folder to find where the frontend handles rendering songs, projection slides, and the editors for songs/songbooks.

Listed directory renderer

I will list the contents of `src/renderer/src` to identify the frontend codebase components.

Listed directory src

I will check the screens directory in the renderer to see if there is an import/export interface or management screen where songbooks and songs can be added.

Listed directory screens

I will view the `ImportExportScreen.tsx` screen to see the frontend implementation of the song and hymnal import/export feature. This will tell us what formats the UI supports (such as Excel, JSON, etc.) and how it connects to the IPC handlers.

Viewed ImportExportScreen.tsx:1-630

I will list the contents of the `src/renderer/src/utils` directory to see if there are utility files that parse or format song lyrics into slides for projection.

Listed directory utils

I will inspect `src/renderer/src/projection` to see how the renderer handles slides and song projection.

Listed directory projection

I will list the contents of `src/renderer/src/engine` to see if it holds the core presentation or slide splitting logic.

Listed directory engine

I will view the `slideEngine.ts` file to see how it processes the raw lyrics (`lyrics_raw`) and converts them into slides for projection. This is crucial for understanding how lyrics need to be formatted when seeding or importing.

Viewed slideEngine.ts:1-310

Berikut adalah penjelasan lengkap mengenai **struktur data**, **sistem database**, **cara kerja pengolahan lirik**, serta **panduan langkah demi langkah** untuk menambahkan buku lagu baru di aplikasi SION Media Desktop agar sistem ini fleksibel di masa depan.

---

### 1. Arsitektur Sistem & Aliran Data
Aplikasi SION Media Desktop dibangun menggunakan Electron dengan React (TypeScript). Aliran datanya terbagi menjadi dua proses:
*   **Main Process (Backend):** Menggunakan pustaka `better-sqlite3` untuk mengelola database SQLite lokal bernama `sion.db` yang terletak di direktori `userData` sistem operasi (untuk Windows biasanya di `%APPDATA%/sion-media-desktop/sion.db`). Fungsi pengelolaan database didefinisikan di [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts).
*   **Renderer Process (Frontend):** Berjalan di UI React. Antara Frontend dan Backend berkomunikasi secara aman melalui jalur IPC (Inter-Process Communication) yang dideklarasikan di [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts).

---

### 2. Struktur Database (Database Schema)
Skema database didefinisikan di dalam file migrasi [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts). Hubungan antar tabel utama lagu adalah **One-to-Many** antara buku lagu (`hymnals`) dengan lagu (`songs`).

#### A. Tabel `hymnals` (Buku Lagu)
Menyimpan informasi metadata dari setiap buku lagu (misalnya: Lagu Sion Edisi Lengkap, Kidung Jemaat, dll).
```sql
CREATE TABLE IF NOT EXISTS hymnals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,          -- Kode unik (misal: 'LS' untuk Lagu Sion, 'KJ' untuk Kidung Jemaat)
  name TEXT NOT NULL,                 -- Nama lengkap buku lagu (misal: 'Lagu Sion Edisi Lengkap')
  language TEXT DEFAULT 'Indonesia',  -- Bahasa utama buku lagu
  region TEXT DEFAULT '',             -- Wilayah asal buku
  version TEXT DEFAULT '',            -- Versi buku/edisi
  publisher TEXT DEFAULT '',          -- Penerbit buku
  is_official INTEGER DEFAULT 1,      -- Status buku resmi/bawaan (1 = Ya, 0 = Tidak)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### B. Tabel `songs` (Daftar Lagu)
Menyimpan data lagu spesifik yang terikat ke salah satu buku lagu melalui foreign key `hymnal_id`.
```sql
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hymnal_id INTEGER NOT NULL,         -- Relasi ke hymnals.id
  number TEXT NOT NULL,               -- Nomor lagu (berupa TEXT untuk mendukung nomor seperti '10a', '01b')
  title TEXT NOT NULL,                -- Judul lagu
  alternate_title TEXT NOT NULL DEFAULT '', -- Judul alternatif / judul bahasa Inggris
  lyrics_raw TEXT NOT NULL DEFAULT '',-- Lirik lagu mentah (berisi baris baru dan penanda slide)
  category TEXT DEFAULT '',           -- Kategori lagu (misal: 'Pujian', 'Sabat')
  language TEXT DEFAULT 'Indonesia',  -- Bahasa lagu
  author TEXT DEFAULT '',             -- Penulis lirik
  composer TEXT DEFAULT '',           -- Komposer musik
  key_note TEXT DEFAULT '',           -- Nada dasar (misal: 'Do = F')
  time_signature TEXT DEFAULT '',     -- Ketukan (misal: '4/4')
  tempo TEXT DEFAULT '',              -- Tempo lagu
  tags TEXT DEFAULT '',               -- Label pencarian tambahan
  theme TEXT DEFAULT '',              -- Tema teologis lagu
  scripture_reference TEXT DEFAULT '',-- Referensi ayat Alkitab terkait
  is_favorite INTEGER DEFAULT 0,      -- Status favorit (1 = Ya, 0 = Tidak)
  song_background_config TEXT DEFAULT '', -- Konfigurasi background visual presentasi
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hymnal_id) REFERENCES hymnals(id) ON DELETE CASCADE
);
```

#### C. Full-Text Search Virtual Table (`songs_fts`)
Untuk mempercepat pencarian lirik dan lagu secara instan, aplikasi menggunakan fitur FTS5 dari SQLite yang disinkronkan secara otomatis menggunakan SQLite *triggers* di [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts#L125-L169).

---

### 3. Cara Kerja Pembagian Lirik Lagu (`lyrics_raw` parsing)
Saat lagu ditampilkan pada layar proyeksi, teks lirik mentah (`lyrics_raw`) diproses oleh modul [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts) menggunakan fungsi [generateSlides](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts#L191) untuk dipecah menjadi beberapa slide secara otomatis dengan aturan berikut:

1.  **Pemisahan Bagian (Sectioning):**
    *   Sistem mendeteksi penanda bagian dengan kurung siku seperti `[Verse 1]`, `[Chorus]`, atau `[Reff]` di awal baris lirik.
    *   Sistem juga mengenali teks header bagian murni tanpa kurung siku menggunakan Regex (seperti baris tunggal bertuliskan `Verse 1`, `Bait 2`, `Reff`, `Chorus`, `Bridge`, `Ending`).
2.  **Pemisahan Manual (`---`):**
    *   Jika Anda menaruh baris `---` (tiga tanda hubung) di dalam teks lirik, sistem akan langsung memotong teks pada bagian tersebut dan memulai slide baru (manual slide break).
3.  **Algoritma Penyeimbang Pintar (Smart Balancing):**
    *   Jika jumlah baris dalam satu bait melebihi batas konfigurasi global (`maxLines`, defaultnya 4 baris per slide), mesin [splitIntoSlides](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts#L128) akan memecah lirik secara seimbang.
    *   *Contoh:* Jika bait memiliki 5 baris lirik sedangkan `maxLines = 4`, mesin akan membaginya menjadi **3 baris di slide pertama** dan **2 baris di slide kedua**, alih-alih membaginya secara kaku menjadi 4 dan 1.

---

### 4. Cara Menambahkan Buku Lagu Baru agar Sistem Fleksibel
Ada dua metode utama yang bisa digunakan untuk menambahkan buku lagu baru:

#### Metode A: Melalui Fitur Import di UI Aplikasi (Rekomendasi untuk Pengguna)
Aplikasi ini sudah menyediakan antarmuka import/export berbasis Excel (`.xlsx`) dan JSON pada file [ImportExportScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/ImportExportScreen.tsx).

1.  **Buat File Excel baru dengan ekstensi `.xlsx`.**
2.  Pastikan nama-nama kolom pada baris pertama sesuai dengan yang dipetakan oleh parser Excel aplikasi di [excel/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/services/excel/index.ts#L126-L138). Kolom yang dibaca adalah:
    *   `Nomor` atau `number` (Nomor lagu, misal: `1`, `2`)
    *   `Judul` or `title` (Judul lagu)
    *   `Lirik` or `lyrics_raw` (Lirik lagu, gunakan baris kosong atau `---` untuk memisahkan slide)
    *   `Kategori` or `category` (Opsional)
    *   `Bahasa` or `language` (Opsional, default: `Indonesia`)
    *   `Penulis` or `author` (Opsional)
    *   `Komposer` or `composer` (Opsional)
    *   `Nada Dasar` or `key_note` (Opsional)
    *   `Tempo` or `tempo` (Opsional)
    *   `Tags` or `tags` (Opsional)
3.  Di aplikasi SION Media, buka menu **Settings / Pengelolaan** lalu ke bagian **Import / Export**.
4.  Pilih target Buku Lagu yang ingin Anda impor di dropdown **"Impor ke Buku"** (atau Anda bisa membuat buku lagu baru terlebih dahulu di menu manajemen buku lagu).
5.  Unggah file Excel tersebut. Jika ada konflik nomor atau judul lagu, UI akan memunculkan menu resolusi konflik: **Skip** (Lewati), **Timpa** (Overwrite), atau **Gabung** (Merge lirik).

#### Metode B: Melalui Pengodean Program / Database Seeding (Rekomendasi untuk Developer)
Jika Anda adalah pengembang aplikasi ini dan ingin menyematkan buku lagu baru secara bawaan saat database pertama kali diinstal:

1.  **Daftarkan buku lagu** di fungsi `seedDatabase` pada [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts#L542).
    ```typescript
    // Contoh menambahkan buku baru 'KJ' (Kidung Jemaat) secara bawaan
    const kjResult = db
      .prepare(
        `INSERT OR IGNORE INTO hymnals (code, name, language, region, publisher, is_official)
         VALUES ('KJ', 'Kidung Jemaat', 'Indonesia', 'Indonesia', 'YAMUGER', 1)`
      )
      .run()
    const kjId = kjResult.lastInsertRowid || db.prepare("SELECT id FROM hymnals WHERE code = 'KJ'").get().id
    ```
2.  **Sediakan data lirik lagu** di [seed-data.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/seed-data.ts) dalam format array objek JSON:
    ```typescript
    export const initialKjSongs = [
      {
        song_number: '1',
        title: 'Haleluya! Pujilah Allah',
        title_en: 'Hallelujah! Praise God',
        language: 'Indonesia',
        lyrics_raw: `[Bait 1]\nHaleluya! Pujilah Allah\ndi tempat kudus-Nya...\n\n[Bait 2]\n...`
      }
    ]
    ```
3.  **Lakukan iterasi insert** pada data lagu baru tersebut dengan menggunakan relasi `kjId` yang sudah didapatkan.

Dengan struktur database relasional yang memisahkan `hymnals` dan `songs` serta mesin pembagi lirik yang fleksibel di [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts), Anda dapat dengan mudah menambahkan puluhan buku lagu baru di masa mendatang tanpa perlu merombak ulang kode program inti aplikasi.