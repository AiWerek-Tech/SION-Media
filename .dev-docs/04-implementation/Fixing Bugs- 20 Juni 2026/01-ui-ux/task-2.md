# Task — Single Splash Screen & Startup UX Polish

## Phase 1: Main Application Shell Updates

- `[x]` 1.1 — Modify `src/renderer/src/App.tsx` to delay `notifyShellReady` until `phase` is `background`, `ready`, or `failed`

## Phase 2: Startup Boot Hook Updates

- `[x]` 2.1 — Modify `src/renderer/src/hooks/useAppBootstrap.ts` to wait for `optionalTasks` with `await Promise.all(optionalTasks)` before transitioning to `background` phase

## Phase 3: React Splash Overlay Updates

- `[x]` 3.1 — Modify `src/renderer/src/startup/SplashScreen.tsx` to exclude `background` phase from rendering the React splash overlay

## Phase 4: Verification

- `[x]` 4.1 — Run `npx tsc --noEmit`
- `[x]` 4.2 — Run `npm run test`
- `[x]` 4.3 — Run `npm run build`
