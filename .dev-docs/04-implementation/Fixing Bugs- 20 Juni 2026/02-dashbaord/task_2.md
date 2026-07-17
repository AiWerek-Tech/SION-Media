# Tasks: Audit Lanjutan & Peningkatan UI/UX Dashboard Mode Perpustakaan (Library Mode) - Tahap 2

- `[x]` Tambahkan Visual Drag-Over Highlight pada Rundown Playlist
  - `[x]` Tambahkan state `isDraggingOver` dan logic enter/leave/drop di [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx).
  - `[x]` Desain rendering border putus-putus menyala (glowing dashed border) dan teks panduan ketika `isDraggingOver` aktif.
- `[x]` Tambahkan Tombol Cepat "Reset Pencarian" pada Tampilan Kosong
  - `[x]` Modifikasi empty state search pada tab `number` dan `title` agar memuat tombol "Bersihkan Pencarian".
- `[x]` Klarifikasi Label Aksi Proyeksi Lirik
  - `[x]` Ubah tombol "Buka" pada `SongMediaCard` menjadi "Tayangkan".
  - `[x]` Ubah tombol "Buka Lagu" pada `RightInspector` menjadi "Tayangkan Lirik".
  - `[x]` Ubah label "Tambah Playlist" menjadi "Tambah Rundown" pada `RightInspector`.
- `[x]` Implementasikan Editor Catatan Cepat (Quick Notes Editor) Langsung
  - `[x]` Ubah tab "Notes" pada `RightInspector` agar menampilkan `<textarea>` interaktif dengan tombol "Simpan Catatan".
  - `[x]` Hubungkan tombol ke `window.api.songs.update` untuk menyimpan catatan secara permanen, dan perbarui state `songs` secara lokal (optimistic update).
- `[x]` Verifikasi & Uji Linting Kode
  - `[x]` Jalankan `npm run lint` dan `npm run typecheck` untuk memastikan lulus kompilasi tanpa error.
