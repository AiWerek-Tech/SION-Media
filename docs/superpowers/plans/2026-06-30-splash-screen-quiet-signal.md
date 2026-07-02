# Splash Screen Quiet Signal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan splash startup minimal Quiet Signal dengan progress boot aktual.

**Architecture:** `startup/SplashScreen.tsx` tetap menjadi overlay portal yang membaca `bootStore`. Styling spacing penting ditempatkan pada kelas scoped di `main.css` agar tidak dipatahkan reset global.

**Tech Stack:** React 19, Zustand, Framer Motion, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Lock the splash contract

**Files:**

- Create: `src/renderer/src/startup/__tests__/SplashScreen.test.tsx`

- [ ] Tulis test identitas Quiet Signal dan absennya badge GPU/tips.
- [ ] Tulis test progress rata-rata serta label task aktif.
- [ ] Tulis test fallback status dan fase `ready` tersembunyi.
- [ ] Jalankan `npx vitest run src/renderer/src/startup/__tests__/SplashScreen.test.tsx`; hasil yang diharapkan adalah gagal pada kontrak visual/progress baru.

### Task 2: Implement Quiet Signal

**Files:**

- Modify: `src/renderer/src/startup/SplashScreen.tsx`
- Modify: `src/renderer/src/assets/main.css`

- [ ] Hapus interval tips dan badge GPU.
- [ ] Render logo, wordmark, tagline, progress aktual, status aktif, dan persentase.
- [ ] Tambahkan kelas scoped `boot-splash__*` serta reduced-motion behavior.
- [ ] Jalankan test target sampai seluruh skenario lulus.

### Task 3: Verify production behavior

**Files:**

- Test: `src/renderer/src/startup/__tests__/SplashScreen.test.tsx`

- [ ] Jalankan `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` dengan exit code 0.
- [ ] Capture splash dari Electron dan bandingkan dengan konsep Quiet Signal untuk alignment, typography, progress, palette, dan absence of clipping.
