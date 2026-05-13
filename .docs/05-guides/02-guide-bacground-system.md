# Panduan Sistem Background & Atmosphere (Enterprise Workflow)

Panduan lengkap penggunaan sistem visual SION-Media, mulai dari manajemen aset hingga operasional harian untuk operator media gereja.

## 1. Konsep Dasar & Hierarki Prioritas
SION-Media menggunakan sistem hierarki cerdas untuk menentukan visual apa yang tampil di layar proyeksi. Sistem akan selalu memilih prioritas tertinggi yang tersedia:

1.  **Live Override (Prioritas Tertinggi)**
    Pilihan manual operator melalui panel atmosfer di Control Bar saat ibadah berlangsung. Digunakan untuk merespon perubahan suasana ibadah secara mendadak.
2.  **Song Background (Binding)**
    Visual yang telah diikat secara permanen ke sebuah lagu melalui [SongEditorScreen.tsx](file:///d:/my_dev/SION-Media/src/renderer/src/screens/SongEditorScreen.tsx). Memungkinkan setiap lagu memiliki "karakter visual" sendiri.
3.  **Global Atmosphere (Fallback)**
    Background default aplikasi yang diatur di [BackgroundSettings.tsx](file:///d:/my_dev/SION-Media/src/renderer/src/screens/settings/BackgroundSettings.tsx). Digunakan jika lagu tidak memiliki binding khusus.

---

## 2. Manajemen Media Library & Koleksi
Kelola aset visual gereja Anda di menu **Settings > Background**.

### Import & Organisasi
*   **Import Media**: Mendukung gambar (JPG, PNG, WEBP) dan video (MP4, WEBM).
*   **Koleksi (Packs)**: Kelompokkan aset berdasarkan tema (contoh: "Worship Ambient", "Seasonal - Christmas", "Fast Beat").
*   **Metadata**: Berikan kategori dan tag pada setiap aset agar mudah ditemukan saat ribuan aset sudah terkumpul.

### Asset Ordering (Drag & Drop)
Guna meningkatkan efisiensi workflow, Anda dapat mengatur urutan aset dalam koleksi:
1.  Pilih koleksi di **Collection Manager**.
2.  Gunakan fitur **Drag & Drop** pada kartu thumbnail untuk memindahkan posisi aset.
3.  Urutan ini akan disimpan secara permanen dan menjadi urutan tampilan utama saat memilih background di Song Editor atau Bulk Assignment.

---

## 3. Mengatur Background Per Lagu (Song Editor)
Ideal untuk lagu-lagu dengan visual spesifik (Hymns tradisional, Lagu Natal, dll).

1.  Buka **Song Editor** untuk lagu target.
2.  Cari bagian **Atmosfer Lagu** di panel kanan.
3.  Pilih salah satu dari tiga mode:
    *   **Inherit Global**: Mengikuti pengaturan default service.
    *   **Preset Lagu**: Menggunakan preset engine (Solid, Gradient, Aurora, dll).
    *   **Asset Library**: Memilih file spesifik dari library.
4.  **Thumbnail Picker**: Jika menggunakan *Asset Library*, sistem akan menampilkan grid thumbnail. Anda dapat memfilter berdasarkan koleksi atau menggunakan fitur pencarian cepat.

---

## 4. Bulk Assignment (Management Mode)
Fitur untuk operator pro guna merapikan ribuan lagu sekaligus dalam hitungan detik.

1.  Masuk ke **Management Mode**.
2.  Pilih banyak lagu menggunakan checkbox atau **Select All Visible**.
3.  Klik ikon **Layers (Bulk Background Assignment)** di toolbar.
4.  Pilih konfigurasi visual yang ingin diterapkan ke semua lagu terpilih.
5.  Klik **Apply**. Database akan memperbarui semua lagu tersebut sekaligus melalui jalur IPC yang aman.

---

## 5. Operasional Saat Ibadah (Live)
SION-Media dirancang agar operator fokus pada momen ibadah, bukan teknis.

*   **Otomatisasi**: Saat lagu diklik dari Playlist, visual akan berubah secara otomatis dengan transisi halus (*cross-fade*).
*   **Emergency Blackout**: Jika terjadi kendala visual, operator dapat langsung mematikan background melalui Live Control.
*   **Smart Fallback**: Jika file media asli terhapus atau harddisk eksternal dicabut, sistem akan otomatis melakukan fallback ke **Global Atmosphere** (Warna Solid) sehingga proyeksi tidak pernah mati/error di depan jemaat.

---

## Tips Teknis untuk Performa Optimal
*   **Format Video**: Gunakan `.webm` untuk beban CPU paling ringan atau `.mp4` (H.264) untuk kompatibilitas luas.
*   **Resolusi**: Rekomendasi 1080p (1920x1080). Engine akan otomatis melakukan *scaling* (cover fit) jika aspek rasio berbeda.
*   **Storage**: SION-Media melakukan *indexing* terhadap lokasi file. Sangat disarankan untuk menyimpan folder Media Library di drive internal SSD yang cepat.
