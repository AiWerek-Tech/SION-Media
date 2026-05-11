# SION Media - Backend & Core Feature Audit Report

Dokumen ini merangkum audit arsitektur utama SION Media setelah upgrade renderer dan workflow live terbaru.

## 1. Electron Main Process

Temuan utama:

- aplikasi mengelola `MainWindow`, `ProjectionWindow`, dan `StageDisplayWindow`
- sinkronisasi antar window memakai IPC bridge via preload
- display eksternal dideteksi melalui `screen.getAllDisplays()`
- projection window dipindahkan otomatis saat monitor berubah
- mode development menambahkan cleanup cache Chromium untuk mengurangi error `disk_cache`

Catatan:

- pembersihan cache dev hanya menyasar `Cache`, `Code Cache`, dan `GPUCache`
- database, settings, dan playlist tidak ikut disentuh

## 2. Renderer Architecture

Temuan utama:

- state sudah dipisah ke `useAppStore`, `usePlaylistStore`, dan `useProjectionStore`
- renderer dashboard kini memakai layout broadcast console, bukan layout admin panel
- `useProjectionStore` memisahkan cue deck dan live deck
- shortcut live sekarang lebih aman: `SPACE` untuk `TAKE`, `RIGHT/LEFT` untuk navigasi live

Status arsitektur projection:

- `slides`: cue / preview
- `programSlides`: deck live aktif
- `programSlide`: slide aktual yang sedang diproyeksikan
- `programSlideIndex`: posisi live deck

## 3. Slide Engine

Temuan utama:

- slide engine terpisah dari UI
- pemecahan lirik memakai wrapping, balancing, dan cache berbasis hash
- manual split `---` tetap didukung
- perubahan lirik dapat di-hot-swap tanpa memaksa refactor komponen monitor

## 4. UI System

Temuan utama:

- TailwindCSS v4 memakai `@theme`
- token dasar renderer sekarang konsisten dengan blueprint enterprise:
  - base `#0D0F17`
  - surface `#151826`
  - elevated `#1B2031`
- font lokal `Poppins` dan `Inter` tetap bundled offline
- control bar, monitor, dan title bar sudah selaras dengan gaya production switcher

## 5. Database & Search
 
 Temuan utama:
 
- SQLite + FTS5 dirombak total menjadi Arsitektur Multi-Hymnal.
- Tabel `hymnals` memisahkan buku lagu resmi (LS, SDAH) dari koleksi custom user.
- Tabel `songs` terhubung secara relasional ke `hymnals` dengan `ON DELETE CASCADE`.
- Pencarian FTS5 ditingkatkan untuk mendukung Global Search (lintas buku lagu) dengan info asal buku lagu dalam hasil query.
- Backup dan restore sudah memakai langkah aman WAL checkpoint dan cleanup WAL/SHM.

## 8. Multi-Hymnal & IPC Stabilization (Update 2026-05-08)

Temuan Audit Akhir:
- **IPC Hardening**: Menghapus registrasi handler ganda yang menyebabkan crash startup. Memperbaiki mismatch channel display monitor.
- **Renderer Parity**: Memperbaiki `BibleScreen.tsx` dari error linting dan tipe data. Implementasi `useEffect` cleanup pattern untuk data fetching yang aman.
- **Shared Integrity**: Menambahkan tipe data Alkitab ke `shared/types.ts` untuk memastikan konsistensi main-to-renderer communication.

## 6. Kesimpulan Audit

Status saat ini:

- arsitektur renderer sudah bergerak jelas dari "modern web app" ke "professional broadcasting console"
- workflow ibadah live jauh lebih aman karena cue dan program tidak lagi bercampur
- edge case utama yang sudah tertangani: monitor tunggal, lirik kosong, snapshot stage display, dan startup dev cache corruption

Risiko residual:

- monitor ketiga `NEXT PREVIEW` masih belum diimplementasikan
- fade selector masih mengandalkan konfigurasi theme projection, belum menjadi sistem transisi yang lebih luas

## 7. Validasi Teknis

Pemeriksaan terakhir pada 2026-05-08:

- `npm run typecheck` lulus
- `npm run lint` lulus
- `npm run build` lulus
