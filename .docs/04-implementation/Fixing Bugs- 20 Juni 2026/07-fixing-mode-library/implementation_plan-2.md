# Rencana Implementasi — Redesain UI Alkitab Interaktif (Library Mode)

Rencana ini merinci peningkatan estetika antarmuka **Alkitab Interaktif** di **Library Mode** agar setara dan selaras dengan desain premium lagu (mendukung glassmorphism, micro-animations, layout bersih, dan tipografi modern).

---

## User Review Required

> [!IMPORTANT]
> * **Tata Letak Baru**: Melebarkan sidebar selektor Kitab (`w-64`) untuk mencegah pemotongan nama kitab, serta menambahkan pembagi visual dan lencana jumlah pasal yang bersih.
> * **Selektor Pasal Modern**: Menggantikan selektor pasal horizontal sederhana dengan deretan pill melingkar premium dengan transisi hover halus dan tombol navigasi cepat (Next/Prev Chapter).
> * **Verses Card-Style List**: Ayat-ayat Alkitab dirender dalam bentuk card modern (`bg-white/[0.01] border border-white/[0.03] rounded-2xl`) dengan efek hover dinamis dan lencana penunjuk ayat yang bersih.
> * **Quick Hover Actions**: Menambahkan tombol aksi cepat (Preview/Live/Add) secara langsung saat kursor diarahkan ke card ayat, menyelaraskan alur kerja operator seperti pada daftar lagu.

---

## Proposed Changes

### 1. Renderer (UI Components)

#### [MODIFY] [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
* **Kitab List Sidebar**:
  * Mengatur background input pencarian kitab dengan warna transparan gelap mewah.
  * Menata ulang list Kitab dengan margin yang rapi, lencana (pill) jumlah pasal di sebelah kanan, dan border penanda aktif dengan warna brand utama.
* **Pasal Navigation Bar**:
  * Mendesain ulang deretan nomor pasal menjadi tombol pill bulat premium yang interaktif.
  * Menambahkan tombol navigasi cepat `<` dan `>` di sebelah kiri dan kanan deretan pasal untuk kemudahan berpindah pasal.
* **Scripture Card List**:
  * Mengganti layout list ayat biasa menjadi tumpukan card modern dengan padding luas (`p-4`), radius rounded besar (`rounded-2xl`), dan transisi warna latar belakang yang memukau.
  * Merancang visual highlight warna (multicolor) agar menyatu secara harmonis sebagai background gradien transparan yang lembut.
  * Menambahkan indikator ikon "Notes" di sebelah nomor ayat jika terdapat catatan belajar pribadi.
  * Mengintegrasikan Floating Quick Action Bar yang muncul secara dinamis saat kursor mengarah di atas card ayat (hover) untuk mempercepat proyeksi Live.

---

## Verification Plan

### Automated Tests
* Jalankan `npm run typecheck` untuk memastikan tipe TypeScript aman.
* Jalankan `npm run build` untuk memastikan kompilasi bundle produksi sukses.

### Manual Verification
1. Buka workspace Alkitab di Library Mode.
2. Verifikasi selektor Kitab tidak terpotong dan memiliki hover effect yang modern.
3. Verifikasi navigasi Pasal bekerja secara instan dan terlihat premium.
4. Verifikasi daftar ayat dirender dalam bentuk card-style modern dan highlight warna tampil secara harmonis.
