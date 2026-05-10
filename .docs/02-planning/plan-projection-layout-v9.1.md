# Plan: Projection Layout V9.1 — Resizable Broadcast Console

## Objective
Mengimplementasikan **Dynamic Dual-Monitor Layout** dengan panel yang dapat diubah ukurannya (*resizable*), terinspirasi oleh vMix dan OBS Studio, untuk memberikan fleksibilitas penuh kepada operator dalam mengatur proporsi layar PREVIEW vs PROGRAM.

## Audit Terhadap Implementasi Saat Ini

### ✅ Sudah Terimplementasi
1. **`react-resizable-panels` (v2.1.9)**: Library sudah terinstal dan aktif di `LivePreviewPanel.tsx`.
2. **PanelGroup/Panel/PanelResizeHandle**: Struktur resizable sudah diterapkan dengan:
   - Default ratio **40% (Preview) : 60% (Program)**.
   - Constraints: `minSize={28} maxSize={65}` (Preview), `minSize={35} maxSize={72}` (Program).
   - Persistensi ukuran via `autoSaveId="sion:projection:monitorSplit"` (tersimpan di localStorage).
3. **CSS `.monitor-resize-handle`**: Drag handle dengan desain garis vertikal tipis, hover state, dan dukungan Light/Dark mode.
4. **Monitor Glow States**: `.monitor-frame--preview` (hijau), `.monitor-frame--program` (merah), `.monitor-frame--live` (pulsing animation).
5. **TAKE Button**: Pulsing glow animation, is-live red state, disabled grayscale.
6. **16:9 Confidence Monitor**: `aspect-video` di dalam MonitorFrame.
7. **PROJECTOR LOST Badge**: Ditampilkan di monitor Program via `isProjectorLost` prop.
8. **Focus Mode**: `AnimatePresence` pada management section untuk collapse/expand dengan transisi halus.
9. **State Separation**: CUE deck (`slides`) terpisah dari LIVE deck (`programSlides`).
10. **Info Pill Program**: Selalu terlihat (tidak tersembunyi di resolusi kecil).

### 🔧 Gap Yang Ditemukan & Perlu Diperbaiki
1. **Management Section**: Masih menggunakan `gap-px bg-white/[0.06]` (border overload) — harus diganti shadow separation.
2. **Inner Panel Padding**: `p-2` terlalu ketat, perlu ditingkatkan ke `p-3`.
3. **Drag Handle Active State**: Tidak ada visual feedback saat handle sedang di-drag (missing `[data-resize-handle-active]` CSS).

## Rencana Perbaikan
1. Ganti `gap-px bg-white/[0.06]` → `gap-0` + shadow separation.
2. Tingkatkan padding → `p-3` untuk breathing room.
3. Tambahkan CSS `[data-resize-handle-active]` → handle berubah biru saat di-drag (brand-primary glow).
4. Tambahkan transition pada `::before` pseudo-element → width berubah dari 2px → 3px (hover) → 4px (active).
