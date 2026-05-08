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
- Memvalidasi ulang `typecheck`, `lint`, dan `build` setelah seluruh perubahan renderer dan main process.
