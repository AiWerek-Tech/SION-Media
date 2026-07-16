# Walkthrough - Panel Media Lokal & Integrasi Rundown

Saya telah sukses mengimplementasikan fitur **Panel Media Lokal** dan mengintegrasikannya dengan **Rundown/Playlist** ibadah. Seluruh berkas telah diverifikasi dengan pemeriksaan tipe TypeScript secara penuh tanpa ada error.

## Perubahan yang Dilakukan

### 1. Main Process (Electron) & Preload Bridge

- **[MODIFY] [src/main/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts):** Mendaftarkan protokol kustom `local-media://` secara aman untuk menyajikan video dan gambar lokal langsung dari PC pengguna ke Chromium proyektor dengan penanganan streaming penuh.
- **[MODIFY] [src/main/database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts):**
  - Menambahkan pengaman pada `deleteMediaAsset` untuk mengecek tag `is_external: true` di database guna mencegah terhapusnya file fisik asli pengguna dari disk lokal saat aset dihapus dari daftar aplikasi.
  - Menambahkan fungsi database `addLocalExternalMedia` untuk menyimpan metadata path asli.
  - Menambahkan fungsi database `addMediaToPlaylist` untuk mendukung penambahan tipe item rundown baru.
- **[MODIFY] [src/main/ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts):** Meregistrasikan handler IPC `db:add-local-external-media` dan `db:add-media-to-playlist`.
- **[MODIFY] [src/preload/index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts) & [src/preload/index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts):** Mengekspos fungsi IPC baru ke Renderer via Electron Context Bridge.

### 2. Sisi UI & Store (React/TypeScript)

- **[MODIFY] [src/shared/types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/shared/types.ts) & [src/renderer/src/types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/types.ts):** Menambahkan tipe item rundown `'media'` ke dalam opsi `item_type` dari `PlaylistItem`.
- **[MODIFY] [src/renderer/src/store/usePlaylistStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/usePlaylistStore.ts):** Menambahkan _action_ `addMediaToPlaylist` untuk menyisipkan item media lokal ke rundown aktif.
- **[MODIFY] [src/renderer/src/engine/slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts) & [src/renderer/src/core/projection/slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts):** Mendukung pembuatan slide kosong dengan penanda background kustom ketika tipe item rundown bermuatan `'media'`.
- **[MODIFY] [src/renderer/src/screens/modes/ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx):**
  - Mengintegrasikan tab baru bernama "Media" di bar panel kanan bawah.
  - Menangani aksi klik rundown media agar langsung memicu proyektor dengan format latar belakang video/gambar yang sesuai.
- **[NEW] [src/renderer/src/components/projection/LocalMediaPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/LocalMediaPanel.tsx):** Panel antarmuka baru untuk mengelola media lokal (tambah file via file picker, pencarian, preview, project/go live, add-to-rundown, dan hapus dari daftar).
- **[MODIFY] [src/renderer/src/components/PlaylistItemCard.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PlaylistItemCard.tsx):** Mendukung visualisasi item rundown tipe media menggunakan ikon `Image` (warna hijau emerald) dan menampilkan informasi ekstensi file (Video / Gambar).

---

## Cara Melakukan Verifikasi Manual

1. Pastikan Anda berada di direktori proyek `sion-media-desktop`.
2. Jalankan server pengembangan lokal dengan perintah berikut:
   ```powershell
   npm run dev
   ```
3. Buka aplikasi SION-Media, masuk ke **Projection Mode** (Mode Proyektor).
4. Di panel kanan bawah, Anda akan melihat tab baru bernama **Media** di sebelah tab _Lagu_, _Alkitab_, dan _Info_.
5. Klik tab **Media** tersebut, lalu klik tombol **+ Tambah** untuk memilih beberapa file gambar (JPG/PNG) atau video (MP4) dari komputer Anda.
6. Aset media yang terpilih akan terdaftar di grid. Anda dapat:
   - **Mencari file:** Ketik di kolom pencarian untuk memfilter daftar media.
   - **Double-klik:** Untuk memproyeksikan (Go Live) media tersebut.
   - **Tombol Play (Hover):** Melakukan proyeksi instan ke layar audience.
   - **Tombol Plus (+):** Menambahkan media ke Rundown aktif di sebelah kiri.
   - **Tombol Tempat Sampah:** Menghapus dari list (Pastikan file fisik asli di komputer Anda **TIDAK** terhapus).
7. Klik item rundown media yang ditambahkan di panel Rundown sebelah kiri untuk menguji navigasi alur ibadah terintegrasi.
