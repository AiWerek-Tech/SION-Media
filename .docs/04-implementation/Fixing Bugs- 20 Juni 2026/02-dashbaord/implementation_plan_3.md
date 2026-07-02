# Rencana Implementasi: Peningkatan UI/UX Dashboard Mode Proyeksi (Projection Mode)

Dokumen ini berisi rencana peningkatan interaksi, pelabelan, dan fungsionalitas pada dashboard utama **Mode Proyeksi (Projection Mode)**. Fokus utama adalah menyederhanakan istilah teknis penyiaran (broadcast) agar ramah bagi relawan gereja pemula (newbie), mencegah kebingungan kontrol proyektor, serta menyelaraskan fitur catatan operator.

---

## Masalah & Gap yang Diidentifikasi (Hasil Audit Dashboard Proyeksi)

1. **Jargon Penyiaran yang Membingungkan**:
   - Tombol **"Take"** dan **"Cut"** adalah istilah industri penyiaran (video switcher). Bagi pemula di multimedia gereja, istilah ini sering membingungkan. Label yang lebih intuitif seperti **"TAYANGKAN"** (dengan efek transisi) dan **"INSTAN"** (langsung ganti tanpa jeda) akan sangat membantu.
2. **Preview Monitor Kosong Tanpa Panduan**:
   - Ketika operator baru pertama kali masuk ke Mode Proyeksi, layar Preview monitor di bagian atas terlihat hitam kosong jika belum ada lagu yang diaktifkan (cued). Ini membuat pemula bingung langkah apa yang harus dilakukan pertama kali. Layar kosong ini harus menampilkan petunjuk interaktif.
3. **Kerancuan Aksi "Clear" vs "Black"**:
   - Tombol status output di kanan bawah bar kontrol meliputi **Black** dan **Clear**. Newbie seringkali tidak mengerti bedanya:
     - **Black**: memadamkan seluruh layar (termasuk background gambar/video).
     - **Clear**: hanya menyembunyikan lirik teks (background media tetap berjalan).
     - Penjelasan visual dan label pelengkap (bilingual) akan membantu operator membedakan keduanya dengan cepat.
4. **Integrasi Catatan Kustom Operator**:
   - Tab **"Notes"** di panel informasi lagu (`SongInfoPanel`) saat ini hanya menampilkan rangkuman metadata statis. Kita perlu menampilkan **Catatan Kustom Operator** yang disimpan di tabel database `song_notes` (yang baru saja kita implementasikan di Library Mode) dan mengizinkan pengeditan langsung di sini agar operator dapat memperbarui catatan rundown/ibadah secara real-time.

---

## Solusi & Peningkatan yang Diusulkan

### 1. Pelabelan Ulang Tombol Transisi & Aksi Proyeksi

- **Komponen**: `TransitionColumn` di [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)
- **Peningkatan**:
  - Mengubah label tombol **"Take"** menjadi **"TAYANGKAN"** (masih menggunakan ikon `Zap`).
  - Mengubah label tombol **"Cut"** menjadi **"INSTAN"** (atau **"CUT INSTAN"**).
  - Memperjelas deskripsi tooltip saat dihover untuk menjelaskan bahwa "Tayangkan" menggunakan efek transisi yang dipilih, sedangkan "Instan" akan langsung menayangkan slide dalam waktu 0.1s.

### 2. Panduan Interaktif di Monitor Preview yang Kosong

- **Komponen**: `MonitorFrame` di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx)
- **Peningkatan**:
  - Jika state `slide` bernilai `null` pada mode `preview` (tidak ada cue aktif), tampilkan sebuah kartu panduan visual di tengah-tengah frame monitor preview:
    > _"Preview Kosong. Klik ganda lagu dari perpustakaan (kiri-bawah) atau rundown (tengah-bawah) untuk memuat slide di sini."_
  - Desain panduan menggunakan ikon `Worship` / `Music2` transparan dengan font berukuran kecil yang modern dan ramah.

### 3. Klarifikasi Visual Aksi "Clear" dan "Black"

- **Komponen**: `LivePreviewPanel` di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx)
- **Peningkatan**:
  - Mengubah label tombol **"Black"** menjadi **"Black (Padam)"** dengan penjelasan tooltip: _"Padamkan layar proyeksi secara total (Hitam Pekat)"_.
  - Mengubah label tombol **"Clear"** menjadi **"Clear (Kosongkan Lirik)"** dengan penjelasan tooltip: _"Sembunyikan teks lirik saja (Latar belakang gambar/video tetap menyala)"_.
  - Menyelaraskan tombol **"Safe"** menjadi **"Safe (Polos)"** dengan tooltip: _"Gunakan tema polos hitam-putih tanpa gambar latar belakang (sangat cocok untuk sesi khotbah)"_.

### 4. Integrasi & Editor Catatan Operator Kustom

- **Komponen**: `SongInfoPanel` di [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)
- **Peningkatan**:
  - Mengambil data catatan kustom dari database via `window.api.songs.getNote(activeSong.id)` saat lagu aktif berubah.
  - Menampilkan area `<textarea>` interaktif di tab **Notes** untuk catatan kustom ini, diletakkan berdampingan dengan metadata statis bawaan.
  - Menyediakan tombol **"Simpan Catatan"** yang memicu pembaruan ke database SQLite secara real-time dengan feedback toast sukses/gagal.

---

## Rencana Verifikasi

### Pengujian Manual

1. **Uji Panduan Preview Kosong**:
   - Buka Projection Mode saat pertama kali aplikasi dijalankan. Verifikasi monitor Preview memuat petunjuk visual _"Preview Kosong. Klik ganda lagu..."_.
   - Klik ganda sebuah lagu, verifikasi petunjuk hilang dan preview lirik termuat dengan benar.
2. **Uji Tombol Aksi**:
   - Hover tombol **TAYANGKAN** (sebelumnya Take) dan **INSTAN** (sebelumnya Cut). Verifikasi label dan tooltip barunya telah terupdate.
   - Hover tombol **Black**, **Clear**, dan **Safe** di sebelah kanan bawah. Pastikan penjelasannya membedakan fungsi memadamkan layar vs menyembunyikan lirik.
3. **Uji Catatan Operator**:
   - Buka tab **Notes** di panel kanan bawah untuk lagu yang dipilih.
   - Tulis catatan baru, klik **Simpan Catatan**. Pastikan toast sukses muncul dan catatan tersimpan di database.
   - Pindah ke Library Mode, buka lagu yang sama, pastikan catatan kustom yang baru saja disimpan sinkron dan tampil di sana juga.

---

## Pertanyaan Terbuka / Masukan Pengguna

- Apakah penamaan **"TAYANGKAN"** dan **"INSTAN"** sudah cukup jelas untuk menggantikan tombol "Take" dan "Cut"? Atau Anda memiliki preferensi istilah lain (seperti "TRANSISI" dan "POTONG")?
