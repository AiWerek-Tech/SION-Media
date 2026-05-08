# UI/UX Audit Report - SION Media

## 1. Executive Summary
Audit ini mengevaluasi interface SION Media terhadap standar desain modern 2024, prinsip Material Design 3, dan Human Interface Guidelines. Meskipun aplikasi memiliki fondasi yang kuat dengan tema gelap yang profesional, terdapat beberapa area kritis yang memerlukan perbaikan untuk meningkatkan usability, accessibility, dan estetika secara keseluruhan.

## 2. Analisis Komponen

### A. Tata Letak (Layout)
*   **Kelemahan**: Tata letak Dashboard bersifat kaku dengan pembagian flexbox statis (5:4). Hal ini membatasi fleksibilitas pengguna pada monitor dengan resolusi berbeda.
*   **Rekomendasi**: Implementasikan layout yang lebih dinamis dengan *resizable panels* atau grid system yang lebih adaptif. Gunakan margin dan padding yang lebih konsisten (8px/16px/24px).

### B. Tipografi (Typography)
*   **Kelemahan**: Penggunaan font size yang terlalu kecil (9px - 11px) pada banyak elemen caption dan label. Hal ini melanggar prinsip aksesibilitas dan menyulitkan pembacaan cepat saat live production.
*   **Rekomendasi**: Skala tipografi minimum harus 12px untuk caption. Gunakan font Inter untuk interface dan Poppins untuk heading dengan hierarki yang lebih jelas menggunakan font-weight dan color contrast.

### C. Skema Warna (Color Scheme)
*   **Kelemahan**: Warna-warna "Live" dan "Program" sangat dominan tetapi kurang memiliki variasi tone. Tidak ada dukungan sistem tema (Light/Dark mode) yang terintegrasi secara modular.
*   **Rekomendasi**: Gunakan Design Tokens untuk warna. Terapkan sistem warna primer, sekunder, dan surface yang mengikuti standar WCAG 2.1 untuk rasio kontras.

### D. Ikonografi (Iconography)
*   **Kelemahan**: Ikon pada SongCard dan ControlBar terlalu kecil (14px). Jarak antar ikon seringkali terlalu rapat, meningkatkan risiko salah klik.
*   **Rekomendasi**: Ukuran ikon standar minimal 16px atau 18px dengan target sentuh/klik minimal 32x32px atau 44x44px untuk elemen kritis.

### E. Spacing & Konsistensi
*   **Kelemahan**: Inkonsistensi penggunaan border-radius (ada yang 4px, 6px, 8px). Spacing antar komponen seringkali tidak mengikuti grid sistem yang ketat.
*   **Rekomendasi**: Standarisasi border-radius (misal: 8px untuk cards, 4px untuk small buttons). Gunakan unit spacing berbasis 4px (4, 8, 12, 16, 24, 32).

## 3. Identifikasi Masalah Utama
1.  **High Cognitive Load**: Dashboard terlalu padat dengan informasi dan tombol yang memiliki prioritas visual yang hampir sama.
2.  **Low Accessibility**: Kontras teks muted pada background gelap seringkali di bawah standar ( < 4.5:1).
3.  **Static UI**: Kurangnya micro-interactions dan loading states yang informatif membuat aplikasi terasa kurang responsif secara visual.

## 4. Daftar Prioritas Perbaikan (Priority List)
1.  **P1 (Critical)**: Standarisasi Design Tokens & Spacing System.
2.  **P1 (Critical)**: Redesign SongCard & Playlist Item untuk readability yang lebih baik.
3.  **P2 (High)**: Implementasi Global Design System (Reusable Components).
4.  **P2 (High)**: Penyesuaian Tipografi (Minimum font size 12px).
5.  **P3 (Medium)**: Penambahan Micro-animations & Transitions.
6.  **P3 (Medium)**: Peningkatan Accessibility (Aria-labels, Keyboard focus).

## 5. Rekomendasi Teknis
*   **Tailwind CSS 4**: Manfaatkan fitur `@theme` untuk mendefinisikan tokens secara global.
*   **Framer Motion**: Gunakan untuk transisi antar layar dan loading states.
*   **Lucide React**: Konsisten menggunakan satu library ikon dengan stroke-width yang seragam.
*   **Zustand**: Pisahkan state UI (modals, active panels) dari state data untuk performa yang lebih baik.

## 6. Audit Lanjutan — Screenshot Regression 2026-05-07

### Masalah Visual

- Custom title bar kehilangan styling lengkap sehingga menu, status, clock, dan window controls saling menumpuk.
- Area Program/Preview terlalu dominan oleh logo/background yang tidak terkontrol.
- Action icon yang hanya muncul saat hover membuat affordance lemah untuk operator baru.

### Perbaikan UI yang Diterapkan

- Menambahkan CSS titlebar lengkap sebagai bagian design system permanen.
- Menambahkan responsive collapse pada titlebar agar elemen non-kritis hilang pada width kecil.
- Menambahkan Focus Live Mode untuk memprioritaskan monitor live.
- Menjaga action icon tetap terlihat samar saat idle dan penuh saat hover/focus.
- Menambahkan focus ring global untuk keyboard navigation.
- Menyesuaikan standby monitor agar background asset dapat memakai `contain` saat tidak live.

## 7. Audit Lanjutan - Broadcast Console 2026-05-08

### Perubahan yang Sudah Masuk

- Dashboard kini memakai layout top-bottom split yang jauh lebih dekat ke control room software.
- Monitor preview/program memakai rasio 40/60 sehingga program lebih dominan secara visual.
- Mixer bar dipisahkan di tengah dan tombol `TAKE` menjadi fokus utama.
- Song library dan playlist memakai high-density rows dengan zebra striping untuk scanning cepat.
- Metadata lagu kini lebih lengkap: `LS`, judul Indonesia, judul Inggris, nada dasar, tempo.
- Warning monitor tunggal tampil jelas pada title bar dan area live preview.

### Penilaian UX Saat Ini

- **Visual Hierarchy**: Meningkat signifikan. Fokus mata operator kini langsung ke program monitor dan tombol `TAKE`.
- **Operational Clarity**: Meningkat signifikan. Istilah `PREVIEW`, `PROGRAM`, dan `TAKE` kini eksplisit.
- **Readability**: Tetap padat tetapi lebih informatif. Banyak area berhasil bertahan pada ukuran minimum 12px.
- **Action Discoverability**: Membaik. Ikon aksi tetap samar saat idle namun tidak hilang total.
- **Failure Visibility**: Membaik. Kehilangan proyektor kini memiliki sinyal visual merah yang sulit terlewat.

### Rekomendasi Lanjutan

- tambahkan mode `Next Preview` opsional jika dibutuhkan gereja yang memakai tiga monitor
- evaluasi ulang ukuran teks mikro tertentu pada layar 1024px agar tetap nyaman bagi operator senior
- jika nanti menambah background video lebih kompleks, pertahankan prinsip `low cognitive load` pada dashboard operator
