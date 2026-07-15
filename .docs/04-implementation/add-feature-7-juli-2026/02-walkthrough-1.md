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

### 4. PDF Page Count & Document Cache (Zustand Store & Global Memory)
- Jumlah halaman PDF di-cache di `usePlaylistStore.pdfPageCounts` agar `generateSlidesForPlaylistItem()` tetap sinkronus (cepat) untuk rendering UI.
- Dokumen PDF (`PDFDocumentProxy`) di-cache di memori global (`pdfUtils.ts`) agar perpindahan slide/halaman PDF tidak memuat ulang dan mem-parsing file dari awal (sangat cepat).
- Indikator "Memuat Slide..." diberikan delay 150ms di `PdfSlideViewer.tsx` sehingga jika rendering selesai dalam waktu sangat cepat (< 150ms), teks memuat tidak akan pernah berkedip/muncul ke layar jemaat.

### 5. Efek Transisi Paralel untuk PDF
- Blok rendering presentasi PDF dipisahkan dari `AnimatePresence` lirik/teks biasa.
- `AnimatePresence` lirik/teks tetap menggunakan mode `"wait"` agar pergantian bait lirik teratur, sedangkan `AnimatePresence` dokumen PDF diubah menggunakan mode paralel (`mode` tidak dideklarasikan/sync).
- Hal ini memungkinkan halaman PDF lama dan halaman PDF baru beranimasi secara bersamaan (tumpang-tindih/cross-fade) sehingga transisi slide (fade, smooth-blur, slide, premium-slide) berjalan langsung dari gambar A ke gambar B tanpa melewati layar hitam gelap di tengahnya.

### 6. Dynamic PDF Thumbnail Generation
- Menambahkan komponen `PdfThumbnail` di `LocalMediaPanel.tsx` untuk memuat halaman pertama (page 1) dari setiap file PDF lokal di background secara asinkronus (skala 0.2x).
- Hasil render thumbnail disimpan ke dalam cache memori global (`pdfRenderCache`) sehingga saat tab Media dibuka kembali, semua thumbnail dimuat secara instan tanpa lag.
- Menggunakan red PDF fallback icon standar saat thumbnail sedang diproses atau jika terjadi kesalahan pemuatan.

### 7. Rendering Offline 100%
Menggunakan `pdfjs-dist` dengan Web Worker lokal — tidak memerlukan CDN atau koneksi internet.

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| [pdfUtils.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/pdfUtils.ts) | Shared helper & cache: `getPdfPageCount()`, `getPdfDocument()`, `getCachedPdfPageImage()` & `prefetchAndCachePdfPage()` — manajemen memuat, merender, dan prefetching file PDF |
| [PdfSlideViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/presentation/PdfSlideViewer.tsx) | Komponen React: render halaman PDF ke HTML5 canvas (1.5x resolusi, 16:9 fit, delayed loading spinner) |

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
| [LocalMediaPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/LocalMediaPanel.tsx) | PDF import support, PPT conversion dialog, PDF tab filter, async page expansion on double-click, and dynamic PDF cover thumbnail rendering (`PdfThumbnail` component) |
| [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx) | Async PDF page count in playlist item click handler |
| [PresentationCanvas.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PresentationCanvas.tsx) | Renders `PdfSlideViewer` for PDF slides; separates lyrics and PDF slides into separate AnimatePresence containers to allow parallel transition animations |

---

## How It Works (User Flow)

1. **Import PDF**: Operator klik "Tambah" di panel Media → pilih file PDF → file masuk ke library dengan thumbnail halaman pertama dokumen yang muncul secara otomatis.
2. **Double-click untuk Live**: PDF otomatis dipecah menjadi slide per halaman (contoh: PDF 15 halaman → 15 slide)
3. **Navigasi Slide**: Operator gunakan tombol Next/Prev atau klik slide strip untuk berpindah halaman. Halaman dirender instan tanpa kedipan (flicker).
4. **Layar Proyeksi**: Setiap halaman PDF dirender tajam ke canvas dengan rasio 16:9 landscape
5. **Transisi**: Slide PDF mendukung semua transisi yang ada (fade, blur, premium-slide) tanpa kedipan hitam

---

## Verification

- ✅ `npm run typecheck` — passes cleanly (both node and web configs)
- ✅ All TypeScript types properly aligned across main/renderer process boundary
- ✅ Caching of `PDFDocumentProxy` in `pdfUtils.ts` works successfully (eliminating reload overhead)
- ✅ Delayed Loading indicator (150ms timeout) completely eliminates "Memuat Slide..." flashing on slide transitions
- ✅ Split `AnimatePresence` structure allows simultaneous enter/exit animations, enabling smooth cross-fade, blur, and slide transitions directly between PDF pages without going to black
- ✅ PDF Cover Thumbnail Generator renders and displays page 1 of PDFs dynamically in the library panel
- ✅ No circular dependency issues (shared `pdfUtils.ts` prevents import cycles)
