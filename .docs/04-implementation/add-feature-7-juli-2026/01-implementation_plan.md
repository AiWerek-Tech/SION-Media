# Rencana Implementasi Panel Media Lokal & Dukungan Rundown/Playlist

Menambahkan tab "Media" baru di panel kanan bawah mode proyektor. Fitur ini memungkinkan operator menambahkan gambar dan video lokal langsung dari folder aslinya di PC (hanya menyimpan alamat/path file mutlak di database) serta memasukkannya ke rundown/playlist ibadah.

## User Review Required

> [!IMPORTANT]
> **Keamanan Penghapusan File:**
> Pengecekan krusial dilakukan pada fungsi `deleteMediaAsset`. Bawaan aplikasi akan langsung menghapus file fisik di disk (`unlinkSync`). Kita memodifikasi fungsi ini agar mendeteksi flag `is_external` di kolom `metadata_json` sehingga jika aset media lokal dihapus dari aplikasi, file fisik asli di komputer pengguna **TIDAK** terhapus secara tidak sengaja.

> [!NOTE]
> **Protokol Kustom (`local-media://`):**
> Menggunakan protokol kustom Electron untuk menyajikan file secara aman guna menghindari pembatasan keamanan CORS/WebSecurity bawaan Chromium.

## Proposed Changes

### Main Process & Preload

---

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts)

- Daftarkan skema protokol kustom `local-media` sebelum aplikasi siap.
- Tangani permintaan file melalui handler `protocol.handle('local-media')` untuk membaca file dari path aslinya di PC.

#### [MODIFY] [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts)

- Modifikasi `deleteMediaAsset` untuk mengecek `metadata_json`. Jika mengandung `is_external: true` atau `is_local: true`, lewati penghapusan file fisik (`unlinkSync`).
- Tambahkan fungsi baru `addMediaToPlaylist` untuk menyisipkan item media ke tabel `playlist_items` dengan `item_type = 'media'`.

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)

- Daftarkan handler IPC baru `db:add-media-to-playlist` ke `setupIPC`.

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)

- Ekspos fungsi `addMedia` di namespace `playlists` pada IPC `preload` Bridge.

---

### Renderer Process (React)

---

#### [MODIFY] [usePlaylistStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/usePlaylistStore.ts)

- Tambahkan action `addMediaToPlaylist(media: { title: string; path: string })` untuk memanggil API IPC.

#### [MODIFY] [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts) & [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts)

- Tangani tipe `item.item_type === 'media'` di `generateSlidesForPlaylistItem` untuk mengembalikan slide kosong dengan penanda media.

#### [MODIFY] [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)

- Tambahkan tab `media-local` (label: "Media") ke panel kanan bawah.
- Tangani klik item playlist bertipe `'media'` untuk memproyeksikan konten media dengan background config yang sesuai.

#### [NEW] [LocalMediaPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/LocalMediaPanel.tsx)

- Desain panel media baru dengan list file lokal, tombol tambah file (menggunakan `showOpenDialog`), tombol tambahkan ke playlist, tombol preview, dan tombol hapus.

#### [MODIFY] [PlaylistItemCard.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PlaylistItemCard.tsx)

- Tambahkan rendering ikon `Image` (lucide-react) dan penanganan visual untuk rundown item tipe `media`.

## Verification Plan

### Automated Tests

- Jalankan pemeriksaan linter (`npm run lint` jika tersedia) setelah pengkodean selesai untuk menjamin tidak ada error tipe.

### Manual Verification

- Jalankan aplikasi (`npm run dev`) di lokal PC.
- Buka mode proyektor.
- Klik tab "Media" baru di kanan bawah.
- Klik "+ Tambah File" untuk memilih gambar/video lokal.
- Verifikasi gambar/video tampil di panel list.
- Klik item media untuk melihat _Preview_.
- Klik kanan atau klik tombol "Project" untuk memproyeksikan media tersebut ke layar jemaat.
- Klik tombol "Tambah ke Playlist" dan verifikasi item masuk ke Rundown sebagai item media dengan ikon gambar.
- Hapus item media lokal dari daftar aset dan pastikan file asli di PC tetap aman (tidak terhapus).
