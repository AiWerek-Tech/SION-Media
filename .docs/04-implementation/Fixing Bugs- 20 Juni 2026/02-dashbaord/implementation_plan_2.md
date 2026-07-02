# Rencana Implementasi: Audit Lanjutan & Peningkatan UI/UX Dashboard Mode Perpustakaan (Library Mode) - Tahap 2

Berdasarkan hasil audit mendalam terhadap Dashboard Mode Perpustakaan (Library Mode) untuk mempermudah relawan dan operator pemula (newbie), diidentifikasi beberapa area interaksi yang masih membingungkan atau memerlukan perpindahan layar yang tidak efisien.

---

## Masalah & Gap yang Diidentifikasi (Hasil Audit Tahap 2)

1. **Umpan Balik Seret-dan-Taruh (Drag-and-Drop) Pasif**:
   - Ketika operator menyeret kartu lagu atau ubin nomor, tidak ada perubahan visual (visual feedback) pada panel playlist rundown sebelah kiri. Relawan pemula mungkin tidak menyadari bahwa mereka harus menjatuhkan (drop) lagu ke panel tersebut untuk menyusun rundown.
2. **Ketiadaan Aksi Reset pada Hasil Pencarian Kosong**:
   - Jika pencarian lagu tidak menemukan hasil, layar hanya menampilkan pesan statis. Untuk mencari ulang, pengguna harus menghapus teks secara manual atau mencari tombol 'X' kecil di kolom pencarian. Tombol reset pencarian yang besar dan intuitif di area kosong akan sangat membantu.
3. **Label Aksi Utama yang Kurang Jelas**:
   - Tombol **"Buka Lagu"** pada inspector kanan memiliki makna yang ambigu bagi pemula. Tidak jelas apakah tombol tersebut untuk mengedit lirik atau untuk menampilkan lirik ke layar jemaat (proyektor). Label yang lebih eksplisit seperti **"Proyeksikan Lirik (Live)"** akan mencegah kesalahan operator di gereja.
4. **Alur Pengeditan Catatan Operator yang Terlalu Panjang**:
   - Tab **"Notes"** pada inspector kanan saat ini hanya bersifat read-only. Jika operator ingin mencatat instruksi ibadah singkat (misal: _"Intro keyboard saja"_, _"Reff diulang 2x"_), mereka harus masuk ke menu edit lagu penuh dan berpindah layar. Memiliki editor catatan langsung (Quick Notes Editor) di inspector kanan akan sangat menghemat waktu.

---

## Solusi & Peningkatan yang Diusulkan

### 1. Visual Drag-Over Highlight pada Rundown Playlist

- **Komponen**: `LibraryMode` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Menambahkan state `isDraggingOver` yang dipicu oleh event `onDragEnter`, `onDragLeave`, `onDragOver` (dengan `preventDefault`), dan `onDrop` pada wadah rundown playlist.
  - Saat file diseret di atas rundown, tampilkan efek border putus-putus menyala (dashed border glow) dan overlay transparan bertuliskan _"Lepaskan lagu di sini untuk menambahkan ke rundown"_ untuk panduan visual yang jelas.

### 2. Tombol Cepat "Reset Pencarian" pada Tampilan Kosong

- **Komponen**: `LibraryMode` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Menambahkan tombol premium _"Bersihkan Pencarian"_ di bawah teks "Tidak ada lagu ditemukan" pada area kosong (empty state) hasil pencarian.
  - Tombol ini akan mereset query pencarian dan mengembalikan daftar lagu default secara instan.

### 3. Klarifikasi Label Aksi Proyeksi

- **Komponen**: `RightInspector` dan `SongMediaCard` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Mengubah label tombol **"Buka"** pada `SongMediaCard` dan **"Buka Lagu"** pada `RightInspector` menjadi **"Tayangkan Lirik (Live)"** atau **"Proyeksikan Lirik"** dengan ikon layar proyeksi (`MonitorPlay`).
  - Mengubah label tombol **"Tambah Playlist"** menjadi **"Tambah ke Rundown"** agar selaras dengan bahasa yang ramah pemula.

### 4. Editor Catatan Cepat (Quick Notes Editor) Langsung

- **Komponen**: `RightInspector` di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Peningkatan**:
  - Mengubah tab **"Notes"** pada inspector kanan menjadi area input teks (`<textarea>`) interaktif yang menampilkan catatan tersimpan untuk lagu aktif.
  - Menyediakan tombol **"Simpan Catatan"** yang memicu pembaruan database Sqlite menggunakan API `window.api.songs.update` dan memperbarui state lokal secara instan (optimistic update).
  - Ini memungkinkan operator menulis pengingat pelayanan dengan satu klik tanpa harus meninggalkan dashboard utama.

---

## Rencana Verifikasi

### Pengujian Manual

1. **Uji Efek Drag-Over**:
   - Seret ubin nomor atau lagu di atas panel playlist rundown. Verifikasi border menyala dan overlay instruksi "Lepaskan lagu di sini" muncul secara dinamis.
   - Seret keluar dari panel rundown dan verifikasi status border kembali normal.
2. **Uji Reset Pencarian**:
   - Masukkan kata kunci pencarian acak yang tidak ada dalam database (misal: "xyzabc").
   - Setelah pesan "Tidak ada lagu ditemukan" muncul, klik tombol "Bersihkan Pencarian" dan verifikasi seluruh lagu kembali tampil.
3. **Uji Edit Catatan Langsung**:
   - Pilih sebuah lagu, buka tab **Notes** di panel kanan.
   - Ketikkan instruksi singkat (misal: "Piano saja di bait pertama") lalu klik "Simpan Catatan".
   - Verifikasi notifikasi sukses muncul, dan saat Anda memilih lagu lain lalu kembali ke lagu tersebut, catatan yang Anda buat tetap tersimpan.
