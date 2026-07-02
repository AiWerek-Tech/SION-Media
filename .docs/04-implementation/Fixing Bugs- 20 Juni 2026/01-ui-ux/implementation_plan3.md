# Implementation Plan — Single React Splash Screen

This plan details the replacement of the double splash screen setup with a single, premium React-based splash overlay rendered inside the main window immediately upon startup. The native splash window will be completely removed, simplifying IPC coordination and preventing Chromium background throttling.

---

## User Review Required

> [!IMPORTANT]
> * **No Native Splash Window**: The small, rounded splash window that opens at startup will be removed.
> * **Immediate Main Window Show**: The main application window will be created and shown immediately as soon as its contents are parsed (`ready-to-show` event), displaying the full-screen React splash overlay (`SplashScreen.tsx`) to indicate booting progress.
> * **Smooth Transition**: Once the critical and optional boot phases are complete, the React splash screen will fade out smoothly using Framer Motion, instantly revealing the operational dashboard.

---

## Proposed Changes

### 1. Main Process Shell
#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts)
* Remove the call to `createNativeSplashWindow()`.
* Keep `createMainWindow()`.

#### [MODIFY] [windows.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/windows.ts)
* Delete `splashWindow` reference, `createNativeSplashWindow()`, and `closeNativeSplashWindow()`.
* In `createMainWindow()`:
  * Set `show: false` and add `mainWindow.once('ready-to-show', () => { mainWindow.show() })` to prevent white flashes while ensuring it opens immediately.
  * Set `backgroundColor: '#050714'` (matching the dark theme of the app).
  * Remove debug log lines.

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)
* Remove the `app:renderer-shell-ready` handler since the main window handles its own showing.

---

### 2. Preload & Renderer
#### [MODIFY] [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)
* Remove the `useEffect` that calls `window.api?.app?.notifyShellReady?.()`.
* Clean up any unused imports or variables (like `notifiedRef`).

#### [MODIFY] [useAppBootstrap.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/hooks/useAppBootstrap.ts)
* Revert the `scheduleIdle` and `cancelIdle` helpers to use `requestIdleCallback` (or keep our 50ms timeout version, which is actually very fast and efficient for loading the background queue). Let's keep the timeout version for reliability.

---

## Verification Plan

### Automated Tests
* Run `npx tsc --noEmit` to verify type safety.
* Run `npm run test` to verify the unit/integration test suite.
* Run `npm run build` to verify production builds.

### Manual Verification
1. **Startup Check**: Launch the app using `npm run start` (preview mode).
2. **Single Splash Screen**: Verify that a single, full-screen, beautifully animated splash screen is shown inside the main window frame.
3. **No Flashing/Stuttering**: Verify there is no white flash on startup and that the main interface fades in smoothly.
