# SION Media — Implementation Master Order v1.0

## The Implementation Bible — Mandatory Entry Point for All Coding Work

**Authority Level:** IMMUTABLE — Changes require formal ADR  
**Status:** Active  
**Applies To:** All developers, all AI coding agents, all implementation work

> **This document defines the ONLY approved implementation order, the ONLY safe refactor sequence, and the ONLY approved execution strategy for the SION Media enterprise transformation. No implementation work may proceed without consulting this document first.**

---

# PART 1: MASTER IMPLEMENTATION PHILOSOPHY

## 1.1 The Core Principle: Infrastructure Before Everything

SION Media is a **live worship production system**. People depend on it during real services. A crash during a live presentation is not a bug — it is a failure of trust. Every implementation decision must be evaluated through this lens:

> **"If this change breaks during a live service, what happens to the congregation?"**

This principle drives the entire implementation philosophy:

1. **Infrastructure first** — build the safety net before changing anything
2. **Additive before destructive** — add new systems before removing old ones
3. **Incremental migration** — no big-bang rewrites, ever
4. **Rollback-capable always** — every change must be independently revertible
5. **Projection-safe always** — the live output must never regress

## 1.2 Why Projection Runtime Is Last-Stage Migration

The projection runtime (`useProjectionStore`, `RuntimeCommandBus`, `PresentationCanvas`, `windows.ts`) is the most critical subsystem. It is already production-quality. The audit confirmed:

- `RuntimeCommandBus` — excellent architecture, throttled, locked, validated
- `useProjectionStore` — solid state machine with LIVE_LOCK protection
- `runtimeCommandHandlers` — well-structured, all handlers registered
- `slideEngine.ts` — correct, cached, hash-invalidated
- `PresentationCanvas` — correct rendering with 4 transition types

**These systems work. They must not be touched until all surrounding infrastructure is stable.**

The projection runtime is last-stage migration because:

- Any regression is immediately visible to the congregation
- The runtime has no UI fallback — if it breaks, the screen goes blank
- Surrounding systems (stores, IPC, UI) must be stable before touching the core
- The adapter pattern allows extending the runtime without breaking it

## 1.3 Why Compatibility Layers Must Exist Temporarily

When migrating from old patterns to new ones, compatibility layers are mandatory:

```
Example: useAppStore decomposition
  Phase A: Create useSongStore (new)
  Phase B: useAppStore re-exports from useSongStore (compatibility layer)
  Phase C: Migrate components one at a time
  Phase D: Remove compatibility layer (only after ALL consumers migrated)

The compatibility layer in Phase B ensures:
  - Zero breaking changes during migration
  - Each component can be migrated independently
  - Rollback is possible at any point
  - No "big bang" migration moment
```

**Removing a compatibility layer before all consumers are migrated is a critical error.** It creates a cascade of failures that are difficult to debug and impossible to roll back cleanly.

## 1.4 Why Dual-System Operation Is Mandatory

During migration, both old and new systems must operate simultaneously:

```
Example: IPC channel normalization
  Old: display_get-all (underscore)
  New: display:get-all (colon)

  Both channels respond identically during transition.
  Renderer uses new channel.
  Old channel remains for backward compatibility.
  Old channel removed only in v2.0.

This ensures:
  - No breakage if renderer uses old channel
  - Gradual migration of all callers
  - Rollback by simply reverting renderer to old channel
```

## 1.5 Why Feature Flags Are Required

Feature flags allow new systems to be deployed without activating them:

```
FEATURE_FLAGS.MODAL_SYSTEM = false  // deployed but inactive
// ... validate in staging ...
FEATURE_FLAGS.MODAL_SYSTEM = true   // activate after validation
```

This enables:

- Deploying code without activating features
- Testing in production environment safely
- Instant rollback by setting flag to false
- Gradual activation per environment (internal ? alpha ? beta ? stable)

## 1.6 Why Runtime Validation Gates Are Required

Before any change to projection-critical files, a 12-step validation gate must pass. This is not optional. It exists because:

- Projection failures are immediately visible to users
- Automated tests cannot fully simulate live presentation conditions
- Human validation catches edge cases that unit tests miss
- The gate takes < 5 minutes and prevents hours of incident response

## 1.7 The No-Big-Bang-Refactor Rule

**Never rewrite an entire system in one commit.** This rule exists because:

- Large rewrites are impossible to review effectively
- Large rewrites are impossible to roll back cleanly
- Large rewrites introduce multiple failure points simultaneously
- Large rewrites make it impossible to identify which change caused a regression

**The maximum scope of a single commit:**

- One component
- One store action
- One IPC handler
- One migration
- One modal

If a task requires more than this, it must be split into multiple commits.

---

# PART 2: ABSOLUTE IMPLEMENTATION ORDER

## 2.1 Phase Overview

```
PHASE 0:  Pre-flight safety infrastructure
PHASE 1:  Infrastructure additions (additive only — zero breaking changes)
PHASE 2:  Critical dead UI fixes (targeted changes)
PHASE 3:  Modal system foundation
PHASE 4:  Projection runtime hardening
PHASE 5:  Design system components
PHASE 6:  Library Mode improvements
PHASE 7:  Projection Mode improvements
PHASE 8:  Management Mode improvements
PHASE 9:  Store decomposition
PHASE 10: Stabilization + performance
PHASE 11: Release preparation
```

**ABSOLUTE RULE: No phase may begin until the previous phase is complete and validated.**

---

## 2.2 PHASE 0 — Pre-Flight Safety Infrastructure

### Goals

Establish the safety infrastructure that all subsequent phases depend on. No production code is changed in this phase.

### Exact Systems Allowed to Change

- `vitest.config.ts` — extend for renderer testing
- `src/renderer/src/test-utils/` — create test utilities
- `.dev-docs/10-enterprise-refactor-system/` — this documentation system
- Git branch strategy — document and implement

### Forbidden Modifications

- ANY source file in `src/main/`
- ANY source file in `src/renderer/src/`
- ANY source file in `src/preload/`
- `package.json` (no new dependencies yet)

### Validation Requirements

```
? npm run typecheck — passes
? npm run lint — passes
? npm run test — passes (existing 2 tests)
? New vitest config compiles without errors
? Test utilities compile without errors
```

### Completion Criteria

- Extended vitest config operational (node + jsdom)
- Mock window.api available in test environment
- Feature flag system documented
- Git branch strategy documented

### Rollback

Delete new test files. No production code was changed.

---

## 2.3 PHASE 1 — Infrastructure Additions

### Goals

Add all new systems without modifying any existing code. Every change is purely additive.

### Exact Systems Allowed to Change

**New files (create only, no modifications to existing):**

- `src/renderer/src/store/useModalStore.ts`
- `src/renderer/src/store/useServiceStore.ts`
- `src/renderer/src/store/useNotificationStore.ts`
- `src/renderer/src/hooks/useTimerTick.ts`

**Existing files (targeted additions only):**

- `src/main/migrations.ts` — add migrations 14-17 at the END only
- `src/main/database.ts` — add 3 new exported functions at the END only
- `src/main/ipc-handlers.ts` — add 4 new channel handlers at the END only
- `src/preload/index.ts` — add 4 new bridge entries at the END only
- `src/renderer/src/store/usePanelLayoutStore.ts` — extend PanelLayoutSizes type only
- `src/renderer/src/store/usePlaylistStore.ts` — add persistence middleware only

### Forbidden Modifications

- ANY modification to existing store actions
- ANY modification to existing IPC handlers
- ANY modification to existing database functions
- ANY modification to existing component files
- ANY modification to `useProjectionStore.ts`
- ANY modification to `runtimeCommandBus.ts`
- ANY modification to `windows.ts`

### Validation Requirements

```
? npm run typecheck — passes
? npm run lint — passes
? npm run test — passes
? New stores compile and initialize without errors
? New IPC channels respond correctly (manual test)
? Migrations 14-17 apply cleanly on fresh DB
? usePanelLayoutStore 3-panel extension works
? usePlaylistStore activePlaylist persists to localStorage
```

### Completion Criteria

All new stores, hooks, IPC channels, and migrations operational. Zero changes to existing behavior.

### Rollback

Delete new files. Revert the 6 modified files to their previous state.

---

## 2.4 PHASE 2 — Critical Dead UI Fixes

### Goals

Fix the 10 highest-impact broken interactions. Each fix is isolated and independently revertible.

### Exact Systems Allowed to Change

```
DUI-001: src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
  ? SongMediaCard star button onClick only

DUI-002: src/renderer/src/components/titlebar/TitleBarMenu.tsx
  ? File menu "New Playlist" action only

DUI-003: src/renderer/src/components/titlebar/TitleBarMenu.tsx
         src/renderer/src/hooks/useGlobalShortcuts.ts
  ? Add Bible to View menu + Ctrl+B shortcut

DUI-004: src/renderer/src/components/titlebar/TitleBar.tsx
  ? TitleBarUtilityButtons Moon button onClick only

DUI-006: src/renderer/src/screens/modes/ManagementMode.tsx
  ? Storage metric useEffect + metrics array only

Timer:   src/renderer/src/App.tsx
  ? Add useTimerTick() call only

Timer:   src/renderer/src/components/titlebar/TitleBarStatus.tsx
  ? Add timer display + 3 control buttons only

Modal:   src/renderer/src/App.tsx
  ? Add <ModalRegistry /> mount only
```

### Forbidden Modifications

- ANY modification to `useProjectionStore.ts`
- ANY modification to `PresentationCanvas.tsx`
- ANY modification to `LivePreviewPanel.tsx`
- ANY modification to `runtimeCommandBus.ts`
- ANY modification to `windows.ts`
- ANY modification to `ipc-handlers.ts`
- ANY modification to `database.ts`
- ANY modification to `migrations.ts`
- Refactoring of any unrelated code in modified files

### Validation Requirements

```
? npm run typecheck — passes
? npm run lint — passes
? npm run test — passes
? Favorite button: click star ? is_favorite flips ? persists on reload
? Theme button: click ? cycles dark/light/system ? applies immediately
? Ctrl+B: opens BibleScreen
? View > Bible: opens BibleScreen
? Storage metric: shows real MB value (not "28.4 GB")
? Timer: advances every second when running
? ModalRegistry: mounts without errors
? PROJECTION VALIDATION GATE: all 12 steps pass
```

### Completion Criteria

All 10 dead UI issues fixed. Zero projection regressions.

### Rollback

Revert each file independently. Each fix is isolated.

---

## 2.5 PHASE 3 — Modal System Foundation

### Goals

Build the modal infrastructure and replace all `window.confirm()` calls.

### Exact Systems Allowed to Change

**New files:**

- `src/renderer/src/components/modals/Modal.tsx`
- `src/renderer/src/components/modals/ConfirmDialog.tsx`
- `src/renderer/src/components/modals/CreatePlaylistDialog.tsx`
- `src/renderer/src/components/modals/CrashRecoveryDialog.tsx`
- `src/renderer/src/components/modals/PlaylistPickerDialog.tsx`
- `src/renderer/src/components/modals/ModalRegistry.tsx`
- `src/renderer/src/components/modals/index.ts`

**Existing files (targeted changes only):**

- `src/renderer/src/screens/modes/ManagementMode.tsx` — replace window.confirm() calls only
- `src/renderer/src/screens/SettingsScreen.tsx` — replace window.confirm() in handleReseed only
- `src/renderer/src/components/titlebar/TitleBarMenu.tsx` — wire New Playlist action only
- `src/renderer/src/hooks/useAppBootstrap.ts` — add crash recovery check only

### Forbidden Modifications

- ANY modification to `useProjectionStore.ts`
- ANY modification to `PresentationCanvas.tsx`
- ANY modification to `LivePreviewPanel.tsx`
- ANY modification to `runtimeCommandBus.ts`
- ANY modification to `windows.ts`
- ANY modification to `ipc-handlers.ts`
- ANY modification to `database.ts`
- ANY modification to `migrations.ts`

### Validation Requirements

```
? npm run typecheck — passes
? npm run lint — passes
? npm run test — passes (new modal tests)
? Modal.tsx: renders, focus trap works, Escape closes
? ConfirmDialog: confirm/cancel work, loading state works
? CreatePlaylistDialog: creates playlist, validates empty name
? CrashRecoveryDialog: restores session correctly
? No window.confirm() calls remain in codebase
? PROJECTION VALIDATION GATE: all 12 steps pass
```

### Completion Criteria

All critical modals operational. Zero `window.confirm()` calls in codebase.

### Rollback

Delete modal files. Restore `window.confirm()` calls in modified files.

---

## 2.6 PHASE 4 — Projection Runtime Hardening

### Goals

Add missing runtime features to the projection system. All changes are additive or use the adapter pattern.

### Exact Systems Allowed to Change

```
src/renderer/src/screens/modes/ProjectionMode.tsx
  ? Add scheduleNextSongPreload() call after handlePlaylistItemClick only

src/renderer/src/hooks/useAppBootstrap.ts
  ? Add slide config loading from settings only

src/renderer/src/engine/slideEngine.ts
  ? Add settings-aware config parameter only (backward compatible)

src/renderer/src/store/useProjectionStore.ts
  ? Add debounced session save call in goToSlide() only
  ? DO NOT modify any existing actions

src/main/ipc-handlers.ts
  ? Add confidence:update handler at the END only

src/renderer/src/stageDisplay/StageDisplayApp.tsx
  ? Add confidence:update listener (dual-channel, keep legacy)

src/renderer/src/App.tsx
  ? Add per-mode ErrorBoundary wrappers only

src/renderer/src/engine/mediaEngine.ts
  ? Add LRU eviction logic only (internal, no API change)

src/renderer/src/projection/ProjectionApp.tsx
  ? Change heartbeat interval from 1000ms to 500ms only
```

### Forbidden Modifications

- ANY modification to existing `useProjectionStore` actions (only additions)
- ANY modification to `sendLiveSlide()` function
- ANY modification to `RuntimeCommandBus` core logic
- ANY modification to `runtimeCommandHandlers.ts` (only additions)
- ANY modification to `PresentationCanvas` rendering logic
- ANY modification to `windows.ts` broadcast logic
- ANY modification to existing IPC handlers (only additions)

### Validation Requirements

```
? npm run typecheck — passes
? npm run lint — passes
? npm run test — passes
? Next song preloads 500ms after current song selected
? Slide config reads from settings (max_lines, max_chars)
? Stage display shows confidence payload
? ProjectionMode crash shows fallback UI, output continues
? MediaEngine evicts when > 50 entries
? Session saves every 2000ms during live presentation
? PROJECTION VALIDATION GATE: all 12 steps pass (MANDATORY)
? Multi-window test: projection reconnects after disconnect
```

### Completion Criteria

All projection runtime hardening complete. Zero regressions. Stage display fully operational.

### Rollback

Revert each file independently. All changes are additive.

---

## 2.7 PHASES 5–11 (Summary)

```
PHASE 5 — Design System Components
  Scope: New atomic components (Button, Input, Badge, SearchInput, SegmentedControl)
  Forbidden: Modifying existing component files until new components are ready
  Gate: Visual review + typecheck + lint + test

PHASE 6 — Library Mode Improvements
  Scope: SongContextMenu, HymnalFilterDropdown, drag-to-playlist, virtualization
  Forbidden: Modifying projection-related code
  Gate: Library Mode functional test + projection gate

PHASE 7 — Projection Mode Improvements
  Scope: 3-panel layout, Bible panel, Announcement panel, Notification panel
  Forbidden: Modifying PresentationCanvas, useProjectionStore core
  Gate: Full projection gate + multi-window test

PHASE 8 — Management Mode Improvements
  Scope: Virtualization, SongRelationsModal, Media Library section
  Forbidden: Modifying projection-related code
  Gate: Management Mode functional test + projection gate

PHASE 9 — Store Decomposition
  Scope: useSongStore, useHymnalStore, useDisplayStore extraction
  Forbidden: Removing compatibility layer before all consumers migrated
  Gate: Full typecheck + all existing tests pass + projection gate

PHASE 10 — Stabilization + Performance
  Scope: Performance optimization, accessibility hardening, test coverage
  Forbidden: New features (stabilization only)
  Gate: Performance budgets met + accessibility gates met

PHASE 11 — Release Preparation
  Scope: Build validation, installer testing, release notes
  Forbidden: Any new features
  Gate: Full production readiness checklist
```

---

# PART 3: FILE-BY-FILE EXECUTION ORDER

## 3.1 Execution Principles

Every file in this sequence is ordered by dependency. A file must not be implemented until all files it depends on are complete and validated. The sequence is designed so that at every step, the application remains in a working state.

**Reading this section:** Each entry shows the file, why it comes at this position, what it depends on, its runtime risk, and what to test after implementing it.

---

## 3.2 Phase 1 — Infrastructure File Sequence

### Sequence 1.1 — New Store Files (No Dependencies)

```
FILE: src/renderer/src/store/useModalStore.ts
Order position: 1 of all Phase 1 files
Reason: No dependencies on any other new file. Pure Zustand store.
Depends on: zustand (existing), nothing new
Runtime risk: ZERO — new file, not mounted anywhere yet
Test after: Import in isolation, verify TypeScript compiles
Rollback impact: Delete file — zero effect on app

FILE: src/renderer/src/store/useServiceStore.ts
Order position: 2
Reason: No dependencies on any other new file. Pure Zustand store.
Depends on: zustand/middleware (existing), nothing new
Runtime risk: ZERO — new file, not mounted anywhere yet
Test after: Verify localStorage key 'sion-service-storage' created
Rollback impact: Delete file — zero effect on app

FILE: src/renderer/src/store/useNotificationStore.ts
Order position: 3
Reason: No dependencies on any other new file. Pure Zustand store.
Depends on: zustand (existing), nothing new
Runtime risk: ZERO — new file, not mounted anywhere yet
Test after: Import in isolation, verify TypeScript compiles
Rollback impact: Delete file — zero effect on app
```

### Sequence 1.2 — New Hook File

```
FILE: src/renderer/src/hooks/useTimerTick.ts
Order position: 4
Reason: Depends on useProjectionStore (existing) — must come after stores exist
Depends on: useProjectionStore.timerTick() (existing action)
Runtime risk: ZERO — new file, not mounted anywhere yet
Test after: Import in isolation, verify TypeScript compiles
Rollback impact: Delete file — zero effect on app
```

### Sequence 1.3 — Database Migrations (Main Process)

```
FILE: src/main/migrations.ts
Order position: 5
Reason: Must come before database.ts additions (new functions need new tables)
Depends on: existing migration structure (versions 1-13 already applied)
Change: Add migrations 14-17 at the END of the migrations array only
Runtime risk: LOW — migrations are idempotent (IF NOT EXISTS)
Test after: npm run test (database.test.ts), verify migrations apply on fresh DB
Rollback impact: Remove migrations 14-17 from array — existing DB unaffected
```

### Sequence 1.4 — Database Functions (Main Process)

```
FILE: src/main/database.ts
Order position: 6
Reason: Must come after migrations (new functions use new tables)
Depends on: migrations 14-17 applied (sequence 1.3)
Change: Add 3 new exported functions at the END only:
  - getSongsSummary() — lightweight query without lyrics_raw
  - duplicateSong(id) — creates copy with modified number/title
  - getStorageStats() — returns dbSizeBytes + memoryMB
Runtime risk: LOW — additive only, no existing functions modified
Test after: Unit test each new function in isolation
Rollback impact: Remove 3 new functions — zero effect on existing code
```

### Sequence 1.5 — IPC Handlers (Main Process)

```
FILE: src/main/ipc-handlers.ts
Order position: 7
Reason: Must come after database.ts (new handlers call new DB functions)
Depends on: getSongsSummary, duplicateSong, getStorageStats (sequence 1.4)
Change: Add 4 new channel handlers at the END of setupIPC() only:
  - system:get-storage-stats
  - db:duplicate-song
  - confidence:update
  - display:get-all (alias for display_get-all)
Runtime risk: LOW — additive only, no existing handlers modified
Test after: Invoke each new channel manually, verify response
Rollback impact: Remove 4 new handlers — zero effect on existing channels
```

### Sequence 1.6 — Preload Bridge (Preload Process)

```
FILE: src/preload/index.ts
Order position: 8
Reason: Must come after ipc-handlers.ts (bridge exposes new channels)
Depends on: new IPC channels registered (sequence 1.5)
Change: Add 4 new bridge entries to the api object only:
  - system.getStorageStats()
  - songs.duplicate()
  - confidence.update() + confidence.onUpdate()
  - display.getAll() (normalized alias)
Runtime risk: LOW — additive only, no existing bridges modified
Test after: window.api.system.getStorageStats() returns data in renderer
Rollback impact: Remove 4 new entries — zero effect on existing bridges
```

### Sequence 1.7 — Store Extensions (Renderer)

```
FILE: src/renderer/src/store/usePanelLayoutStore.ts
Order position: 9
Reason: Can be done after preload (no dependency on new IPC)
Depends on: nothing new
Change: Extend PanelLayoutSizes interface to add projectionBottom as [number,number,number]
  Add PANEL_CONSTRAINTS.projectionBottom with 3-panel constraints
Runtime risk: LOW — type extension only, existing 2-panel usage still works
Test after: Verify 3-panel sizes persist to localStorage key 'sion-panel-layout'
Rollback impact: Revert type change — existing code unaffected

FILE: src/renderer/src/store/usePlaylistStore.ts
Order position: 10
Reason: Last in Phase 1 — depends on nothing new
Depends on: zustand/middleware (existing)
Change: Add persist middleware with partialize for _persistedActivePlaylistId only
  Add _persistedActivePlaylistId: number | null to state
Runtime risk: LOW — new localStorage key 'sion-playlist-storage', no existing behavior changed
Test after: Set activePlaylist, reload app, verify _persistedActivePlaylistId in localStorage
Rollback impact: Remove persist middleware — zero effect on existing behavior
```

---

## 3.3 Phase 2 — Dead UI Fix File Sequence

### Sequence 2.1 — Isolated Single-File Fixes

```
FILE: src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
Order position: 1 of Phase 2
Fix: DUI-001 — wire favorite button
Change: SongMediaCard star button onClick:
  async (e) => {
    e.stopPropagation()
    // optimistic update
    const prev = get().songs
    set({ songs: songs.map(s => s.id === song.id ? {...s, is_favorite: s.is_favorite ? 0 : 1} : s) })
    try { await window.api.songs.toggleFavorite(song.id) }
    catch { set({ songs: prev }); showToast('Gagal', 'error') }
  }
Depends on: window.api.songs.toggleFavorite (existing IPC)
Runtime risk: ZERO — no projection code touched
Test after: Click star ? is_favorite flips ? persists on reload
Rollback: Revert onClick to stopPropagation only

FILE: src/renderer/src/components/titlebar/TitleBar.tsx
Order position: 2 of Phase 2
Fix: DUI-004 — wire theme button
Change: Moon button onClick cycles useModeStore.theme: dark ? light ? system
  Icon changes: Moon (dark) / Sun (light) / SunMoon (system)
  Calls applyEffectiveTheme() + IPC app:theme-mode-set
Depends on: useModeStore.setTheme (existing), applyEffectiveTheme (existing)
Runtime risk: ZERO — no projection code touched
Test after: Click ? cycles ? theme applies ? persists on reload
Rollback: Revert onClick to empty

FILE: src/renderer/src/hooks/useGlobalShortcuts.ts
Order position: 3 of Phase 2
Fix: DUI-003 — add Ctrl+B shortcut
Change: Add case in handleKeyDown:
  if (e.ctrlKey && e.code === 'KeyB') {
    e.preventDefault()
    setScreen('bible')
  }
Depends on: setScreen (existing)
Runtime risk: ZERO — additive shortcut only
Test after: Ctrl+B ? BibleScreen opens
Rollback: Remove the case

FILE: src/renderer/src/components/titlebar/TitleBarMenu.tsx
Order position: 4 of Phase 2
Fix: DUI-002 + DUI-003 — wire New Playlist + add Bible to View menu
Change 1: File menu "New Playlist" action:
  action: () => document.dispatchEvent(new CustomEvent('sion:create-playlist'))
Change 2: View menu — add Bible item:
  { label: 'Bible', shortcut: 'Ctrl+B', action: () => setScreen('bible') }
Depends on: setScreen (existing), CustomEvent (browser API)
Runtime risk: ZERO — menu items only
Test after: File > New Playlist dispatches event; View > Bible opens BibleScreen
Rollback: Revert menu item changes

FILE: src/renderer/src/screens/modes/ManagementMode.tsx
Order position: 5 of Phase 2
Fix: DUI-006 — real storage metric
Change: Add useEffect to call window.api.system.getStorageStats()
  Replace hardcoded "28.4 GB" metric with real data
  Replace hardcoded trend bars with data from db:get-recent-songs
Depends on: system.getStorageStats (Phase 1 IPC), db:get-recent-songs (existing)
Runtime risk: ZERO — no projection code touched
Test after: Storage metric shows real MB value
Rollback: Revert useEffect and metrics array
```

### Sequence 2.2 — App.tsx Additions

```
FILE: src/renderer/src/App.tsx
Order position: 6 of Phase 2
Changes (two separate, independent additions):
  1. Add useTimerTick() call (after useAppBootstrap, useCrashRecovery)
  2. Add <ModalRegistry /> inside the content div (after <Toast />)
Depends on: useTimerTick (Phase 1), ModalRegistry (Phase 3 — add placeholder import)
  NOTE: ModalRegistry can be a no-op stub until Phase 3 builds it
Runtime risk: LOW — additive only, no existing rendering changed
Test after: App renders without errors; timer advances in title bar
Rollback: Remove useTimerTick() call and <ModalRegistry />

FILE: src/renderer/src/components/titlebar/TitleBarStatus.tsx
Order position: 7 of Phase 2
Fix: Add timer controls to title bar
Change: Add timer display + ? ¦ ? buttons using useProjectionStore timer state
  Read: timerElapsed, timerRunning from useProjectionStore
  Actions: timerStart, timerStop, timerReset from useProjectionStore
  Display: Inter Mono 11px/800, format as HH:MM:SS
Depends on: useProjectionStore timer state (existing), useTimerTick (Phase 1)
Runtime risk: LOW — read-only access to projection store, no mutations to projection logic
Test after: Timer displays; ? starts; ¦ stops; ? resets
Rollback: Remove timer display section
```

---

## 3.4 Phase 3 — Modal System File Sequence

```
FILE: src/renderer/src/components/modals/Modal.tsx
Order position: 1 of Phase 3
Reason: Base component — all other modals depend on it
Depends on: framer-motion (existing), useModalStore (Phase 1)
Runtime risk: ZERO — new file
Test after: Renders with correct size, focus trap works, Escape closes
Rollback: Delete file

FILE: src/renderer/src/components/modals/ConfirmDialog.tsx
Order position: 2 of Phase 3
Reason: Most widely used modal — needed before replacing window.confirm()
Depends on: Modal.tsx (sequence 3.1)
Runtime risk: ZERO — new file
Test after: Confirm/cancel work; loading state works; danger variant renders
Rollback: Delete file

FILE: src/renderer/src/components/modals/CreatePlaylistDialog.tsx
Order position: 3 of Phase 3
Reason: Needed for DUI-002 wire (File > New Playlist)
Depends on: Modal.tsx, usePlaylistStore (existing), useModalStore (Phase 1)
Runtime risk: ZERO — new file
Test after: Creates playlist; validates empty name; closes on success
Rollback: Delete file

FILE: src/renderer/src/components/modals/CrashRecoveryDialog.tsx
Order position: 4 of Phase 3
Reason: Critical safety feature — needed before release
Depends on: Modal.tsx, useAppStore, usePlaylistStore, useProjectionStore (all existing)
Runtime risk: LOW — reads from projection store but does not mutate during render
Test after: Restores session state; markCleanExit() called on dismiss
Rollback: Delete file

FILE: src/renderer/src/components/modals/PlaylistPickerDialog.tsx
Order position: 5 of Phase 3
Reason: Needed for "Add to Playlist" context menu (Phase 6)
Depends on: Modal.tsx, usePlaylistStore (existing)
Runtime risk: ZERO — new file
Test after: Shows playlist list; selects on click; closes
Rollback: Delete file

FILE: src/renderer/src/components/modals/ModalRegistry.tsx
Order position: 6 of Phase 3
Reason: Renders all modals — must come after all modal components
Depends on: All modal components (sequences 3.1-3.5), useModalStore (Phase 1)
Runtime risk: ZERO — new file (already mounted as stub in Phase 2)
Test after: Correct modal renders based on useModalStore.stack
Rollback: Delete file (App.tsx already has stub mount)

FILE: src/renderer/src/components/modals/index.ts
Order position: 7 of Phase 3
Reason: Export barrel — must come after all modal components
Depends on: All modal components
Runtime risk: ZERO — export file only
Test after: All exports compile
Rollback: Delete file
```

### Sequence 3.2 — Replace window.confirm() (One File at a Time)

```
FILE: src/renderer/src/screens/modes/ManagementMode.tsx
Order position: 8 of Phase 3
Change: Replace window.confirm() in handleDeleteSong and handleBulkDelete
  with useModalStore.openAsync('confirm-delete', { ... })
Depends on: ConfirmDialog (sequence 3.2), useModalStore (Phase 1)
Runtime risk: ZERO — no projection code touched
Test after: Delete song ? ConfirmDialog appears ? confirm deletes ? cancel cancels
Rollback: Restore window.confirm() calls

FILE: src/renderer/src/screens/SettingsScreen.tsx
Order position: 9 of Phase 3
Change: Replace window.confirm() in handleReseed
Depends on: ConfirmDialog (sequence 3.2)
Runtime risk: ZERO
Test after: Reseed ? ConfirmDialog appears with danger styling
Rollback: Restore window.confirm()
```

### Sequence 3.3 — Wire Modals to Entry Points

```
FILE: src/renderer/src/components/titlebar/TitleBarMenu.tsx
Order position: 10 of Phase 3
Change: Wire 'sion:create-playlist' event listener to open CreatePlaylistDialog
  document.addEventListener('sion:create-playlist', () =>
    useModalStore.getState().open('create-playlist'))
Depends on: CreatePlaylistDialog (sequence 3.3), useModalStore (Phase 1)
Runtime risk: ZERO
Test after: File > New Playlist ? CreatePlaylistDialog opens
Rollback: Remove event listener

FILE: src/renderer/src/hooks/useAppBootstrap.ts
Order position: 11 of Phase 3
Change: After getRecoveryState(), if needsRecovery:
  useModalStore.getState().open('crash-recovery', { recoveryState })
Depends on: CrashRecoveryDialog (sequence 3.4), useModalStore (Phase 1)
Runtime risk: LOW — additive check at startup only
Test after: Simulate crash ? restart ? CrashRecoveryDialog appears
Rollback: Remove recovery check
```

---

## 3.5 Phase 4 — Projection Hardening File Sequence

```
FILE: src/renderer/src/engine/mediaEngine.ts
Order position: 1 of Phase 4
Reason: Internal change only — no API change, no callers affected
Change: Add LRU eviction when cache > 50 entries
  Add getStats() method for diagnostics
Depends on: nothing new
Runtime risk: LOW — internal cache management only
Test after: Load 60 images ? verify oldest 10 evicted
Rollback: Revert eviction logic

FILE: src/renderer/src/engine/slideEngine.ts
Order position: 2 of Phase 4
Reason: Must come before useAppBootstrap change (which passes config)
Change: Add optional config parameter to generateSlidesForSong():
  config?: { maxLines?: number; maxChars?: number }
  Backward compatible — existing calls without config still work
Depends on: nothing new
Runtime risk: LOW — backward compatible parameter addition
Test after: generateSlidesForSong(song) still works; generateSlidesForSong(song, {maxLines:3}) works
Rollback: Remove config parameter (existing calls unaffected)

FILE: src/renderer/src/hooks/useAppBootstrap.ts
Order position: 3 of Phase 4
Reason: Must come after slideEngine change (passes config to it)
Change: After loading settings, extract maxLines/maxChars and store in useDisplayStore
  Pass config to generateSlidesForSong calls
Depends on: slideEngine config parameter (sequence 4.2), useDisplayStore (Phase 1)
Runtime risk: LOW — additive settings loading
Test after: Change projection_max_lines in settings ? slides regenerate with new config
Rollback: Remove config extraction

FILE: src/renderer/src/store/useProjectionStore.ts
Order position: 4 of Phase 4
Reason: Must come after useAppBootstrap (session save uses bootstrap context)
Change: Add debounced session save call inside goToSlide() only:
  debouncedSaveSession({ playlistId, songId, slideIndex, projectionState })
  Debounce: 2000ms — never blocks projection
Depends on: window.api.system.saveSession (existing IPC)
Runtime risk: MEDIUM — modifying projection store
  MANDATORY: Run 12-step projection validation gate after this change
Test after: Go LIVE ? wait 2s ? check app_state table for session
Rollback: Remove debouncedSaveSession call

FILE: src/renderer/src/screens/modes/ProjectionMode.tsx
Order position: 5 of Phase 4
Reason: Must come after slideEngine change (uses config)
Change: Add scheduleNextSongPreload() after handlePlaylistItemClick:
  setTimeout(() => {
    const nextItem = playlistItems[index + 1]
    if (!nextItem) return
    const nextSong = songs.find(s => s.id === nextItem.song_id)
    if (!nextSong) return
    const nextSlides = generateSlidesForSong(nextSong)
    loadNextSong(nextSong, nextSlides)
  }, 500)
Depends on: slideEngine (sequence 4.2), useProjectionStore.loadNextSong (existing)
Runtime risk: LOW — additive setTimeout, no existing logic changed
Test after: Click playlist item ? 500ms later ? NEXT strip shows next song
Rollback: Remove setTimeout call

FILE: src/main/ipc-handlers.ts
Order position: 6 of Phase 4
Reason: Must come before StageDisplayApp change (which listens to new channel)
Change: Add confidence:update handler at END of setupIPC():
  ipcMain.on('confidence:update', (_event, payload) => {
    const stageWindow = getStageDisplayWindow()
    if (stageWindow && !stageWindow.isDestroyed()) {
      stageWindow.webContents.send('confidence:update', payload)
    }
  })
Depends on: getStageDisplayWindow (existing)
Runtime risk: LOW — additive handler
Test after: Send confidence:update from renderer ? stage window receives it
Rollback: Remove handler

FILE: src/renderer/src/stageDisplay/StageDisplayApp.tsx
Order position: 7 of Phase 4
Reason: Must come after ipc-handlers change (new channel must exist)
Change: Add confidence:update listener (dual-channel — keep legacy):
  const unsubscribeConfidence = window.api.confidence?.onUpdate((data) => {
    setPayload(data as ConfidencePayload)
  })
  Keep existing projection:slide-update listener as fallback
Depends on: confidence:update IPC (sequence 4.6), preload bridge (Phase 1)
Runtime risk: LOW — additive listener, legacy path preserved
Test after: Go LIVE ? stage display shows current slide from confidence payload
Rollback: Remove confidence listener (legacy path still works)

FILE: src/renderer/src/App.tsx
Order position: 8 of Phase 4
Reason: Must come after all mode components are stable
Change: Wrap each mode in per-mode ErrorBoundary:
  <ErrorBoundary fallback={<ProjectionModeErrorFallback />}>
    <ProjectionMode />
  </ErrorBoundary>
  Similar for LibraryMode, ManagementMode
Depends on: ErrorBoundary (existing component)
Runtime risk: LOW — wrapping only, no logic change
Test after: Throw error in ProjectionMode ? fallback UI shows ? output continues
Rollback: Remove ErrorBoundary wrappers

FILE: src/renderer/src/projection/ProjectionApp.tsx
Order position: 9 of Phase 4
Reason: Last in Phase 4 — isolated change to projection window
Change: Change heartbeat interval from 1000ms to 500ms
  const heartbeatInterval = setInterval(() => {
    window.api.health?.sendHeartbeat('PROJECTION_WINDOW')
  }, 500)  // was 1000ms
Depends on: nothing new
Runtime risk: LOW — only affects health monitoring frequency
  MANDATORY: Run 12-step projection validation gate after this change
Test after: Verify projection window still works; health monitor shows connected
Rollback: Revert to 1000ms
```

---

# PART 4: AI CODING AGENT RULES

## 4.1 Mandatory Pre-Implementation Protocol

Before writing any code, an AI coding agent MUST complete this checklist:

```
? 1. Read implementation-master-order-v1.md (this document)
? 2. Identify which Phase the task belongs to
? 3. Verify all previous phases are complete
? 4. Read the relevant source files in the codebase
? 5. Identify what currently exists vs what needs to change
? 6. Identify all files that will be modified
? 7. Verify none of the modified files are in the "forbidden" list for this phase
? 8. Confirm the change is the MINIMUM needed to accomplish the task
? 9. Confirm the change can be independently reverted
? 10. If touching projection-critical files: plan the 12-step validation gate
```

**If any checkbox cannot be checked, STOP and ask for clarification.**

---

## 4.2 Forbidden Actions (Absolute — No Exceptions)

### 4.2.1 Forbidden Refactors

```
FORBIDDEN: Rewriting a working file "while you're at it"
  If a file works correctly, only change what the task requires.
  Do not clean up, reorganize, or improve unrelated code.

FORBIDDEN: Big-bang rewrites
  Never rewrite an entire component, store, or module in one commit.
  Always make targeted, minimal changes.

FORBIDDEN: Changing function signatures without backward compatibility
  If a function is called from multiple places, adding a required parameter
  breaks all callers. Always use optional parameters with defaults.

FORBIDDEN: Removing exports without verifying all consumers
  Before removing any exported function, type, or constant, verify
  that no other file imports it. Use grep/search to confirm.

FORBIDDEN: Changing CSS class names without updating all usages
  CSS class names are used in multiple files. Renaming without
  updating all usages breaks the UI silently.
```

### 4.2.2 Forbidden Deletions

```
FORBIDDEN: Deleting any IPC channel handler
  Old channels must remain for backward compatibility.
  Only add new channels; never remove existing ones in v1.x.

FORBIDDEN: Deleting any compatibility layer before migration is complete
  A compatibility layer (re-export, alias, adapter) must remain
  until ALL consumers have been migrated to the new system.

FORBIDDEN: Deleting any database migration
  Migrations are permanent. Never remove a migration from the array.
  If a migration was wrong, add a new migration to fix it.

FORBIDDEN: Deleting any store action that is called from components
  Before removing a store action, verify no component calls it.
  Use grep to confirm zero usages.
```

### 4.2.3 Forbidden Runtime Edits

```
FORBIDDEN: Adding cross-store reads inside Zustand store actions
  Store actions must not call getState() on other stores.
  Pass data as parameters instead.

FORBIDDEN: Adding async operations to sendLiveSlide()
  sendLiveSlide() must remain synchronous and instant.
  It is called in the hot path of live presentation.

FORBIDDEN: Adding blocking operations to ipcMain.on handlers
  ipcMain.on handlers are fire-and-forget.
  Never await inside them; use ipcMain.handle for async operations.

FORBIDDEN: Adding UI state to useProjectionStore
  useProjectionStore owns projection runtime state only.
  UI state (panel sizes, selected items) belongs in other stores.

FORBIDDEN: Using setTimeout/setInterval inside Zustand store actions
  Timer management belongs in hooks (useTimerTick) or components.
  Store actions must be synchronous.
```

### 4.2.4 Forbidden Projection Changes

```
FORBIDDEN: Modifying sendLiveSlide() in any way
  This function is the critical path for live output.
  Any change requires a full projection validation gate.

FORBIDDEN: Adding error handling that swallows projection errors silently
  Projection errors must be logged and surfaced to the operator.
  Never catch and ignore errors in projection-critical paths.

FORBIDDEN: Changing the ProjectionState type values
  'LIVE' | 'BLACK' | 'FREEZE' | 'CLEAR' | 'LOGO' are used
  throughout the codebase and in IPC messages. Changing them
  breaks the projection window.

FORBIDDEN: Changing the SlideData interface without backward compatibility
  SlideData is serialized over IPC. Adding required fields breaks
  the projection window which may have cached old data.
```

### 4.2.5 Forbidden Multi-System Rewrites

```
FORBIDDEN: Implementing multiple phases simultaneously
  Phase N must be complete before Phase N+1 begins.
  Never implement Phase 3 features while Phase 2 is incomplete.

FORBIDDEN: Modifying both the store and its consumers in one commit
  If migrating a store, migrate the store first (one commit),
  then migrate consumers one at a time (separate commits).

FORBIDDEN: Changing IPC contracts and callers simultaneously
  If changing an IPC channel, update the handler first,
  then update callers in separate commits.
```

---

## 4.3 Safe Actions

### 4.3.1 Incremental Replacement

```
SAFE: Adding a new function alongside an existing one
  Old function remains; new function added; callers migrated one at a time.

SAFE: Adding optional parameters to existing functions
  function generateSlidesForSong(song: Song, config?: SlideConfig)
  Existing callers without config still work.

SAFE: Adding new exports to existing files
  New exports don't affect existing imports.

SAFE: Adding new IPC channels alongside existing ones
  New channels don't affect existing channel behavior.
```

### 4.3.2 Adapter Usage

```
SAFE: Adapter pattern for ProjectionPayload migration
  PresentationCanvas accepts both SlideData (legacy) and ProjectionPayload (new).
  Internal adapter converts SlideData to ProjectionPayload.
  Callers migrate to ProjectionPayload one at a time.

SAFE: Re-export compatibility layer for store decomposition
  useAppStore.songs re-exports from useSongStore.songs.
  Existing components continue to work unchanged.
  Components migrate to useSongStore one at a time.
```

### 4.3.3 Compatibility Bridges

```
SAFE: IPC channel alias
  display:get-all responds identically to display_get-all.
  Both channels active simultaneously.
  Renderer migrates to new channel; old channel remains.

SAFE: Dual-channel IPC listeners
  StageDisplayApp listens to both confidence:update (new) and
  projection:slide-update (legacy). Prefers new channel when available.
```

### 4.3.4 Feature-Flag Migrations

```
SAFE: Deploying code behind a feature flag
  FEATURE_FLAGS.LIBRARY_CONTEXT_MENU = false
  Code deployed but inactive. Activated after validation.

SAFE: Gradual feature activation
  Internal: all flags true
  Alpha: Phase 1-4 flags true
  Beta: Phase 1-8 flags true
  Stable: all flags true
```

---

## 4.4 Mandatory Validation Workflow

Every AI coding agent MUST follow this exact workflow for every implementation task:

```
STEP 1 — ANALYZE
  Read the task description carefully.
  Read the relevant architecture documents.
  Read the source files that will be modified.
  Read the files that import from modified files.
  Identify: what exists, what changes, what must not change.

STEP 2 — MAP DEPENDENCIES
  List all files that will be modified.
  List all files that depend on modified files.
  Verify no circular dependencies will be created.
  Verify no projection-critical files are in the list (or plan gate).

STEP 3 — VALIDATE SAFETY
  Is this change in the correct phase? (Check Part 2)
  Is this change in the forbidden list? (Check Part 4.2)
  Is this change the minimum needed?
  Can this change be independently reverted?
  If projection-critical: is the 12-step gate planned?

STEP 4 — IMPLEMENT
  Make the minimum change needed.
  Follow TypeScript standards (Part 4.5).
  Follow component standards (Part 4.5).
  Add error handling to all async operations.
  Add aria-label to all icon-only buttons.
  No refactoring of unrelated code.

STEP 5 — TEST
  npm run typecheck — must pass (zero errors)
  npm run lint — must pass (zero errors)
  npm run test — must pass (all tests green)
  Manual: verify the specific feature works
  Manual: verify projection controls (Space, B, Esc) still work
  If projection-critical: run full 12-step gate

STEP 6 — ROLLBACK CHECK
  Can this change be reverted by reverting the modified files?
  Does reverting restore the previous behavior exactly?
  Are there any irreversible side effects (DB changes, localStorage)?
  If DB migration: is pre-migration backup in place?

STEP 7 — INTEGRATE
  Commit with descriptive message referencing feature ID
  Format: "fix(DUI-001): wire favorite button in LibraryMode"
  Update feature completion matrix in 04-production-system/
  Create implementation log in .dev-docs/04-implementation/
```

---

## 4.5 Code Standards (Non-Negotiable)

### TypeScript

```typescript
// REQUIRED: Explicit return types
function Component(): React.JSX.Element { ... }
async function handleAction(): Promise<void> { ... }

// REQUIRED: Interface for props (not inline type)
interface ButtonProps { variant?: 'primary'; onClick?: () => void }

// REQUIRED: No 'any' — use 'unknown' with type guards
function process(data: unknown): void {
  if (typeof data !== 'object' || !data) return
}

// FORBIDDEN: Non-null assertion without comment
const el = document.getElementById('id')!  // FORBIDDEN
```

### Components

```typescript
// REQUIRED: React.memo for list items
const SongRow = React.memo(({ song }: Props) => <div>{song.title}</div>)

// REQUIRED: useCallback for callbacks passed to children
const handleSelect = useCallback((song: Song) => setSelectedSong(song), [setSelectedSong])

// REQUIRED: Granular store subscriptions
const selectedSong = useAppStore(s => s.selectedSong)  // GOOD
const store = useAppStore()  // BAD — subscribes to everything

// REQUIRED: aria-label on icon-only buttons
<button aria-label="Delete song"><Trash2 size={16} /></button>

// REQUIRED: Error handling on all async operations
try { await window.api.songs.delete(id) }
catch (err) { logger.error('Failed:', err); showToast('Gagal', 'error') }

// FORBIDDEN: window.confirm() for any new code
window.confirm('Delete?')  // FORBIDDEN — use ConfirmDialog
```

### IPC

```typescript
// REQUIRED: IPC calls in store actions, NOT in components
// REQUIRED: Fire-and-forget for projection (no await)
window.api.projection.slideUpdate(data) // no await

// REQUIRED: Cleanup IPC listeners
useEffect(() => {
  const unsub = window.api.projection.onSlideUpdate(handler)
  return () => unsub()
}, [])
```

### Zustand

```typescript
// REQUIRED: useShallow for multiple values
const { songs, selectedSong } = useAppStore(
  useShallow((s) => ({ songs: s.songs, selectedSong: s.selectedSong }))
)

// REQUIRED: getState() in event handlers (not subscriptions)
const handleKey = () => {
  const { selectedSong } = useAppStore.getState()
}

// FORBIDDEN: Cross-store reads in store actions
// In useProjectionStore: useAppStore.getState()  // FORBIDDEN
```

---

# PART 5: PROJECTION SAFETY PROTOCOL

## 5.1 Why Projection Safety Is the Highest Priority

The projection runtime is the only part of SION Media that is directly visible to the congregation during a live service. A crash, freeze, or incorrect output is not a software bug — it is a public failure that disrupts worship. This protocol exists to ensure that no implementation work, however well-intentioned, can break the live output.

**The projection window runs in a separate Electron BrowserWindow process.** This means:

- The operator UI (main window) can crash without affecting the projection output
- The projection window can be restarted without losing the main window state
- IPC messages are the only communication channel between them

This architecture is a safety feature. It must be preserved.

---

## 5.2 Projection-Critical File Registry

The following files directly affect live projection output. Any modification requires the 12-step Projection Validation Gate:

```
TIER 1 — DIRECT OUTPUT (highest risk):
  src/renderer/src/components/PresentationCanvas.tsx
    ? Renders the actual projection output
    ? Any change here is immediately visible to the congregation

  src/renderer/src/atmosphere/AtmosphereRenderer.tsx
    ? Renders backgrounds and motion effects
    ? Crash here blacks out the projection

  src/renderer/src/projection/ProjectionApp.tsx
    ? The projection window's root component
    ? Crash here kills the projection window

TIER 2 — RUNTIME CONTROL (high risk):
  src/renderer/src/store/useProjectionStore.ts
    ? Controls all projection state
    ? Bugs here cause incorrect slide navigation or state corruption

  src/renderer/src/utils/runtimeCommandBus.ts
    ? Routes all operator commands
    ? Bugs here break keyboard shortcuts and UI controls

  src/renderer/src/utils/runtimeCommandHandlers.ts
    ? Executes projection commands
    ? Bugs here cause commands to fail silently

  src/renderer/src/components/LivePreviewPanel.tsx
    ? Operator's primary control interface
    ? Bugs here prevent operators from controlling the output

TIER 3 — IPC BRIDGE (medium risk):
  src/main/windows.ts
    ? Creates and manages projection window
    ? Bugs here prevent projection window from showing

  src/main/ipc-handlers.ts (projection channels only)
    ? Bridges operator commands to projection window
    ? Bugs here break the operator-to-output pipeline
```

---

## 5.3 The 12-Step Projection Validation Gate

**This gate is MANDATORY before merging any change to Tier 1 or Tier 2 files.**  
**Both the implementer AND a reviewer must independently pass this gate.**

```
Setup: Two monitors connected (or virtual display configured)
       App running in development mode

STEP 1:  Select a song from the library
         Expected: Preview monitor shows first slide (green border)

STEP 2:  Press Space
         Expected: LIVE state, red border on program monitor,
                   projection window shows lyrics

STEP 3:  Press ? (right arrow)
         Expected: Next slide appears on projection window

STEP 4:  Press ? (left arrow)
         Expected: Previous slide appears on projection window

STEP 5:  Press B
         Expected: Projection window goes black, "BLACK" badge in title bar

STEP 6:  Press B again
         Expected: Returns to LIVE, lyrics reappear on projection window

STEP 7:  Press F
         Expected: "FREEZE" badge, projection window frozen

STEP 8:  Press F again
         Expected: Returns to LIVE, projection window unfreezes

STEP 9:  Press Esc
         Expected: "CLEAR" state, projection window shows placeholder

STEP 10: Click a different song in the library
         Expected: Preview monitor shows new song's first slide

STEP 11: Press Space
         Expected: New song goes LIVE on projection window

STEP 12: Verify projection window throughout
         Expected: All content changes appeared correctly on projection window
                   No flicker, no blank frames, no incorrect content

PASS CRITERIA: All 12 steps complete without error
FAIL CRITERIA: Any step produces unexpected behavior

If ANY step fails: DO NOT MERGE. Investigate and fix before proceeding.
```

---

## 5.4 Live-Session Protection Rules

```
RULE: NEVER force-reload the main window during a live session
  If projectionState === 'LIVE', defer any reload or restart.
  Show notification: "Update tersedia — akan diterapkan setelah sesi selesai"

RULE: NEVER reset useProjectionStore state during a live session
  If projectionState === 'LIVE', do not call clearScreen() or reset state
  unless the operator explicitly requests it.

RULE: NEVER block the main thread during slide navigation
  sendLiveSlide() must complete in < 16ms.
  No database queries, no file I/O, no network calls in the hot path.

RULE: NEVER show modal dialogs that block projection controls
  Modals must not intercept keyboard events for B, F, Esc, Space, ?, ?.
  These shortcuts must work even when a modal is open.
  Implementation: check if modal is open before processing projection shortcuts.

RULE: NEVER auto-update the app during a live session
  Check projectionState before showing update notification.
  Only show update notification when projectionState === 'CLEAR'.
```

---

## 5.5 Projection Runtime Isolation Rules

```
ISOLATION RULE 1: Projection store owns projection state only
  useProjectionStore must not own:
  - UI state (panel sizes, selected items, search queries)
  - Application state (current screen, loading state)
  - User preferences (theme, language)
  These belong in other stores.

ISOLATION RULE 2: No cross-store reads in projection store actions
  useProjectionStore actions must not call:
  - useAppStore.getState()
  - usePlaylistStore.getState()
  - useModeStore.getState()
  Data needed from other stores must be passed as parameters.

ISOLATION RULE 3: Projection window has minimal dependencies
  ProjectionApp.tsx must not import:
  - useAppStore
  - usePlaylistStore
  - useModeStore
  - RuntimeCommandBus
  It only needs: IPC listeners, PresentationCanvas, AtmosphereRenderer.

ISOLATION RULE 4: IPC is the only communication channel
  The projection window communicates with the main window ONLY via IPC.
  No shared memory, no shared state, no direct function calls.
  This is enforced by Electron's process isolation.
```

---

## 5.6 Emergency Rollback Rules

```
If a projection regression is discovered after merge:

IMMEDIATE ACTION (< 5 minutes):
  1. git revert [merge commit] on develop branch
  2. Rebuild and deploy reverted version
  3. Verify projection works with reverted version
  4. Notify team of regression

INVESTIGATION (after immediate action):
  1. Identify which specific change caused the regression
  2. Write a test that reproduces the regression
  3. Fix the regression in isolation
  4. Run 12-step gate on the fix
  5. Re-merge after gate passes

PREVENTION:
  1. Add the regression scenario to the 12-step gate
  2. Add an automated test if possible
  3. Document the root cause in the implementation log
```

---

# PART 6: DEPENDENCY SAFETY SYSTEM

## 6.1 Allowed Dependency Direction

Dependencies must flow in ONE direction only. Circular dependencies are forbidden.

```
ALLOWED DEPENDENCY DIRECTION:

Components ? Stores ? IPC Bridge ? Main Process ? Database

Specifically:
  React Components ? Zustand Stores (via hooks)
  Zustand Stores ? window.api (IPC bridge)
  window.api ? ipcRenderer ? ipcMain handlers
  ipcMain handlers ? database.ts functions
  database.ts ? better-sqlite3

FORBIDDEN DIRECTIONS:
  Stores ? Components (stores must not import React components)
  IPC Bridge ? Stores (preload must not import renderer stores)
  Main Process ? Renderer (main must not import renderer code)
  Database ? IPC (database functions must not call IPC)
```

## 6.2 Store Dependency Rules

```
RULE: Stores must not import from other stores
  useProjectionStore must not import useAppStore
  usePlaylistStore must not import useProjectionStore
  etc.

  If a store needs data from another store, the component
  that uses both stores is responsible for passing the data.

RULE: Stores may import from utilities
  Stores may import: logger, slideEngine, runtimeCommandBus
  These are pure utilities with no store dependencies.

RULE: Stores may import from types
  Stores may import types from: src/renderer/src/types.ts
  Stores may import types from: src/shared/types.ts

RULE: New stores must not create circular imports
  Before creating a new store, verify its imports don't
  create a cycle. Use a dependency graph tool if needed.
```

## 6.3 Component Dependency Rules

```
RULE: Components may import from multiple stores
  A component may subscribe to useProjectionStore AND usePlaylistStore.
  This is normal and expected.

RULE: Components must not import from main process files
  Components must not import from src/main/*.ts
  All main process access goes through window.api (IPC bridge).

RULE: Modal components must not import from mode components
  Modal components are shared across modes.
  They must not import from LibraryMode, ProjectionMode, etc.
  They may import from stores and design-system components.

RULE: Design system components must not import from stores
  Button, Input, Badge, etc. must be pure UI components.
  They must not subscribe to any Zustand store.
  Data is passed via props only.
```

## 6.4 IPC Dependency Rules

```
RULE: Renderer may only call IPC via window.api
  Never use ipcRenderer directly in renderer code.
  Always use the preload bridge (window.api).

RULE: Main process may not call renderer functions
  Main process communicates to renderer via webContents.send() only.
  Never import renderer code in main process.

RULE: New IPC channels must be registered in both places
  1. ipcMain.handle/on in ipc-handlers.ts
  2. window.api.[domain].[action] in preload/index.ts
  Missing either registration causes silent failures.

RULE: IPC channel names follow the pattern [domain]:[action]
  db:get-songs, projection:slide-update, system:get-memory
  Exception: display_get-all (legacy, keep for backward compat)
```

## 6.5 Critical Dependency Graph

```
The following dependency chain is the most critical in the application.
Any break in this chain breaks live projection:

Keyboard Input
  ? useGlobalShortcuts (hook)
  ? executeRuntimeCommand() (runtimeCommandBus)
  ? commandBus.execute() (validates + routes)
  ? CommandHandler (runtimeCommandHandlers)
  ? useProjectionStore.action() (store mutation)
  ? sendLiveSlide(slideData) (IPC call)
  ? window.api.projection.slideUpdate(data) (preload bridge)
  ? ipcRenderer.send('projection:slide-update', data) (IPC)
  ? ipcMain.on('projection:slide-update') (main handler)
  ? updateSlideData(data) (windows.ts)
  ? projectionWindow.webContents.send('projection:slide-update', data)
  ? ProjectionApp.tsx (receives IPC)
  ? PresentationCanvas (renders output)
  ? Congregation sees lyrics

Every link in this chain must be preserved.
```

---

# PART 7: REFACTOR SAFETY SYSTEM

## 7.1 Rollback Checkpoints

Every phase has a defined rollback checkpoint. At each checkpoint, the application must be in a fully working state.

```
CHECKPOINT 0 (after Phase 0):
  State: Test infrastructure added, no production code changed
  Rollback: Delete test files
  Verify: npm run test passes

CHECKPOINT 1 (after Phase 1):
  State: New stores, IPC, migrations added. Zero behavior change.
  Rollback: Delete new files, revert 6 modified files
  Verify: App works exactly as before Phase 1

CHECKPOINT 2 (after Phase 2):
  State: 10 dead UI issues fixed. Projection unchanged.
  Rollback: Revert 7 modified files independently
  Verify: Projection validation gate passes

CHECKPOINT 3 (after Phase 3):
  State: Modal system operational. No window.confirm() calls.
  Rollback: Delete modal files, restore window.confirm() calls
  Verify: Projection validation gate passes

CHECKPOINT 4 (after Phase 4):
  State: Projection runtime hardened. Stage display operational.
  Rollback: Revert 9 modified files independently
  Verify: Full projection validation gate + multi-window test

CHECKPOINT 5 (after Phase 5):
  State: Design system components available.
  Rollback: Delete new component files
  Verify: Existing UI unchanged

CHECKPOINT 6 (after Phase 6):
  State: Library Mode improvements complete.
  Rollback: Revert LibraryModeRedesigned.tsx
  Verify: Library Mode functional test

CHECKPOINT 7 (after Phase 7):
  State: Projection Mode improvements complete.
  Rollback: Revert ProjectionMode.tsx
  Verify: Full projection validation gate

CHECKPOINT 8 (after Phase 8):
  State: Management Mode improvements complete.
  Rollback: Revert ManagementMode.tsx
  Verify: Management Mode functional test

CHECKPOINT 9 (after Phase 9):
  State: Store decomposition complete.
  Rollback: Delete new stores, restore useAppStore re-exports
  Verify: Full typecheck + all tests pass + projection gate

CHECKPOINT 10 (after Phase 10):
  State: Performance and accessibility hardened.
  Rollback: Revert performance changes individually
  Verify: Performance budgets met

CHECKPOINT 11 (after Phase 11):
  State: Release candidate ready.
  Rollback: Revert to previous release tag
  Verify: Full production readiness checklist
```

---

## 7.2 Compatibility Layer Lifecycle

```
LIFECYCLE RULE: A compatibility layer has three stages:

Stage 1 — ACTIVE (during migration):
  Both old and new systems operational.
  Old system still used by some consumers.
  New system used by migrated consumers.
  DO NOT remove the old system.

Stage 2 — DEPRECATED (migration complete):
  All consumers migrated to new system.
  Old system still present but unused.
  Mark with @deprecated JSDoc comment.
  Schedule removal for next major version.

Stage 3 — REMOVED (next major version):
  Old system removed.
  Only in major version (v2.0.0, not v1.x.x).
  Verify zero usages before removal.

Example: useAppStore.songs compatibility layer
  Stage 1: useAppStore.songs re-exports from useSongStore.songs
           Components still use useAppStore.songs
  Stage 2: All components migrated to useSongStore.songs
           useAppStore.songs still present, marked @deprecated
  Stage 3: useAppStore.songs removed in v2.0.0
```

---

## 7.3 Feature Flag Lifecycle

```
LIFECYCLE RULE: Feature flags have four stages:

Stage 1 — DISABLED (deployed but inactive):
  FEATURE_FLAGS.LIBRARY_CONTEXT_MENU = false
  Code deployed, not activated.
  Used for: staging validation, gradual rollout.

Stage 2 — INTERNAL (active for developers):
  FEATURE_FLAGS.LIBRARY_CONTEXT_MENU = true (internal only)
  Validated in development environment.
  Not yet in alpha/beta.

Stage 3 — ACTIVE (all environments):
  FEATURE_FLAGS.LIBRARY_CONTEXT_MENU = true (all)
  Feature fully validated and stable.
  Flag still present for emergency rollback.

Stage 4 — REMOVED (after 2 stable releases):
  Flag removed from FEATURE_FLAGS object.
  Code paths that check the flag removed.
  Feature is now unconditional.

RULE: Never remove a feature flag before 2 stable releases.
RULE: Never activate a flag in stable before alpha + beta validation.
```

---

## 7.4 Recovery from Failed Migrations

```
SCENARIO: Migration 15 (song_notes) fails on user's machine

DETECTION:
  App startup ? runMigrations() throws error
  Error logged: "[Migration] Migration 15 failed: ..."

RECOVERY PROCEDURE:
  1. Pre-migration backup exists (created before migration ran)
     Location: userData/backups/pre-migration-[timestamp].db
  2. App shows error dialog: "Database migration failed"
     Options: [Restore from backup] [Contact support]
  3. User clicks "Restore from backup"
  4. App copies pre-migration backup to sion.db
  5. App restarts with previous schema version
  6. Migration 15 is skipped (version already at 14)

PREVENTION:
  1. Test migration on copy of production DB before release
  2. Ensure migration is idempotent (IF NOT EXISTS)
  3. Wrap migration in db.transaction()
  4. Log migration result to app_state table
```

---

## 7.5 Recovery from Broken Runtime State

```
SCENARIO: useProjectionStore enters invalid state after a bug

DETECTION:
  projectionState === 'LIVE' but programSlide === null
  OR programLockState === 'LIVE_DIRTY' but pendingChanges === []

RECOVERY PROCEDURE:
  1. Operator presses Esc ? clearScreen() ? resets to CLEAR + UNLOCKED
  2. If Esc doesn't work: operator clicks "Clear" button in scene strip
  3. If UI is unresponsive: operator uses B key (toggleBlack)
  4. If all else fails: operator hides projection window (title bar button)
     ? Projection window shows nothing
     ? Operator can reload main window without affecting projection

PREVENTION:
  1. State invariants checked in goToSlide() and clearScreen()
  2. ErrorBoundary catches render errors in ProjectionMode
  3. Per-mode ErrorBoundary shows fallback UI with emergency controls
```

---

## 7.6 Recovery from Broken IPC Contracts

```
SCENARIO: New IPC channel added but preload bridge not updated

DETECTION:
  window.api.system.getStorageStats is undefined
  TypeError: window.api.system.getStorageStats is not a function

RECOVERY PROCEDURE:
  1. Catch the TypeError in the calling code
  2. Show fallback value (e.g., "N/A" for storage metric)
  3. Log error: logger.error('[IPC] getStorageStats not available')
  4. Fix: add bridge entry to preload/index.ts

PREVENTION:
  1. Always update preload/index.ts when adding new IPC handler
  2. TypeScript types in preload/index.d.ts catch missing bridges
  3. Test each new channel manually after implementation
```

---

# PART 8: IMPLEMENTATION VALIDATION SYSTEM

## 8.1 Validation After Every Change

**Every single code change, no matter how small, requires:**

```
MINIMUM VALIDATION (every change):
  ? npm run typecheck — zero errors
  ? npm run lint — zero errors
  ? npm run test — all tests pass
  ? Manual: the specific feature works as expected
  ? Manual: Space, B, Esc keys still work in Projection Mode
```

## 8.2 Validation After Projection-Critical Changes

**Any change to Tier 1 or Tier 2 projection files requires:**

```
PROJECTION VALIDATION (Tier 1/2 changes):
  ? All minimum validation above
  ? 12-step Projection Validation Gate (Part 5.3)
  ? Multi-window test (projection window on external display)
  ? Stage display test (confidence payload received)
  ? Memory check: < 200MB after 5 minutes of operation
```

## 8.3 Validation After IPC Changes

**Any change to ipc-handlers.ts or preload/index.ts requires:**

```
IPC VALIDATION:
  ? All minimum validation above
  ? Each new channel invoked manually and returns expected data
  ? Each modified channel still returns same data as before
  ? No existing channel removed or return type changed
  ? TypeScript types in preload/index.d.ts updated
```

## 8.4 Validation After Store Changes

**Any change to Zustand stores requires:**

```
STATE VALIDATION:
  ? All minimum validation above
  ? No cross-store reads added (grep for getState() in store files)
  ? Persistence: if store is persisted, verify localStorage key correct
  ? Hydration: if store loads from IPC, verify data loads on startup
  ? Selectors: verify granular subscriptions (no whole-store subscriptions)
```

## 8.5 Validation After Database Changes

**Any change to migrations.ts or database.ts requires:**

```
DATABASE VALIDATION:
  ? All minimum validation above
  ? Migration tested on copy of production DB
  ? Migration is idempotent (run twice, same result)
  ? All existing data intact after migration
  ? New functions unit tested in database.test.ts
  ? Pre-migration backup created before testing
```

## 8.6 Validation Before Every Merge

**Before merging any branch to develop:**

```
PRE-MERGE VALIDATION:
  ? All minimum validation above
  ? No window.confirm() calls added
  ? No hardcoded colors (use design tokens)
  ? No console.log() in production code
  ? Error handling on all async operations
  ? Loading states for async UI
  ? aria-label on all icon-only buttons
  ? If projection-critical: 12-step gate passed by both implementer and reviewer
  ? Feature completion matrix updated
  ? Implementation log created
```

## 8.7 Performance Validation

**Required before Phase 10 completion:**

```
PERFORMANCE VALIDATION:
  ? Management Mode with 1000 songs: renders in < 500ms
  ? Library Mode search: results appear in < 100ms
  ? Slide generation: < 50ms for generateSlidesForSong()
  ? App startup: < 3000ms from launch to interactive
  ? Memory (main window): < 200MB after 30 minutes
  ? Memory (projection window): < 100MB
  ? No memory leak: memory stable over 30-minute session
```

## 8.8 Accessibility Validation

**Required before v1.1.0 release:**

```
ACCESSIBILITY VALIDATION (v1.1.0):
  ? All modals: role="dialog" + aria-modal="true"
  ? All modals: aria-labelledby pointing to title
  ? All modals: focus trap works
  ? All modals: Escape closes
  ? All icon-only buttons: aria-label present
  ? All form inputs: associated labels
  ? Tab order: logical in all modes

ACCESSIBILITY VALIDATION (v1.2.0):
  ? prefers-reduced-motion: all animations respect it
  ? Keyboard navigation: ?? Enter in song grids
  ? aria-live: toast notifications announced
  ? Color contrast: = 4.5:1 for all text
```

---

# PART 9: DOCUMENTATION GOVERNANCE

## 9.1 Documentation Update Requirements

**No implementation work is complete without documentation updates.**

```
AFTER EVERY PHASE:
  ? Update feature completion matrix in:
    04-production-system/01-production-architecture.md
    ? Change status from ? to ? for completed features

  ? Create implementation log in:
    .dev-docs/04-implementation/[N]-log-impl-[feature].md
    ? Document what was changed, why, and any issues

AFTER ADDING NEW IPC CHANNEL:
  ? Update IPC channel map in:
    01-foundation/01-audit-and-architecture.md
  ? Update preload/index.ts JSDoc

AFTER ADDING NEW STORE:
  ? Update store architecture map in:
    02-runtime-architecture/01-functional-refactor.md
  ? Document ownership rules and persistence key

AFTER ADDING NEW MIGRATION:
  ? Update database schema in:
    01-foundation/01-audit-and-architecture.md
  ? Document migration purpose in migrations.ts JSDoc

AFTER ARCHITECTURE DECISION:
  ? Create ADR in:
    .dev-docs/10-enterprise-refactor-system/08-governance/
    Format: adr-[N]-[title].md
```

## 9.2 When Architecture Documents Must Change

```
LEVEL 1 DOCUMENTS (immutable — require formal ADR):
  implementation-master-order-v1.md
  02-runtime-architecture/02-runtime-engine.md

  These documents change ONLY when:
  - A fundamental architectural decision is reversed
  - A new constraint is discovered that invalidates existing decisions
  - A security vulnerability requires architectural change

  Process: Write ADR ? Review ? Update document ? Version bump

LEVEL 2 DOCUMENTS (authoritative — require review):
  01-foundation/01-audit-and-architecture.md
  02-runtime-architecture/01-functional-refactor.md
  04-production-system/01-production-architecture.md

  These documents change when:
  - New features are added to the feature registry
  - Implementation status changes
  - New IPC channels, stores, or migrations are added

  Process: Update in same PR as implementation ? Review

LEVEL 3 DOCUMENTS (living — updated per sprint):
  05-migration-system/*
  06-testing-system/*
  08-governance/*
  09-dependency-maps/*

  These documents change when:
  - A migration is completed
  - A new test is written
  - An ADR is created
  - A dependency map changes

  Process: Update in same PR as implementation
```

## 9.3 No Implementation Without Documentation

```
RULE: A feature is not "done" until:
  1. The code is implemented and validated
  2. The feature completion matrix is updated
  3. An implementation log is created
  4. Any affected architecture documents are updated

RULE: A migration is not "done" until:
  1. The migration is applied and tested
  2. The database schema document is updated
  3. The migration is documented in migrations.ts JSDoc

RULE: An ADR is required for:
  - Adding a new Zustand store
  - Adding a new IPC channel group
  - Changing the projection runtime architecture
  - Changing the modal orchestration system
  - Changing the store decomposition strategy
  - Any decision that affects multiple phases
```

---

# PART 10: FINAL IMPLEMENTATION COMMANDMENTS

## The Immutable Laws of SION Media Implementation

These commandments are the distillation of all architecture decisions, safety rules, and engineering principles in this document. They are immutable. They apply to every developer, every AI coding agent, and every implementation decision.

---

### COMMANDMENT I

**NEVER rewrite the projection runtime directly.**

The projection runtime (`useProjectionStore`, `RuntimeCommandBus`, `PresentationCanvas`) is production-quality. It works. It protects live services. Extend it with adapters and additions. Never rewrite it.

---

### COMMANDMENT II

**NEVER implement Phase N before Phase N-1 is complete and validated.**

The phase sequence is a dependency chain. Phase 3 modals depend on Phase 1 stores. Phase 4 hardening depends on Phase 3 modals. Skipping phases creates invisible dependencies that cause cascading failures.

---

### COMMANDMENT III

**NEVER remove a compatibility layer before all consumers are migrated.**

A compatibility layer is a promise to existing code. Breaking that promise breaks all code that depends on it. Migrate consumers first, then remove the layer — never the reverse.

---

### COMMANDMENT IV

**NEVER use `window.confirm()` for any new code.**

`window.confirm()` blocks the main thread, has no styling, and cannot be tested. Every confirmation dialog must use `ConfirmDialog` or `DeleteConfirmDialog` from the modal system.

---

### COMMANDMENT V

**NEVER add cross-store reads inside Zustand store actions.**

Stores are independent domains. `useProjectionStore` must not read from `useAppStore`. `usePlaylistStore` must not read from `useProjectionStore`. Data flows through components, not between stores.

---

### COMMANDMENT VI

**NEVER modify more than one system in a single commit.**

One commit = one change. If a task requires modifying the store AND the component, that is two commits. This makes rollback possible and review meaningful.

---

### COMMANDMENT VII

**ALWAYS run the 12-step Projection Validation Gate before merging any change to projection-critical files.**

The gate takes 5 minutes. A projection regression during a live service takes hours to recover from. The gate is not optional.

---

### COMMANDMENT VIII

**ALWAYS implement infrastructure before UI.**

New stores, IPC channels, and migrations must exist before the UI that uses them. Building UI on top of missing infrastructure creates runtime errors that are difficult to debug.

---

### COMMANDMENT IX

**ALWAYS ensure every change can be independently reverted.**

Before implementing any change, ask: "If I revert only this file, does the app return to its previous state?" If the answer is no, the change is too large and must be split.

---

### COMMANDMENT X

**ALWAYS maintain rollback capability throughout the entire implementation.**

At every checkpoint, the application must be in a fully working state. There must never be a moment where the application is broken and cannot be reverted to a working state.

---

### COMMANDMENT XI

**NEVER deploy to stable without passing the full production readiness checklist.**

The checklist exists because real operators depend on this software during real services. Every item on the checklist represents a real failure mode that has been anticipated and prevented.

---

### COMMANDMENT XII

**ALWAYS update documentation when implementation changes architecture.**

Code without documentation is a liability. Architecture decisions without ADRs are forgotten. Feature status without tracking is invisible. Documentation is not optional — it is part of the implementation.

---

## Summary: The Three Principles

All twelve commandments derive from three core principles:

```
PRINCIPLE 1: PROJECTION SAFETY
  The live output must never regress.
  Every decision is evaluated against this principle first.

PRINCIPLE 2: INCREMENTAL MIGRATION
  No big-bang rewrites. No skipped phases.
  Every change is small, validated, and revertible.

PRINCIPLE 3: INFRASTRUCTURE FIRST
  Build the foundation before the features.
  New systems before new UI.
  Compatibility before migration.
```

---

## Quick Reference Card

```
BEFORE CODING:
  ? Read this document
  ? Identify the phase
  ? Check forbidden list
  ? Plan rollback

WHILE CODING:
  ? Minimum change only
  ? No unrelated refactoring
  ? Error handling on all async
  ? aria-label on icon buttons

AFTER CODING:
  ? typecheck + lint + test
  ? Manual feature test
  ? Manual projection test (Space, B, Esc)
  ? If projection-critical: 12-step gate
  ? Update feature matrix
  ? Create implementation log

BEFORE MERGING:
  ? All validation passed
  ? No window.confirm() added
  ? No hardcoded colors
  ? No console.log()
  ? Documentation updated
```

---

_SION Media — Implementation Master Order v1.0_  
_This document is the single source of truth for all implementation work._  
_Authority Level: IMMUTABLE — Changes require formal ADR._  
_Generated: May 2026_
