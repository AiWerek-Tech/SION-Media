# Plan: Projection Mode Modernization V9

## Objective
Transformasi antarmuka **Projection Mode** dari estetika "admin panel" menjadi **Professional Broadcast Console** berstandar vMix/OBS/ProPresenter 2026. Fokus pada hierarki visual yang presisi, eliminasi border overload, dan pemisahan alur kerja PROGRAM ↔ PREVIEW ↔ TAKE yang crystal-clear.

## Temuan Audit

### 1. Layout & Grid
- **ProjectionMode.tsx**: Grid `grid-template-rows: 1fr 70px 1fr` sudah tepat. Focus mode (`0fr`) berfungsi.
- **Management Section**: Menggunakan `gap-px bg-white/[0.04]` — ini menciptakan "garis sekat" antara panel library & playlist via gap 1px + background fill. Terlihat sebagai border keras. **Harus diganti** dengan shadow-based separation.
- **Inner panels**: Padding `p-2` pada wrapper divs terlalu ketat. Perlu sedikit breathing room.

### 2. Monitor Section (LivePreviewPanel)
- **Rasio 40/60**: Sudah terimplementasi (`grid-cols-[minmax(280px,40%)_minmax(420px,60%)]`). ✓
- **Monitor Frame CSS**: Kualitas sangat baik — menggunakan radial gradient, glow-driven shadows, dan animasi `monitorLivePulse`. ✓
- **Monitor Title Bar**: Height 28px, glassmorphism ringan. Sudah baik.
- **Masalah**: `pt-9` pada grid container (untuk memberi ruang badge "Monitor Tunggal") agak kasar. Badge sebaiknya di-overlay tanpa menggeser content.

### 3. Mixer Bar (ControlBar)
- **TAKE Button**: Kualitas CSS sangat tinggi — gradient glow, pulsing animation, is-live state. ✓
- **Info Pill**: Layout baik, tapi `hidden xl:flex` pada program pill bisa menyembunyikan informasi penting pada resolusi standar. **Harus terlihat selalu**.
- **Segmented Control**: Baik. Fade speed selector sudah ada.
- **State Button Group**: Baik. Black/Freeze/Clear terpisah.
- **Masalah minor**: Mixer bar tidak memiliki label kontekstual yang menunjukkan ini adalah "transport zone".

### 4. Management Section (Library + Playlist)
- **SongLibraryPanel**: Border overload — `border border-border-default`, `border-b border-border-subtle`, dll. Terlalu banyak batas keras.
- **SongCard**: Zebra striping sudah ada (`rowIndex % 2`). Action affordance sudah 20%/100%. ✓
- **PlaylistPanel**: `panel-glass` wrapper sudah bagus, tapi nested borders (`border-b border-border-subtle`) berlebihan.
- **Virtualization**: `@tanstack/react-virtual` aktif di SongLibraryPanel. ✓

### 5. CSS Architecture
- Semua token projection ada di `main.css` lines 1490-1770. Terorganisir dengan baik.
- Light mode overrides tersedia untuk mixer-bar, info-pill, segmented-control, state-btn-group, mixer-center-well. ✓

## Rencana Implementasi

### Phase 1: ProjectionMode.tsx — Management Section Cleanup
- Hapus `gap-px bg-white/[0.04]` pada management section grid.
- Ganti dengan `gap-0` dan gunakan shadow separation alih-alih border.
- Tingkatkan padding inner panels dari `p-2` ke `p-3`.

### Phase 2: SongLibraryPanel.tsx — Border Reduction
- Hapus border luar (`border border-border-default`) dari container utama.
- Ganti `border-b border-border-subtle` dengan shadow ultra-tipis.
- Pastikan search input tetap visible tanpa heavy borders.

### Phase 3: ControlBar.tsx — Program Info Visibility
- Hapus `hidden xl:flex` dari program info pill agar selalu terlihat.
- Program pill sangat penting untuk operator; harus selalu tampil.

### Phase 4: LivePreviewPanel.tsx — Padding Fix
- Ganti `pt-9` dengan `pt-8` dan biarkan badge overlay tanpa menggeser grid.

### Phase 5: PlaylistPanel.tsx — Cleanup
- Hapus border berlebihan pada header dan quick actions bar.
- Gunakan separator berbasis shadow.
