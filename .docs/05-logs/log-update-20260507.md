# SION Presenter — Implementation Update Log (2026-05-07)

Dokumen ini merangkum semua perubahan terbaru yang telah diimplementasikan dalam sistem SION Presenter, mencakup sinkronisasi data, perombakan UI, keamanan database, dan perbaikan kode.

## 1. Sinkronisasi Data & Standarisasi Lagu

Telah dilakukan standarisasi 525 lagu berdasarkan dokumen resmi `Daftar-Lagu-Sion.md`.

- **Skrip Sinkronisasi**: Dibuat `scripts/sync-songs-from-md.mjs` untuk mengekstrak data dari Markdown dan memperbarui `src/main/seed-data.ts`.
- **Struktur Judul**: Judul Bahasa Indonesia ditetapkan sebagai judul utama (default), sedangkan judul Bahasa Inggris menjadi sub-judul (subtitle) di bawahnya.
- **Data Cleaner**: Skrip `scripts/merge-english-titles.mjs` digunakan untuk menggabungkan entri bahasa yang terpisah menjadi satu entri lagu dengan dua bahasa.

## 2. Peningkatan Keamanan & Manajemen Database

Perbaikan pada lapisan data untuk memastikan integritas dan kemudahan pemeliharaan.

- **Validasi Duplikat**: Penambahan pengecekan nomor lagu dan judul yang sama pada fungsi `addSong` di `src/main/database.ts`.
- **Fitur Reset & Reseed**:
  - Menambahkan fungsi `reseedDatabase` yang jauh lebih kuat.
  - Menangani penghapusan tabel FTS5 (pencarian cepat), pemicu (triggers), riwayat lagu, dan item playlist sebelum melakukan impor ulang.
  - Memastikan urutan ID (sqlite_sequence) direset dengan benar.
- **Pembaruan IPC**: Mengekspos fungsi `reseed` melalui `preload/index.ts` agar dapat diakses dari antarmuka pengguna.

## 3. Perombakan Antarmuka Pengguna (UI/UX)

Peningkatan visual dan fungsionalitas pada panel utama dan library lagu.

- **Library Lagu (`SongLibraryPanel.tsx`)**:
  - Mengganti tombol "Tambah Lagu" yang besar di bawah dengan icon `+` kecil di header (sejajar dengan search).
  - Menambahkan tombol "Import/Export" cepat di header.
  - Implementasi **Panel Aksi Seleksi**: Muncul di bagian bawah saat lagu dipilih, berisi tombol besar untuk LIVE, Edit, Playlist, Favorit, dan Hapus.
  - Menambahkan **Badge "LIRIK KOSONG"**: Indikator visual merah pada kartu lagu yang belum memiliki konten lirik.
- **Navigasi Atas (`TopBar.tsx`)**:
  - Menampilkan info lagu yang sedang dipilih (Nomor, Judul, Sub-judul) di tengah atas untuk panduan operator.
- **Playlist (`PlaylistItemCard.tsx`)**:
  - Menampilkan sub-judul Inggris di bawah judul utama pada daftar antrean.
- **Kategori Lagu**: Memperbarui daftar kategori di `SongEditorScreen.tsx` dengan daftar lengkap (50+ kategori) termasuk kategori khusus seperti _Lagu Perjamuan Jemaat Jambrut_.

## 4. Pembersihan Kode & Perbaikan Bug

Memastikan stabilitas aplikasi melalui standarisasi kode.

- **Linting & Formatting**:
  - Memperbaiki semua error linting pada `App.tsx`, `SettingsScreen.tsx`, dan `SongEditorScreen.tsx`.
  - Menghilangkan penggunaan tipe data `any` dan menggantinya dengan interface yang tepat (seperti `RecoveryState`).
  - Menjalankan `npm run format` pada seluruh basis kode untuk konsistensi gaya penulisan.
- **Perbaikan React Hooks**:
  - Menangani dependensi yang hilang pada `useEffect` dan `useCallback`.
  - Memperbaiki masalah `set-state-in-effect` pada `SettingsScreen.tsx` menggunakan pola `isMounted`.
- **Global Toast**: Memastikan `showToast` tersedia di `SongEditorScreen.tsx` untuk memberikan umpan balik saat operasi simpan/gagal.

## 5. Lokasi File Utama yang Berubah

- `src/main/database.ts`: Logika reseed dan validasi duplikat.
- `src/renderer/src/components/SongLibraryPanel.tsx`: UI baru untuk library dan aksi seleksi.
- `src/renderer/src/screens/SongEditorScreen.tsx`: Kategori baru dan validasi input.
- `src/main/seed-data.ts`: Data 525 lagu hasil sinkronisasi.
- `src/renderer/src/screens/SettingsScreen.tsx`: UI reset database dan penanganan error yang lebih baik.

## 6. Implementasi Professional Custom Title Bar

- **Frameless Window**: Integrasi penuh dengan Electron untuk pengalaman desktop enterprise.
- **Identity System**: Logo SION, versi aplikasi, dan Workspace Name (editable).
- **Menu Bar**: Dropdown menu profesional (File, Edit, View, Playlist, dll) menggunakan Floating UI.
- **Status Center**: Indikator LIVE/BLACK/FREEZE real-time, deteksi display, FPS monitor, dan Service Timer.
- **Window Controls**: Custom minimize, maximize/restore, dan close buttons dengan feedback visual.
- **Cleanup**: Menghapus `TopBar.tsx` lama dan menggantikannya dengan arsitektur TitleBar yang lebih terintegrasi.

## 7. Redesain Modern UI Library Lagu
- **Modern Card Layout**: Mengubah daftar lagu menjadi kartu-kartu modern dengan sudut melengkung (`rounded-xl`) dan efek bayangan halus.
- **Visual Thumbnails**: Penambahan thumbnail placeholder dengan gradien abstrak dan nomor lagu untuk identifikasi visual yang lebih cepat.
- **Typography Hierarchy**: Penataan ulang tipografi untuk Judul, Sub-judul Inggris, dan Metadata (Penulis, Nada Dasar, Tempo) agar lebih mudah dipindai.
- **Quick Action Icons**: Tombol aksi cepat (Favorit, Tambah ke Playlist, Play Now) yang intuitif dan responsif terhadap interaksi hover.
- **Enhanced Empty State**: Redesain tampilan "Lagu Tidak Ditemukan" dengan visual yang lebih premium dan tombol aksi yang jelas.
- **Micro-interactions**: Implementasi animasi *bounce* pada tombol favorit dan transisi halus pada seluruh elemen kartu.
- **Aksi Langsung pada Kartu**: Tombol Edit dan Hapus kini selalu terlihat pada setiap kartu lagu, dengan ukuran ikon yang lebih besar dan konsisten dengan tombol Favorit dan Play.

## 8. Audit Stabilitas Live Projection & Stage Display

- **Stage Display Aktif**: Mengisi entry point `src/renderer/src/stageDisplay/main.tsx` sehingga window Stage Display tidak lagi kosong saat dibuka.
- **Preview vs Program State**: Menambahkan pemisahan `programSlide` pada projection store agar pemilihan lagu hanya masuk ke cue/preview dan tidak diam-diam mengganti output proyektor sebelum operator menekan TAKE.
- **Freeze Recovery**: Memperbaiki urutan IPC saat keluar dari mode FREEZE agar slide terbaru dikirim setelah state kembali LIVE.
- **TAKE Button**: Memperbaiki perilaku TAKE agar memproyeksikan slide yang sedang dipilih, termasuk lagu satu slide, bukan melompat ke slide berikutnya.
- **IPC Cleanup**: Listener preload kini mengembalikan fungsi unsubscribe untuk mencegah listener ganda pada React Strict Mode dan navigasi antar screen.
- **SQLite Backup Safety**: Backup melakukan WAL checkpoint sebelum copy database, dan restore membersihkan file `-wal`/`-shm` lama sebelum membuka database hasil restore.
- **Search Coverage**: Fallback pencarian LIKE sekarang mencakup `title_en`.
- **UI Accessibility**: Menambahkan focus ring global, aria-label untuk aksi kartu lagu/playlist, dan menjaga action icon tetap terlihat samar saat idle sesuai hasil usability testing.

## 9. Perbaikan UI Regression & Modern Live Mode

- **Title Bar CSS Restored**: Menambahkan styling lengkap untuk identity, menu trigger, dropdown, status center, display badge, FPS, timer, clock, dan custom window controls.
- **Design Token Alias**: Menambahkan alias warna `accent`, `program`, `preview`, `live`, dan `warning` agar komponen lama dan baru konsisten.
- **Focus Live Mode**: Menambahkan mode fokus dashboard yang membesarkan Program/Preview dan menyembunyikan Library/Playlist saat live operation. Shortcut: `Ctrl+Shift+F`.
- **Responsive Title Bar**: Titlebar kini menyembunyikan elemen non-kritis di width kecil agar tidak menumpuk.
- **Monitor Standby Rendering**: Program/Preview menggunakan `contain` untuk background pada standby agar logo tidak tampil terlalu besar atau terpotong.

---

_Log ini mencakup perubahan hingga tanggal 2026-05-07._

## 10. Renderer Broadcast Console Upgrade (2026-05-08)

Perubahan tambahan setelah log 2026-05-07:

- **Dashboard Broadcast Layout**:
  - `Dashboard.tsx` dirombak menjadi top-bottom split.
  - Bagian atas berisi dual monitor `PREVIEW` dan `PROGRAM`.
  - Bagian tengah berisi mixer bar.
  - Bagian bawah berisi `Song Library` dan `Playlist`.
- **Cue vs Program Store V2**:
  - `useProjectionStore.ts` kini memiliki cue deck dan live deck terpisah.
  - `slides` dipakai sebagai cue.
  - `programSlides`, `programSlide`, dan `programSlideIndex` dipakai sebagai output live.
- **Shortcut Workflow Baru**:
  - `SPACE` = `TAKE`
  - `RIGHT / PAGE DOWN` = next live slide
  - `LEFT / PAGE UP` = previous live slide
- **LivePreviewPanel Redesign**:
  - ratio 40/60
  - confidence monitor 16:9
  - badge `NO CUE`, `ON AIR`, `LIRIK KOSONG`
  - warning visual saat hanya satu monitor terdeteksi
- **ControlBar Redesign**:
  - cue navigation
  - tombol `TAKE` glowing dan dominan
  - live navigation
  - fade selector
  - black, freeze, clear
- **High-Density List UI**:
  - library dan playlist memakai zebra striping
  - metadata `LS`, judul Indonesia/Inggris, nada dasar, tempo
  - action icon 20% idle dan 100% hover/focus
- **Title Bar Monitor Badge**:
  - jika hanya satu monitor terdeteksi, badge berubah merah dan menampilkan `PROJECTOR LOST`
- **Dev Startup Stability**:
  - mode development membersihkan `Cache`, `Code Cache`, dan `GPUCache` Chromium
  - tujuan: menurunkan error startup `Failing CreateMapBlock` dan `Critical error -8`

Validasi ulang setelah perubahan:

- `npm run lint` sukses
- `npm run typecheck` sukses
- `npm run build` sukses
