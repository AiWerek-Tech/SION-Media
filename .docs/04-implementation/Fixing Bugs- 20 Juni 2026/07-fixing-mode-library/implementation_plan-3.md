# Perbaikan Mode Baca Fullscreen Alkitab & Sinkronisasi UI

Rencana ini merinci perbaikan visual dan fungsional pada mode baca layar penuh Alkitab di Library Mode. Masalah utama saat ini adalah TitleBar global tetap muncul dan menutupi baris kontrol interaktif (termasuk tombol kembali, pengatur ukuran font, auto-scroll, dan pemilih tema) dari `LibraryBibleViewer.tsx`. Kami akan menyelesaikan hal ini dengan membaca display store secara langsung di komponen utama untuk memastikan sinkronisasi state yang responsif dan andal.

## User Review Required

> [!IMPORTANT]
> * **Bypass Sync Facade untuk Display State**: Mengubah `App.tsx` dan `LibraryModeRedesigned.tsx` agar mengimpor state `isBibleFullscreen` dan `isLyricsFullscreen` secara langsung dari `useDisplayStore` alih-alih melalui facade `useAppStore`. Hal ini menjamin status fullscreen tersinkronisasi secara instan tanpa jeda atau kegagalan update antar-modul bundel Vite.
> * **TitleBar Auto-Hide**: Mematikan TitleBar global aplikasi sepenuhnya ketika mode baca fullscreen aktif, sehingga area viewport Alkitab memanjang 100vh dari ujung atas dan menampilkan kontrol baca secara sempurna.
> * **Pembaruan Reaktif Catatan**: Menghubungkan callback `onNoteSaved={loadChapterNotes}` dari `LibraryModeRedesigned.tsx` ke `<LibraryBibleViewer />` agar perubahan warna highlight dan catatan belajar yang diubah di layar penuh langsung dimuat ulang dan ditampilkan secara instan.

## Open Questions

> [!NOTE]
> Tidak ada pertanyaan terbuka saat ini. Solusi sinkronisasi langsung menggunakan store dekomposisi `useDisplayStore` adalah pendekatan standar dan paling aman untuk arsitektur multi-store SION Media.

---

## Proposed Changes

### 1. Store & State Integration

#### [MODIFY] [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)
* Impor `useDisplayStore` dari `./store/useDisplayStore`.
* Ambil state `isLyricsFullscreen` dan `isBibleFullscreen` secara langsung menggunakan selector `useDisplayStore` alih-alih `useAppStore`.
* Pastikan baris kondisional TitleBar `{!isLyricsFullscreen && !isBibleFullscreen && <TitleBar />}` merespons perubahan ini.

#### [MODIFY] [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
* Impor `useDisplayStore` dari `../../store/useDisplayStore`.
* Ambil state `isLyricsFullscreen`, `isBibleFullscreen`, `setLyricsFullscreen`, dan `setBibleFullscreen` secara langsung dari `useDisplayStore` menggunakan selector.
* Di bagian render `<LibraryBibleViewer />`, tambahkan properti `onNoteSaved={loadChapterNotes}` agar pembaruan reaktif catatan belajar terhubung secara instan.

---

## Verification Plan

### Automated Tests
* Jalankan `npm run typecheck` untuk memastikan seluruh tipe data TypeScript aman dan tidak ada error import.
* Jalankan `npm run test` untuk memverifikasi seluruh suite pengujian (234 test) tetap sukses tanpa regresi.
* Jalankan `npm run build` untuk memvalidasi keberhasilan pemaketan bundle produksi.

### Manual Verification
1. Jalankan aplikasi di mode pengembangan (`npm run dev`).
2. Masuk ke **Library Mode** lalu pilih workspace **Alkitab**.
3. Klik tombol **Membaca Layar Penuh**.
4. Verifikasi bahwa:
   * TitleBar global aplikasi otomatis tersembunyi sepenuhnya.
   * Header menu `LibraryBibleViewer` muncul di bagian paling atas dengan tombol "Kembali ke Library", tombol font size, auto-scroll, dan pemilih tema.
   * Tombol pagination `<` dan `>` di kiri dan kanan memindahkan pasal dengan benar.
   * Mengklik ayat di layar penuh memunculkan modal catatan belajar interaktif.
   * Mengubah warna highlight atau menyimpan catatan di modal tersebut langsung memperbarui visual ayat secara reaktif di viewport layar penuh.
5. Klik tombol kembali atau tombol tutup untuk kembali ke tampilan perpustakaan biasa, dan pastikan TitleBar global muncul kembali secara normal.
