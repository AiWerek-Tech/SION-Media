# Plan: Library Immersive Player V6 (Player-First)

## Objective
Mengadopsi pola interaksi "Player-First" di **Library Mode** dengan menghapus komponen lirik bergaya split-pane (`LyricStudioLite`) dan menggantinya dengan **Full-Width Immersive Viewer** (`LibraryLyricsViewer`) yang akan muncul sebagai overlay menutupi seluruh *viewport* ketika sebuah lagu dipilih, mengimitasi pengalaman pada `play.lagusion.org`.

## Arsitektur & State Management
1. **Global State (`useAppStore`)**:
   - Memanfaatkan *state* `isLyricsFullscreen` (boolean) untuk memicu kemunculan overlay.
   - Menggunakan `selectedSong` (Song | null) sebagai sumber kebenaran (source of truth) data lirik yang akan dirender.

2. **Penggantian Komponen (Refactoring)**:
   - **`LibraryBrowserPanel.tsx`**: Menghapus `LyricStudioLite` dan membersihkan layout *flex-row* agar Daftar Lagu (Number/Title/Playlist) mengambil lebar penuh (flex-1).
   - **`LibraryModeRedesigned.tsx`**: Mengubah *conditional rendering* untuk memuat `LibraryLyricsViewer` menggunakan `AnimatePresence` (dari *framer-motion*) ketika `isLyricsFullscreen && selectedSong` bernilai *true*. Render komponen ini dengan urutan *z-index* tinggi (`z-[80]`).
   - **`App.tsx`**: Melakukan modifikasi untuk menyembunyikan komponen `<TitleBar />` secara otomatis jika `isLyricsFullscreen` aktif (`{!isLyricsFullscreen && <TitleBar />}`). Hal ini tidak akan mengganggu Windows Native Controls karena *controls* tersebut didambar langsung oleh *DWM (Desktop Window Manager)* Windows via `titleBarOverlay`.

3. **Desain Komponen `LibraryLyricsViewer.tsx`**:
   - **Background**: Menggunakan kombinasi *Subtle abstract gradient* dengan lapisan *glassmorphism* dan *masking* hitam.
   - **Header**: Terletak di bagian atas (`absolute top-0`) untuk menampilkan Metadata Lagu (Nomor, Judul, Kunci/Key, Birama/Time Signature).
   - **Controls**: Implementasi "Glassmorphism 2.0" untuk tombol navigasi font (Perkecil/Perbesar), Auto-Scroll (Play/Pause), dan tombol *Back/Esc*.
   - **Right Navigation**: Dot Navigation vertikal (`absolute right-6`) untuk mewakili setiap bait/halaman lirik.
   - **Center Content**: Area utama yang memuat teks lirik besar (proporsional 14px-48px) dengan efek *drop-shadow* presisi tinggi agar teks terbaca walau latar belakang sedikit kompleks. Terdapat transisi *masking* (`WebkitMaskImage`) di ujung atas dan bawah konten untuk memberikan efek *smooth fade-out* ketika auto-scroll berjalan.
   - **Footer**: Indikator ketersediaan versi buku lain (Hymnal Relations).

## Mekanisme Interaksi
- **Masuk**: Ketika user meng-klik sebuah lagu, panggil `setLyricsFullscreen(true)` dan `setSelectedSong(song)`. Transisi Framer Motion: *Scale-up + Fade-in* (`scale: 0.98 -> 1`, `opacity: 0 -> 1`).
- **Keluar**: Tombol *Back* di UI atau tekan tombol `Esc` memanggil `setLyricsFullscreen(false)`. Transisi Framer Motion: *Slide-down + Fade-out* (`y: 24`, `opacity: 1 -> 0`).
- **Paginasi**:
  - Paginasi diproses melalui modul internal `buildStanzaPages` yang memilah lirik menggunakan label stanza (bait) dan Reff/Chorus.
  - Shortcut keyboard: `ArrowDown`/`PageDown` (Bait selanjutnya) dan `ArrowUp`/`PageUp` (Bait sebelumnya).
- **Auto-scroll**: Shortcut keyboard `Space` digunakan untuk *Play/Pause*. Jika aktif, `scrollTop` elemen kontainer ditambahkan secara perlahan menggunakan `setInterval` (~16ms loop).

## Penanganan Edge Cases
- **Lirik Kosong**: Modifikasi `currentText` pada viewer. Jika kosong, jangan biarkan layar menjadi hitam. Tampilkan UI "Empty State" *glassmorphism* dengan pesan artistik: "Lirik belum tersedia".
- **Pembersihan Modul Lama**: Berkas `LyricStudioLite.tsx` (modul split-pane sebelumnya) harus **dihapus sepenuhnya** dari basis kode untuk mengurangi ukuran *bundle* dan menjaga kerapian *codebase*.
