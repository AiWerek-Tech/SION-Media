# Walkthrough - Library Lyrics Viewer Enhancements

Penyempurnaan `LibraryLyricsViewer` untuk workflow produksi yang lebih efisien dan fungsional.

## Fitur Baru

### 1. **Broadcast Control Center (Top Bar)**

Top Bar kini dilengkapi dengan kontrol operasional yang lengkap:

- **Font Scaling**: Tombol `+` dan `-` dengan indikator ukuran font numerik.
- **Music Mode**: Tombol toggle untuk menampilkan/menyembunyikan chord musik.
- **Copy Action**: Tombol salin lirik dengan feedback ikon `Check` saat berhasil.
- **Quick Search**: Ikon pencarian untuk memicu `LibrarySearchPalette` secara instan.

### 2. **Integrasi Quick Jump**

Operator kini dapat menekan ikon pencarian (atau nantinya shortcut keyboard) untuk mencari lagu lain. Saat lagu dipilih, viewer akan langsung memuat lagu tersebut tanpa harus kembali ke Library Dashboard.

### 3. **Music Mode (Chord Support)**

Implementasi parser lirik sederhana yang mendeteksi format `[Chord]` (contoh: `[G]`) dan menampilkannya sebagai badge kecil yang elegan di atas baris lirik saat Music Mode aktif.

### 4. **Dynamic Progress Bar**

Garis progress berwarna biru brand di bagian bawah Top Bar yang menunjukkan posisi bait saat ini terhadap total bait lagu.

## Perubahan Kode Utama

- **File**: `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
  - Penambahan state: `fontSize`, `showChords`, `isSearchOpen`, `copyFeedback`.
  - Penambahan logic: `renderLyrics`, `handleCopyLyrics`, `handleSearchJump`, `handleZoom`.
  - Refactoring Top Bar metadata untuk efisiensi ruang.

## Verifikasi Visual

- [x] Metadata 'Tema' dan 'Penulis' telah dihapus.
- [x] Kontrol zoom font berfungsi (14px - 120px).
- [x] Tombol salin memberikan feedback visual warna hijau.
- [x] Progress bar di Top Bar bergerak sesuai navigasi slide.
- [x] Search Palette muncul sebagai overlay di atas viewer.
- [x] Chord muncul di atas lirik saat mode Musik aktif (uji coba dengan lirik berformat `[G]`).
