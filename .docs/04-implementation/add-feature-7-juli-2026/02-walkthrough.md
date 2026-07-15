# Walkthrough — PDF & Image Presentation Feature

## Overview

Fitur presentasi PDF & gambar telah diimplementasikan secara lengkap di SION Presenter. Operator gereja kini dapat mengimpor dokumen PDF (untuk khotbah, materi presentasi, dll.) ke library media, lalu menampilkannya halaman per halaman ke layar proyeksi jemaat — persis seperti slide presentasi.

---

## Architecture Decisions

### 1. File Asli Tidak Disalin ke Database
Sesuai prinsip SION Presenter, file PDF asli **tidak** diimpor/disalin ke database internal. Yang disimpan hanya:
- `original_path` — path absolut ke file PDF asli
- `local_path` — sama dengan original_path (referensi lokal)
- `type` — `'pdf'`
- Metadata lainnya (nama, kategori, tanggal)

File PDF dipanggil langsung dari direktori asal melalui protokol `local-media://`.

### 2. PPT/PPTX Tidak Didukung Langsung
Ketika operator memilih file `.ppt`/`.pptx`, muncul dialog instruksi konversi langkah demi langkah:
1. Buka di Microsoft PowerPoint / Google Slides
2. Export sebagai PDF atau kumpulan gambar (PNG/JPEG)
3. Upload hasil konversi ke SION Media

### 3. PDF Page Count Cache (Zustand Store)
Jumlah halaman PDF di-cache di `usePlaylistStore.pdfPageCounts` agar:
- `generateSlidesForPlaylistItem()` tetap sinkronus (cepat) untuk rendering UI
- Background fetch otomatis ter-trigger jika cache kosong
- Re-render terjadi secara reaktif setelah cache terisi

### 4. Rendering Offline 100%
Menggunakan `pdfjs-dist` dengan Web Worker lokal — tidak memerlukan CDN atau koneksi internet.

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| [pdfUtils.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/pdfUtils.ts) | Shared helper: `getPdfPageCount()` — menghitung jumlah halaman PDF via pdfjs-dist |
| [PdfSlideViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/presentation/PdfSlideViewer.tsx) | Komponen React: render halaman PDF ke HTML5 canvas (1.5x resolusi, 16:9 fit) |

### Modified Files

| File | Changes |
|------|---------|
| [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts) | Added `.pdf` → `application/pdf` to MIME_TYPES map |
| [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts) | Extended `MediaAssetType` with `'pdf'`; updated `normalizeMediaAssetType` |
| [types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/types.ts) | Added `pdfPath?: string` to `SlideData` |
| [atmosphere/types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/atmosphere/types.ts) | Extended renderer `MediaAssetType` with `'pdf'` |
| [usePlaylistStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/usePlaylistStore.ts) | Added `pdfPageCounts` cache + `fetchPdfPageCount()` async action |
| [engine/slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts) | PDF media items expand into N slides (one per page) using cached page counts |
| [core/projection/slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts) | Same PDF expansion logic |
| [LocalMediaPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/LocalMediaPanel.tsx) | PDF import support, PPT conversion dialog, PDF tab filter, async page expansion on double-click |
| [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx) | Async PDF page count in playlist item click handler |
| [PresentationCanvas.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PresentationCanvas.tsx) | Renders `PdfSlideViewer` for PDF slides; suppresses `AtmosphereRenderer` during PDF display |

---

## How It Works (User Flow)

1. **Import PDF**: Operator klik "Tambah" di panel Media → pilih file PDF → file masuk ke library
2. **Double-click untuk Live**: PDF otomatis dipecah menjadi slide per halaman (contoh: PDF 15 halaman → 15 slide)
3. **Navigasi Slide**: Operator gunakan tombol Next/Prev atau klik slide strip untuk berpindah halaman
4. **Layar Proyeksi**: Setiap halaman PDF dirender tajam ke canvas dengan rasio 16:9 landscape
5. **Transisi**: Slide PDF mendukung semua transisi yang ada (fade, blur, premium-slide)

---

## Verification

- ✅ `npm run typecheck` — passes cleanly (both node and web configs)
- ✅ All TypeScript types properly aligned across main/renderer process boundary
- ✅ No circular dependency issues (shared `pdfUtils.ts` prevents import cycles)
