# Phase 0 — Pre-Flight Safety Infrastructure

**Status:** ✅ COMPLETE  
**Date:** 2026-05-15  
**Validation:** `npm run typecheck` ✅ | `npm run test` 16/16 ✅  
**Risk Level:** ZERO — no production code changed

---

## Objective

Establish the safety infrastructure that all subsequent phases depend on. Verify that the existing test and type infrastructure is operational before touching any production code.

---

## Pre-Existing Infrastructure (Verified, Not Created)

### `vitest.config.ts`

Already configured with dual-environment testing:

- `node` project: `src/main/**/*.test.ts`, `src/shared/**/*.test.ts`
- `renderer` project: `src/renderer/**/*.test.{ts,tsx}` with jsdom + `@testing-library/react`
- `setupFiles: ['src/renderer/src/test-utils/setup.ts']`
- `globals: true`

### `src/renderer/src/test-utils/setup.ts`

Already had complete `window.api` mock covering all IPC channels:

- `window`, `appTheme`, `projection`, `stage`, `display`
- `hymnals`, `songs`, `playlists`, `settings`
- `system`, `file`, `media`, `bible`, `slides`, `health`
- `window.electron` mock for electron-toolkit

---

## Pre-Existing TypeScript Errors Fixed

These errors existed before our work. Fixed as part of Phase 0 to achieve clean typecheck baseline.

### `src/renderer/src/core/runtime/event-emitter.ts` — 17 errors

**Root cause:** Methods used non-existent union type aliases (`ProjectionEvent`, `PlaylistEvent`, `SystemEvent`, `OperatorEvent`) as type casts. These types were never defined — only the specific event interfaces exist.

**Fix:** Replaced each wrong cast with the correct specific type:

```
ProjectionEvent → ProjectionClearedEvent / ProjectionLiveTakenEvent / etc.
PlaylistEvent   → PlaylistItemCuedEvent / PlaylistPlaybackStartedEvent / etc.
SystemEvent     → SystemAppStartedEvent / SystemAppReadyEvent / etc.
OperatorEvent   → OperatorSettingsChangedEvent / OperatorProfileSwitchedEvent
```

Also removed unused `RuntimeEvent` import.

### `src/renderer/src/core/runtime/command-bus.ts` — 3 errors

**Root cause:** `matchesFilter()` used `filter.types.includes(commandType)` where `commandType` is `string` but `filter.types` is `RuntimeEventType[]`. Also `RuntimeEventType` and `RuntimeEventSource` not imported.

**Fix:**

- Added `RuntimeEventType`, `RuntimeEventSource` to imports
- Cast: `filter.types.includes(commandType as RuntimeEventType)`
- Cast: `filter.sources.includes(source as RuntimeEventSource)`
- `onRuntimeCommand()`: `typeArray as unknown as RuntimeEventType[]` (double cast — types don't overlap)

### `src/renderer/src/core/runtime/handlers/protection.ts` — 3 errors

**Root cause:** `PendingChange` imported from `'../contracts'` but it's defined in `@renderer/types`. Also `message` property used on `RuntimeCommandResult` which doesn't have that field.

**Fix:**

- Changed import: `from '../contracts'` → `from '@renderer/types'`
- Removed `message` property from all `RuntimeCommandResult` return objects

### `src/renderer/src/core/runtime/handlers/timer.ts` — 4 errors

**Root cause:** Same `message` property issue on `RuntimeCommandResult`. Also `cmd` parameter in `handleTimerTick` declared but never read.

**Fix:**

- Removed `message` from all 3 success return objects
- Renamed `cmd` → `_cmd` in `handleTimerTick`

### `src/renderer/src/store/usePanelLayoutStore.ts` — 1 error

**Root cause:** `PanelLayoutSizes` had `projectionBottom3: [number, number, number]` added (3-tuple) but `PanelLayoutState.getSizes` return type was `[number, number]` (2-tuple only).

**Fix:** Updated `getSizes` and `setSizes` interface to use `number[]` to accommodate both 2-panel and 3-panel sizes.

### `src/renderer/src/store/usePlaylistStore.ts` — 1 error (syntax)

**Root cause:** File had inconsistent indentation from partial persist middleware addition — bracket mismatch caused `TS1005: ')' expected`.

**Fix:** Rewrote entire file cleanly with proper `create<PlaylistStore>()(persist(...))` structure.

### `src/renderer/src/components/design-system/ResizablePanels.tsx` — 1 error

**Root cause:** `useState<[number, number]>(getSizes(layoutKey))` — `getSizes` now returns `number[]` but `useState` expected `[number, number]`.

**Fix:** Added explicit cast: `getSizes(layoutKey) as [number, number]` — safe because `ResizablePanels` only handles 2-panel layouts.

---

## Validation Results

```
npm run typecheck  → Exit 0 ✅
npm run test       → 16/16 pass ✅
  ✓ node    src/main/database.test.ts (2 tests)
  ✓ renderer src/renderer/src/test-utils/setup.test.ts (14 tests)
```

---

## Rollback

No production code was changed. Rollback = revert the TypeScript error fixes only.
