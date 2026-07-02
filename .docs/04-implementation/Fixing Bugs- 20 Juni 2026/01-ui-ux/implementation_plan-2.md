# Implementation Plan — Single Splash Screen & Startup UX Polish

This plan addresses the double splash screen behavior at startup. We will unify the startup flow so the user experiences exactly one brief native splash screen, hiding non-critical technical background checks (e.g. update checks, media indexing) behind the scenes while the main application becomes instantly interactive.

---

## User Review Required

> [!IMPORTANT]
>
> - **Boot Flow Unification**: Currently, the native splash window closes as soon as React is mounted, and then the React app shows a second full-screen overlay component while loading libraries, checking updates, and indexing media. We will change the flow so that React performs critical and optional loading _while the main window is hidden and the native splash is still active_. Once critical/optional databases are loaded, the native splash closes and the app is instantly shown.
> - **Backgrounding Slow Tasks**: Non-critical boot operations (checking updates over the network, media indexing, warming up the Bible engine) will run silently in the background _after_ the main UI is shown. The user will no longer be blocked by these operations.

---

## Open Questions

There are no unresolved design decisions. The proposed flow keeps the existing startup tasks but coordinates their phase transitions and IPC shell-ready triggers to achieve a single splash screen experience.

---

## Proposed Changes

### 1. Main Application shell

#### [MODIFY] [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)

- Update the `useEffect` that triggers `notifyShellReady()` to wait for the completion of critical and optional boot phases.
- The trigger will fire only when the `phase` reaches `background`, `ready`, or `failed` (ensuring that in case of boot failure, the window is still shown to display diagnostics).

### 2. Startup Hook

#### [MODIFY] [useAppBootstrap.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/hooks/useAppBootstrap.ts)

- Change the asynchronous flow to wait for optional tasks (`loadSongs`, `loadPlaylists`, `loadHymnals`) using `await Promise.all(optionalTasks)` instead of executing them in a detached fire-and-forget promise chain.
- This ensures the application reaches the `background` phase only when the core worship libraries are fully hydrated and ready for user interactions.

### 3. React Splash Overlay

#### [MODIFY] [SplashScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/startup/SplashScreen.tsx)

- Exclude the `'background'` phase from the list of phases that render the React `<SplashScreen />` full-screen overlay.
- This ensures that as soon as the main window is displayed (which happens exactly when the phase becomes `'background'`), the React splash screen fades out immediately.

---

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` and `npm run typecheck` to ensure no TypeScript or syntax regressions.
- Run `npm run test` to verify the vitest test suite.
- Run `npm run build` to verify the production bundle.

### Manual Verification

1. **Single Splash Screen Check**: Verify that when SION Media starts:
   - Only one native splash screen is displayed.
   - When it closes, the main window opens immediately in a fully interactive state (no secondary loading screen overlay).
2. **Background Operation Check**: Confirm that background tasks (like checking for updates and media indexing) execute silently in the background without blocking the UI.
3. **Error Recovery**: Artificially fail a task to confirm that if booting fails, the main window still opens to render the `RendererBootScreen` diagnostic view.
