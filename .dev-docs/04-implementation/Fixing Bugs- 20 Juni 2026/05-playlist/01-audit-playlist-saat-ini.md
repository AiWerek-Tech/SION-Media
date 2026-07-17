Berikut adalah laporan audit mendalam dan penjelasan lengkap mengenai cara kerja **Sistem Playlist** (Rundown Acara/Ibadah) di aplikasi SION Media, baik di dalam **Mode Proyeksi (Projection Mode)** maupun hubungannya dengan mode-mode lainnya.

---

# LAPORAN AUDIT SISTEM PLAYLIST - SION MEDIA

Sistem Playlist di SION Media dirancang sebagai **Rundown Builder & Live Controller** yang menghubungkan database lagu, manajemen presentasi (Slides Engine), dan tampilan visual jemaat secara _real-time_.

---

## 1. Arsitektur Database (SQLite Schema)

Di tingkat backend, database SQLite menyimpan data playlist secara relasional melalui dua tabel utama (dapat dilihat di [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts)):

### A. Tabel `playlists`

Menyimpan metadata dasar dari event/ibadah yang dibuat:

- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL) — Nama ibadah/event (misal: _Ibadah Raya Minggu Pagi_).
- `service_date` (TEXT) — Tanggal pelaksanaan ibadah.
- `description` (TEXT) — Catatan deskriptif tambahan.

### B. Tabel `playlist_items`

Menyimpan baris lagu atau pemisah bagian di dalam playlist:

- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `playlist_id` (INTEGER) — Foreign key yang terhubung ke tabel `playlists` (dengan relasi `ON DELETE CASCADE`).
- `song_id` (INTEGER) — Foreign key yang terhubung ke tabel `songs` untuk menarik data lirik, kunci nada, tempo, dsb.
- `sort_order` (INTEGER NOT NULL DEFAULT 0) — Menyimpan urutan item. Berguna saat operator memindahkan lagu (Drag & Drop).
- `section_label` (TEXT DEFAULT '') — Label penanda bagian rundown (seperti `PEMBUKAAN`, `PUJIAN`, `KHOTBAH`, `PERSEMBAHAN`, `PENUTUPAN`).

---

## 2. State Management (Zustand & Persistensi Session)

Di sisi frontend, state dikelola secara reaktif menggunakan Zustand di berkas [usePlaylistStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/usePlaylistStore.ts):

- **Sinkronisasi IPC (Inter-Process Communication)**: Setiap aksi seperti memuat (`loadPlaylists`), membuat (`createPlaylist`), menambah lagu (`addSongToPlaylist`), menghapus (`removeItem`), hingga mengurutkan ulang (`reorderItems`) dikirim ke Main Process Electron via IPC Channels (seperti `db:get-playlists`, `db:reorder-playlist-items`) untuk diperbarui di SQLite.
- **Optimistic UI Updates**: Pada aksi drag-and-drop (`reorderItems`) dan pelabelan (`updateItemLabel`), store langsung mengubah state lokal terlebih dahulu untuk menghindari jeda UI, lalu mengirim data ke database di latar belakang. Jika gagal, state akan di-_rollback_ ke nilai sebelumnya.
- **Kontinuitas Sesi (Session Continuity)**: Menggunakan middleware `persist` bawaan Zustand (`sion-playlist-storage`), aplikasi secara otomatis menyimpan `_persistedActivePlaylistId` di `localStorage`. Hal ini memastikan jika aplikasi mati mendadak atau direfresh, **playlist yang sedang aktif tetap terbuka** saat aplikasi dibuka kembali.

---

## 3. Cara Kerja Playlist pada Mode Proyeksi (Projection Mode)

Pada layar Proyeksi (Operator View), panel playlist merender komponen [PlaylistPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PlaylistPanel.tsx) di sisi kiri.

### A. Navigasi & Pemilihan Lagu

- Saat operator mengklik salah satu lagu di rundown playlist:
  1. `activeItemIndex` diperbarui.
  2. Lagu yang terpilih akan dikirim ke `useAppStore` untuk dimuat datanya.
  3. Lirik mentah lagu tersebut diproses oleh Slide Engine (`generateSlidesForSong`), dipecah menjadi bait/slide terstruktur, lalu dikirim ke panel **CUE / Preview (Slide List Tengah)**.
- **Aksi Drag-and-Drop**: Operator dapat mengurutkan kembali rundown lagu secara instan di tengah ibadah menggunakan Pointer/Mouse via library `@dnd-kit`.

### B. Sinkronisasi Tampilan LIVE (Congregation Screen)

- Setiap kartu item playlist mengecek status proyeksi secara real-time (`isProjected={projectedSongId === item.song_id}`).
- Jika lagu tersebut sedang ditembak ke layar utama jemaat (Program/Live), kartu rundown di panel operator akan menampilkan **lingkaran merah berkedip** (pulse) dan lencana tulisan **"Live"** berwarna biru menyala, memudahkan operator mengetahui lagu mana yang sedang tayang.

### C. Pembagian Bagian Rundown (Section Divider)

- Operator dapat menyisipkan penanda batas ibadah (Section) seperti _KHOTBAH_ atau _PUJIAN_ pada lagu tertentu. Penanda ini dirender sebagai pembatas garis horizontal (`SeparatorHorizontal`) yang estetik di antara baris lagu agar rundown terlihat rapi dan tidak membingungkan.

### D. Phase 4 Preloading Background (Sangat Krusial!)

Sistem playlist di mode proyeksi memiliki optimasi transisi visual yang cerdas (`scheduleNextSongPreload` di `ProjectionMode.tsx`):

- 500ms setelah operator memilih suatu lagu di rundown, sistem akan mendeteksi lagu berikutnya (N+1).
- Jika lagu berikutnya memiliki konfigurasi background (gambar atau video), aplikasi akan menginstruksikan `mediaEngine.preloadImage` atau `mediaEngine.preloadVideo` di latar belakang.
- Hal ini menjamin ketika lagu berikutnya dimuat ke layar LIVE, background visual langsung muncul seketika tanpa jeda loading.

---

## 4. Hubungan Playlist dengan Mode Lainnya

Sistem playlist bersifat global dan terintegrasi di seluruh aplikasi:

```
┌──────────────────────────┐          ┌──────────────────────────┐
│       LIBRARY MODE       │          │     PROJECTION MODE      │
│   (Rundown/Setlist Builder)│        │   (Rundown Live Operator)│
└────────────┬─────────────┘          └────────────▲─────────────┘
             │                                     │
             │ Tambah Lagu                         │ Baca & Navigasi
             │ Urutkan / Reorder                   │ Tampilkan Status LIVE
             ▼                                     │
┌──────────────────────────────────────────────────┴─────────────┐
│                 ZUSTAND STORE (usePlaylistStore)               │
│               - state: playlists, playlistItems                │
│               - persistence: _persistedActivePlaylistId        │
└──────────────────────────┬─────────────────────────────────────┘
                           │ IPC Bridge
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                   MAIN PROCESS & SQLITE DB                     │
│               - tables: playlists, playlist_items              │
└────────────────────────────────────────────────────────────────┘
```

### A. Library Mode (Rundown Builder)

- Di Library Mode, panel playlist berfungsi sebagai **Rundown Builder**. Operator mempersiapkan daftar lagu jauh-jauh hari atau sesaat sebelum ibadah dengan mencari lagu di database utama, lalu menekan tombol `+` pada lagu. Lagu tersebut secara otomatis di-insert ke dalam tabel `playlist_items` pada database aktif.

### B. Sinkronisasi Global

- Perubahan urutan (DnD) atau penghapusan item di **Library Mode** otomatis tersinkronisasi secara real-time dan langsung terlihat di **Projection Mode**, karena keduanya mengonsumsi Zustand Store yang sama (`usePlaylistStore.ts`) dan terhubung ke database SQLite lokal yang sama.

### C. Ekspor / Impor Setlist Rundown

- Playlist dapat diekspor menjadi file `.json` mandiri (`handleExportPlaylist` yang memanfaatkan dialog penyimpanan native Electron `window.api.file.showSaveDialog`). File ini berisi metadata playlist dan seluruh lirik lagu yang ada di dalamnya.
- File ini dapat dibawa ke laptop gereja lain dan diimpor langsung, memastikan kesiapan ibadah tanpa perlu mengetik ulang lirik atau menyalin database penuh.
