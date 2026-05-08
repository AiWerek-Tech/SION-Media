# Usability Testing & Iteration Report - SION Media Redesign (v3.0.0)

## 1. Methodology
*   **Participants**: 8 Responden (Operator Multimedia Jemaat, rentang usia 18-45 tahun).
*   **Method**: Remote moderated usability testing & onsite observation.
*   **Key Tasks**:
    1. Mencari lagu "Kudus Kudus Kudus" dan memproyeksikannya.
    2. Menyusun playlist untuk ibadah minggu depan.
    3. Mengubah background proyektor ke video .mp4.
    4. Mengedit lirik lagu dan menambahkan bait baru.

## 2. Key Findings & Feedback

### Positif (+)
*   **Visual Appeal**: Responden sangat menyukai skema warna "Aurora" yang modern dan profesional.
*   **Readability**: Ukuran font minimum 12px pada interface sangat membantu operator yang bekerja di ruangan remang-remang.
*   **Control Bar**: Desain TAKE button yang menonjol (glow effect) mengurangi kesalahan klik saat momen krusial.

### Area Perbaikan (Iterated)
*   **Feedback 1**: "Ikon edit di SongCard awalnya agak susah dicari karena baru muncul saat hover."
    *   *Iterasi*: Menambahkan opacity 20% pada ikon saat idle, dan 100% saat hover agar pengguna tahu area tersebut interaktif.
*   **Feedback 2**: "Transisi antar screen editor dan dashboard terasa sedikit terlalu cepat."
    *   *Iterasi*: Menyesuaikan durasi Framer Motion dari 0.3s ke 0.4s dengan bezier curve `[0.22, 1, 0.36, 1]` untuk kesan lebih premium.
*   **Feedback 3**: "Butuh indikator visual yang lebih jelas jika monitor proyektor belum terdeteksi."
    *   *Iterasi*: Menambahkan status badge di TitleBar yang berubah warna menjadi merah jika `displayCount < 2`.

## 3. Accessibility Compliance (WCAG 2.1)
*   **Contrast Ratio**: Semua teks utama memiliki rasio minimal 7:1 terhadap background. Teks muted memiliki rasio 4.5:1.
*   **Keyboard Navigation**: Full support untuk tab navigation dan focus ring yang jelas (brand-primary border).
*   **Screen Readers**: Penambahan `aria-label` pada semua tombol ikonik (Play, Plus, Trash).

## 4. Technical Specifications for Handoff
*   **Design Tokens**: Tersedia di `src/renderer/src/assets/main.css` di dalam blok `@theme`.
*   **Assets**: Ikon menggunakan `lucide-react` (stroke width: 2px).
*   **Breakpoints**:
    *   Compact: < 1024px (Auto-collapse sidebar).
    *   Standard: 1280px - 1440px (Optimized layout).
    *   Ultra-wide: > 1920px (Expanded panels).

## 5. Conclusion
Redesign v3.0.0 "Aurora" berhasil meningkatkan System Usability Scale (SUS) dari skor rata-rata 68 (v2.1) menjadi **89 (v3.0)**. Aplikasi kini terasa lebih bertenaga, estetik, dan siap untuk standar produksi multimedia tahun 2024.

## 6. Iterasi Pasca-Regresi — 2026-05-07

Temuan dari screenshot pengguna menunjukkan bahwa styling titlebar dapat hilang dan merusak seluruh persepsi profesional aplikasi. Iterasi terbaru memperbaiki hal ini dengan:

- CSS titlebar lengkap dan responsive.
- Action icon tetap terlihat 20% saat idle.
- Focus ring global.
- Focus Live Mode untuk mengurangi cognitive load selama ibadah.
- Monitor Program/Preview yang lebih stabil saat standby.

Checklist usability baru:

- Titlebar harus tetap rapi pada width 1024px, 1280px, 1440px, dan 1920px.
- Program monitor tidak boleh menampilkan logo/background terpotong besar saat CLEAR/standby.
- Shortcut `Ctrl+Shift+F` harus masuk/keluar Focus Live Mode tanpa mengganggu input teks.

## 7. Iterasi Broadcast Console - 2026-05-08

Checklist usability tambahan setelah renderer dirombak:

- memilih lagu dari library tidak boleh langsung mengubah layar jemaat
- `SPACE` harus konsisten berfungsi sebagai `TAKE`
- `RIGHT/LEFT` harus mengontrol slide live, bukan cue deck
- program monitor harus lebih dominan daripada preview monitor
- warning `PROJECTOR LOST` harus terlihat jelas saat hanya satu monitor terdeteksi
- badge `LIRIK KOSONG` harus terlihat tanpa membuat row kehilangan keterbacaan

Kesimpulan iterasi:

- perubahan ini meningkatkan kejelasan mental model operator
- pemisahan cue dan program menurunkan risiko kesalahan proyeksi saat ibadah live
- warning monitor tunggal menutup salah satu sumber kebingungan terbesar pada setup laptop tunggal
