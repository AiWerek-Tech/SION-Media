# Tasks: Peningkatan UI/UX Dashboard Mode Proyeksi (Projection Mode)

- `[x]` Pelabelan Ulang Tombol Transisi & Aksi Proyeksi
  - `[x]` Ubah "Take" menjadi "TAYANGKAN" (diubah ke "Tayangkan" agar harmonis) dan perjelas tooltip di [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx).
  - `[x]` Ubah "Cut" menjadi "INSTAN" (diubah ke "Instan" agar rapi) dan perjelas tooltip di [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx).
- `[x]` Panduan Interaktif di Monitor Preview yang Kosong
  - `[x]` Tambahkan petunjuk visual ketika preview slide kosong pada `MonitorFrame` di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx).
- `[x]` Klarifikasi Visual Aksi "Clear", "Black", dan "Safe"
  - `[x]` Ubah "Black" menjadi "Black (Padam)" beserta tooltip di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx).
  - `[x]` Ubah "Clear" menjadi "Clear (Kosongkan)" beserta tooltip di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx).
  - `[x]` Ubah "Safe" menjadi "Safe (Polos)" beserta tooltip di [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx).
- `[x]` Integrasi & Editor Catatan Operator Kustom
  - `[x]` Tarik catatan kustom dari database via API `getNote` di `SongInfoPanel` pada [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx).
  - `[x]` Tambahkan editor `<textarea>` interaktif di tab Notes pada `SongInfoPanel` untuk mengubah/menyimpan catatan secara real-time.
- `[x]` Verifikasi & Uji Linting Kode
  - `[x]` Jalankan `npm run lint` dan `npm run typecheck` untuk memastikan kelulusan kompilasi tanpa error.
