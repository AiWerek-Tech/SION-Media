# SION Media — Phase 4: Production System Architecture v1.0

## Implementation Orchestration, Migration Engineering & Production Governance

**Document Status:** Production-Ready Engineering Blueprint  
**Phase:** Phase 4 — Production System Architecture  
**Depends On:** All previous architecture documents (Phases 1–3)  
**Codebase:** Electron 39 / React 19 / Zustand 5 / better-sqlite3 / Vitest / electron-vite

---

# PART 1: MASTER IMPLEMENTATION ROADMAP

## 1.1 Implementation Philosophy

SION Media is a **live worship production system**. The implementation strategy must be:

1. **Projection-safe first** — the live output must never regress
2. **Additive before destructive** — add new systems before removing old ones
3. **Incremental migration** — no big-bang rewrites
4. **Dependency-sequenced** — infrastructure before features
5. **Rollback-capable** — every sprint can be reverted independently

The existing codebase is **production-quality in its core runtime**. The `RuntimeCommandBus`, `useProjectionStore`, `slideEngine`, `migrations`, and `ipc-health` systems are solid and must be preserved. The refactor targets dead UI, missing modals, state normalization, and UI modernization — not the runtime core.

---

## 1.2 Phase Architecture

### PHASE 0 — Pre-Flight (Before Any Code Changes)

**Objective:** Establish safety infrastructure before touching any production code.

**Prerequisites:**

- All architecture documents reviewed and approved
- Vitest configured for renderer (currently node-only)
- ESLint passing with zero errors
- TypeScript compiling with zero errors

**Deliverables:**

- Extended vitest config (renderer + node)
- Test utilities (mock stores, mock IPC)
- Feature flag system
- Git branch strategy documented

**Success Criteria:**

- `npm run test` passes
- `npm run typecheck` passes
- `npm run lint` passes
- Feature flag system operational

**Risk Level:** Low  
**Rollback:** N/A (no production code changed)

---

### PHASE 1 — Infrastructure Sprint (Sprint 0 from Phase 2)

**Objective:** Add all new systems without modifying any existing code.

**Prerequisites:** Phase 0 complete

**Deliverables (all additive — zero breaking changes):**

```
New stores:
  useModalStore.ts
  useServiceStore.ts
  useNotificationStore.ts

New hooks:
  useTimerTick.ts

New IPC channels:
  system:get-storage-stats
  db:duplicate-song
  confidence:update
  display:get-all (alias for display_get-all)

New DB migrations:
  Migration 14: service_state table
  Migration 15: song_notes table
  Migration 16: notifications table
  Migration 17: missing indexes

Store extensions:
  usePanelLayoutStore: extend to 3-panel projection
  usePlaylistStore: add activePlaylist persistence

New DB functions:
  getSongsSummary() — excludes lyrics_raw
  duplicateSong()
  getStorageStats()
```

**Success Criteria:**

- All new stores compile without errors
- New IPC channels respond correctly
- Migrations 14–17 apply cleanly on fresh DB
- `npm run typecheck` passes
- `npm run test` passes

**Risk Level:** Low (additive only)  
**Rollback:** Delete new files, revert migrations.ts

---

### PHASE 2 — Critical Dead UI Fixes (Sprint 1 from Phase 2)

**Objective:** Fix the 10 highest-impact broken interactions.

**Prerequisites:** Phase 1 complete

**Deliverables:**

```
DUI-001: Wire favorite button (LibraryModeRedesigned.tsx)
DUI-002: Wire "New Playlist" in File menu (TitleBarMenu.tsx)
DUI-003: Add Bible to View menu + Ctrl+B shortcut
DUI-004: Wire theme button (TitleBar.tsx)
DUI-006: Real storage metric (ManagementMode.tsx + new IPC)
DUI-008: Wire layout toggle (ManagementMode.tsx)
Timer:   Mount useTimerTick in App.tsx
Timer:   Add timer controls to TitleBarStatus.tsx
Modal:   Mount ModalRegistry in App.tsx
```

**Success Criteria:**

- Favorite button toggles and persists
- New Playlist menu item opens dialog
- Ctrl+B opens BibleScreen
- Theme button cycles dark/light/system
- Storage metric shows real MB values
- Timer advances every second
- ModalRegistry renders without errors

**Risk Level:** Low (isolated changes)  
**Rollback:** Revert individual files

---

### PHASE 3 — Modal System Foundation (Sprint 2 from Phase 2)

**Objective:** Build the modal infrastructure and replace all `window.confirm()` calls.

**Prerequisites:** Phase 2 complete, useModalStore operational

**Deliverables:**

```
Modal base component (Modal.tsx)
DeleteConfirmDialog (replaces all window.confirm())
CreatePlaylistDialog
CrashRecoveryDialog
PlaylistPickerDialog

Wire DeleteConfirmDialog:
  ManagementMode.tsx: handleDeleteSong
  ManagementMode.tsx: handleBulkDelete
  SettingsScreen.tsx: handleReseed
  LibraryModeRedesigned.tsx: delete song

Wire CreatePlaylistDialog:
  TitleBarMenu.tsx: File > New Playlist
  LibraryMode: + New Playlist button
  ProjectionMode: PlaylistPanel + New button

Wire CrashRecoveryDialog:
  useAppBootstrap.ts: on needsRecovery

Wire PlaylistPickerDialog:
  SongContextMenu: Add to Playlist...
```

**Success Criteria:**

- No `window.confirm()` calls remain in codebase
- All modals open/close correctly
- Focus trap works in all modals
- Escape closes all modals
- Crash recovery dialog appears on simulated crash

**Risk Level:** Medium (touches many files)  
**Rollback:** Revert modal components, restore window.confirm() calls

---

### PHASE 4 — Projection Runtime Hardening (Sprint 3 from Phase 2)

**Objective:** Harden the projection runtime with missing features.

**Prerequisites:** Phase 3 complete

**Deliverables:**

```
Next song preload pipeline (ProjectionMode.tsx)
Slide config from settings (useAppBootstrap.ts + slideEngine.ts)
Confidence payload broadcast (useProjectionStore.ts + ipc-handlers.ts)
StageDisplayApp confidence render (StageDisplayApp.tsx)
Per-mode ErrorBoundary (App.tsx)
ProjectionMode ErrorBoundary fallback
MediaEngine LRU cache (mediaEngine.ts)
Auto session save debounced (useProjectionStore.ts)
```

**Success Criteria:**

- Next song pre-generates slides 500ms after current song loads
- Slide config reads from settings (max_lines, max_chars)
- Stage display shows current/next slide from confidence payload
- Projection Mode crash shows fallback UI, output continues
- MediaEngine evicts LRU entries when > 50 items
- Session saves every 2000ms during live presentation

**Risk Level:** Medium-High (touches projection runtime)  
**Rollback:** Revert individual files; projection core unchanged

---

### PHASE 5 — UI Modernization Sprint A (Design System)

**Objective:** Build the shared component library and apply design tokens consistently.

**Prerequisites:** Phase 4 complete

**Deliverables:**

```
New atomic components:
  Button.tsx (6 variants, 4 sizes, all states)
  Input.tsx (3 variants, 3 sizes)
  Badge.tsx (7 variants, 3 sizes)
  SearchInput.tsx
  SegmentedControl.tsx
  MetricCard.tsx (real data, no hardcoded values)

CSS consolidation:
  Audit main.css for hardcoded colors → replace with tokens
  Add prefers-reduced-motion support
  Add focus-visible ring to all interactive elements
  Add aria-label to all icon-only buttons

Design system index.ts updated
```

**Success Criteria:**

- All new components pass TypeScript compilation
- No hardcoded hex colors outside @theme block
- All icon buttons have aria-label
- prefers-reduced-motion CSS added
- Storybook-style visual test for each component (manual)

**Risk Level:** Low (additive components)  
**Rollback:** Delete new components; existing code unchanged

---

### PHASE 6 — UI Modernization Sprint B (Library Mode)

**Objective:** Complete Library Mode improvements.

**Prerequisites:** Phase 5 complete

**Deliverables:**

```
SongContextMenu: right-click on song card/tile/row
HymnalFilterDropdown: in Library command bar
Notes tab: functional (song_notes table from migration 15)
Chord tab: shows key + time signature
Drag-to-playlist: @dnd-kit integration
Multi-select: Ctrl+Click, Shift+Click
Virtualize title view: @tanstack/react-virtual
```

**Success Criteria:**

- Right-click shows context menu at cursor position
- Hymnal filter narrows song list
- Notes tab saves/loads per song
- Chord tab shows key and time signature
- Drag song to playlist panel adds it
- Multi-select shows bulk action bar
- Title view renders 1000+ songs without lag

**Risk Level:** Medium  
**Rollback:** Revert LibraryModeRedesigned.tsx

---

### PHASE 7 — UI Modernization Sprint C (Projection Mode)

**Objective:** Complete Projection Mode improvements.

**Prerequisites:** Phase 6 complete

**Deliverables:**

```
Resizable 3-panel bottom workspace (react-resizable-panels)
Bible panel tab in bottom workspace
Announcement panel tab in bottom workspace
NEXT strip always visible (already exists, ensure correct)
Notification panel (NotificationPanel.tsx)
DUI-005: Wire notifications bell
DUI-007: Real trend bars from song_history
DUI-009: Filter dropdown in Management
DUI-010: Chord/Notes tabs content
```

**Success Criteria:**

- 3 panels resize independently, sizes persist
- Bible panel loads translations and books
- Announcement panel loads custom slides
- Notification panel opens from bell icon
- Trend bars reflect actual song_history data
- Filter dropdown applies to Management song list

**Risk Level:** Medium  
**Rollback:** Revert ProjectionMode.tsx, ManagementMode.tsx

---

### PHASE 8 — UI Modernization Sprint D (Management Mode)

**Objective:** Complete Management Mode improvements.

**Prerequisites:** Phase 7 complete

**Deliverables:**

```
Virtualize Management song list (@tanstack/react-virtual)
SongRelationsModal (MM-004)
ImportProgressDialog (MM-005)
IntegrityCheckDialog (MM-006)
DuplicateSongDialog (MM-010)
Media Library section (new Management section)
Custom Slides section (new Management section)
Layout toggle: table/grid view
```

**Success Criteria:**

- Song list renders 1000+ songs without lag
- Song relations modal shows/adds/removes relations
- Import progress shows results after import
- Integrity check shows duplicate analysis
- Duplicate song creates copy with modified number/title
- Media Library section shows imported assets
- Custom Slides section shows announcement slides

**Risk Level:** Medium  
**Rollback:** Revert ManagementMode.tsx

---

### PHASE 9 — Store Decomposition (Sprint 5 from Phase 2)

**Objective:** Decompose useAppStore into focused stores.

**Prerequisites:** Phase 8 complete (all UI stable before store changes)

**Deliverables:**

```
useSongStore.ts (extracted from useAppStore)
useHymnalStore.ts (extracted from useAppStore)
useDisplayStore.ts (extracted from useAppStore)

Migration strategy:
  Phase A: Create new stores, copy state/actions
  Phase B: useAppStore re-exports from new stores (compatibility)
  Phase C: Update component imports one file at a time
  Phase D: Remove re-exports from useAppStore
```

**Success Criteria:**

- All components compile after migration
- No circular imports
- Store subscriptions are more granular (fewer re-renders)
- `npm run typecheck` passes

**Risk Level:** High (touches many components)  
**Rollback:** Delete new stores, revert useAppStore

---

### PHASE 10 — Stabilization & Performance

**Objective:** Performance optimization and accessibility hardening.

**Prerequisites:** Phase 9 complete

**Deliverables:**

```
Performance:
  getSongsSummary() IPC for list views (no lyrics_raw)
  Migration 17 indexes applied
  Debounce theme IPC updates (300ms)
  Projection heartbeat reduced to 500ms

Accessibility:
  Keyboard navigation in song grids (↑↓ Enter)
  aria-live on toast notifications
  aria-busy on loading buttons
  Screen reader testing pass

Testing:
  Unit tests for all new stores
  Unit tests for new IPC handlers
  Integration tests for modal flows
  E2E test for song presentation workflow
```

**Success Criteria:**

- Management Mode renders 1000 songs in < 100ms
- All keyboard navigation works without mouse
- Screen reader announces state changes
- Test coverage > 60% for new code

**Risk Level:** Low  
**Rollback:** Revert performance changes individually

---

### PHASE 11 — Release Preparation

**Objective:** Production readiness validation and release.

**Prerequisites:** Phase 10 complete

**Deliverables:**

```
Production readiness checklist complete
All blockers resolved
Build validation passing
Installer tested on Windows
Auto-update configured
Release notes written
```

**Success Criteria:**

- All items in Production Readiness Matrix: ✅
- Zero critical bugs
- Zero projection regressions
- Build produces valid installer
- App starts cleanly on fresh Windows install

**Risk Level:** Low  
**Rollback:** Revert to previous release tag

---

## 1.3 Sprint Architecture

```
Sprint 0 (Phase 0):     Pre-flight safety infrastructure
Sprint 1 (Phase 1):     Infrastructure additions (additive only)
Sprint 2 (Phase 2):     Critical dead UI fixes
Sprint 3 (Phase 3):     Modal system foundation
Sprint 4 (Phase 4):     Projection runtime hardening
Sprint 5 (Phase 5):     Design system components
Sprint 6 (Phase 6):     Library Mode improvements
Sprint 7 (Phase 7):     Projection Mode improvements
Sprint 8 (Phase 8):     Management Mode improvements
Sprint 9 (Phase 9):     Store decomposition
Sprint 10 (Phase 10):   Stabilization + performance
Sprint 11 (Phase 11):   Release preparation
```

## 1.4 Milestone Architecture

```
Milestone 1 — Infrastructure Complete (after Sprint 1)
  All new stores, IPC channels, migrations operational
  Zero breaking changes to existing functionality

Milestone 2 — Dead UI Eliminated (after Sprint 3)
  All 10 dead UI issues fixed
  All critical modals operational
  No window.confirm() calls remain

Milestone 3 — Runtime Hardened (after Sprint 4)
  Projection runtime fully hardened
  Stage display confidence monitor operational
  Session auto-save working
  Per-mode error boundaries active

Milestone 4 — UI Modernized (after Sprint 8)
  All three modes fully modernized
  All missing modals implemented
  Design system components in use

Milestone 5 — Architecture Normalized (after Sprint 9)
  Store decomposition complete
  No circular dependencies
  All imports updated

Milestone 6 — Production Ready (after Sprint 11)
  All production readiness criteria met
  Release candidate validated
  v1.1.0 released
```

## 1.5 Critical Path

```
The critical path for production release:

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 11

Phases 5–10 are important but not on the critical path for v1.1.0.
They can be released as v1.2.0 and v1.3.0.

v1.1.0 scope (critical path only):
  - All dead UI fixed
  - All critical modals
  - Projection runtime hardened
  - Session recovery working

v1.2.0 scope:
  - UI modernization (Phases 5–8)
  - Performance improvements

v1.3.0 scope:
  - Store decomposition (Phase 9)
  - Advanced features (Bible projection, Announcements)
```

---

# PART 2: MIGRATION ARCHITECTURE

## 2.1 Component Migration Strategy

### 2.1.1 Atomic Component Migration

```
Migration approach: Parallel existence
  - New components created in design-system/
  - Old ad-hoc styles remain until component is adopted
  - Components adopted one page at a time
  - Old styles removed only after all usages migrated

Order:
  1. Button.tsx — most used, highest impact
  2. Input.tsx — forms everywhere
  3. Badge.tsx — status indicators
  4. SearchInput.tsx — 3 modes use search
  5. SegmentedControl.tsx — Library + Management tabs
  6. MetricCard.tsx — Management dashboard

Compatibility strategy:
  New components accept className prop for overrides
  Existing CSS classes remain valid during transition
  No forced migration — gradual adoption
```

### 2.1.2 Modal Migration

```
Migration approach: Replace window.confirm() first, then add new modals

Step 1: Mount ModalRegistry in App.tsx (zero visual change)
Step 2: Build Modal base + ConfirmDialog
Step 3: Replace window.confirm() calls one at a time
  - ManagementMode.tsx: handleDeleteSong → ConfirmDialog
  - ManagementMode.tsx: handleBulkDelete → ConfirmDialog
  - SettingsScreen.tsx: handleReseed → ConfirmDialog
  - LibraryMode: delete song → ConfirmDialog
Step 4: Build CreatePlaylistDialog
Step 5: Wire CreatePlaylistDialog to all entry points
Step 6: Build remaining modals in priority order

Rollback per step:
  Each step is independent
  Reverting one step doesn't affect others
  window.confirm() can be restored if modal fails
```

### 2.1.3 CSS Migration

```
Migration approach: Token-first, class-second

Step 1: Audit all hardcoded colors in main.css
  → Replace with CSS custom properties from @theme
  → No visual change (same values, different references)

Step 2: Add missing tokens
  → State colors (hover, active, selected)
  → Responsive tokens

Step 3: Add prefers-reduced-motion
  → CSS media query wrapping all animations
  → No visual change for standard users

Step 4: Standardize component classes
  → Ensure all .management-*, .library-pro-*, .song-studio-* use tokens
  → No visual change

Step 5: Add new component classes
  → .modal-*, .notification-*, .lower-third-*
  → New functionality only
```

---

## 2.2 State Migration Architecture

### 2.2.1 useAppStore Decomposition Migration

```
Current state: useAppStore owns songs, hymnals, screen routing,
               display state, toast, workspace, timer

Target state:
  useAppStore:    screen routing, toast, focus mode, loading
  useSongStore:   songs, selectedSong, editingSong, search, filter
  useHymnalStore: hymnals, selectedHymnalId
  useDisplayStore: displayCount, projectionVisible, stageVisible,
                   isMaximized, workspaceName, slideConfig

Migration phases:

Phase A — Create new stores (additive, zero breaking changes):
  Create useSongStore.ts with all song-related state
  Create useHymnalStore.ts with all hymnal-related state
  Create useDisplayStore.ts with all display-related state
  All new stores import from window.api directly

Phase B — Add re-exports to useAppStore (compatibility layer):
  useAppStore.songs → useSongStore.songs (re-export)
  useAppStore.hymnals → useHymnalStore.hymnals (re-export)
  useAppStore.displayCount → useDisplayStore.displayCount (re-export)
  All existing components continue to work unchanged

Phase C — Migrate components one at a time:
  Priority: components with most re-renders first
  ManagementMode.tsx: migrate to useSongStore + useHymnalStore
  LibraryMode.tsx: migrate to useSongStore + useHymnalStore
  ProjectionMode.tsx: migrate to useSongStore
  TitleBarStatus.tsx: migrate to useDisplayStore

Phase D — Remove re-exports from useAppStore:
  Only after ALL components migrated
  Run typecheck to verify no remaining usages
  Remove re-export code from useAppStore

Rollback per phase:
  Phase A: delete new store files
  Phase B: remove re-exports from useAppStore
  Phase C: revert individual component files
  Phase D: restore re-exports
```

### 2.2.2 Persistence Migration

```
Current persisted stores:
  useModeStore: localStorage 'sion-mode-storage'
  usePanelLayoutStore: localStorage 'sion-panel-layout'

New persisted stores:
  usePlaylistStore: localStorage 'sion-playlist-storage'
    → partialize: { _persistedActivePlaylistId }
  useServiceStore: localStorage 'sion-service-storage'
    → partialize: { timerElapsed, timerRunning }

Migration safety:
  New persistence keys don't conflict with existing
  If localStorage key missing: use default values (graceful)
  No migration needed for existing persisted data
```

### 2.2.3 Hydration Migration

```
Current hydration (useAppBootstrap.ts):
  loadSongs() → useAppStore.songs
  loadPlaylists() → usePlaylistStore.playlists
  getAll displays → useAppStore.displayCount

New hydration additions:
  getRecoveryState() → if needsRecovery: open CrashRecoveryDialog
  getStorageStats() → useDisplayStore.storageStats
  Restore activePlaylist from _persistedActivePlaylistId
  Load settings → useDisplayStore.slideConfig

Hydration order (must be sequential):
  1. Register command handlers + validators + metadata
  2. Init health monitor
  3. Load settings (needed for slideConfig)
  4. Load hymnals
  5. Load songs
  6. Load playlists
  7. Restore active playlist (needs playlists loaded)
  8. Get displays
  9. Check recovery state
  10. Set loading = false
```

---

## 2.3 IPC Migration Architecture

### 2.3.1 Channel Normalization

```
Deprecated channel (keep for backward compat):
  display_get-all → add alias display:get-all

New channels (additive):
  system:get-storage-stats
  db:duplicate-song
  confidence:update
  db:get-songs-summary

Migration strategy:
  1. Add new channel alongside old
  2. Update preload bridge to use new channel
  3. Keep old channel handler (backward compat)
  4. Remove old channel in v2.0 (not v1.x)

Compatibility bridge:
  Both display_get-all and display:get-all respond identically
  Renderer uses display:get-all (new)
  Old code using display_get-all still works
```

### 2.3.2 safeIpcHandle Rollout

```
Current state: safeIpcHandle used for destructive operations only
Target state: ALL ipcMain.handle calls use safeIpcHandle

Migration order (lowest risk first):
  1. Read-only channels (db:get-*, display:*, health:*)
  2. Write channels (db:add-*, db:update-*)
  3. Destructive channels (already wrapped)

Per-channel migration:
  Replace: ipcMain.handle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))
  With:    safeIpcHandle('db:get-songs', (hymnalId?: unknown) => {
             const id = typeof hymnalId === 'number' ? hymnalId : undefined
             return getSongs(id)
           })

Risk: Low — safeIpcHandle only adds error handling, doesn't change behavior
Rollback: Revert ipc-handlers.ts to previous version
```

---

## 2.4 Database Migration Architecture

### 2.4.1 Migration Safety Rules

```
All migrations MUST be:
  - Idempotent (safe to run multiple times)
  - Non-destructive (never DROP existing data)
  - Wrapped in db.transaction()
  - Tested on a copy of production DB before deploy

Migration 14 (service_state):
  CREATE TABLE IF NOT EXISTS service_state (...)
  INSERT OR IGNORE default values
  Risk: None (new table)

Migration 15 (song_notes):
  CREATE TABLE IF NOT EXISTS song_notes (...)
  Risk: None (new table)

Migration 16 (notifications):
  CREATE TABLE IF NOT EXISTS notifications (...)
  Risk: None (new table)

Migration 17 (indexes):
  CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC)
  CREATE INDEX IF NOT EXISTS idx_song_history_played_at ON song_history(played_at DESC)
  CREATE INDEX IF NOT EXISTS idx_custom_slides_type ON custom_slides(slide_type)
  CREATE INDEX IF NOT EXISTS idx_custom_slides_active ON custom_slides(is_active)
  Risk: None (indexes are additive, IF NOT EXISTS)
```

### 2.4.2 Backup Before Migration

```
Auto-backup strategy:
  On app startup, before running migrations:
  1. Check if any pending migrations exist
  2. If yes: create auto-backup to userData/backups/pre-migration-[timestamp].db
  3. Run migrations
  4. If migration fails: restore from pre-migration backup
  5. Log migration result

Implementation in initDatabase():
  const pendingCount = migrations.filter(m => m.version > getCurrentVersion(db)).length
  if (pendingCount > 0) {
    const backupPath = createBackup(`pre-migration-${Date.now()}.db`)
    console.log('[Migration] Pre-migration backup:', backupPath)
  }
  runMigrations(db)
```

---

## 2.5 Runtime Migration Architecture

### 2.5.1 Projection Engine Migration

```
Current: PresentationCanvas accepts SlideData | null
Target: PresentationCanvas accepts ProjectionPayload | null

Migration approach: Adapter pattern (zero breaking change)

Step 1: Define ProjectionPayload type (additive)
Step 2: Create adapter function:
  function slideDataToPayload(slide: SlideData | null): ProjectionPayload {
    return { type: 'song', slide, projectionState, background: resolvedAtmosphere }
  }
Step 3: PresentationCanvas accepts BOTH (union type):
  slide?: SlideData | null  (legacy)
  payload?: ProjectionPayload | null  (new)
  Internal: if payload provided, use payload; else use slide
Step 4: Migrate callers to use payload (one at a time)
Step 5: Remove legacy slide prop (v2.0 only)

Rollback: Remove payload prop, revert to slide-only
```

### 2.5.2 StageDisplayApp Migration

```
Current: Uses legacy projection:slide-update channel
Target: Uses confidence:update channel

Migration approach: Dual-channel support

Step 1: Add confidence:update listener (new)
Step 2: Keep projection:slide-update listener (legacy)
Step 3: Prefer confidence payload when available
Step 4: Fall back to legacy when confidence not available

Code:
  // New channel (preferred)
  const unsubscribeConfidence = window.api.confidence?.onUpdate((data) => {
    setPayload(data as ConfidencePayload)
  })

  // Legacy channel (fallback)
  const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
    if (!payload) buildPartialPayload(data)  // only if no confidence data
  })

Rollback: Remove confidence listener, keep legacy
```

---

# PART 3: COMPONENT DEPENDENCY MAP

## 3.1 Critical Dependency Graph

```
App.tsx (root)
  ├── REQUIRES: useAppStore, useModeStore
  ├── REQUIRES: useModalStore (Phase 1)
  ├── REQUIRES: useTimerTick hook (Phase 1)
  ├── RENDERS: TitleBar
  │   ├── REQUIRES: useAppStore, useModeStore, useProjectionStore
  │   ├── REQUIRES: useNotificationStore (Phase 1)
  │   └── RENDERS: TitleBarMenu, TitleBarModeSwitcher, TitleBarStatus, TitleBarControls
  ├── RENDERS: ModalRegistry
  │   ├── REQUIRES: useModalStore
  │   └── RENDERS: [all modal components]
  ├── RENDERS: Toast
  │   └── REQUIRES: useAppStore.toast
  ├── RENDERS: CommandPalette
  │   └── REQUIRES: commandBus.getPaletteCommands()
  └── RENDERS: Mode Content (AnimatePresence)
      ├── LibraryMode
      │   ├── REQUIRES: useSongStore (Phase 9) / useAppStore (current)
      │   ├── REQUIRES: useHymnalStore (Phase 9) / useAppStore (current)
      │   ├── REQUIRES: usePlaylistStore
      │   └── REQUIRES: useModalStore (for CreatePlaylistDialog)
      ├── ProjectionMode
      │   ├── REQUIRES: useProjectionStore (critical — never break)
      │   ├── REQUIRES: usePlaylistStore
      │   ├── REQUIRES: useAppStore
      │   ├── REQUIRES: useAtmosphereStore
      │   └── RENDERS: LivePreviewPanel → PresentationCanvas → AtmosphereRenderer
      └── ManagementMode
          ├── REQUIRES: useSongStore (Phase 9) / useAppStore (current)
          ├── REQUIRES: useHymnalStore (Phase 9) / useAppStore (current)
          └── REQUIRES: useModalStore (for DeleteConfirmDialog, SongRelationsModal)
```

## 3.2 Store Dependency Map

```
Store ownership rules (no store reads from another store):

useAppStore
  → owns: currentScreen, toast, isFocusMode, isLyricsFullscreen, isLoading
  → reads: window.api.songs, window.api.hymnals (IPC)
  → does NOT read: useProjectionStore, usePlaylistStore

useSongStore (Phase 9)
  → owns: songs[], selectedSong, editingSong, searchQuery, activeFilter
  → reads: window.api.songs (IPC)
  → does NOT read: useAppStore, useProjectionStore

useHymnalStore (Phase 9)
  → owns: hymnals[], selectedHymnalId
  → reads: window.api.hymnals (IPC)
  → does NOT read: any other store

useProjectionStore
  → owns: slides, programSlide, projectionState, programLockState, timer
  → reads: window.api.projection, window.api.settings (IPC)
  → does NOT read: useAppStore, usePlaylistStore
  → CRITICAL: never add cross-store reads here

usePlaylistStore
  → owns: playlists[], activePlaylist, playlistItems, activeItemIndex
  → reads: window.api.playlists (IPC)
  → does NOT read: useAppStore, useProjectionStore

useModeStore
  → owns: currentMode, theme, isFirstInstall
  → reads: window.api.system (IPC)
  → persisted: localStorage

usePanelLayoutStore
  → owns: panel sizes
  → reads: nothing (pure UI state)
  → persisted: localStorage

useModalStore (Phase 1)
  → owns: modal stack
  → reads: nothing (pure UI state)
  → NOT persisted

useServiceStore (Phase 1)
  → owns: timerElapsed, timerRunning
  → reads: nothing (pure UI state)
  → persisted: localStorage

useNotificationStore (Phase 1)
  → owns: notifications[]
  → reads: nothing (in-process events only)
  → NOT persisted

useHealthStore
  → owns: endpoint health map
  → reads: window.api.health (IPC)
  → NOT persisted

useAtmosphereStore
  → owns: liveOverride, globalConfig
  → reads: window.api.projection (IPC)
  → NOT persisted
```

## 3.3 IPC Dependency Map

```
Renderer → Preload Bridge → IPC Channel → Main Handler → DB Function

Critical projection path (must never fail):
  useProjectionStore.sendLiveSlide()
    → window.api.projection.slideUpdate()
    → IPC: projection:slide-update (ipcMain.on — fire-and-forget)
    → updateSlideData() → broadcast to projectionWindow

  useProjectionStore.clearScreen()
    → window.api.projection.stateChange('CLEAR')
    → IPC: projection:state-change (ipcMain.on — fire-and-forget)
    → updateProjectionState() → broadcast

Non-critical paths (can fail gracefully):
  window.api.songs.getAll() → db:get-songs → getSongs()
  window.api.playlists.getAll() → db:get-playlists → getPlaylists()
  window.api.settings.getAll() → db:get-settings → getSettings()

New paths (Phase 1):
  window.api.system.getStorageStats() → system:get-storage-stats → getStorageStats()
  window.api.songs.duplicate() → db:duplicate-song → duplicateSong()
  window.api.confidence.update() → confidence:update → stageWindow.send()
```

## 3.4 Modal Dependency Map

```
Modal dependencies (what each modal needs):

CreatePlaylistDialog
  → usePlaylistStore.createPlaylist() (action)
  → useModalStore.close() (to close itself)
  → No IPC directly (store handles IPC)

DeleteConfirmDialog
  → props.onConfirm() (callback from parent)
  → useModalStore.close()
  → No store dependencies

CrashRecoveryDialog
  → useAppStore.loadSongs()
  → usePlaylistStore.loadPlaylists(), setActivePlaylist(), loadPlaylistItems()
  → useProjectionStore.setSlides(), setCurrentSlideIndex()
  → window.api.system.markCleanExit()
  → useModalStore.close()

SongRelationsModal
  → window.api.songs.getRelations(songId)
  → window.api.songs.addRelation()
  → window.api.songs.deleteRelation()
  → useModalStore.close()

ImportProgressDialog
  → props.result: ImportSongsFromJsonResult (passed as prop)
  → useAppStore.loadSongs() (on close)
  → useModalStore.close()

Circular dependency check:
  ✅ No modal reads from useModalStore (only calls close())
  ✅ No modal creates another modal (parent handles chaining)
  ✅ No store reads from modal state
```

## 3.5 High-Risk Dependency Registry

```
RISK-001: useProjectionStore ← sendLiveSlide()
  Risk: Any change to sendLiveSlide() breaks live output
  Mitigation: Never modify sendLiveSlide() without projection test
  Test: Verify slide appears on projection window after change

RISK-002: PresentationCanvas ← AtmosphereRenderer
  Risk: AtmosphereRenderer crash blacks out projection
  Mitigation: ErrorBoundary around AtmosphereRenderer
  Test: Verify fallback renders when AtmosphereRenderer throws

RISK-003: useAppBootstrap ← registerCommandHandlers()
  Risk: Handler registration failure breaks all keyboard shortcuts
  Mitigation: try/catch around registration, log errors
  Test: Verify Space key works after bootstrap

RISK-004: migrations.ts ← initDatabase()
  Risk: Failed migration corrupts DB
  Mitigation: Pre-migration backup, transaction wrapping
  Test: Run migrations on copy of production DB

RISK-005: ipc-handlers.ts ← setupIPC()
  Risk: Handler registration failure breaks all IPC
  Mitigation: Each handler wrapped in safeIpcHandle
  Test: Verify each channel responds after change

RISK-006: useAppStore ← loadSongs()
  Risk: loadSongs() failure leaves app with empty song list
  Mitigation: Error caught, toast shown, empty state displayed
  Test: Verify empty state shows when DB unavailable
```

---

# PART 4: FEATURE COMPLETION TRACKING SYSTEM

## 4.1 Global Feature Registry

### Status Legend

```
✅ Complete — implemented and tested
⚠️ Partial — implemented but incomplete
❌ Missing — not implemented
🔴 Blocker — blocks other features
🟡 High — important, not blocking
🟠 Medium — nice to have
🟢 Low — future enhancement
```

## 4.2 Runtime Completion Matrix

| ID     | Feature                            | Status | Phase    | Risk   | Runtime Impact |
| ------ | ---------------------------------- | ------ | -------- | ------ | -------------- |
| RT-001 | RuntimeCommandBus                  | ✅     | —        | None   | Critical       |
| RT-002 | Command handlers (all types)       | ✅     | —        | None   | Critical       |
| RT-003 | Command validators (LIVE_LOCK)     | ✅     | —        | None   | Critical       |
| RT-004 | LIVE_LOCK / LIVE_DIRTY protection  | ✅     | —        | None   | Critical       |
| RT-005 | NEXT state computation             | ✅     | —        | None   | High           |
| RT-006 | Quick Jump (section map)           | ✅     | —        | None   | High           |
| RT-007 | Slide cache (hash-based)           | ✅     | —        | None   | High           |
| RT-008 | Timer tick interval                | ❌     | Phase 2  | Low    | Medium         |
| RT-009 | Timer controls in title bar        | ❌     | Phase 2  | Low    | Medium         |
| RT-010 | Next song preload pipeline         | ❌     | Phase 4  | Low    | High           |
| RT-011 | Slide config from settings         | ❌     | Phase 4  | Low    | Medium         |
| RT-012 | Confidence payload broadcast       | ❌     | Phase 4  | Low    | High           |
| RT-013 | StageDisplay confidence render     | ⚠️     | Phase 4  | Low    | High           |
| RT-014 | Auto session save (debounced)      | ❌     | Phase 4  | Low    | High           |
| RT-015 | MediaEngine LRU cache              | ❌     | Phase 4  | Medium | Medium         |
| RT-016 | Atmosphere resolution pipeline     | ⚠️     | Phase 4  | Medium | Medium         |
| RT-017 | Overlay engine (ProjectionPayload) | ❌     | Phase 7  | High   | High           |
| RT-018 | Per-mode ErrorBoundary             | ❌     | Phase 4  | Low    | Critical       |
| RT-019 | ProjectionMode fallback UI         | ❌     | Phase 4  | Low    | Critical       |
| RT-020 | Safe-mode startup                  | ❌     | Phase 10 | Low    | Medium         |

## 4.3 UI Completion Matrix

| ID     | Feature                       | Status | Phase   | Severity | UX Impact |
| ------ | ----------------------------- | ------ | ------- | -------- | --------- |
| UI-001 | Favorite button wire          | ❌     | Phase 2 | 🔴       | Critical  |
| UI-002 | New Playlist menu wire        | ❌     | Phase 2 | 🔴       | Critical  |
| UI-003 | Bible Screen access           | ❌     | Phase 2 | 🔴       | Critical  |
| UI-004 | Theme button wire             | ❌     | Phase 2 | 🟡       | High      |
| UI-005 | Notifications panel           | ❌     | Phase 7 | 🟡       | High      |
| UI-006 | Real storage metric           | ❌     | Phase 2 | 🔴       | Critical  |
| UI-007 | Real trend bars               | ❌     | Phase 7 | 🟡       | High      |
| UI-008 | Layout toggle                 | ❌     | Phase 7 | 🟠       | Medium    |
| UI-009 | Filter dropdown               | ❌     | Phase 7 | 🟠       | Medium    |
| UI-010 | Chord/Notes tabs              | ❌     | Phase 7 | 🟡       | High      |
| UI-011 | SongContextMenu               | ❌     | Phase 6 | 🟡       | High      |
| UI-012 | HymnalFilterDropdown          | ❌     | Phase 6 | 🟡       | High      |
| UI-013 | Drag-to-playlist              | ❌     | Phase 6 | 🟡       | High      |
| UI-014 | Multi-select in Library       | ❌     | Phase 6 | 🟠       | Medium    |
| UI-015 | Virtualize Management list    | ❌     | Phase 8 | 🟡       | High      |
| UI-016 | Virtualize Library title view | ❌     | Phase 6 | 🟠       | Medium    |
| UI-017 | Bible panel in Projection     | ❌     | Phase 7 | 🟡       | High      |
| UI-018 | Announcement panel            | ❌     | Phase 7 | 🟡       | High      |
| UI-019 | Media Library section         | ❌     | Phase 8 | 🟡       | High      |
| UI-020 | Custom Slides section         | ❌     | Phase 8 | 🟡       | High      |

## 4.4 Modal Completion Matrix

| ID     | Modal                | Status | Phase   | Priority | Backend |
| ------ | -------------------- | ------ | ------- | -------- | ------- |
| MM-001 | CreatePlaylistDialog | ❌     | Phase 3 | 🔴       | ✅      |
| MM-002 | DeleteConfirmDialog  | ❌     | Phase 3 | 🔴       | ✅      |
| MM-003 | CrashRecoveryDialog  | ❌     | Phase 3 | 🔴       | ✅      |
| MM-004 | SongRelationsModal   | ❌     | Phase 8 | 🟡       | ✅      |
| MM-005 | ImportProgressDialog | ❌     | Phase 8 | 🟡       | ✅      |
| MM-006 | IntegrityCheckDialog | ❌     | Phase 8 | 🟡       | ✅      |
| MM-007 | BiblePickerDialog    | ❌     | Phase 7 | 🟡       | ✅      |
| MM-008 | AnnouncementEditor   | ❌     | Phase 7 | 🟡       | ✅      |
| MM-009 | MediaImportDialog    | ❌     | Phase 8 | 🟡       | ✅      |
| MM-010 | DuplicateSongDialog  | ❌     | Phase 8 | 🟠       | ❌      |
| MM-011 | NotificationPanel    | ❌     | Phase 7 | 🟠       | ❌      |
| MM-012 | FilterDropdown       | ❌     | Phase 7 | 🟠       | ✅      |
| MM-013 | PlaylistPickerDialog | ❌     | Phase 3 | 🟡       | ✅      |
| MM-014 | BackupProgressDialog | ❌     | Phase 8 | 🟠       | ✅      |
| MM-015 | StorageStatsDialog   | ❌     | Phase 8 | 🟠       | ❌      |

## 4.5 IPC Completion Matrix

| Channel                    | Status         | Action                      | Phase    | Risk |
| -------------------------- | -------------- | --------------------------- | -------- | ---- |
| `display_get-all`          | ⚠️ Naming      | Add alias `display:get-all` | Phase 1  | Low  |
| `system:get-storage-stats` | ❌ Missing     | Add new handler             | Phase 1  | Low  |
| `db:duplicate-song`        | ❌ Missing     | Add new handler + DB fn     | Phase 1  | Low  |
| `confidence:update`        | ❌ Missing     | Add new handler             | Phase 1  | Low  |
| `db:get-songs-summary`     | ❌ Missing     | Add lightweight query       | Phase 10 | Low  |
| All `ipcMain.handle` reads | ⚠️ Unvalidated | Wrap in safeIpcHandle       | Phase 10 | Low  |

## 4.6 Store Migration Matrix

| Store                | Current State       | Target State                  | Phase   | Risk   |
| -------------------- | ------------------- | ----------------------------- | ------- | ------ |
| useAppStore          | Too broad           | Reduced scope                 | Phase 9 | High   |
| useSongStore         | ❌ Missing          | Extract from useAppStore      | Phase 9 | High   |
| useHymnalStore       | ❌ Missing          | Extract from useAppStore      | Phase 9 | High   |
| useDisplayStore      | ❌ Missing          | Extract from useAppStore      | Phase 9 | Medium |
| usePlaylistStore     | No persistence      | Add activePlaylist persist    | Phase 1 | Low    |
| useProjectionStore   | Timer not persisted | Move timer to useServiceStore | Phase 1 | Low    |
| usePanelLayoutStore  | 2-panel only        | Extend to 3-panel             | Phase 1 | Low    |
| useModalStore        | ❌ Missing          | Create new                    | Phase 1 | Low    |
| useServiceStore      | ❌ Missing          | Create new                    | Phase 1 | Low    |
| useNotificationStore | ❌ Missing          | Create new                    | Phase 1 | Low    |

## 4.7 Accessibility Completion Matrix

| Item                          | Status      | Priority | Phase    |
| ----------------------------- | ----------- | -------- | -------- |
| aria-label on icon buttons    | ⚠️ Partial  | 🟡       | Phase 5  |
| Focus ring on all interactive | ⚠️ Partial  | 🟡       | Phase 5  |
| prefers-reduced-motion        | ❌ Missing  | 🟡       | Phase 5  |
| Focus trap in modals          | ❌ Missing  | 🔴       | Phase 3  |
| Escape closes modals          | ❌ Missing  | 🔴       | Phase 3  |
| Keyboard nav in song grids    | ❌ Missing  | 🟡       | Phase 10 |
| role="dialog" on modals       | ❌ Missing  | 🔴       | Phase 3  |
| aria-live on toast            | ❌ Missing  | 🟡       | Phase 5  |
| aria-busy on loading buttons  | ❌ Missing  | 🟠       | Phase 5  |
| Screen reader testing         | ❌ Not done | 🟠       | Phase 10 |

## 4.8 Performance Completion Matrix

| Item                          | Status     | Priority | Phase    |
| ----------------------------- | ---------- | -------- | -------- |
| Virtualize Management list    | ❌ Missing | 🟡       | Phase 8  |
| Virtualize Library title view | ❌ Missing | 🟠       | Phase 6  |
| Memoize SongRow               | ❌ Missing | 🟡       | Phase 8  |
| MediaEngine LRU eviction      | ❌ Missing | 🟡       | Phase 4  |
| Debounce theme IPC            | ❌ Missing | 🟠       | Phase 10 |
| getSongsSummary (no lyrics)   | ❌ Missing | 🟠       | Phase 10 |
| Migration 17 indexes          | ❌ Missing | 🟠       | Phase 1  |
| Projection heartbeat 500ms    | ❌ Missing | 🟠       | Phase 4  |
| Slide config from settings    | ❌ Missing | 🟡       | Phase 4  |
| Auto-backup on startup        | ❌ Missing | 🟠       | Phase 1  |

## 4.9 Production Readiness Matrix

| Category      | Items  | Complete     | Blockers                       |
| ------------- | ------ | ------------ | ------------------------------ |
| Runtime       | 20     | 7            | RT-008, RT-018, RT-019         |
| UI            | 20     | 0            | UI-001, UI-002, UI-003, UI-006 |
| Modals        | 15     | 0            | MM-001, MM-002, MM-003         |
| IPC           | 6      | 0            | None (all additive)            |
| Stores        | 10     | 4            | None (all additive)            |
| Accessibility | 10     | 0            | MM-002 focus trap              |
| Performance   | 10     | 0            | None (all optional for v1.1)   |
| **Total**     | **91** | **11 (12%)** | **7 blockers**                 |

**v1.1.0 Blockers (must fix before release):**

1. UI-001: Favorite button (DUI-001)
2. UI-002: New Playlist menu (DUI-002)
3. UI-003: Bible Screen access (DUI-003)
4. UI-006: Real storage metric (DUI-006)
5. MM-001: CreatePlaylistDialog
6. MM-002: DeleteConfirmDialog (replaces window.confirm)
7. MM-003: CrashRecoveryDialog
8. RT-018: Per-mode ErrorBoundary
9. RT-019: ProjectionMode fallback UI

---

# PART 5: REFACTOR SAFETY SYSTEM

## 5.1 Rollback System

### 5.1.1 Git Branch Strategy

```
Branch structure:
  main              ← production releases only
  develop           ← integration branch
  feature/phase-1   ← Phase 1 infrastructure
  feature/phase-2   ← Phase 2 dead UI fixes
  feature/phase-3   ← Phase 3 modal system
  feature/phase-4   ← Phase 4 projection hardening
  hotfix/*          ← emergency fixes to main

Merge strategy:
  feature/* → develop (PR with review)
  develop → main (release only, after full validation)
  hotfix/* → main + develop (emergency)

Rollback procedure:
  If a phase introduces regression:
  1. git revert [merge commit] on develop
  2. Previous phase remains intact
  3. Investigate root cause
  4. Fix in new branch
  5. Re-merge after fix validated
```

### 5.1.2 Feature-Level Rollback

```
Each feature is a single commit or small commit group.
Rollback = git revert [commit hash]

High-risk features with explicit rollback plan:

DUI-001 (favorite button):
  Rollback: revert LibraryModeRedesigned.tsx
  Impact: favorite button returns to no-op
  Risk: None to projection

Modal system:
  Rollback: remove ModalRegistry from App.tsx, delete modal files
  Impact: window.confirm() restored
  Risk: None to projection

Store decomposition (Phase 9):
  Rollback: delete new stores, restore useAppStore re-exports
  Impact: returns to current state
  Risk: None to projection

Projection hardening (Phase 4):
  Rollback: revert individual files
  Impact: returns to current projection behavior
  Risk: Low (hardening is additive)
```

### 5.1.3 Database Rollback

```
Migrations are non-destructive (IF NOT EXISTS, no DROP).
Rollback strategy: restore from pre-migration backup.

Pre-migration backup created automatically before any migration run.
Backup location: userData/backups/pre-migration-[timestamp].db

Manual rollback procedure:
  1. Close SION Media
  2. Copy pre-migration backup to userData/sion.db
  3. Revert migrations.ts to previous version
  4. Restart SION Media

Note: Migrations 14-17 only add tables/indexes.
Rollback is safe — no data loss.
```

---

## 5.2 Feature Flag System

### 5.2.1 Feature Flag Architecture

```typescript
// src/renderer/src/utils/featureFlags.ts

export const FEATURE_FLAGS = {
  // Phase 1 features
  MODAL_SYSTEM: true, // useModalStore + ModalRegistry
  SERVICE_STORE: true, // useServiceStore (timer persistence)
  NOTIFICATION_STORE: true, // useNotificationStore

  // Phase 4 features
  NEXT_SONG_PRELOAD: true, // auto-preload next song
  CONFIDENCE_BROADCAST: true, // confidence:update IPC
  MEDIA_ENGINE_LRU: true, // LRU cache in mediaEngine

  // Phase 6-8 features (UI)
  LIBRARY_CONTEXT_MENU: false, // right-click context menu
  LIBRARY_DRAG_DROP: false, // drag song to playlist
  PROJECTION_BIBLE_PANEL: false, // Bible tab in Projection Mode
  PROJECTION_ANNOUNCE_PANEL: false, // Announcement tab

  // Phase 9 features (store decomposition)
  SONG_STORE_DECOMPOSED: false, // useSongStore active
  HYMNAL_STORE_DECOMPOSED: false, // useHymnalStore active

  // Experimental
  OVERLAY_ENGINE: false, // ProjectionPayload system
  SAFE_MODE_STARTUP: false // crash-count safe mode
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}
```

### 5.2.2 Feature Flag Usage

```typescript
// In components:
import { isEnabled } from '../utils/featureFlags'

// Conditional rendering:
{isEnabled('LIBRARY_CONTEXT_MENU') && (
  <SongContextMenu ... />
)}

// Conditional behavior:
const handleSelect = useCallback((song: Song) => {
  if (isEnabled('NEXT_SONG_PRELOAD')) {
    scheduleNextSongPreload(index + 1)
  }
  setSelectedSong(song)
}, [])
```

### 5.2.3 Runtime Flags (Projection-Specific)

```typescript
// Projection runtime flags — never change during live service
export const PROJECTION_FLAGS = {
  // Safety: disable features that could affect live output
  DISABLE_ATMOSPHERE_TRANSITIONS: false, // for low-end hardware
  FORCE_FAST_CUT: false, // emergency: all transitions = cut
  DISABLE_MOTION_BACKGROUNDS: false, // for LED walls
  SAFE_FONT_ONLY: false // use system font only
} as const

// These flags are read ONCE at app startup and never change
// Changing them requires app restart
```

---

## 5.3 Safe Deployment System

### 5.3.1 Staged Rollout

```
Stage 1 — Internal (developer machines):
  Full feature set enabled
  All feature flags: true
  Aggressive testing

Stage 2 — Alpha (trusted operators):
  Feature flags: Phase 1-4 enabled, Phase 5-9 disabled
  Feedback collection
  Bug reports prioritized

Stage 3 — Beta (wider operator group):
  Feature flags: Phase 1-8 enabled, Phase 9 disabled
  Performance monitoring
  Crash telemetry active

Stage 4 — Stable (all users):
  All Phase 1-11 features enabled
  Auto-update active
  Monitoring active
```

### 5.3.2 Shadow Runtime Validation

```
Before deploying projection changes:
  1. Run shadow mode: new code runs alongside old code
  2. Compare outputs: new vs old projection state
  3. If outputs match: deploy new code
  4. If outputs differ: investigate before deploy

Shadow mode implementation:
  // In useProjectionStore (temporary, for validation only):
  if (SHADOW_MODE) {
    const oldResult = oldGoToSlide(index)
    const newResult = newGoToSlide(index)
    if (oldResult !== newResult) {
      logger.warn('[Shadow] Projection state mismatch:', { old: oldResult, new: newResult })
    }
  }
```

### 5.3.3 Dual-System Validation

```
For IPC channel changes:
  1. Add new channel alongside old
  2. Both channels active simultaneously
  3. Renderer uses new channel
  4. Old channel still responds (backward compat)
  5. Monitor: if new channel fails, old channel is fallback
  6. After 2 weeks stable: remove old channel

For store decomposition:
  1. New store created
  2. useAppStore re-exports from new store
  3. Both paths active simultaneously
  4. Monitor for re-render regressions
  5. After validation: remove re-exports
```

---

## 5.4 Validation Gates

### 5.4.1 Pre-Merge Validation

```
Required before any PR merge to develop:

Automated (CI):
  □ npm run typecheck — zero errors
  □ npm run lint — zero errors
  □ npm run test — all tests pass
  □ npm run build — build succeeds

Manual (developer):
  □ App starts without errors
  □ Projection Mode: Space key works
  □ Projection Mode: B key works
  □ Projection Mode: Esc key works
  □ No console errors in normal operation
```

### 5.4.2 Projection Validation Gate

```
Required before any merge that touches projection-related files:
  (LivePreviewPanel, PresentationCanvas, useProjectionStore,
   runtimeCommandBus, runtimeCommandHandlers, ipc-handlers, windows.ts)

Manual test sequence:
  1. Open app → Projection Mode
  2. Select a song → verify slides load in preview
  3. Press Space → verify LIVE state, red border on program monitor
  4. Press → → verify next slide
  5. Press ← → verify previous slide
  6. Press B → verify black screen
  7. Press B again → verify returns to LIVE
  8. Press F → verify freeze
  9. Press F again → verify returns to LIVE
  10. Press Esc → verify CLEAR state
  11. Verify projection window shows correct content throughout
  12. Verify stage display shows correct content throughout

All 12 steps must pass before merge.
```

### 5.4.3 Runtime Stability Gate

```
Required before any release:
  App runs for 30 minutes in Projection Mode without:
  □ Memory leak (memory < 200MB throughout)
  □ CPU spike > 50% during normal operation
  □ Any unhandled exceptions in console
  □ Any IPC errors
  □ Any projection state corruption
  □ Any slide navigation failures
```

---

# PART 6: TESTING ARCHITECTURE

## 6.1 Current Testing Infrastructure

```
Test runner: Vitest 3.2.4 (confirmed from package.json)
Config: vitest.config.ts — environment: 'node', include: 'src/**/*.test.ts'
Existing tests: src/main/database.test.ts (2 tests for filterAllowedUpdateEntries)

Gaps:
  - No renderer tests (environment is 'node', not 'jsdom')
  - No store tests
  - No IPC handler tests
  - No component tests
  - No integration tests
  - No E2E tests
```

## 6.2 Testing Infrastructure Setup

### 6.2.1 Vitest Configuration Extension

```typescript
// vitest.config.ts — extended
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Node tests (main process, database)
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts']
        }
      },
      // Renderer tests (stores, components, utilities)
      {
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
          setupFiles: ['src/renderer/src/test-utils/setup.ts'],
          globals: true
        },
        resolve: {
          alias: {
            '@renderer': resolve('src/renderer/src')
          }
        }
      }
    ]
  }
})
```

### 6.2.2 Test Utilities

```typescript
// src/renderer/src/test-utils/setup.ts
import '@testing-library/jest-dom'

// Mock window.api (IPC bridge)
global.window = {
  ...global.window,
  api: {
    songs: {
      getAll: vi.fn().mockResolvedValue([]),
      search: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(true),
      toggleFavorite: vi.fn().mockResolvedValue({})
    },
    playlists: {
      getAll: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ id: 1 }),
      getItems: vi.fn().mockResolvedValue([])
    },
    settings: {
      getAll: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue(undefined)
    },
    projection: {
      slideUpdate: vi.fn(),
      stateChange: vi.fn(),
      themeUpdate: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      onSlideUpdate: vi.fn().mockReturnValue(() => {}),
      onStateChange: vi.fn().mockReturnValue(() => {}),
      onThemeUpdate: vi.fn().mockReturnValue(() => {})
    },
    system: {
      logHistory: vi.fn().mockResolvedValue(undefined),
      markCleanExit: vi.fn().mockResolvedValue(undefined),
      getRecoveryState: vi.fn().mockResolvedValue({ needsRecovery: false })
    },
    display: {
      getAll: vi.fn().mockResolvedValue([{ id: 1, isPrimary: true }]),
      onDisplayChanged: vi.fn().mockReturnValue(() => {})
    },
    health: {
      sendHeartbeat: vi.fn(),
      getStatus: vi.fn().mockResolvedValue([]),
      onStatusUpdate: vi.fn().mockReturnValue(() => {}),
      onHeartbeatAck: vi.fn().mockReturnValue(() => {})
    },
    hymnals: {
      getAll: vi.fn().mockResolvedValue([])
    }
  }
}
```

---

## 6.3 Unit Testing Strategy

### 6.3.1 Store Tests

```typescript
// src/renderer/src/store/useProjectionStore.test.ts

describe('useProjectionStore', () => {
  beforeEach(() => {
    useProjectionStore.setState({
      slides: [],
      programSlide: null,
      programSlides: [],
      programSlideIndex: -1,
      currentSlideIndex: 0,
      projectionState: 'CLEAR',
      programLockState: 'UNLOCKED',
      pendingChanges: [],
      hasPendingLiveChanges: false
    })
  })

  describe('goToSlide', () => {
    it('sets LIVE state and LIVE_LOCK when going to slide', () => {
      const slides = [mockSlide(0), mockSlide(1), mockSlide(2)]
      useProjectionStore.getState().setSlides(slides, mockMeta)
      useProjectionStore.getState().goToSlide(0)

      const state = useProjectionStore.getState()
      expect(state.projectionState).toBe('LIVE')
      expect(state.programLockState).toBe('LIVE_LOCK')
      expect(state.programSlide?.slideIndex).toBe(0)
      expect(window.api.projection.stateChange).toHaveBeenCalledWith('LIVE')
      expect(window.api.projection.slideUpdate).toHaveBeenCalled()
    })

    it('does not go to invalid slide index', () => {
      useProjectionStore.getState().setSlides([mockSlide(0)], mockMeta)
      useProjectionStore.getState().goToSlide(99)

      expect(useProjectionStore.getState().projectionState).toBe('CLEAR')
    })
  })

  describe('toggleBlack', () => {
    it('toggles between BLACK and LIVE', () => {
      const slides = [mockSlide(0)]
      useProjectionStore.getState().setSlides(slides, mockMeta)
      useProjectionStore.getState().goToSlide(0)

      useProjectionStore.getState().toggleBlack()
      expect(useProjectionStore.getState().projectionState).toBe('BLACK')

      useProjectionStore.getState().toggleBlack()
      expect(useProjectionStore.getState().projectionState).toBe('LIVE')
    })
  })

  describe('LIVE_LOCK protection', () => {
    it('marks dirty when editing while LIVE_LOCK', () => {
      const slides = [mockSlide(0), mockSlide(1)]
      useProjectionStore.getState().setSlides(slides, mockMeta)
      useProjectionStore.getState().goToSlide(0)

      // Simulate lyrics edit
      const newSlides = [mockSlide(0, 'edited text'), mockSlide(1)]
      useProjectionStore.getState().hotSwapSlides(0, newSlides)

      expect(useProjectionStore.getState().programLockState).toBe('LIVE_DIRTY')
      expect(useProjectionStore.getState().hasPendingLiveChanges).toBe(true)
    })
  })

  describe('clearScreen', () => {
    it('sets CLEAR state and UNLOCKED', () => {
      useProjectionStore.getState().setSlides([mockSlide(0)], mockMeta)
      useProjectionStore.getState().goToSlide(0)
      useProjectionStore.getState().clearScreen()

      expect(useProjectionStore.getState().projectionState).toBe('CLEAR')
      expect(useProjectionStore.getState().programLockState).toBe('UNLOCKED')
    })
  })
})
```

### 6.3.2 RuntimeCommandBus Tests

```typescript
// src/renderer/src/utils/runtimeCommandBus.test.ts

describe('RuntimeCommandBus', () => {
  let bus: RuntimeCommandBus

  beforeEach(() => {
    bus = new RuntimeCommandBus()
  })

  it('executes registered handler', () => {
    const handler = vi.fn().mockReturnValue({ success: true })
    bus.registerHandler('PROJ_BLACK', handler)

    const result = bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))
    expect(result.status).toBe('SUCCESS')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('throttles rapid same-source commands', () => {
    const handler = vi.fn().mockReturnValue({ success: true })
    bus.registerHandler('PROJ_BLACK', handler)

    bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))
    const result = bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))

    expect(result.status).toBe('BLOCKED')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('rejects command with no handler', () => {
    const result = bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))
    expect(result.status).toBe('ERROR')
    expect(result.error).toContain('No handler registered')
  })

  it('blocks reentrant execution', () => {
    let innerResult: RuntimeEvent | null = null
    bus.registerHandler('PROJ_BLACK', () => {
      // Try to execute another command while this one is running
      innerResult = bus.execute(bus.createCommand('PROJ_CLEAR', undefined, 'KEYBOARD'))
      return { success: true }
    })
    bus.registerHandler('PROJ_CLEAR', () => ({ success: true }))

    bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))
    expect(innerResult?.status).toBe('BLOCKED')
  })
})
```

### 6.3.3 SlideEngine Tests

```typescript
// src/renderer/src/engine/slideEngine.test.ts

describe('slideEngine', () => {
  describe('generateSlides', () => {
    it('generates slides from simple lyrics', () => {
      const lyrics = '[Verse 1]\nLine 1\nLine 2\nLine 3\nLine 4'
      const slides = generateSlides(1, lyrics)

      expect(slides).toHaveLength(1)
      expect(slides[0].sectionLabel).toBe('Verse 1')
      expect(slides[0].text).toContain('Line 1')
    })

    it('splits long sections into multiple slides', () => {
      const lyrics = '[Verse 1]\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6'
      const slides = generateSlides(1, lyrics, { maxLines: 4 })

      expect(slides.length).toBeGreaterThan(1)
    })

    it('returns empty array for empty lyrics', () => {
      expect(generateSlides(1, '')).toHaveLength(0)
      expect(generateSlides(1, '   ')).toHaveLength(0)
    })

    it('caches results by song id + hash', () => {
      const lyrics = 'Test lyrics'
      const slides1 = generateSlides(1, lyrics)
      const slides2 = generateSlides(1, lyrics)
      expect(slides1).toBe(slides2) // same reference
    })

    it('invalidates cache when lyrics change', () => {
      const slides1 = generateSlides(1, 'Original lyrics')
      const slides2 = generateSlides(1, 'Changed lyrics')
      expect(slides1).not.toBe(slides2)
    })
  })

  describe('buildSectionIndexMap', () => {
    it('maps section labels to slide indices', () => {
      const slides = [
        { sectionLabel: 'Verse 1', slideIndex: 0, text: '', songId: 1 },
        { sectionLabel: 'Chorus', slideIndex: 1, text: '', songId: 1 },
        { sectionLabel: 'Verse 2', slideIndex: 2, text: '', songId: 1 },
        { sectionLabel: 'Chorus', slideIndex: 3, text: '', songId: 1 }
      ]
      const map = buildSectionIndexMap(slides)

      expect(map['verse 1']).toEqual([0])
      expect(map['chorus']).toEqual([1, 3])
      expect(map['verse 2']).toEqual([2])
    })
  })
})
```

---

## 6.4 Integration Testing Strategy

### 6.4.1 Modal Flow Integration Tests

```typescript
// src/renderer/src/components/modals/CreatePlaylistDialog.test.tsx

describe('CreatePlaylistDialog', () => {
  it('creates playlist and closes on submit', async () => {
    const mockCreate = vi.fn().mockResolvedValue(undefined)
    vi.mocked(usePlaylistStore.getState).mockReturnValue({
      createPlaylist: mockCreate,
      playlists: [],
    })

    render(<CreatePlaylistDialog isOpen={true} onClose={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Nama Playlist'), 'Ibadah Minggu')
    await userEvent.click(screen.getByRole('button', { name: 'Buat Playlist' }))

    expect(mockCreate).toHaveBeenCalledWith('Ibadah Minggu', expect.any(String))
  })

  it('shows validation error for empty name', async () => {
    render(<CreatePlaylistDialog isOpen={true} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Buat Playlist' }))

    expect(screen.getByText(/nama playlist wajib diisi/i)).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    const onClose = vi.fn()
    render(<CreatePlaylistDialog isOpen={true} onClose={onClose} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
```

### 6.4.2 Projection Synchronization Integration Tests

```typescript
// src/renderer/src/store/projectionSync.test.ts

describe('Projection synchronization', () => {
  it('broadcasts slide update to IPC on goToSlide', () => {
    const store = useProjectionStore.getState()
    store.setSlides([mockSlide(0), mockSlide(1)], mockMeta)
    store.goToSlide(0)

    expect(window.api.projection.stateChange).toHaveBeenCalledWith('LIVE')
    expect(window.api.projection.slideUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ slideIndex: 0 })
    )
  })

  it('does not broadcast when LIVE_LOCK and hotSwap called', () => {
    const store = useProjectionStore.getState()
    store.setSlides([mockSlide(0)], mockMeta)
    store.goToSlide(0) // sets LIVE_LOCK

    vi.clearAllMocks()
    store.hotSwapSlides(0, [mockSlide(0, 'edited')])

    // Should NOT broadcast — changes are pending
    expect(window.api.projection.slideUpdate).not.toHaveBeenCalled()
    expect(store.programLockState).toBe('LIVE_DIRTY')
  })
})
```

---

## 6.5 End-to-End Testing Strategy

### 6.5.1 Operator Workflow E2E Tests

```
E2E tests use Playwright with Electron support.
These are manual-first, automated later.

Test: Song Presentation Workflow
  1. Launch app
  2. Verify Projection Mode loads
  3. Search for song "Tuhan Yesus"
  4. Click song → verify preview loads
  5. Press Space → verify LIVE state
  6. Press → → verify next slide
  7. Press B → verify BLACK state
  8. Press B → verify returns to LIVE
  9. Press Esc → verify CLEAR state
  Expected: All steps complete without error

Test: Playlist Creation Workflow
  1. Launch app
  2. Press Ctrl+N → verify CreatePlaylistDialog opens
  3. Type "Ibadah Minggu 18 Mei"
  4. Click "Buat Playlist"
  5. Verify playlist appears in sidebar
  6. Search song → right-click → "Add to Playlist"
  7. Verify song appears in playlist
  Expected: Playlist created with song

Test: Crash Recovery Workflow
  1. Launch app
  2. Load a song, go LIVE
  3. Simulate crash (kill renderer process)
  4. Relaunch app
  5. Verify CrashRecoveryDialog appears
  6. Click "Pulihkan Session"
  7. Verify song and slide restored
  Expected: Session fully restored
```

---

## 6.6 Multi-Window Testing

### 6.6.1 Projection Window Tests

```
Manual test sequence (run before every release):

Test 1: Projection window appears on external display
  Setup: Connect external monitor
  Action: Open Projection Mode → click "Show Projection"
  Expected: Projection window appears on external display

Test 2: Slide content appears on projection window
  Action: Select song → press Space
  Expected: Lyrics appear on projection window

Test 3: Projection window reconnects after disconnect
  Action: Disconnect external monitor → reconnect
  Expected: Projection window moves to external display
  Expected: Current slide content restored (snapshot sent)

Test 4: Stage display shows correct content
  Action: Open Stage Display → select song → go LIVE
  Expected: Stage display shows current slide + next slide

Test 5: DPI mismatch handling
  Setup: Primary 100% DPI, external 150% DPI
  Action: Project slides
  Expected: Text renders correctly on both displays
```

---

## 6.7 Performance Testing

### 6.7.1 Render Performance Tests

```
Test: Management Mode with 1000 songs
  Setup: DB with 1000 songs
  Action: Open Management Mode
  Measure: Time to first render
  Target: < 500ms
  Method: performance.now() before/after render

Test: Library Mode search
  Setup: DB with 1000 songs
  Action: Type "Tuhan" in search
  Measure: Time from keypress to results
  Target: < 100ms (FTS5 query)
  Method: console.time() in searchSongs()

Test: Slide generation
  Setup: Song with 50 verses
  Action: generateSlidesForSong(song)
  Measure: Time to generate
  Target: < 50ms
  Method: performance.now()

Test: Memory after 30 minutes
  Setup: Normal operation for 30 minutes
  Measure: window.performance.memory.usedJSHeapSize
  Target: < 200MB
  Method: Log every 5 minutes
```

### 6.7.2 IPC Throughput Tests

```
Test: Rapid slide navigation
  Action: Press → 100 times in 10 seconds
  Measure: All slides render correctly
  Target: No dropped frames, no IPC errors
  Method: Monitor console for errors

Test: Concurrent IPC calls
  Action: Load songs + load playlists + get settings simultaneously
  Measure: All calls complete successfully
  Target: No race conditions, no errors
  Method: Promise.all() with timing
```

---

# PART 7: RELEASE + DEPLOYMENT ARCHITECTURE

## 7.1 Release Channel Architecture

### 7.1.1 Channel Definitions

```
INTERNAL (developer builds):
  Audience:   Development team only
  Trigger:    Every commit to develop branch
  Build:      electron-vite build (no signing)
  Installer:  build:unpack (directory, not installer)
  Testing:    Full feature flags enabled
  Monitoring: Console logs only

ALPHA (trusted operators):
  Audience:   5-10 trusted worship operators
  Trigger:    Manual, after Milestone 2 (Dead UI Eliminated)
  Build:      npm run build:win (signed NSIS installer)
  Installer:  SION Media Setup [version]-alpha.exe
  Testing:    Phase 1-4 features enabled
  Monitoring: Crash telemetry + manual feedback

BETA (wider operator group):
  Audience:   20-50 operators across multiple churches
  Trigger:    Manual, after Milestone 4 (UI Modernized)
  Build:      npm run build:win (signed)
  Installer:  SION Media Setup [version]-beta.exe
  Testing:    Phase 1-8 features enabled
  Monitoring: Full telemetry + performance monitoring

STABLE (all users):
  Audience:   All users via auto-update
  Trigger:    Manual, after Milestone 6 (Production Ready)
  Build:      npm run build:win (signed, notarized)
  Installer:  SION Media Setup [version].exe
  Testing:    All features enabled
  Monitoring: Full telemetry + crash reporting

EMERGENCY HOTFIX:
  Audience:   All users (immediate)
  Trigger:    Critical projection bug or data loss bug
  Build:      npm run build:win (expedited)
  Process:    hotfix/* → main (skip develop)
  Testing:    Projection validation gate only
  Monitoring: Immediate post-deploy monitoring
```

### 7.1.2 Version Numbering

```
Format: MAJOR.MINOR.PATCH[-channel]

Current: 1.0.0
v1.1.0:  Milestone 2 (Dead UI + Modals + Projection hardening)
v1.2.0:  Milestone 4 (UI Modernization)
v1.3.0:  Milestone 5 (Store Decomposition)
v2.0.0:  Overlay engine + Bible projection + Announcements

Hotfix:  1.1.1, 1.1.2, etc.

Channel suffixes:
  1.1.0-alpha.1
  1.1.0-beta.1
  1.1.0 (stable, no suffix)
```

---

## 7.2 Deployment Flow

### 7.2.1 Build Validation Pipeline

```
Step 1: Pre-build validation
  npm run typecheck     → must pass (zero errors)
  npm run lint          → must pass (zero errors)
  npm run test          → must pass (all tests green)

Step 2: Build
  npm run build         → electron-vite build
  Artifacts: out/main/, out/preload/, out/renderer/

Step 3: Package
  electron-builder --win
  Artifacts: dist/SION Media Setup [version].exe
             dist/latest.yml (auto-update manifest)

Step 4: Runtime validation (manual)
  Install on clean Windows machine
  Run projection validation gate (12-step sequence)
  Verify auto-update manifest is correct

Step 5: Sign and publish
  Code signing (Windows Authenticode)
  Upload to update server
  Update latest.yml on update channel

Step 6: Monitor
  Watch crash telemetry for 24 hours
  Watch performance metrics
  Ready to hotfix if needed
```

### 7.2.2 Migration Validation

```
Before each release, validate migrations on production DB copy:

1. Copy production sion.db to test environment
2. Run new version of app against copy
3. Verify migrations apply cleanly
4. Verify all data intact after migration
5. Verify app functions correctly with migrated DB
6. If any issue: fix migration before release

Migration test checklist:
  □ Migration applies without error
  □ All existing songs present after migration
  □ All existing playlists present
  □ All existing settings present
  □ New tables/indexes created correctly
  □ App starts and loads data correctly
```

---

## 7.3 Update System

### 7.3.1 Auto-Update Architecture

```
electron-builder provides auto-update via electron-updater.
Current config in electron-builder.yml:
  target: nsis (Windows)
  output: dist/

Auto-update flow:
  1. App starts → check for updates (background)
  2. Update available → notify user (non-blocking)
  3. User clicks "Update" → download in background
  4. Download complete → prompt restart
  5. User restarts → installer runs silently
  6. New version starts

Update notification UI:
  Toast: "Update tersedia: v1.1.0 — [Download]"
  After download: "Update siap dipasang — [Restart Sekarang]"
  Non-blocking: operator can dismiss and update later

Critical rule: NEVER force-restart during live presentation
  Check: if projectionState === 'LIVE' → defer update notification
  Show notification only when projectionState === 'CLEAR'
```

### 7.3.2 Update Recovery

```
Failed update scenarios:

Scenario 1: Download fails
  → Retry automatically (3 attempts, exponential backoff)
  → If all fail: show error toast, continue with current version

Scenario 2: Install fails
  → NSIS installer rolls back automatically
  → Previous version remains functional
  → Log error to crash telemetry

Scenario 3: New version crashes on startup
  → electron-updater detects crash loop
  → Rolls back to previous version automatically
  → User notified: "Update gagal, versi sebelumnya dipulihkan"

Scenario 4: Migration fails after update
  → Pre-migration backup exists (created before migration)
  → Restore from backup
  → User notified: "Migrasi database gagal, data dipulihkan"
```

---

## 7.4 Production Monitoring

### 7.4.1 Runtime Diagnostics

```
In-app diagnostics (accessible via Ctrl+Shift+I):
  RuntimeInspector panel:
    - Command log (last 200 events)
    - Structured log buffer (last 500 entries)
    - IPC health status (all endpoints)
    - Store state snapshot
    - Memory usage (from system:get-memory)
    - DB size (from system:get-storage-stats)

Diagnostic export:
  [Export Diagnostics] button in RuntimeInspector
  Exports: JSON file with all diagnostic data
  Operator can send to developer for debugging
```

### 7.4.2 Crash Telemetry

```
Crash data collected (privacy-safe, no PII):
  - Error message (sanitized)
  - Stack trace (renderer only)
  - App version
  - Electron version
  - OS version
  - Memory at crash time
  - Last 10 runtime commands before crash
  - Projection state at crash time

NOT collected:
  - Song titles or lyrics
  - Playlist names
  - User identity
  - File paths

Telemetry implementation:
  Main process: process.on('uncaughtException') → log to file
  Renderer: ErrorBoundary.componentDidCatch() → log to file
  On next startup: offer to send crash report (opt-in)
```

### 7.4.3 Performance Telemetry

```
Metrics collected (in-process, not sent externally):
  - App startup time (ms)
  - Song load time (ms)
  - Search response time (ms)
  - Slide generation time (ms)
  - Memory usage (MB, sampled every 5 minutes)
  - IPC round-trip time (ms, sampled)

Stored in: app_state table (key: 'performance_log')
Accessible via: RuntimeInspector > Performance tab (future)
Retention: Last 7 days of samples
```

---

# PART 8: CODING AGENT EXECUTION STRATEGY

## 8.1 AI Implementation Workflow

### 8.1.1 Standard Execution Protocol

Every AI coding agent implementing a feature MUST follow this protocol:

```
STEP 1 — ANALYZE
  Read the relevant architecture documents:
    - enterprise-redesign-system-v1.md (audit findings)
    - phase2-functional-refactor-architecture-v1.md (IPC + state specs)
    - phase3-ui-modernization-system-v1.md (UI specs)
    - phase4-production-system-architecture-v1.md (this document)

  Read the relevant source files:
    - The file being modified
    - Files that import from the file being modified
    - Files that the file imports from

  Identify:
    - What currently exists
    - What needs to change
    - What must NOT change (projection-critical code)

STEP 2 — VALIDATE
  Before writing any code:
    - Confirm the feature is in the correct implementation phase
    - Confirm all dependencies are already implemented
    - Confirm no projection-critical code will be modified
    - Confirm the change is additive (preferred) or targeted (if modification)

STEP 3 — IMPLEMENT
  Write the minimum code needed:
    - No gold-plating
    - No unrequested features
    - No refactoring of unrelated code
    - Follow TypeScript standards (see 8.3)
    - Follow component standards (see 8.3)

STEP 4 — TEST
  After implementation:
    - Run: npm run typecheck (must pass)
    - Run: npm run lint (must pass)
    - Run: npm run test (must pass)
    - Manual: verify the specific feature works
    - Manual: verify no regression in projection controls

STEP 5 — ROLLBACK CHECK
  Before finalizing:
    - Can this change be reverted independently?
    - Does reverting this change restore previous behavior?
    - Are there any irreversible side effects?

STEP 6 — INTEGRATE
  After validation:
    - Commit with descriptive message
    - Reference the feature ID (e.g., "fix(DUI-001): wire favorite button")
    - Update feature completion matrix if applicable
```

---

## 8.2 Implementation Order (File-by-File)

### 8.2.1 Phase 1 — Infrastructure (Exact File Order)

```
Order matters — each file may depend on the previous.

1. src/renderer/src/store/useModalStore.ts
   → No dependencies on other new files
   → Test: import and use in isolation

2. src/renderer/src/store/useServiceStore.ts
   → No dependencies on other new files
   → Test: timer state persists to localStorage

3. src/renderer/src/store/useNotificationStore.ts
   → No dependencies on other new files
   → Test: add/read/clear notifications

4. src/renderer/src/hooks/useTimerTick.ts
   → Depends on: useProjectionStore (existing)
   → Test: timerElapsed increments every second

5. src/main/migrations.ts (add migrations 14-17)
   → Depends on: existing migration structure
   → Test: npm run test (database.test.ts)

6. src/main/database.ts (add getSongsSummary, duplicateSong, getStorageStats)
   → Depends on: migrations 14-17 applied
   → Test: unit test each new function

7. src/main/ipc-handlers.ts (add new channels)
   → Depends on: new database functions
   → Test: invoke each new channel manually

8. src/preload/index.ts (add new channel bridges)
   → Depends on: new IPC handlers
   → Test: window.api.system.getStorageStats() returns data

9. src/renderer/src/store/usePanelLayoutStore.ts (extend to 3-panel)
   → Depends on: nothing new
   → Test: 3-panel sizes persist to localStorage

10. src/renderer/src/store/usePlaylistStore.ts (add persistence)
    → Depends on: nothing new
    → Test: activePlaylist.id persists across reload
```

### 8.2.2 Phase 2 — Dead UI Fixes (Exact File Order)

```
1. src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
   Change: Wire favorite button (DUI-001)
   Lines: SongMediaCard onClick handler
   Test: Click star → song.is_favorite flips → persists on reload

2. src/renderer/src/components/titlebar/TitleBar.tsx
   Change: Wire theme button (DUI-004)
   Lines: TitleBarUtilityButtons Moon button onClick
   Test: Click → cycles dark/light/system → applies immediately

3. src/renderer/src/hooks/useGlobalShortcuts.ts
   Change: Add Ctrl+B for Bible (DUI-003)
   Lines: Add case in handleKeyDown
   Test: Ctrl+B → setScreen('bible')

4. src/renderer/src/components/titlebar/TitleBarMenu.tsx
   Change: Add Bible to View menu (DUI-003)
   Lines: View menu items array
   Test: View > Bible → opens BibleScreen

5. src/renderer/src/screens/modes/ManagementMode.tsx
   Change: Real storage metric (DUI-006)
   Lines: metrics array, add useEffect for getStorageStats
   Test: Storage metric shows real MB value

6. src/renderer/src/App.tsx
   Change: Mount ModalRegistry + useTimerTick
   Lines: Add <ModalRegistry /> and useTimerTick() call
   Test: App renders without errors

7. src/renderer/src/components/titlebar/TitleBarStatus.tsx
   Change: Add timer controls (▶ ■ ↺)
   Lines: Add timer display + control buttons
   Test: Timer starts/stops/resets from title bar
```

### 8.2.3 Phase 3 — Modal System (Exact File Order)

```
1. src/renderer/src/components/modals/Modal.tsx
   → Base modal component (no dependencies on other new files)
   → Test: renders with correct size, focus trap, Escape closes

2. src/renderer/src/components/modals/ConfirmDialog.tsx
   → Depends on: Modal.tsx
   → Test: renders title/description, confirm/cancel work

3. src/renderer/src/components/modals/CreatePlaylistDialog.tsx
   → Depends on: Modal.tsx, usePlaylistStore
   → Test: creates playlist, validates empty name

4. src/renderer/src/components/modals/CrashRecoveryDialog.tsx
   → Depends on: Modal.tsx, useAppStore, usePlaylistStore, useProjectionStore
   → Test: restores session state correctly

5. src/renderer/src/components/modals/PlaylistPickerDialog.tsx
   → Depends on: Modal.tsx, usePlaylistStore
   → Test: shows playlist list, selects on click

6. src/renderer/src/components/modals/ModalRegistry.tsx
   → Depends on: all modal components, useModalStore
   → Test: renders correct modal based on stack

7. src/renderer/src/components/modals/index.ts
   → Export all modals
   → Test: all exports compile

8. Replace window.confirm() calls (one file at a time):
   a. src/renderer/src/screens/modes/ManagementMode.tsx
      → handleDeleteSong, handleBulkDelete
   b. src/renderer/src/screens/SettingsScreen.tsx
      → handleReseed
   c. src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
      → delete song (if any)

9. Wire CreatePlaylistDialog:
   a. src/renderer/src/components/titlebar/TitleBarMenu.tsx
      → File > New Playlist action
   b. src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
      → + New Playlist button

10. Wire CrashRecoveryDialog:
    src/renderer/src/hooks/useAppBootstrap.ts
    → Check getRecoveryState() → open modal if needsRecovery
```

---

## 8.3 Code Generation Rules

### 8.3.1 TypeScript Standards

```typescript
// REQUIRED: Explicit return types on all functions
function Component(): React.JSX.Element { ... }
async function handleAction(): Promise<void> { ... }

// REQUIRED: Interface for all component props (not inline type)
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  children: React.ReactNode
}

// REQUIRED: Explicit event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => { ... }
const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => { ... }

// REQUIRED: No 'any' type — use 'unknown' with type guards
function processData(data: unknown): void {
  if (typeof data !== 'object' || data === null) return
  // ...
}

// REQUIRED: Const assertions for literal types
const VARIANTS = ['primary', 'secondary', 'ghost'] as const
type Variant = typeof VARIANTS[number]

// FORBIDDEN: Non-null assertion without comment
const el = document.getElementById('id')! // FORBIDDEN
const el = document.getElementById('id')  // REQUIRED: check null
if (!el) return

// FORBIDDEN: @ts-ignore without explanation
// @ts-ignore  // FORBIDDEN
// @ts-ignore: electron-specific API not in types  // ACCEPTABLE
```

### 8.3.2 Component Standards

```typescript
// REQUIRED: React.memo for list items
const SongRow = React.memo(({ song, isSelected, onSelect }: SongRowProps) => {
  return <div onClick={() => onSelect(song)}>{song.title}</div>
}, (prev, next) => {
  return prev.song.id === next.song.id &&
    prev.song.updated_at === next.song.updated_at &&
    prev.isSelected === next.isSelected
})

// REQUIRED: useCallback for callbacks passed to children
const handleSelect = useCallback((song: Song) => {
  setSelectedSong(song)
}, [setSelectedSong])

// REQUIRED: useMemo for expensive computations
const filteredSongs = useMemo(() =>
  songs.filter(s => matchesSong(s, query)),
  [songs, query]
)

// REQUIRED: Granular store subscriptions
// BAD:
const store = useAppStore()
// GOOD:
const selectedSong = useAppStore(s => s.selectedSong)
const { setScreen, showToast } = useAppStore()

// REQUIRED: Error handling in async handlers
const handleAction = async (): Promise<void> => {
  try {
    await window.api.songs.delete(id)
    showToast('Berhasil', 'success')
  } catch (err) {
    logger.error('Failed:', err)
    showToast('Gagal', 'error')
  }
}

// REQUIRED: Loading state for async operations
const [isLoading, setIsLoading] = useState(false)
const handleAction = async (): Promise<void> => {
  setIsLoading(true)
  try { ... } finally { setIsLoading(false) }
}

// REQUIRED: aria-label on icon-only buttons
<button aria-label="Delete song" title="Delete song">
  <Trash2 size={16} />
</button>

// REQUIRED: focus-visible ring (via CSS, not inline)
// In main.css: :focus-visible { outline: 2px solid ... }
// NOT inline style
```

### 8.3.3 IPC Standards

```typescript
// REQUIRED: All IPC calls in store actions or hooks, NOT in components
// BAD (in component):
const songs = await window.api.songs.getAll()
// GOOD (in store action):
loadSongs: async () => {
  const songs = await window.api.songs.getAll()
  set({ songs })
}

// REQUIRED: Error handling on all IPC calls
try {
  await window.api.songs.update(id, data)
} catch (err) {
  logger.error('[IPC] songs.update failed:', err)
  showToast('Gagal menyimpan', 'error')
}

// REQUIRED: Fire-and-forget for projection (no await)
window.api.projection.slideUpdate(slideData) // no await
window.api.projection.stateChange('LIVE') // no await

// REQUIRED: Await for data queries
const songs = await window.api.songs.getAll()

// REQUIRED: Cleanup IPC listeners
useEffect(() => {
  const unsub = window.api.projection.onSlideUpdate(handler)
  return () => unsub() // cleanup on unmount
}, [])
```

### 8.3.4 Zustand Standards

```typescript
// REQUIRED: Selector pattern for performance
const selectedSong = useAppStore(s => s.selectedSong)

// REQUIRED: useShallow for multiple values
import { useShallow } from 'zustand/react/shallow'
const { songs, selectedSong } = useAppStore(
  useShallow(s => ({ songs: s.songs, selectedSong: s.selectedSong }))
)

// REQUIRED: getState() for event handlers (not subscriptions)
const handleKeyDown = () => {
  const { selectedSong } = useAppStore.getState()  // not a subscription
}

// REQUIRED: Optimistic updates with rollback
const prevSongs = get().songs
set({ songs: optimisticUpdate(songs) })
try {
  await window.api.songs.toggleFavorite(id)
} catch {
  set({ songs: prevSongs })  // rollback
}

// FORBIDDEN: Cross-store reads inside store actions
// BAD (in useProjectionStore):
const { selectedSong } = useAppStore.getState()  // FORBIDDEN
// GOOD: pass data as parameter
goToSlide: (index: number) => { ... }  // caller provides context
```

---

## 8.4 Safe Execution Rules

### 8.4.1 Projection Safety Rules

```
NEVER modify these files without running the full projection validation gate:
  src/renderer/src/store/useProjectionStore.ts
  src/renderer/src/utils/runtimeCommandBus.ts
  src/renderer/src/utils/runtimeCommandHandlers.ts
  src/renderer/src/components/LivePreviewPanel.tsx
  src/renderer/src/components/PresentationCanvas.tsx
  src/renderer/src/atmosphere/AtmosphereRenderer.tsx
  src/main/windows.ts
  src/main/ipc-handlers.ts (projection channels only)

NEVER add cross-store reads to useProjectionStore
NEVER add async operations to sendLiveSlide()
NEVER add UI state to useProjectionStore
NEVER block the main thread in projection handlers
NEVER use setTimeout/setInterval inside store actions
  (use useTimerTick hook instead)
```

### 8.4.2 IPC Safety Rules

```
NEVER remove an existing IPC channel (only add aliases)
NEVER change the return type of an existing IPC channel
NEVER add synchronous blocking operations to ipcMain.on handlers
  (use ipcMain.handle for async, ipcMain.on for fire-and-forget)
NEVER expose filesystem paths to renderer without validation
NEVER expose raw SQL errors to renderer (sanitize in safeIpcHandle)
NEVER skip input validation on destructive operations
```

### 8.4.3 Migration Safety Rules

```
NEVER use DROP TABLE in migrations
NEVER use DELETE FROM in migrations (except reseed)
NEVER modify existing column types (SQLite limitation)
ALWAYS use IF NOT EXISTS for CREATE TABLE/INDEX
ALWAYS use INSERT OR IGNORE for seed data
ALWAYS wrap multi-step migrations in db.transaction()
ALWAYS test migration on a copy of production DB first
ALWAYS create pre-migration backup before running migrations
```

### 8.4.4 Forbidden Refactor Patterns

```
FORBIDDEN: Big-bang rewrites
  Never rewrite an entire file in one commit
  Always make targeted, minimal changes

FORBIDDEN: Changing working projection code "while you're at it"
  If a file works correctly for projection, don't touch it
  unless the task specifically requires it

FORBIDDEN: Adding new dependencies without approval
  Check package.json before adding any new package
  Prefer existing packages (framer-motion, @dnd-kit, etc.)

FORBIDDEN: Inline styles for design tokens
  Never: style={{ color: '#3b82f6' }}
  Always: className="text-brand-primary"

FORBIDDEN: window.confirm() for any new code
  Always use DeleteConfirmDialog or ConfirmDialog

FORBIDDEN: console.log() in production code
  Always use logger.info/warn/error

FORBIDDEN: Hardcoded strings in UI
  Always use i18n keys or constants
  Exception: Indonesian UI strings (current app is Indonesian-first)
```

---

# PART 9: ENGINEERING GOVERNANCE SYSTEM

## 9.1 Architecture Decision System

### 9.1.1 ADR Structure

```
Architecture Decision Records (ADRs) document significant decisions.
Location: .docs/06-history/adr-[number]-[title].md

ADR Template:
  # ADR-[N]: [Title]
  Date: [YYYY-MM-DD]
  Status: [Proposed | Accepted | Deprecated | Superseded]

  ## Context
  What is the situation that requires a decision?

  ## Decision
  What was decided?

  ## Rationale
  Why was this decision made?

  ## Consequences
  What are the positive and negative consequences?

  ## Alternatives Considered
  What other options were evaluated?

Existing implicit ADRs (should be documented):
  ADR-001: Use Zustand for state management (vs Redux, Jotai)
  ADR-002: Use better-sqlite3 (vs Prisma, Drizzle)
  ADR-003: Use RuntimeCommandBus pattern (vs direct store calls)
  ADR-004: Use electron-vite (vs webpack, parcel)
  ADR-005: Frameless window with custom title bar
  ADR-006: Separate projection window (vs canvas overlay)
  ADR-007: WAL mode for SQLite (vs journal mode)
  ADR-008: FTS5 for song search (vs LIKE queries)
```

### 9.1.2 Architecture Approval Flow

```
For changes that affect:
  - Projection runtime (useProjectionStore, PresentationCanvas)
  - IPC architecture (new channels, changed contracts)
  - Database schema (new migrations)
  - Store architecture (new stores, decomposition)
  - Window management (windows.ts)

Required approval process:
  1. Write ADR describing the change
  2. Review against existing architecture documents
  3. Verify no projection regression risk
  4. Implement in feature branch
  5. Run full projection validation gate
  6. Merge to develop

For UI-only changes (no runtime impact):
  No ADR required
  Standard PR review sufficient
```

---

## 9.2 Code Review System

### 9.2.1 Review Checklist

```
For ALL PRs:
  □ TypeScript compiles without errors
  □ ESLint passes without errors
  □ All tests pass
  □ No window.confirm() calls added
  □ No hardcoded colors (use design tokens)
  □ No console.log() in production code
  □ Error handling on all async operations
  □ Loading states for async UI

For PRs touching projection files:
  □ Projection validation gate passed (12-step sequence)
  □ No cross-store reads added to useProjectionStore
  □ No blocking operations in sendLiveSlide()
  □ No new dependencies on useProjectionStore from other stores

For PRs touching IPC:
  □ No existing channel removed or return type changed
  □ New channels use safeIpcHandle
  □ Input validation on all new handlers
  □ Preload bridge updated for new channels

For PRs touching database:
  □ Migration is idempotent (IF NOT EXISTS)
  □ No DROP TABLE or destructive operations
  □ Migration tested on DB copy
  □ Pre-migration backup strategy documented

For PRs touching stores:
  □ No cross-store reads in store actions
  □ Optimistic updates have rollback
  □ Selectors are granular (not whole store)
  □ Persistence keys don't conflict
```

### 9.2.2 Projection Review Protocol

```
Any PR that modifies projection-critical files requires:

1. Developer runs projection validation gate locally
2. Records results in PR description:
   "Projection validation: ✅ All 12 steps passed"
3. Reviewer independently runs projection validation gate
4. Both must pass before merge

Projection-critical files:
  useProjectionStore.ts
  runtimeCommandBus.ts
  runtimeCommandHandlers.ts
  LivePreviewPanel.tsx
  PresentationCanvas.tsx
  AtmosphereRenderer.tsx
  windows.ts
  ipc-handlers.ts (projection channels)
```

---

## 9.3 Quality Gates

### 9.3.1 Performance Budgets

```
Startup time:
  Target: < 3000ms from launch to interactive
  Measurement: time from app.whenReady() to mainWindow.show()
  Gate: Fail if > 5000ms

Song load time:
  Target: < 200ms for getSongs() with 1000 songs
  Measurement: IPC round-trip time
  Gate: Fail if > 500ms

Search response time:
  Target: < 100ms for FTS5 search
  Measurement: IPC round-trip time
  Gate: Fail if > 300ms

Slide generation:
  Target: < 50ms for generateSlidesForSong()
  Measurement: performance.now()
  Gate: Fail if > 200ms

Memory (main window):
  Target: < 200MB after 30 minutes
  Measurement: process.getProcessMemoryInfo()
  Gate: Fail if > 400MB

Memory (projection window):
  Target: < 100MB
  Measurement: process.getProcessMemoryInfo()
  Gate: Fail if > 200MB
```

### 9.3.2 Accessibility Gates

```
Required before v1.1.0 release:
  □ All modals have role="dialog" + aria-modal="true"
  □ All modals have aria-labelledby pointing to title
  □ All modals trap focus correctly
  □ All icon-only buttons have aria-label
  □ All form inputs have associated labels
  □ Escape closes all modals and dropdowns
  □ Tab order is logical in all modes

Required before v1.2.0 release:
  □ prefers-reduced-motion respected
  □ Keyboard navigation in song grids
  □ aria-live on toast notifications
  □ Color contrast ≥ 4.5:1 for all text
```

### 9.3.3 Runtime Stability Gates

```
Required before any release:
  □ App runs 30 minutes in Projection Mode without crash
  □ No unhandled exceptions in console during normal operation
  □ Projection window reconnects correctly after disconnect
  □ Session saves and restores correctly
  □ All keyboard shortcuts work throughout 30-minute session
  □ Memory stays within budget throughout 30-minute session
```

---

## 9.4 Documentation Governance

### 9.4.1 Documentation Update Requirements

```
When implementing a feature, update:

1. Feature completion matrix (Part 4 of this document)
   → Change status from ❌ to ✅
   → Update phase column if changed

2. If new IPC channel added:
   → Update IPC channel map in enterprise-redesign-system-v1.md
   → Update preload/index.ts JSDoc

3. If new store created:
   → Update store architecture map in phase2-functional-refactor-architecture-v1.md
   → Document ownership rules

4. If new migration added:
   → Update database schema in enterprise-redesign-system-v1.md
   → Document migration purpose in migrations.ts JSDoc

5. If architecture decision made:
   → Create ADR in .docs/06-history/
```

### 9.4.2 Implementation Log

```
After each sprint, create implementation log:
Location: .docs/04-implementation/[N]-log-impl-[feature].md

Log template:
  # Implementation Log: [Feature Name]
  Date: [YYYY-MM-DD]
  Phase: [Phase N]

  ## What Was Implemented
  [List of changes]

  ## Files Modified
  [List of files]

  ## Tests Added
  [List of tests]

  ## Known Issues
  [Any remaining issues]

  ## Next Steps
  [What comes next]
```

---

# PART 10: FINAL PRODUCTION READINESS SYSTEM

## 10.1 Production Readiness Checklist

### 10.1.1 Runtime Readiness

```
□ RT-001: RuntimeCommandBus operational ✅
□ RT-002: All command handlers registered ✅
□ RT-003: LIVE_LOCK protection working ✅
□ RT-004: NEXT state computation working ✅
□ RT-005: Quick Jump operational ✅
□ RT-006: Slide cache working ✅
□ RT-007: Timer tick interval (useTimerTick) ❌ Phase 2
□ RT-008: Timer controls in title bar ❌ Phase 2
□ RT-009: Next song preload pipeline ❌ Phase 4
□ RT-010: Slide config from settings ❌ Phase 4
□ RT-011: Confidence payload broadcast ❌ Phase 4
□ RT-012: StageDisplay confidence render ⚠️ Phase 4
□ RT-013: Auto session save ❌ Phase 4
□ RT-014: MediaEngine LRU cache ❌ Phase 4
□ RT-015: Per-mode ErrorBoundary ❌ Phase 4
□ RT-016: ProjectionMode fallback UI ❌ Phase 4
□ RT-017: Crash recovery dialog ❌ Phase 3
□ RT-018: Pre-migration backup ❌ Phase 1
□ RT-019: Auto-backup on startup ❌ Phase 1
□ RT-020: IPC health monitoring ✅
```

### 10.1.2 UI Readiness

```
□ UI-001: Favorite button wired ❌ Phase 2
□ UI-002: New Playlist menu wired ❌ Phase 2
□ UI-003: Bible Screen accessible ❌ Phase 2
□ UI-004: Theme button wired ❌ Phase 2
□ UI-005: Storage metric real ❌ Phase 2
□ UI-006: No window.confirm() calls ❌ Phase 3
□ UI-007: All critical modals built ❌ Phase 3
□ UI-008: Design system components ❌ Phase 5
□ UI-009: Library Mode improvements ❌ Phase 6
□ UI-010: Projection Mode improvements ❌ Phase 7
□ UI-011: Management Mode improvements ❌ Phase 8
□ UI-012: Accessibility gates met ❌ Phase 5+
□ UI-013: Performance budgets met ❌ Phase 10
```

### 10.1.3 Projection Readiness

```
□ PROJ-001: Slide navigation (Space, →, ←) ✅
□ PROJ-002: Black screen (B) ✅
□ PROJ-003: Freeze screen (F) ✅
□ PROJ-004: Clear screen (Esc) ✅
□ PROJ-005: TAKE cue (Space) ✅
□ PROJ-006: Atmosphere rendering ✅
□ PROJ-007: Transition types (4 types) ✅
□ PROJ-008: Projection window reconnect ✅
□ PROJ-009: Stage display sync ⚠️ (legacy only)
□ PROJ-010: Confidence monitor ❌ Phase 4
□ PROJ-011: Next song preload ❌ Phase 4
□ PROJ-012: ErrorBoundary fallback ❌ Phase 4
□ PROJ-013: Bible projection ❌ Phase 7
□ PROJ-014: Announcement projection ❌ Phase 7
□ PROJ-015: Lower third overlay ❌ Phase 7+
```

### 10.1.4 Data Readiness

```
□ DATA-001: SQLite WAL mode ✅
□ DATA-002: FTS5 search ✅
□ DATA-003: All 13 migrations applied ✅
□ DATA-004: Migrations 14-17 ❌ Phase 1
□ DATA-005: Pre-migration backup ❌ Phase 1
□ DATA-006: Auto-backup on startup ❌ Phase 1
□ DATA-007: Backup integrity validation ❌ Phase 1
□ DATA-008: Crash recovery state ✅ (save exists)
□ DATA-009: Crash recovery dialog ❌ Phase 3
□ DATA-010: Session auto-save ❌ Phase 4
```

---

## 10.2 Launch Readiness Matrix

### 10.2.1 v1.1.0 Launch Blockers

```
CRITICAL BLOCKERS (must fix before v1.1.0):

BLOCK-001: window.confirm() in production code
  Severity: Critical (UX regression, blocks modal system)
  Fix: Phase 3 — DeleteConfirmDialog
  ETA: Sprint 3

BLOCK-002: Favorite button broken (DUI-001)
  Severity: Critical (core workflow broken)
  Fix: Phase 2 — wire toggleFavorite
  ETA: Sprint 2

BLOCK-003: No way to create playlist (DUI-002)
  Severity: Critical (core workflow broken)
  Fix: Phase 2+3 — CreatePlaylistDialog
  ETA: Sprint 3

BLOCK-004: Bible Screen unreachable (DUI-003)
  Severity: Critical (entire feature inaccessible)
  Fix: Phase 2 — add menu entry + shortcut
  ETA: Sprint 2

BLOCK-005: Fake storage metric (DUI-006)
  Severity: Critical (false information to operator)
  Fix: Phase 2 — real system:get-storage-stats
  ETA: Sprint 2

BLOCK-006: No crash recovery dialog
  Severity: Critical (data loss risk)
  Fix: Phase 3 — CrashRecoveryDialog
  ETA: Sprint 3

BLOCK-007: No per-mode ErrorBoundary
  Severity: Critical (projection crash = white screen)
  Fix: Phase 4 — ErrorBoundary with fallback
  ETA: Sprint 4

BLOCK-008: Timer never advances
  Severity: High (service timer broken)
  Fix: Phase 2 — useTimerTick hook
  ETA: Sprint 2
```

### 10.2.2 v1.2.0 Launch Blockers

```
HIGH PRIORITY (must fix before v1.2.0):

BLOCK-009: No context menu on songs
  Severity: High (operator workflow friction)
  Fix: Phase 6 — SongContextMenu

BLOCK-010: No hymnal filter in Library
  Severity: High (navigation friction)
  Fix: Phase 6 — HymnalFilterDropdown

BLOCK-011: Management list not virtualized
  Severity: High (performance with 1000+ songs)
  Fix: Phase 8 — @tanstack/react-virtual

BLOCK-012: No Bible projection workflow
  Severity: High (missing core feature)
  Fix: Phase 7 — Bible panel + BiblePickerDialog

BLOCK-013: No announcement projection
  Severity: High (missing core feature)
  Fix: Phase 7 — Announcement panel
```

---

## 10.3 Final Validation System

### 10.3.1 Projection Simulation Test

```
Full projection simulation (run before every release):

Setup:
  - Two monitors connected (or virtual display)
  - Fresh app install (or cleared userData)
  - DB with 50+ songs

Test sequence:
  1. App starts → verify SplashScreen → verify main app loads
  2. Projection Mode → verify layout correct
  3. Search "Tuhan" → verify results appear
  4. Click song → verify preview loads (green border)
  5. Space → verify LIVE (red border, projection window shows lyrics)
  6. → × 5 → verify 5 slides advance correctly
  7. ← × 2 → verify 2 slides go back
  8. B → verify BLACK (projection window goes black)
  9. B → verify returns to LIVE
  10. F → verify FREEZE (projection window frozen)
  11. F → verify returns to LIVE
  12. Esc → verify CLEAR (projection window shows placeholder)
  13. Click different song → verify preview loads
  14. Space → verify new song goes LIVE
  15. Ctrl+J → verify Quick Jump opens
  16. Type "chorus" → verify chorus slide highlighted
  17. Enter → verify jumps to chorus
  18. Ctrl+N → verify CreatePlaylistDialog opens
  19. Create playlist → verify appears in panel
  20. Add song to playlist → verify appears in rundown
  21. Click playlist item → verify cues in preview
  22. Space → verify TAKE works from playlist

All 22 steps must pass.
```

### 10.3.2 Multi-Window Simulation Test

```
Multi-window test (run before every release):

1. Connect external monitor
2. Open app → verify projection window on external
3. Go LIVE → verify lyrics on external display
4. Disconnect external monitor
5. Verify "PROJECTOR LOST" badge in title bar
6. Reconnect external monitor
7. Verify projection window moves to external
8. Verify current slide content restored
9. Open Stage Display (Ctrl+Shift+S)
10. Verify stage display shows current slide
11. Navigate slides → verify stage display updates
12. Close stage display → verify no errors

All 12 steps must pass.
```

### 10.3.3 Stress Simulation Test

```
Stress test (run before stable release):

1. Load DB with 1000+ songs
2. Open Management Mode → verify renders without lag
3. Search "a" → verify results appear < 100ms
4. Open Library Mode → verify renders without lag
5. Scroll through all songs → verify no lag
6. Switch modes 10 times rapidly → verify no errors
7. Open/close Command Palette 20 times → verify no memory leak
8. Navigate 100 slides rapidly (hold → key) → verify no errors
9. Run for 30 minutes → verify memory < 200MB
10. Verify no console errors throughout

All 10 steps must pass.
```

### 10.3.4 Failure Simulation Test

```
Failure recovery test (run before stable release):

1. Simulate DB corruption:
   → Close app → corrupt sion.db → reopen
   → Verify app handles gracefully (error message, not crash)

2. Simulate projection window crash:
   → Go LIVE → kill projection window process
   → Verify main window shows "PROJECTOR LOST"
   → Verify main window doesn't crash
   → Reopen projection → verify snapshot sent

3. Simulate crash during live:
   → Go LIVE → kill renderer process
   → Verify main window reloads
   → Verify CrashRecoveryDialog appears
   → Verify session restores correctly

4. Simulate failed import:
   → Import malformed JSON file
   → Verify error shown, no data corruption
   → Verify existing songs intact

5. Simulate failed backup:
   → Backup to read-only path
   → Verify error shown, app continues normally

All 5 scenarios must be handled gracefully.
```

---

## APPENDIX A: Implementation Quick Reference

### A.1 Phase Summary

```
Phase 0:  Pre-flight (testing infra, branch strategy)
Phase 1:  Infrastructure (new stores, IPC, migrations) — additive only
Phase 2:  Critical dead UI (10 fixes) — targeted changes
Phase 3:  Modal system (DeleteConfirm, CreatePlaylist, CrashRecovery)
Phase 4:  Projection hardening (timer, preload, confidence, ErrorBoundary)
Phase 5:  Design system (Button, Input, Badge, SearchInput components)
Phase 6:  Library Mode (context menu, drag-drop, virtualize)
Phase 7:  Projection Mode (3-panel, Bible, Announcements)
Phase 8:  Management Mode (virtualize, SongRelations, Media Library)
Phase 9:  Store decomposition (useSongStore, useHymnalStore, useDisplayStore)
Phase 10: Stabilization (performance, accessibility, testing)
Phase 11: Release preparation
```

### A.2 v1.1.0 Minimum Viable Release

```
Required for v1.1.0 (critical path):
  Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4

Features included:
  ✓ Favorite button works
  ✓ Create playlist works
  ✓ Bible Screen accessible
  ✓ Theme button works
  ✓ Real storage metric
  ✓ Timer works
  ✓ No window.confirm()
  ✓ Crash recovery dialog
  ✓ Per-mode ErrorBoundary
  ✓ Next song preload
  ✓ Confidence monitor
  ✓ Auto session save

Features deferred to v1.2.0:
  Design system components
  Library Mode improvements
  Projection Mode 3-panel
  Management Mode improvements
  Store decomposition
```

### A.3 File Change Summary by Phase

```
Phase 1 (new files only):
  + useModalStore.ts
  + useServiceStore.ts
  + useNotificationStore.ts
  + useTimerTick.ts
  ~ migrations.ts (add 14-17)
  ~ database.ts (add 3 functions)
  ~ ipc-handlers.ts (add 4 channels)
  ~ preload/index.ts (add 4 bridges)
  ~ usePanelLayoutStore.ts (extend)
  ~ usePlaylistStore.ts (add persistence)

Phase 2 (targeted changes):
  ~ LibraryModeRedesigned.tsx (favorite button)
  ~ TitleBar.tsx (theme button)
  ~ useGlobalShortcuts.ts (Ctrl+B)
  ~ TitleBarMenu.tsx (Bible menu item)
  ~ ManagementMode.tsx (storage metric)
  ~ App.tsx (ModalRegistry + useTimerTick)
  ~ TitleBarStatus.tsx (timer controls)

Phase 3 (new files + targeted changes):
  + Modal.tsx
  + ConfirmDialog.tsx
  + CreatePlaylistDialog.tsx
  + CrashRecoveryDialog.tsx
  + PlaylistPickerDialog.tsx
  + ModalRegistry.tsx
  + modals/index.ts
  ~ ManagementMode.tsx (replace window.confirm)
  ~ SettingsScreen.tsx (replace window.confirm)
  ~ TitleBarMenu.tsx (wire New Playlist)
  ~ useAppBootstrap.ts (crash recovery)

Phase 4 (targeted changes):
  ~ ProjectionMode.tsx (next song preload)
  ~ useAppBootstrap.ts (slide config)
  ~ slideEngine.ts (settings-aware)
  ~ useProjectionStore.ts (auto session save)
  ~ ipc-handlers.ts (confidence:update)
  ~ StageDisplayApp.tsx (confidence render)
  ~ App.tsx (per-mode ErrorBoundary)
  ~ mediaEngine.ts (LRU cache)
  ~ ProjectionApp.tsx (heartbeat 500ms)
```

---

_Document: Phase 4 Production System Architecture v1.0_  
_SION Media Enterprise Transformation_  
_Generated: May 2026_  
_Status: Production-Ready Engineering Blueprint_
