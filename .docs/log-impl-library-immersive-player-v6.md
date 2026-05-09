---
title: Log — Implementasi Library Immersive Player v6
phase: 2-log
status: implemented
---

# Ringkasan
Implementasi v6 mengubah alur **Library Mode (Player-First)** dari pola *split-pane* (list + sidebar 400px) menjadi **Full-Width Immersive Lyrics Player overlay** yang menutupi seluruh area kerja.

Perubahan ini membuat pengalaman pemilihan lagu menjadi:
- Klik lagu -> langsung masuk ke viewer full-screen overlay.
- Kembali (Back/Escape) -> kembali ke list/grid tanpa pembagian layar.

# Perubahan Arsitektur
## Dari: Split-pane
- `LibraryBrowserPanel` menggunakan layout `flex`:
  - kiri: list/grid
  - kanan: `LyricStudioLite` (sidebar)

## Ke: Full-width overlay (Immersive)
- `LibraryBrowserPanel` hanya bertanggung jawab untuk master list (playlist/nomor/judul).
- Overlay player dipasang di level `LibraryModeRedesigned` menggunakan `AnimatePresence`.
- `LibraryLyricsViewer` direfaktor menjadi komponen overlay immersive (100vw/100vh) dan menjadi *single source* untuk interaksi lyrics di Library Mode.

# Perubahan Utama per File
## `src/renderer/src/components/library/LibraryBrowserPanel.tsx`
- Menghapus integrasi `LyricStudioLite` dari layout.
- Saat user memilih lagu, sekarang memanggil:
  - `setSelectedSong(song)`
  - `setLyricsFullscreen(true)`

## `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`
- Menambahkan rendering overlay global:
  - `AnimatePresence` + `motion.div`
  - kondisi: `isLyricsFullscreen && selectedSong`
- Menambahkan handler close:
  - `setLyricsFullscreen(false)`
  - `setSelectedSong(null)`

## `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
Refaktor total menjadi **Immersive Overlay Player**:
- **Layout hierarchy**
  - Header: tombol Back + metadata + kontrol (slider font + play/pause)
  - Center: 1 stanza per screen (stanza-based pages)
  - Right navigation: vertical dot navigation
  - Footer: indikator linked songs
- **Keyboard**
  - `Escape`: close overlay
  - `ArrowDown/PageDown`: stanza berikutnya
  - `ArrowUp/PageUp`: stanza sebelumnya
  - `Space`: play/pause auto-scroll
- **Typography**
  - slider 14-48, persist ke `localStorage` (`sion:lyric-font-size`)
- **Empty state**
  - tampilkan panel artistik bila lirik kosong
- **Performance**
  - state `index/fontSize/autoScroll` lokal di overlay (tidak mengubah store), sehingga list di background tidak ikut rerender.

# Title Bar / Immersive Mode
- Aplikasi sudah memiliki mekanisme menyembunyikan `TitleBar` berdasarkan `isLyricsFullscreen` di `App.tsx`.
- Dengan overlay v6 memanfaatkan `isLyricsFullscreen`, Title Bar otomatis hilang saat player aktif, memenuhi kebutuhan “area pandang bersih” tanpa perubahan IPC tambahan.

# Catatan QA / Acceptance
- Klik lagu dari tab manapun di Library Mode sekarang membuka overlay.
- Tidak ada lagi split pane untuk lyrics.
- Animasi enter/exit memakai easing dan durasi yang diminta (0.4s).
- Escape / Arrow / Page key bekerja stabil saat overlay aktif.

# Bug Fixes (Post-Implementation)
## Scroll Jump pada LibraryNumberView
- **Issue**: Klik nomor lagu di grid menyebabkan scroll melompat ke kartu yang salah.
- **Cause**: `useEffect` yang melakukan `rowVirtualizer.scrollToIndex()` dipicu oleh perubahan `focusedIndex` baik dari keyboard maupun pointer click.
- **Fix**: Menambahkan state `focusOrigin` ('keyboard' | 'pointer') untuk membedakan sumber fokus. Auto-scroll hanya dijalankan jika `focusOrigin === 'keyboard'`.
- **File**: `src/renderer/src/components/library/LibraryNumberView.tsx`

## Lint Error: react-hooks/set-state-in-effect
- **Issue**: `setSplashDone(true)` dan `setIndex(0)/setAutoScroll(false)` dipanggil sinkron di dalam `useEffect`.
- **Fix**:
  - `App.tsx`: Defer `setSplashDone(true)` dengan `setTimeout(..., 0)`.
  - `LibraryLyricsViewer.tsx`: Hapus `useEffect([song.id])` yang melakukan reset state, karena komponen sudah di-key dengan `selectedSong.id` sehingga remount otomatis saat ganti lagu.
- **Files**: `src/renderer/src/App.tsx`, `src/renderer/src/components/library/LibraryLyricsViewer.tsx`

## Hook Dependency Warning
- **Issue**: `useMemo` columns mengandalkan `gridRef.current?.clientWidth` yang tidak stabil.
- **Fix**: Menggunakan `ResizeObserver` + state `gridWidth` untuk mendapatkan lebar grid secara reaktif.
- **File**: `src/renderer/src/components/library/LibraryNumberView.tsx`

# Verifikasi
- `npm run typecheck`: lulus.
- `npm run lint`: lulus (0 errors, 0 warnings).
- `npm run build`: lulus.

# Deferred / Next Iteration (opsional)
- Menambahkan tombol/indikator untuk memilih linked songs langsung dari footer.
- Auto-fit typography berbasis viewport (selain slider manual) untuk skenario proyeksi jarak jauh.
