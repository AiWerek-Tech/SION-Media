# Task — Single React Splash Screen

## Phase 1: Main Process Updates
- `[x]` 1.1 — Modify `src/main/index.ts` to remove `createNativeSplashWindow()` call
- `[x]` 1.2 — Modify `src/main/windows.ts` to delete `splashWindow`, `createNativeSplashWindow()`, `closeNativeSplashWindow()`, and update `createMainWindow()`
- `[x]` 1.3 — Modify `src/main/ipc-handlers.ts` to remove the `app:renderer-shell-ready` handler

## Phase 2: Renderer Process Updates
- `[x]` 2.1 — Modify `src/renderer/src/App.tsx` to remove the IPC notification hook for `notifyShellReady`

## Phase 3: Verification
- `[x]` 3.1 — Run `npx tsc --noEmit` to verify compilation
- `[x]` 3.2 — Run `npm run test` to verify unit and integration tests
- `[x]` 3.3 — Run `npm run build` to verify production builds
- `[x]` 3.4 — Run `npm run start` and verify startup behavior
