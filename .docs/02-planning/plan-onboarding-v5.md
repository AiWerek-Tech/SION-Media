# Plan: Onboarding V5 — WelcomeScreen Multi-Phase

## Objective
Bangun antarmuka penyambutan (onboarding) multi-fase yang merepresentasikan identitas SION Media sebagai **Professional Worship Multimedia Ecosystem**.

## Architecture
- **State:** `useModeStore` memegang `isFirstInstall`, `currentMode`, `theme: 'dark' | 'light'`.
- **Persistensi:** Zustand `persist` middleware → localStorage (`sion-mode-storage`).
- **Routing:** `App.tsx` melakukan top-level conditional rendering antara `WelcomeScreen` dan `MainLayout` berdasarkan `isFirstInstall`.
- **Title Bar Lockdown:** `TitleBar.tsx` menerima prop `isOnboarding`. Saat true, sembunyikan `TitleBarMenu`, `TitleBarModeSwitcher`, `TitleBarStatus`.

## Phase Flow
1. **Phase 1: Intro** — Mesh gradient, logo scale-in, progress bar, "Get Started".
2. **Phase 2: Theme** — Pilih Celestial Dark vs Sacred Light (preview langsung).
3. **Phase 3: Mode** — Bento grid 4 mode (Library, Projection, Broadcast, Management).

## Transitions
- `AnimatePresence` dengan `mode="wait"`.
- Duration 0.5s, ease `[0.22, 1, 0.36, 1]`.
- Exit: slide-up + fade.

## Files to Modify
- `src/renderer/src/store/useModeStore.ts` — tambah `theme`, `setTheme`, `finishOnboarding`.
- `src/renderer/src/screens/WelcomeScreen.tsx` — komponen baru.
- `src/renderer/src/App.tsx` — conditional render WelcomeScreen.
- `src/renderer/src/components/titlebar/TitleBar.tsx` — conditional lockdown.

## Acceptance Criteria
- [ ] Logo + loader muncul minimal 1.5s atau sampai DB siap.
- [ ] Tombol "Get Started" → Phase 2 (Theme) → Phase 3 (Mode).
- [ ] TitleBar hanya tampilkan identitas + window controls saat onboarding.
- [ ] Setelah pilih mode, `isFirstInstall=false`, masuk ke `LibraryMode` sebagai default aman.
