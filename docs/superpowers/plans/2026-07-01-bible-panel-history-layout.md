# Bible Panel History Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat Riwayat panel Alkitab tidak pernah menutupi atau menghabiskan ruang daftar ayat.

**Architecture:** Pertahankan `BiblePanel` dan tambahkan state collapse lokal untuk footer Riwayat. Gunakan class CSS terisolasi agar ukuran, scroll, dan responsivitas stabil di Electron tanpa memengaruhi dashboard lain.

**Tech Stack:** React, TypeScript, CSS, Vitest, Testing Library, Electron.

---

### Task 1: Regression test

**Files:**

- Modify: `src/renderer/src/components/projection/__tests__/BiblePanel.test.tsx`

- [ ] Tambahkan test yang membuat satu entri Riwayat melalui alur Preview.
- [ ] Pastikan daftar Riwayat belum dirender sebelum toggle ditekan.
- [ ] Pastikan daftar muncul setelah toggle dan memakai viewport scroll terisolasi.
- [ ] Jalankan test dan konfirmasi RED.

### Task 2: History footer dan layout

**Files:**

- Modify: `src/renderer/src/components/projection/BiblePanel.tsx`
- Modify: `src/renderer/src/assets/main.css`

- [ ] Tambahkan state `isHistoryExpanded` dengan default `false`.
- [ ] Ubah header Riwayat menjadi tombol dengan count dan chevron.
- [ ] Render daftar hanya saat terbuka dan beri class viewport khusus.
- [ ] Tambahkan batas tinggi, scroll internal, ellipsis, focus state, dan aturan compact-height.
- [ ] Jalankan focused test dan konfirmasi GREEN.

### Task 3: Production verification

**Files:**

- Verify only.

- [ ] QA panel Cari, Browse, Manual dan Riwayat di Electron.
- [ ] Jalankan lint, seluruh test suite, dan build produksi.
