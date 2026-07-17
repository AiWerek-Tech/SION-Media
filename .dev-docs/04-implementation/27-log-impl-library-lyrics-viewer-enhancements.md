# Library Lyrics Viewer Enhancements Implementation

> **Created**: 2026-05-13
> **Status**: Planning
> **Purpose**: Rencana implementasi fitur lanjutan untuk Library Lyrics Viewer (Broadcast-grade console)

---

## Ringkasan Rencana

Penyempurnaan `LibraryLyricsViewer` untuk meningkatkan fungsionalitas bagi operator dalam skenario siaran langsung (live broadcast). Fokus utama adalah aksesibilitas, navigasi cepat, dan integrasi metadata musik.

---

## Daftar Fitur & Spesifikasi

### 1. **Font Scaling (Zoom Controls)**

- **Tujuan**: Memungkinkan operator menyesuaikan ukuran teks lirik secara instan.
- **UI**:
  - Tombol **(+)** dan **(-)** di sebelah kanan Slide Indicators atau di Footer.
  - Menampilkan angka persentase atau ukuran pixel saat diubah.
- **Logika**:
  - State `fontSize` (saat ini sudah ada namun akan diekspos ke UI).
  - Shortcut keyboard: `+` (zoom in) dan `-` (zoom out).
  - Simpan preferensi di `localStorage`.

### 2. **Quick Jump Search (Command Palette)**

- **Tujuan**: Berpindah lagu secara instan tanpa menutup penampil lirik.
- **UI**:
  - Ikon **Kaca Pembesar (Search)** di Top Bar (sebelah kiri tombol Fullscreen).
  - Menampilkan overlay `LibrarySearchPalette` saat dipicu.
- **Logika**:
  - Shortcut keyboard: `Ctrl+F` atau `S`.
  - Integrasi dengan `selectedSong` di store untuk update konten secara reaktif.

### 3. **Salin Lirik (Copy to Clipboard)**

- **Tujuan**: Mempermudah distribusi teks lirik untuk tim media sosial atau koordinasi.
- **UI**:
  - Ikon **Salin (Copy)** di Top Bar.
  - Feedback visual (Toast/Tooltip) bertuliskan "Lirik berhasil disalin".
- **Logika**:
  - Menggunakan `navigator.clipboard.writeText(song.lyrics_raw)`.

### 4. **Progress Indicator (Visual Navigation)**

- **Tujuan**: Memberikan orientasi posisi bait lirik secara visual.
- **UI**:
  - Indikator berupa deretan titik (dots) vertikal di sisi kanan (Slide Indicators).
  - _Optional_: Progress bar tipis di bagian bawah Top Bar atau di atas Footer.
- **Logika**:
  - Berdasarkan `(index + 1) / totalPages`.

### 5. **Music Mode (Chord View Toggle)**

- **Tujuan**: Menampilkan kunci musik (chords) bagi tim pemusik.
- **UI**:
  - Toggle **Ikon Musik (Music)** di Top Bar.
  - Label "Music Mode" aktif saat dihidupkan.
- **Logika**:
  - State `showChords`.
  - Rendering baris kunci gitar/piano (jika tersedia dalam metadata atau diparsing dari `lyrics_raw`).

---

## File yang Akan Diubah

- `src/renderer/src/components/library/LibraryLyricsViewer.tsx` (Logic & UI utama)
- `src/renderer/src/components/library/LibrarySearchPalette.tsx` (Optional: penyesuaian z-index/overlay)

---

## Langkah Eksekusi

1. **Phase 1: UI Layout Prep**
   - Menyiapkan ruang di Top Bar dan Footer untuk ikon-ikon baru.
   - Refactor `LibraryLyricsViewer` untuk mendukung state baru (`showChords`, `fontSize`).

2. **Phase 2: Core Features**
   - Implementasi Zoom logic (+/-).
   - Implementasi Copy logic.
   - Implementasi Progress Indicator.

3. **Phase 3: Search Integration**
   - Menghubungkan `LibrarySearchPalette` ke dalam viewer.
   - Memastikan navigasi `selectedSong` tidak merusak state viewer.

4. **Phase 4: Music Mode (Chords)**
   - Implementasi parser sederhana untuk menampilkan kunci musik di atas lirik.

---

## Verifikasi

- [ ] Pastikan shortcut keyboard bekerja dengan responsif.
- [ ] Verifikasi `localStorage` menyimpan ukuran font saat viewer ditutup dan dibuka kembali.
- [ ] Uji coba "Quick Jump" apakah transisi antar lagu mulus tanpa glitch visual.
- [ ] Pastikan mode Fullscreen tetap bersih dari elemen yang tidak perlu.
