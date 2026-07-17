# Walkthrough: Peningkatan UI/UX Dashboard Mode Perpustakaan & Quick Notes Editor (Tahap 2)

Seluruh rencana peningkatan fungsionalitas dan kemudahan operasional (UI/UX) pada Library Mode Dashboard tahap 2 telah diimplementasikan dengan sempurna dan lulus verifikasi kompilasi/linter 100%.

---

## Ringkasan Perubahan Baru (Tahap 2)

### 1. Editor Catatan Cepat Interaktif (Interactive Quick Notes Editor)

- **Database Schema & Migrations**: Memanfaatkan tabel `song_notes` dari migrasi database versi 15:
  ```sql
  CREATE TABLE IF NOT EXISTS song_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  );
  ```
- **Backend & Database Queries**: Ditambahkan helper `getSongNote(songId)` dan `updateSongNote(songId, noteText)` di [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts) untuk membaca/menulis data catatan ke SQLite secara efisien dengan manajemen checkpoint WAL.
- **IPC Handler Channel**: Didaftarkan handler baru pada saluran `'db:get-song-note'` dan `'db:update-song-note'` di [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts).
- **Preload API Expose**: Diekspos di context bridge [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts) dan didefinisikan tipenya di [index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts):
  - `window.api.songs.getNote(songId: number) -> Promise<string>`
  - `window.api.songs.updateNote(songId: number, noteText: string) -> Promise<string>`
- **Inspector UI (Tab Notes)**: Mengubah tab Notes pada `RightInspector` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx) dari tampilan statis read-only menjadi editor interaktif yang didesain secara premium (glassmorphic dark background, resize-none text area, hover/focus rings, loading state, dan tombol simpan dengan ikon `FileEdit`).
- **Toast Notifications**: Mengintegrasikan feedback sukses/gagal secara visual menggunakan `showToast` bawaan dari `useAppStore`.

### 2. Efek Visual Drag-Over Highlight pada Rundown Playlist

- Menambahkan state `isDraggingOver` yang aktif saat lagu diseret di atas panel rundown playlist sebelah kiri.
- Memberikan feedback border putus-putus menyala (glowing dashed border) dan teks panduan dinamis untuk memudahkan operator pemula menyusun playlist.

### 3. Tombol Reset Pencarian Cepat

- Menambahkan tombol _"Bersihkan Pencarian"_ yang interaktif pada tampilan kosong (empty state) hasil pencarian, baik untuk tab angka maupun judul, agar operator tidak perlu menghapus input secara manual jika lagu tidak ditemukan.

### 4. Klarifikasi Label Proyeksi & Rundown

- Mengubah nama-nama tombol utama agar ramah pemula:
  - Tombol **"Buka"** pada kartu media lagu diubah menjadi **"Tayangkan"** (dengan ikon `MonitorPlay`).
  - Tombol **"Buka Lagu"** pada inspector detail kanan diubah menjadi **"Tayangkan Lirik"**.
  - Tombol **"Tambah Playlist"** diubah menjadi **"Tambah Rundown"**.

### 5. Penanganan Bug Fullscreen & Title Bar Hilang di Beranda

- **Berkas**: [LibraryLyricsViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/library/LibraryLyricsViewer.tsx)
- **Detail Perubahan**:
  - **Exiting Fullscreen on Unmount**: Menambahkan logika pemeriksaan native HTML5 fullscreen (`document.fullscreenElement`) di dalam fungsi pembersihan (`cleanup`) `useEffect` pemasangan komponen.
  - Sekarang, jika user keluar dari lyric viewer menggunakan tombol kembali (Back), tombol `Escape`, atau navigasi apa pun yang melepas/unmount komponen `LibraryLyricsViewer` saat fullscreen sedang aktif, aplikasi secara otomatis memanggil `document.exitFullscreen()` untuk memulihkan ukuran jendela.
  - Ini mencegah window Electron terjebak dalam mode native fullscreen di halaman utama (Beranda), sehingga custom title bar (tombol minimize, maximize, close) dan taskbar sistem operasi langsung tampil kembali dengan sempurna.

---

## Verifikasi Kepatuhan Kode (Lint & Typecheck)

Hasil eksekusi tools verifikasi menunjukkan kode 100% patuh dan bersih dari kesalahan:

- **`npm run lint`**: Lolos penuh dengan **0 error** dan **0 warning**.
- **`npm run typecheck`**: Lolos penuh dengan **0 error** (TS compilation sukses).
