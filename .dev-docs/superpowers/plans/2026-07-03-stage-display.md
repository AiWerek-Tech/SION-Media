# Stage Display Production Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghasilkan Stage Display Electron yang responsif, informatif, dan aman untuk lagu maupun Alkitab.

**Architecture:** Perkaya payload confidence dari sumber runtime, lalu render melalui komponen Stage Display yang hanya membaca payload. Helper presentasi murni menangani pembersihan nomor ayat dan kelas auto-fit agar mudah diuji.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

---

### Task 1: Confidence payload metadata

**Files:**

- Modify: `src/renderer/src/types.ts`
- Modify: `src/renderer/src/core/projection/confidencePayloadBuilder.ts`
- Test: `src/renderer/src/core/projection/confidencePayloadBuilder.test.ts`

- [ ] Tulis tes gagal yang memastikan slide Alkitab membawa tipe, referensi, versi, copyright, dan tidak membuat metadata lagu palsu.
- [ ] Jalankan tes dan pastikan gagal karena metadata belum tersedia.
- [ ] Tambahkan metadata opsional pada payload dan mapping dari `SlideData`.
- [ ] Jalankan tes dan pastikan lulus.

### Task 2: Stage Display presentation

**Files:**

- Modify: `src/renderer/src/stageDisplay/StageDisplayApp.tsx`
- Test: `src/renderer/src/stageDisplay/StageDisplayApp.test.tsx`

- [ ] Tulis tes gagal untuk tampilan Alkitab, lagu, NEXT, progress, status, dan empty state.
- [ ] Jalankan tes dan pastikan kegagalan mewakili UI lama.
- [ ] Implementasikan helper pembersihan ayat, auto-fit, header status, progress, footer kontekstual, dan NEXT yang ringkas.
- [ ] Jalankan tes dan pastikan lulus.

### Task 3: Production verification

**Files:**

- Verify: seluruh perubahan Stage Display dan regresi aplikasi.

- [ ] Jalankan tes Stage Display dan payload.
- [ ] Jalankan typecheck, lint, dan seluruh test suite.
- [ ] Periksa diff agar tidak mengubah modul yang tidak terkait.
