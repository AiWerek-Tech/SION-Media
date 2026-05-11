# SION Media Documentation Roadmap V2 (Consolidated)

Dokumen ini menggabungkan semua rencana implementasi dan strategi upgrade untuk SION Media V2.

## Major Plans Included:

- Enterprise Upgrade V2.1
- Implementation Plan V2.0
- Implementation Plan V2.1
- Advanced Theme & Database Migration

## Key Objectives:

- Full-Text Search (FTS5) integration for instant song retrieval.
- Multi-window management for Operator, Projection, and Stage displays.
- Crash recovery system (session auto-save).
- Enterprise-grade UI with TailwindCSS V4.

---

_Note: This file is a consolidated version of previous planning documents for V2._

## 2026-05-07 V2 Alignment

Perubahan terbaru yang sudah sejajar dengan roadmap V2:

- Restorasi Title Bar sebagai application command center.
- Penambahan Focus Live Mode untuk operator saat ibadah berjalan.
- Perbaikan Program/Preview agar workflow TAKE aman.
- Stage Display sudah masuk jalur implementasi nyata, bukan hanya rencana.
- Accessibility dasar ditingkatkan melalui focus ring dan `aria-label` pada tombol ikon penting.

## 2026-05-08 V2 Alignment

Penyelarasan tambahan yang kini sudah masuk implementasi:

- dashboard sudah berubah ke layout broadcast console atas-bawah
- workflow `CUE -> TAKE -> PROGRAM` sekarang eksplisit di store dan UI
- control bar sudah mengikuti model switcher video
- monitor preview/program sudah akurat 16:9 dan mendukung warning monitor tunggal
- library dan playlist sudah memakai high-density rows dengan metadata operasional yang lebih kaya
- main process dev menambahkan recovery cache Chromium untuk startup yang lebih stabil
