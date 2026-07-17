# Rencana Implementasi: Audit & Peningkatan UI/UX Dashboard Mode Perpustakaan (Library Mode)

Rencana ini berfokus pada penyempurnaan kegunaan (usability), estetika visual, dan kemudahan pengoperasian Dashboard Mode Perpustakaan bagi operator gereja pemula maupun berpengalaman di SION Media Desktop.

## Masalah & Gap yang Diidentifikasi (Hasil Audit)

1. **Ketiadaan Fitur Pembuatan Playlist di Mode Perpustakaan**:
   - Jika pengguna baru belum memiliki playlist aktif, tab rundown/playlist hanya menampilkan instruksi pasif untuk membuat playlist di "Content Mode". Pengguna harus berpindah ke Mode Pengelolaan (Management) hanya untuk membuat playlist, yang merupakan hambatan UX besar bagi pemula.
2. **Nomor Ubin (Number Tiles) Pasif**:
   - Ubin nomor lagu (Number Tiles) di tab "Nomor" tidak mendukung interaksi drag-and-drop ke playlist rundown, berbeda dengan kartu media lagu (Song Media Cards) di tab "Judul".
   - Double-click pada ubin nomor juga tidak melakukan aksi apa pun, padahal pengguna mengharapkan lagu langsung terbuka (seperti pada tab "Judul").
3. **Inspector Kanan Kosong & Monoton**:
   - Saat tidak ada lagu yang dipilih (keadaan awal bagi pengguna baru), panel Inspector kanan hanya menampilkan pesan teks abu-abu polos. Ini adalah ruang berharga yang bisa digunakan untuk memandu operator baru.
4. **Tidak Ada Panduan Cari Berdasarkan Kategori/Chip**:
   - Pengguna harus mengetik kata kunci secara manual di search bar. Bagi operator pemula yang bingung mencari tema lagu (misal: lagu Natal, Pujian, Penyembahan), tidak ada alat bantu navigasi cepat.

---

## Solusi & Peningkatan yang Diusulkan

### 1. Panel Pengelola Playlist Langsung (Direct Playlist Management)

- **Komponen**: [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx) (Bagian Playlist Workspace)
- **Peningkatan**:
  - Menambahkan dropdown pemilih playlist aktif jika ada lebih dari 1 playlist dalam database.
  - Menambahkan tombol cepat **"Buat Playlist" (+)** langsung di dalam tab Playlist. Menekan tombol ini akan memunculkan dialog masukan nama playlist yang intuitif.
  - Jika pengguna mengklik tombol **"+"** di kartu lagu namun belum memiliki playlist aktif, aplikasi akan secara otomatis memicu pembuatan playlist baru secara interaktif, alih-alih hanya memunculkan pesan error toast.

### 2. Peningkatan Interaksi Ubin Nomor (Number Tiles Interaction)

- **Komponen**: `NumberTile` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Mengaktifkan HTML5 drag-and-drop pada setiap `NumberTile` sehingga pengguna bisa menyeret nomor lagu langsung ke rundown playlist di sebelah kiri.
  - Menambahkan event `onDoubleClick` pada `NumberTile` untuk membuka pemutar lirik layar penuh secara instan.

### 3. Papan Panduan Operator Baru (Rich Empty Inspector Guide)

- **Komponen**: `RightInspector` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Mengubah tampilan kosong (empty state) menjadi **"Panduan Cepat Operator SION"** yang menarik secara visual dengan glassmorphism.
  - Menampilkan daftar shortcut keyboard penting (seperti `Ctrl+P` mencari lagu, `Esc` kembali, `Space` auto-scroll lirik).
  - Menyediakan panduan langkah demi langkah singkat: _"Bagaimana menyusun Rundown Ibadah hari ini?"_ yang memandu operator pemula dari mencari lagu, menyeretnya ke rundown, hingga menampilkan lirik.

### 4. Chip Pencarian Tema/Kategori Cepat (Quick Theme Search Chips)

- **Komponen**: `LibraryMode` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Menampilkan baris chip tema/kategori populer (seperti _Pujian_, _Penyembahan_, _Natal_, _Paskah_, _Roh Kudus_) tepat di bawah bilah pencarian saat kotak input kosong.
  - Mengklik chip akan secara otomatis mengisi bilah pencarian dan memfilter daftar lagu berdasarkan tema/kategori tersebut secara instan.

### 5. Penghapusan Panel Diagnostik Sistem (System Diagnostics) dari Dashboard

- **Komponen**: [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)
- **Peningkatan**:
  - Menghapus komponen `<DiagnosticsPanel />` dari layout utama aplikasi agar panel teknis ini tidak melayang di pojok kanan bawah dashboard dan tidak mengganggu area pandang operator.

---

## Rencana Verifikasi

### Pengujian Manual

1. **Pembuatan Playlist Baru**:
   - Masuk ke tab Playlist, klik tombol "Buat Playlist Baru", masukkan nama (misalnya "Ibadah Minggu Pagi"), dan verifikasi rundown playlist langsung aktif dan database terupdate.
2. **Seret Ubin Nomor**:
   - Seret ubin nomor `003` dari tab "Nomor" ke rundown playlist di sebelah kiri dan verifikasi lagu berhasil ditambahkan ke rundown.
3. **Double-Click Ubin Nomor**:
   - Klik ganda ubin nomor `005` dan verifikasi penampil lirik layar penuh terbuka secara langsung.
4. **Papan Panduan Inspector**:
   - Saat pertama masuk atau menghapus seleksi lagu, verifikasi "Panduan Cepat Operator" tampil dengan rapi dan informatif di sebelah kanan.
5. **Chip Tema Cepat**:
   - Klik chip tema "Penyembahan" dan verifikasi daftar lagu langsung terfilter menampilkan lagu-lagu penyembahan.
6. **Verifikasi Diagnostik Sistem**:
   - Pastikan panel "System Diagnostics" tidak lagi muncul di pojok kanan bawah dashboard saat masuk ke workspace utama.
