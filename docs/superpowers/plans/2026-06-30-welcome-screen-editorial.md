# Welcome Screen Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan Welcome Screen satu layar berdasarkan konsep Editorial Split.

**Architecture:** `WelcomeScreen.tsx` menjadi komposisi hero dan capability rail tanpa state wizard. Store yang ada tetap menjadi pemilik persistence first-install, sedangkan layar menangani penyimpanan tema dan feedback kegagalan.

**Tech Stack:** React 19, TypeScript, Zustand, Framer Motion, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Lock behavior with tests

**Files:**

- Create: `src/renderer/src/screens/__tests__/WelcomeScreen.test.tsx`

- [ ] Tulis test untuk copy baru dan hilangnya kontrol wizard.
- [ ] Tulis test klik dan Enter menghasilkan `{ theme: 'system', mode: 'LIBRARY' }` setelah settings tersimpan.
- [ ] Tulis test kegagalan persistence mempertahankan first-install dan menampilkan alert.
- [ ] Jalankan `npx vitest run src/renderer/src/screens/__tests__/WelcomeScreen.test.tsx` dan pastikan gagal karena UI baru belum ada.

### Task 2: Implement Editorial Split

**Files:**

- Modify: `src/renderer/src/screens/WelcomeScreen.tsx`

- [ ] Hapus tutorial, theme picker, mode picker, dan magnetic-button wizard.
- [ ] Tambahkan hero, capability rail, CTA tunggal, keyboard Enter, loading, dan error feedback.
- [ ] Terapkan tema sistem lalu persist `app_theme_mode=system` sebelum `finishOnboarding`.
- [ ] Jalankan test target dan pastikan lulus.

### Task 3: Production and visual verification

**Files:**

- Modify: `.gitignore`

- [ ] Abaikan `.superpowers/` sebagai artefak brainstorming lokal.
- [ ] Jalankan `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build`.
- [ ] Jalankan renderer, cek 1280×720 dan viewport aktif, klik CTA, audit console, serta bandingkan screenshot dengan konsep yang disetujui.
