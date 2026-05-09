# SION Media Implementation History V2

Dokumen ini mencatat riwayat implementasi, tugas yang diselesaikan, dan panduan teknis selama pengembangan V2.

---

_Note: This file contains the consolidated history of walkthroughs and tasks for version 2._

## Implementation Update — 2026-05-07

Perubahan V2 terbaru:

- Mengisi `src/renderer/src/stageDisplay/main.tsx` agar Stage Display render.
- Menambahkan `programSlide` di projection store untuk memisahkan cue/preview dari output.
- Memperbaiki TAKE workflow dan recovery dari FREEZE.
- Memulihkan CSS lengkap custom title bar dan window controls.
- Menambahkan Focus Live Mode (`Ctrl+Shift+F`) di dashboard.
- Menambahkan focus ring global dan `aria-label` untuk action icon penting.
- Memperkuat backup/restore SQLite dengan WAL checkpoint dan cleanup WAL/SHM.
- Memastikan validasi `typecheck`, `lint`, dan `build` tetap hijau.

## Implementation Update - 2026-05-08

Perubahan V2 tambahan:

- Merombak `Dashboard.tsx` menjadi layout top-bottom split dengan dual monitor section di atas dan dual panel management di bawah.
- Mengubah `LivePreviewPanel.tsx` menjadi sistem `PREVIEW` dan `PROGRAM` dengan rasio 40/60, confidence monitor 16:9, badge `NO CUE`, `ON AIR`, dan `LIRIK KOSONG`.
- Mengubah `ControlBar.tsx` menjadi switcher-style transport bar dengan cue nav, live nav, fade selector, black, freeze, clear, dan tombol `TAKE` dominan.
- Memisahkan projection store menjadi cue deck dan live deck melalui `slides`, `programSlides`, `programSlide`, dan `programSlideIndex`.
- Mengubah shortcut live: `SPACE` sekarang `TAKE`, `RIGHT/LEFT` untuk navigasi slide live.
- Memadatkan `SongLibraryPanel.tsx`, `SongCard.tsx`, `PlaylistPanel.tsx`, dan `PlaylistItemCard.tsx` dengan zebra rows, metadata `LS`, judul Inggris, nada dasar, tempo, dan affordance action 20% idle / 100% hover.
- Menambahkan warning kehilangan proyektor pada title bar dan simulasi monitor tunggal pada live preview.
- Menambahkan cleanup cache Chromium pada `src/main/index.ts` untuk mode development agar startup `npm run dev` lebih stabil.
- Audit & Finalisasi Database Multi-Hymnal: Menyelesaikan perombakan total skema database SQLite untuk mendukung banyak buku lagu (Hymnals).
- Menghapus registrasi ganda IPC handler di `src/main/ipc-handlers.ts` yang menyebabkan crash saat startup (Bible/Slides channels).
- Memperbaiki penamaan channel IPC display monitor agar sinkron antara main dan renderer (`display_get-all`).
- Menambahkan interface `BibleTranslation`, `BibleBook`, dan `BibleVerse` di `src/shared/types.ts` untuk integritas data antar proses.
- Ekspos namespace `window.api.bible` dan `window.api.slides` secara penuh di `src/preload/index.ts`.
- Refaktor `BibleScreen.tsx` untuk menghilangkan 6 linting/type errors, termasuk implementasi `useEffect` cleanup pattern untuk menghindari cascading renders.
- Memperbaiki query FTS5 Alkitab di `src/main/database.ts` agar menggunakan JOIN yang benar.
- Memvalidasi ulang `typecheck`, `lint`, dan `build` setelah seluruh perubahan arsitektur database dan IPC.

## Implementation Update - 2026-05-09

Perubahan Library Mode dan Song Metadata:

### Library Mode — Full-screen Lyrics Viewer

- **Stanza-based Pagination**: Lirik ditampilkan per bait (bukan per slide). Jika ada Reff/Chorus, setiap bait ditampilkan bersama Reff.
- **Navigation Controls**:
  - Tombol Next/Previous song untuk navigasi antar lagu
  - Keyboard: ArrowDown/PageDown untuk bait berikutnya, ArrowUp/PageUp untuk bait sebelumnya
  - Klik titik di kanan layar untuk lompat ke bait tertentu
- **Progress Indicator**: Menampilkan `1/3` (bait ke-1 dari 3 bait total)
- **Key & Time Signature Badge**: Menampilkan nada dasar + birama di pojok kanan atas (contoh: `Eb 3/4 1/3`)
- **Immersive Fullscreen Mode**:
  - Tombol fullscreen (icon) di kanan atas
  - Shortcut F11 untuk toggle fullscreen
  - Mode fullscreen menyembunyikan TitleBar untuk tampilan full-screen murni
  - Escape keluar dari fullscreen dan kembali ke library

### Song Metadata — Time Signature (Birama)

- **Database Schema**:
  - Migration v7 menambahkan kolom `time_signature` di tabel `songs`
  - Field menyimpan birama lagu (contoh: `4/4`, `3/4`, `6/8`)
- **Song Editor**:
  - Input field baru "Birama" di sebelah "Nada Dasar"
  - Placeholder: `4/4`
  - Disimpan ke database saat add/update song
- **Types**:
  - `Song` interface di `src/shared/types.ts` dan `src/renderer/src/types.ts` memiliki field `time_signature: string`
  - `AddSongRequest` dan `UpdateSongRequest` mendukung `time_signature`
- **Import/Copy Operations**:
  - `HymnalSettings.tsx` menyertakan `time_signature` saat import dan copy lagu

### Files Changed

- `src/main/migrations.ts` — Migration v7
- `src/main/database.ts` — addSong/updateSong dengan time_signature
- `src/shared/types.ts` — Song interface
- `src/renderer/src/types.ts` — Song interface (renderer)
- `src/renderer/src/screens/SongEditorScreen.tsx` — Input birama
- `src/renderer/src/screens/settings/HymnalSettings.tsx` — Import/copy support
- `src/renderer/src/components/library/LibraryLyricsViewer.tsx` — Full viewer redesign
- `src/renderer/src/components/library/LibraryBrowserPanel.tsx` — Pass songs for navigation
- `src/renderer/src/store/useAppStore.ts` — isLyricsFullscreen state
- `src/renderer/src/App.tsx` — Hide TitleBar when fullscreen
