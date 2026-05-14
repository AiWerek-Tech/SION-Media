# SION Media — Phase 2: Functional Refactor Architecture v1.0

## Production-Grade Runtime Engineering Blueprint

**Document Status:** Implementation-Ready Architecture Specification  
**Phase:** Phase 2 — Functional Refactor Architecture  
**Depends On:** enterprise-redesign-system-v1.md, foundation-system-architecture-v1.md  
**Codebase Revision:** Electron 39 / React 19 / Zustand 5 / better-sqlite3 / RuntimeCommandBus

---

## EXECUTIVE SUMMARY

This document defines the complete functional refactor architecture for SION Media. Every decision is grounded in the actual source code. The architecture addresses 10 dead UI issues, 20 missing modals, 35 broken workflows, and 8 runtime gaps identified in the audit — without breaking the existing projection runtime, which is already production-quality.

**What is NOT broken and must be preserved:**

- `RuntimeCommandBus` — excellent architecture, extend only
- `useProjectionStore` — solid state machine, normalize only
- `runtimeCommandHandlers` — well-structured, add missing handlers only
- `slideEngine.ts` — correct and cached, extend only
- `migrations.ts` — 13 migrations, non-destructive, extend only
- `ipc-health.ts` — working heartbeat system, extend only
- `usePanelLayoutStore` — persisted correctly, extend only

**What must be refactored:**

- Dead UI connections (10 broken interactions)
- Missing modal system (20 modals needed)
- IPC channel normalization (type safety, validation)
- State store boundaries (ownership violations)
- Fake data elimination (hardcoded metrics)
- Workflow orchestration (missing create-playlist, bible access, etc.)

---

# PART 1: DEAD UI ELIMINATION SYSTEM

## 1.1 Dead UI Registry

### DUI-001: Favorite Button in Library Mode

| Field                  | Value                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **ID**                 | DUI-001                                                                             |
| **Severity**           | 🔴 Critical                                                                         |
| **Current Behavior**   | Star button in `SongMediaCard` calls `event.stopPropagation()` only — no toggle     |
| **Root Cause**         | `onClick` handler was stubbed during development and never wired                    |
| **Affected Component** | `LibraryModeRedesigned.tsx` → `SongMediaCard`                                       |
| **Affected Store**     | `useAppStore` (needs `loadSongs` after toggle)                                      |
| **Affected IPC**       | `db:toggle-favorite` → `toggleFavorite()`                                           |
| **UX Impact**          | Operators cannot mark favorites — core workflow broken                              |
| **Runtime Impact**     | None (no projection impact)                                                         |
| **Refactor Strategy**  | Wire `window.api.songs.toggleFavorite(song.id)` then call `loadSongs()`             |
| **Correct Solution**   | Optimistic update: flip `is_favorite` in local state immediately, then sync DB      |
| **Validation**         | Star fills/unfills on click; favorites count in sidebar updates; persists on reload |

**Architecture Fix:**

```
SongMediaCard.onStarClick
  → optimistic: mutate songs[] in useAppStore (flip is_favorite)
  → async: window.api.songs.toggleFavorite(song.id)
  → on error: revert optimistic update + showToast('error')
  → no full reload needed (optimistic is sufficient)
```

---

### DUI-002: "New Playlist" in File Menu — Empty Action

| Field                  | Value                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| **ID**                 | DUI-002                                                                    |
| **Severity**           | 🔴 Critical                                                                |
| **Current Behavior**   | `File > New Playlist` has empty action comment `/* Will be wired */`       |
| **Root Cause**         | `CreatePlaylistDialog` component does not exist                            |
| **Affected Component** | `TitleBarMenu.tsx` → File menu                                             |
| **Affected Store**     | `usePlaylistStore` (has `createPlaylist()` action — already implemented)   |
| **Affected IPC**       | `db:add-playlist` → `addPlaylist()` — already implemented                  |
| **UX Impact**          | Operators cannot create playlists from the primary entry point             |
| **Runtime Impact**     | None                                                                       |
| **Refactor Strategy**  | Build `CreatePlaylistDialog`, dispatch `sion:create-playlist` custom event |
| **Correct Solution**   | Global modal manager dispatches `OPEN_MODAL('create-playlist')`            |
| **Validation**         | Dialog opens, form validates, playlist created, appears in sidebar         |

---

### DUI-003: Bible Screen Unreachable

| Field                  | Value                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| **ID**                 | DUI-003                                                                         |
| **Severity**           | 🔴 Critical                                                                     |
| **Current Behavior**   | `BibleScreen` exists and is fully implemented but has no navigation entry point |
| **Root Cause**         | No menu item, no button, no keyboard shortcut routes to `setScreen('bible')`    |
| **Affected Component** | `TitleBarMenu.tsx` → View menu; `App.tsx` routing                               |
| **Affected Store**     | `useAppStore.setScreen('bible')`                                                |
| **Affected IPC**       | All `db:get-bible-*` channels — implemented but unreachable                     |
| **UX Impact**          | Entire Bible projection workflow is inaccessible                                |
| **Runtime Impact**     | None                                                                            |
| **Refactor Strategy**  | Add `View > Bible` menu item + `Ctrl+B` shortcut                                |
| **Correct Solution**   | Also add Bible panel to Projection Mode bottom workspace                        |
| **Validation**         | `Ctrl+B` opens BibleScreen; View menu item works                                |

---

### DUI-004: Theme Button (Moon Icon) Opens Nothing

| Field                  | Value                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| **ID**                 | DUI-004                                                                     |
| **Severity**           | 🟡 High                                                                     |
| **Current Behavior**   | Moon icon button in `TitleBarUtilityButtons` has no `onClick` handler       |
| **Root Cause**         | Button was added as placeholder; theme system exists in `useModeStore`      |
| **Affected Component** | `TitleBar.tsx` → `TitleBarUtilityButtons`                                   |
| **Affected Store**     | `useModeStore.theme`, `useModeStore.setTheme()`                             |
| **Affected IPC**       | `app:theme-mode-set` → `broadcastAppTheme()`                                |
| **UX Impact**          | No way to toggle theme from title bar                                       |
| **Refactor Strategy**  | Cycle through `dark → light → system` on click; update icon per state       |
| **Correct Solution**   | `onClick` → `setTheme(nextTheme)` → `applyEffectiveTheme()` → IPC broadcast |
| **Validation**         | Icon changes (Moon/Sun/SunMoon); theme applies; persists on reload          |

---

### DUI-005: Notifications Button Opens Nothing

| Field                  | Value                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| **ID**                 | DUI-005                                                                          |
| **Severity**           | 🟡 High                                                                          |
| **Current Behavior**   | Bell icon button has no `onClick` handler                                        |
| **Root Cause**         | No notification system exists in the application                                 |
| **Affected Component** | `TitleBar.tsx` → `TitleBarUtilityButtons`                                        |
| **Affected Store**     | None (needs new `useNotificationStore`)                                          |
| **Affected IPC**       | None (needs new notification IPC or in-process events)                           |
| **UX Impact**          | Dead UI creates confusion                                                        |
| **Refactor Strategy**  | Build minimal `NotificationStore` + `NotificationPanel`                          |
| **Correct Solution**   | In-process notification queue (no IPC needed for v1); panel slides in from right |
| **Validation**         | Bell opens panel; import results, backup results post notifications              |

---

### DUI-006: Storage Metric is Hardcoded Fake Data

| Field                  | Value                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| **ID**                 | DUI-006                                                                    |
| **Severity**           | 🔴 Critical                                                                |
| **Current Behavior**   | Management Mode shows "28.4 GB / 28% dari 100 GB" — completely fabricated  |
| **Root Cause**         | No filesystem stats IPC exists; metric was hardcoded as placeholder        |
| **Affected Component** | `ManagementMode.tsx` → `metrics` array                                     |
| **Affected Store**     | `useAppStore` (needs memory info)                                          |
| **Affected IPC**       | `system:get-memory` exists but returns process memory, not disk            |
| **UX Impact**          | Operators see false system information — trust-breaking                    |
| **Refactor Strategy**  | Replace with real `process.getProcessMemoryInfo()` data + DB file size     |
| **Correct Solution**   | New IPC `system:get-storage-stats` returns `{ dbSizeBytes, memorySizeMB }` |
| **Validation**         | Shows real memory usage; updates on each Management Mode open              |

---

### DUI-007: Metric Trend Bars are Hardcoded

| Field                  | Value                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| **ID**                 | DUI-007                                                                     |
| **Severity**           | 🟡 High                                                                     |
| **Current Behavior**   | All 6 metric cards show hardcoded bar arrays `[38, 54, 42, 68, 58, 78, 86]` |
| **Root Cause**         | No analytics/history data was available when metrics were built             |
| **Affected Component** | `ManagementMode.tsx` → `metrics` array                                      |
| **Affected Store**     | None (needs derived computation)                                            |
| **Affected IPC**       | `db:get-recent-songs` can provide history data                              |
| **UX Impact**          | Misleading visual data                                                      |
| **Refactor Strategy**  | Compute bars from `song_history` data (last 7 days activity)                |
| **Correct Solution**   | `getRecentSongs(50)` → group by day → normalize to 0-100 scale              |
| **Validation**         | Bars reflect actual usage; flat bars when no history                        |

---

### DUI-008: Management Mode Layout Toggle Has No Action

| Field                  | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ | ------- |
| **ID**                 | DUI-008                                                            |
| **Severity**           | 🟠 Medium                                                          |
| **Current Behavior**   | `Grid2X2` icon button in Management command bar has no `onClick`   |
| **Root Cause**         | Grid view was planned but not implemented                          |
| **Affected Component** | `ManagementMode.tsx` → command bar                                 |
| **Affected Store**     | Local state `viewMode: 'table'                                     | 'grid'` |
| **UX Impact**          | Dead button creates confusion                                      |
| **Refactor Strategy**  | Add `viewMode` state; toggle between table and card grid           |
| **Correct Solution**   | Table view (current) + Card grid view (new); icon changes per mode |
| **Validation**         | Toggle switches layout; layout persists in session                 |

---

### DUI-009: Management Mode Filter Button Has No Dropdown

| Field                  | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| **ID**                 | DUI-009                                                                 |
| **Severity**           | 🟠 Medium                                                               |
| **Current Behavior**   | "Filter" button in Management command bar opens nothing                 |
| **Root Cause**         | Filter panel was not implemented                                        |
| **Affected Component** | `ManagementMode.tsx` → command bar                                      |
| **Affected Store**     | Local state for filter options                                          |
| **UX Impact**          | Operators cannot filter by category, author, key, etc.                  |
| **Refactor Strategy**  | Build `FilterDropdown` component with category/author/key filters       |
| **Correct Solution**   | Floating dropdown with checkboxes; active filters shown as chips        |
| **Validation**         | Filter applies to song list; chips show active filters; clear all works |

---

### DUI-010: Inspector Tabs "Chord" and "Notes" Render Nothing

| Field                   | Value                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | DUI-010                                                                                                                                  |
| **Severity**            | 🟡 High                                                                                                                                  |
| **Current Behavior**    | Both Library Mode inspector and Projection Mode `SongInfoPanel` have "Chord" and "Notes" tabs that render empty content                  |
| **Root Cause**          | Chord and notes systems were not implemented                                                                                             |
| **Affected Components** | `LibraryModeRedesigned.tsx` → `RightInspector`; `ProjectionMode.tsx` → `SongInfoPanel`                                                   |
| **Affected Store**      | None                                                                                                                                     |
| **UX Impact**           | Dead tabs create confusion; operators click and see nothing                                                                              |
| **Refactor Strategy**   | Phase A: Show "Coming Soon" placeholder with feature description. Phase B: Implement chord display from `key_note` + `time_signature`    |
| **Correct Solution**    | Notes tab: free-text note per song (stored in `app_state` keyed by song ID). Chord tab: display key + time signature + basic chord chart |
| **Validation**          | Tabs show content (not blank); notes persist per song                                                                                    |

---

## 1.2 Fake Interaction Registry

### FI-001: Projection Mode "Chord" Button Shows Toast Only

| Field                | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **ID**               | FI-001                                                                                     |
| **Current Behavior** | Chord button in `SongInfoPanel` shows toast "Panel chord akan mengikuti metadata lagu ini" |
| **Root Cause**       | Chord panel not implemented; toast used as placeholder                                     |
| **Fix**              | Replace toast with actual chord display in "Chord" tab of inspector                        |

---

### FI-002: Scene Presets (1-4) Apply CSS Classes Only

| Field                | Value                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **ID**               | FI-002                                                                                                      |
| **Current Behavior** | Scene preset buttons dispatch `projection-scene-change` event → applies CSS class `projection-scene-N` only |
| **Root Cause**       | Scene configuration UI not built; presets are CSS-only                                                      |
| **Fix**              | Wire scene presets to `atmosphereStore`; each preset loads an `AtmosphereConfig`                            |

---

### FI-003: Management "Duplikat" Quick Action Has No Backend

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| **ID**               | FI-003                                                           |
| **Current Behavior** | "Duplikat" button in Management inspector has no `onClick`       |
| **Root Cause**       | No duplicate song IPC handler exists                             |
| **Fix**              | Add `db:duplicate-song` IPC handler; opens `DuplicateSongDialog` |

---

### FI-004: Management "Relasi" Quick Action Has No UI

| Field                | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| **ID**               | FI-004                                                               |
| **Current Behavior** | "Relasi" button has no `onClick`                                     |
| **Root Cause**       | `SongRelationsModal` not built (IPC exists: `db:get-song-relations`) |
| **Fix**              | Build `SongRelationsModal`; wire button                              |

---

### FI-005: Management "Export" Quick Action Has No Per-Song Export

| Field                | Value                                              |
| -------------------- | -------------------------------------------------- |
| **ID**               | FI-005                                             |
| **Current Behavior** | "Export" button has no `onClick`                   |
| **Root Cause**       | Only full-library export exists                    |
| **Fix**              | Wire to `file:write-json` with single song payload |

---

## 1.3 Missing Workflow Registry

### MW-001: Create Playlist Workflow

**Entry Points:** File > New Playlist, Library Mode sidebar, Projection Mode playlist panel  
**Backend:** `usePlaylistStore.createPlaylist()` → `db:add-playlist` (both exist)  
**Missing:** `CreatePlaylistDialog` component  
**Orchestration:**

```
User triggers → OPEN_MODAL('create-playlist')
  → Dialog: name (required), service_date, description
  → Validate: name non-empty
  → Submit: usePlaylistStore.createPlaylist(name, date)
  → On success: setActivePlaylist(new), close modal, showToast
  → On error: show inline error, keep modal open
```

---

### MW-002: Delete Confirmation Workflow

**Affected:** All delete operations (songs, hymnals, playlists, media assets)  
**Current:** `window.confirm()` — blocks main thread, no styling, no async  
**Missing:** `DeleteConfirmDialog` component  
**Orchestration:**

```
User triggers delete → OPEN_MODAL('confirm-delete', { target, onConfirm })
  → Dialog shows: title, description, item name
  → Cancel: close modal, no action
  → Confirm: setLoading(true), call onConfirm()
  → On success: close modal, showToast('success')
  → On error: show error in modal, re-enable confirm button
```

---

### MW-003: Bible Projection Workflow

**Entry Points:** View > Bible (Ctrl+B), Projection Mode Bible panel  
**Backend:** All `db:get-bible-*` IPC channels exist  
**Missing:** Navigation entry point + Projection Mode integration  
**Orchestration:**

```
Operator opens Bible screen
  → Select translation → Select book → Select chapter
  → Select verse range → Preview in projection preview panel
  → Click "Project" → generateBibleSlide(verse) → setSlides([bibleSlide])
  → TAKE → live output
```

---

### MW-004: Announcement/Custom Slide Projection Workflow

**Entry Points:** Projection Mode (no panel exists)  
**Backend:** All `db:get-custom-slides` IPC channels exist  
**Missing:** `AnnouncementPanel` in Projection Mode  
**Orchestration:**

```
Operator opens Announcement panel (new tab in bottom workspace)
  → Load custom slides by type
  → Click slide → cue in preview
  → TAKE → live output
  → Slide auto-advances if display_duration set
```

---

### MW-005: Song Relations Workflow

**Entry Points:** Management Mode inspector "Relasi" button  
**Backend:** `db:get/add/delete-song-relations` all exist  
**Missing:** `SongRelationsModal`  
**Orchestration:**

```
User clicks Relasi → OPEN_MODAL('song-relations', { songId })
  → Load relations via getSongRelations(songId)
  → Display: related songs list with relation type
  → Add relation: search songs → select → set type → addSongRelation()
  → Remove: confirm → deleteSongRelation()
```

---

### MW-006: Crash Recovery Dialog Workflow

**Entry Points:** App startup after crash  
**Backend:** `db:get-recovery-state` exists; `useCrashRecovery` hook exists  
**Missing:** Recovery dialog UI  
**Orchestration:**

```
App starts → useCrashRecovery checks getRecoveryState()
  → If needsRecovery: OPEN_MODAL('crash-recovery', { state })
  → Dialog: "Session sebelumnya tidak ditutup dengan benar. Pulihkan?"
  → Restore: load playlist, song, slide, projectionState
  → Dismiss: markCleanExit(), continue fresh
```

---

### MW-007: Import Progress Workflow

**Entry Points:** Import/Export screen, Management Mode JSON import  
**Backend:** `importSongsFromJson()` returns `ImportSongsFromJsonResult`  
**Missing:** Progress dialog showing import results  
**Orchestration:**

```
User triggers import → show ImportProgressDialog (loading state)
  → Run import → receive ImportSongsFromJsonResult
  → Show results: total, inserted, skipped, conflicts, errors
  → If errors: show error list (first 10)
  → Close → reload songs
```

---

## 1.4 Broken State Registry

### BS-001: Active Playlist Lost on App Restart

| Field                | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| **ID**               | BS-001                                                              |
| **Current Behavior** | `usePlaylistStore.activePlaylist` is not persisted; lost on restart |
| **Root Cause**       | `usePlaylistStore` has no `persist` middleware                      |
| **Impact**           | Operators must re-select playlist every session                     |
| **Fix**              | Persist `activePlaylist.id` in localStorage; restore on bootstrap   |

---

### BS-002: Panel Layout Not Persisted (Projection Bottom)

| Field                | Value                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **ID**               | BS-002                                                                                                           |
| **Current Behavior** | `usePanelLayoutStore` IS persisted, but Projection Mode bottom workspace uses 3 panels while store only tracks 2 |
| **Root Cause**       | `projectionBottom` stores `[number, number]` but Projection Mode has 3 panels                                    |
| **Fix**              | Extend `PanelLayoutSizes.projectionBottom` to `[number, number, number]`                                         |

---

### BS-003: Timer Not Persisted Across Mode Switches

| Field                | Value                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| **ID**               | BS-003                                                                                |
| **Current Behavior** | `timerElapsed` and `timerRunning` reset when switching modes                          |
| **Root Cause**       | `useProjectionStore` is not persisted; timer state is ephemeral                       |
| **Impact**           | Service timer resets if operator accidentally switches modes                          |
| **Fix**              | Persist `timerElapsed` and `timerRunning` in `usePanelLayoutStore` or dedicated store |

---

### BS-004: Recovery State Not Saved on Every Slide Change

| Field                | Value                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| **ID**               | BS-004                                                                          |
| **Current Behavior** | `saveSessionState()` is called manually; not on every slide navigation          |
| **Root Cause**       | No automatic session save on projection state changes                           |
| **Impact**           | Crash recovery may restore to stale state                                       |
| **Fix**              | Subscribe to `useProjectionStore` in `useCrashRecovery`; debounce save (2000ms) |

---

## 1.5 Missing Modal Registry

| ID     | Modal                 | Priority    | Backend Ready   | Complexity |
| ------ | --------------------- | ----------- | --------------- | ---------- |
| MM-001 | CreatePlaylistDialog  | 🔴 Critical | ✅              | Low        |
| MM-002 | DeleteConfirmDialog   | 🔴 Critical | ✅              | Low        |
| MM-003 | CrashRecoveryDialog   | 🔴 Critical | ✅              | Low        |
| MM-004 | SongRelationsModal    | 🟡 High     | ✅              | Medium     |
| MM-005 | ImportProgressDialog  | 🟡 High     | ✅              | Medium     |
| MM-006 | IntegrityCheckDialog  | 🟡 High     | ✅              | Medium     |
| MM-007 | BiblePickerDialog     | 🟡 High     | ✅              | High       |
| MM-008 | AnnouncementEditor    | 🟡 High     | ✅              | High       |
| MM-009 | MediaImportDialog     | 🟡 High     | ✅              | Medium     |
| MM-010 | DuplicateSongDialog   | 🟠 Medium   | ❌ (needs IPC)  | Low        |
| MM-011 | NotificationPanel     | 🟠 Medium   | ❌ (in-process) | Medium     |
| MM-012 | FilterDropdown        | 🟠 Medium   | ✅              | Low        |
| MM-013 | SceneConfigDialog     | 🟠 Medium   | ✅              | High       |
| MM-014 | TagManagerDialog      | 🟠 Medium   | ✅              | Medium     |
| MM-015 | PlaylistPickerDialog  | 🟠 Medium   | ✅              | Low        |
| MM-016 | ExportSongDialog      | 🟠 Medium   | ✅              | Low        |
| MM-017 | SongHistoryPanel      | 🟠 Medium   | ✅              | Low        |
| MM-018 | StorageStatsDialog    | 🟠 Medium   | ❌ (needs IPC)  | Low        |
| MM-019 | HymnalIntegrityDialog | 🟠 Medium   | ✅              | Medium     |
| MM-020 | BackupProgressDialog  | 🟠 Medium   | ✅              | Low        |

---

# PART 2: MODAL ORCHESTRATION ARCHITECTURE

## 2.1 Global Modal Manager Design

The current application has no centralized modal system. Each modal is managed with ad-hoc `useState` inside the component that needs it. This creates:

- Duplicated open/close logic across 8+ components
- No modal stacking support
- No promise-based async handling
- No focus management coordination
- No keyboard escape chain

**Architecture Decision:** Build a lightweight `useModalStore` (Zustand) that acts as a centralized modal registry. This avoids a heavy modal framework while solving all coordination problems.

### 2.1.1 Modal Store Architecture

```typescript
// src/renderer/src/store/useModalStore.ts

type ModalId =
  | 'create-playlist'
  | 'confirm-delete'
  | 'crash-recovery'
  | 'song-relations'
  | 'import-progress'
  | 'integrity-check'
  | 'bible-picker'
  | 'announcement-editor'
  | 'media-import'
  | 'duplicate-song'
  | 'notification-panel'
  | 'filter-dropdown'
  | 'scene-config'
  | 'tag-manager'
  | 'playlist-picker'
  | 'export-song'
  | 'song-history'
  | 'storage-stats'
  | 'hymnal-integrity'
  | 'backup-progress'

interface ModalEntry {
  id: ModalId
  props: Record<string, unknown>
  // Promise resolution for async modals
  resolve?: (result: unknown) => void
  reject?: (reason: unknown) => void
}

interface ModalStore {
  stack: ModalEntry[]
  // Open a modal (fire-and-forget)
  open: (id: ModalId, props?: Record<string, unknown>) => void
  // Open a modal and await its result (promise-based)
  openAsync: <T>(id: ModalId, props?: Record<string, unknown>) => Promise<T>
  // Close the top modal
  close: () => void
  // Close a specific modal by id
  closeById: (id: ModalId) => void
  // Close all modals
  closeAll: () => void
  // Check if a modal is open
  isOpen: (id: ModalId) => boolean
  // Get props for a modal
  getProps: (id: ModalId) => Record<string, unknown> | null
}
```

### 2.1.2 Modal Lifecycle State Machine

```
CLOSED
  ↓ open() / openAsync()
OPENING (animation: scale(0.96)+opacity(0) → scale(1)+opacity(1), 200ms)
  ↓ animation complete
ACTIVE
  ├── VALIDATING (form submit in progress)
  │     ↓ validation passes
  ├── LOADING (async operation in progress)
  │     ├── SUCCESS → CLOSING
  │     └── ERROR → ACTIVE (error shown inline)
  └── CLOSING (animation: scale(1)+opacity(1) → scale(0.96)+opacity(0), 150ms)
        ↓ animation complete
CLOSED
```

### 2.1.3 Modal Stacking Rules

```
Stack behavior:
- Modals stack on top of each other (z-index increments by 10 per level)
- Maximum stack depth: 3 (prevents infinite nesting)
- Escape key closes TOP modal only
- Backdrop click closes TOP modal only (if dismissible)
- Destructive modals (confirm-delete, crash-recovery): backdrop click DISABLED
- closeAll() used only for emergency/logout scenarios

Stack example:
  [0] create-playlist (base)
  [1] playlist-picker (opened from within create-playlist)
  Escape → closes playlist-picker → create-playlist remains
```

### 2.1.4 Promise-Based Modal Pattern

```typescript
// Usage in component:
const { openAsync } = useModalStore()

const handleDelete = async (song: Song) => {
  const confirmed = await openAsync<boolean>('confirm-delete', {
    title: `Hapus "${song.title}"?`,
    description: 'Tindakan ini tidak dapat dibatalkan.',
    confirmLabel: 'Hapus',
    danger: true
  })
  if (!confirmed) return
  await window.api.songs.delete(song.id)
  showToast('Lagu berhasil dihapus', 'success')
}

// Inside ConfirmDialog:
const { close, getProps } = useModalStore()
const props = getProps('confirm-delete')

const handleConfirm = () => {
  props.resolve(true) // resolves the openAsync promise
  close()
}
const handleCancel = () => {
  props.resolve(false)
  close()
}
```

### 2.1.5 Modal Registry Component

```typescript
// src/renderer/src/components/modals/ModalRegistry.tsx
// Renders the active modal stack from useModalStore

export function ModalRegistry(): React.JSX.Element {
  const { stack } = useModalStore()

  return (
    <AnimatePresence>
      {stack.map((entry, index) => (
        <ModalRenderer
          key={entry.id}
          entry={entry}
          zIndex={1400 + index * 10}
        />
      ))}
    </AnimatePresence>
  )
}
```

---

## 2.2 Modal Type Specifications

### 2.2.1 CreatePlaylistDialog

```
Size: md (520px)
Dismissible: Yes (backdrop click)
Async: Yes (returns Playlist | null)

Fields:
  name: string (required, max 100 chars)
  service_date: date (optional, defaults to today)
  description: string (optional, max 500 chars)

Validation:
  - name: required, non-empty after trim
  - service_date: valid date format if provided

Submit flow:
  → setLoading(true)
  → usePlaylistStore.createPlaylist(name, date)
  → On success: resolve(playlist), close, showToast
  → On error: show inline error, setLoading(false)

Keyboard:
  Enter: submit (when form valid)
  Escape: cancel
  Tab: cycle fields
```

### 2.2.2 DeleteConfirmDialog

```
Size: sm (400px)
Dismissible: No (backdrop click disabled)
Async: Yes (returns boolean)

Props:
  title: string
  description?: string
  itemName?: string
  confirmLabel?: string (default: "Hapus")
  danger: boolean (default: true)

Submit flow:
  → setLoading(true)
  → call onConfirm() (passed as prop)
  → On success: resolve(true), close
  → On error: show error message, setLoading(false), re-enable button

Keyboard:
  Enter: confirm (when focused on confirm button)
  Escape: cancel → resolve(false)
```

### 2.2.3 CrashRecoveryDialog

```
Size: md (520px)
Dismissible: No
Async: Yes (returns 'restore' | 'dismiss')

Props:
  recoveryState: RecoveryState

Content:
  - Warning icon
  - "Session sebelumumnya tidak ditutup dengan benar"
  - Details: playlist name, song title, slide index
  - Two actions: "Pulihkan Session" | "Mulai Baru"

Restore flow:
  → Load playlist by recoveryState.playlistId
  → Load song by recoveryState.songId
  → Set slide index
  → Set projectionState
  → markCleanExit() (clear recovery flag)
  → resolve('restore'), close

Dismiss flow:
  → markCleanExit()
  → resolve('dismiss'), close
```

### 2.2.4 ImportProgressDialog

```
Size: lg (640px)
Dismissible: No (during import), Yes (after complete)
Async: No (fire-and-forget)

States:
  loading: "Mengimpor lagu..."
  complete: shows ImportSongsFromJsonResult
    - Total: N lagu diproses
    - Inserted: N lagu baru
    - Skipped: N lagu dilewati
    - Conflicts: N konflik
    - Errors: N gagal
    - Error list (first 10 errors)

Actions:
  loading: no actions
  complete: "Tutup" button → close + reload songs
```

### 2.2.5 SongRelationsModal

```
Size: lg (640px)
Dismissible: Yes
Async: No

Props:
  songId: number
  songTitle: string

Content:
  - Current relations list (type badge + song title + remove button)
  - Add relation section:
    - Search input → song picker
    - Relation type selector (translation/same_tune/same_text/medley/response)
    - Add button

IPC:
  Load: getSongRelations(songId)
  Add: addSongRelation({ source_song_id, target_song_id, relation_type })
  Remove: deleteSongRelation(id) → confirm first
```

---

# PART 3: IPC REFACTOR ARCHITECTURE

## 3.1 IPC Contract System

### 3.1.1 Current IPC Problems

From the audit:

1. **No typed contracts** — `ipcMain.handle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))` — `hymnalId` is `unknown` at the call site
2. **No timeout handling** — long-running queries can hang indefinitely
3. **Inconsistent error format** — some handlers throw raw errors, some return null
4. **No request validation** — `safeIpcHandle` exists for some channels but not all
5. **Channel naming inconsistency** — `display_get-all` uses underscore, all others use colon
6. **No retry logic** — transient failures have no recovery path

### 3.1.2 IPC Channel Naming Convention (Normalized)

```
Pattern: [domain]:[action]-[resource]

Current violations:
  display_get-all → RENAME TO: display:get-all

Standard format:
  db:get-songs          ✅
  db:add-song           ✅
  projection:show       ✅
  window:minimize       ✅
  display_get-all       ❌ → display:get-all
```

**Migration:** Add alias in `ipc-handlers.ts` for backward compatibility during transition:

```typescript
// Alias for backward compatibility
ipcMain.handle('display_get-all', () => getAllDisplays()) // keep existing
ipcMain.handle('display:get-all', () => getAllDisplays()) // add normalized
```

### 3.1.3 IPC Channel Groups (Complete Normalized Map)

```
WINDOW CONTROLS:
  window:minimize
  window:maximize
  window:close
  window:is-maximized
  window:maximized-changed (event)

SYSTEM:
  system:get-memory
  system:get-storage-stats    ← NEW (DUI-006 fix)
  system:set-mode
  app:theme-mode-set
  app:theme-updated (event)

PROJECTION:
  projection:slide-update
  projection:state-change
  projection:theme-update
  projection:show
  projection:hide

STAGE:
  stage:show
  stage:hide

DISPLAY:
  display:get-all             ← NORMALIZED (was display_get-all)
  display:is-projection-visible
  display:changed (event)

HEALTH:
  health:heartbeat
  health:heartbeat-ack (event)
  health:get-status
  health:status-update (event)

DATABASE — HYMNALS:
  db:get-hymnals
  db:add-hymnal
  db:update-hymnal
  db:delete-hymnal

DATABASE — SONGS:
  db:get-songs
  db:search-songs
  db:add-song
  db:import-json
  db:update-song
  db:delete-song
  db:duplicate-song           ← NEW (FI-003 fix)
  db:clear-lyrics
  db:bulk-assign-song-background
  db:toggle-favorite
  db:get-song-relations
  db:add-song-relation
  db:delete-song-relation

DATABASE — PLAYLISTS:
  db:get-playlists
  db:add-playlist
  db:update-playlist
  db:delete-playlist
  db:get-playlist-items
  db:add-playlist-item
  db:update-playlist-item
  db:delete-playlist-item
  db:reorder-playlist-items

DATABASE — SETTINGS:
  db:get-settings
  db:update-setting

DATABASE — HISTORY:
  db:log-history
  db:get-recent-songs

DATABASE — BACKUP/RECOVERY:
  db:create-backup
  db:restore-backup
  db:reseed
  db:save-session
  db:get-recovery-state
  db:mark-clean-exit
  db:check-multi-hymnal-integrity

DATABASE — MEDIA:
  db:get-media-assets
  db:import-media-assets
  db:update-media-asset
  db:delete-media-asset
  db:increment-media-asset-usage
  db:get-media-collections
  db:add-media-collection
  db:update-media-collection
  db:delete-media-collection
  db:add-assets-to-media-collection
  db:remove-assets-from-media-collection
  db:reorder-media-collection-items
  db:bulk-update-media-assets
  db:bulk-delete-media-assets

DATABASE — BIBLE:
  db:get-bible-translations
  db:add-bible-translation
  db:delete-bible-translation
  db:get-bible-books
  db:add-bible-book
  db:get-bible-verses
  db:get-bible-verse-range
  db:add-bible-verse
  db:add-bible-verses-batch
  db:search-bible-verses

DATABASE — CUSTOM SLIDES:
  db:get-custom-slides
  db:get-slides-by-type
  db:add-custom-slide
  db:update-custom-slide
  db:delete-custom-slide
  db:get-slide-groups
  db:add-slide-group
  db:update-slide-group
  db:delete-slide-group
  db:get-group-slides
  db:add-slide-to-group
  db:remove-slide-from-group
  db:reorder-group-slides

FILE:
  file:parse-excel
  file:show-save-dialog
  file:write-json
```

### 3.1.4 New IPC Handlers Required

**`system:get-storage-stats`** (fixes DUI-006):

```typescript
// Main process handler
ipcMain.handle('system:get-storage-stats', async () => {
  const { statSync } = await import('fs')
  const dbPath = join(app.getPath('userData'), 'sion.db')
  const mem = await process.getProcessMemoryInfo?.()

  let dbSizeBytes = 0
  try {
    dbSizeBytes = statSync(dbPath).size
  } catch {
    /* ignore */
  }

  return {
    dbSizeBytes,
    dbSizeMB: Math.round((dbSizeBytes / (1024 * 1024)) * 10) / 10,
    memoryPrivateMB: mem ? Math.round(mem.private / 1024) : null,
    memorySharedMB: mem ? Math.round(mem.shared / 1024) : null
  }
})
```

**`db:duplicate-song`** (fixes FI-003):

```typescript
// Database function
export function duplicateSong(songId: number): Song {
  const original = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId)
  if (!original) throw new Error('Song not found')

  const result = db
    .prepare(
      `
    INSERT INTO songs (hymnal_id, number, title, alternate_title, lyrics_raw,
      category, language, author, composer, key_note, time_signature, tempo,
      tags, theme, scripture_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      original.hymnal_id,
      `${original.number}-copy`,
      `${original.title} (Salinan)`,
      original.alternate_title,
      original.lyrics_raw
      // ... rest of fields
    )
  return db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid)
}
```

### 3.1.5 IPC Security Hardening

**Current state:** `safeIpcHandle` wrapper exists for destructive operations. Standard `ipcMain.handle` used for reads.

**Normalization plan:**

```typescript
// Wrap ALL handlers in safeIpcHandle for consistent error handling
// Current: ipcMain.handle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))
// Normalized:
safeIpcHandle('db:get-songs', (hymnalId?: unknown) => {
  const id =
    hymnalId === undefined
      ? undefined
      : typeof hymnalId === 'number'
        ? hymnalId
        : parseInt(String(hymnalId), 10)
  return getSongs(Number.isFinite(id) ? id : undefined)
})
```

**Preload bridge validation:**

```typescript
// All preload functions validate types before sending
songs: {
  getAll: (hymnalId?: number): Promise<unknown[]> => {
    if (hymnalId !== undefined && !Number.isInteger(hymnalId)) {
      return Promise.reject(new Error('hymnalId must be an integer'))
    }
    return ipcRenderer.invoke('db:get-songs', hymnalId)
  }
}
```

### 3.1.6 IPC Timeout Strategy

```typescript
// Wrap long-running IPC calls with timeout
function invokeWithTimeout<T>(channel: string, timeoutMs: number, ...args: unknown[]): Promise<T> {
  return Promise.race([
    ipcRenderer.invoke(channel, ...args) as Promise<T>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`IPC timeout: ${channel}`)), timeoutMs)
    )
  ])
}

// Usage:
// Short operations (< 1s): no timeout needed
// DB queries: 5000ms timeout
// File operations: 30000ms timeout
// Import operations: 120000ms timeout
```

### 3.1.7 IPC Performance: Stale Listener Prevention

```typescript
// Current problem: useAppBootstrap registers listeners but cleanup
// depends on component unmount. If component remounts, duplicate listeners.

// Solution: Named listener registry in preload
const listenerRegistry = new Map<string, () => void>()

function registerListener(key: string, register: () => () => void): void {
  // Remove existing listener with same key
  listenerRegistry.get(key)?.()
  const cleanup = register()
  listenerRegistry.set(key, cleanup)
}

// Usage in useAppBootstrap:
registerListener('display-changed', () => window.api.display.onDisplayChanged(handleDisplayChange))
```

---

# PART 4: STATE MANAGEMENT REFACTOR

## 4.1 Store Architecture Map

### 4.1.1 Current Store Inventory

| Store                  | Persisted       | Responsibility                                 | Issues                                 |
| ---------------------- | --------------- | ---------------------------------------------- | -------------------------------------- |
| `useAppStore`          | ❌              | Songs, hymnals, screen routing, display, toast | Too broad — owns too much              |
| `useModeStore`         | ✅ localStorage | currentMode, theme, isFirstInstall             | Good — keep as-is                      |
| `useProjectionStore`   | ❌              | Slides, program state, timer, NEXT state       | Good — add timer persistence           |
| `usePlaylistStore`     | ❌              | Playlists, items, active playlist              | Missing persistence for activePlaylist |
| `useAtmosphereStore`   | ❌              | Atmosphere config                              | Not read in audit — verify usage       |
| `useAnnouncementStore` | ❌              | Custom slides                                  | Not read in audit — verify usage       |
| `useCacheStore`        | ❌              | Media cache                                    | In-memory only — correct               |
| `useHealthStore`       | ❌              | IPC health endpoints                           | In-memory only — correct               |
| `usePanelLayoutStore`  | ✅ localStorage | Panel sizes                                    | Needs 3-panel support                  |
| `useModalStore`        | ❌              | Modal stack                                    | NEW — needs to be created              |

### 4.1.2 Store Ownership Rules

**Rule 1: Single Responsibility**
Each store owns exactly one domain. No store reads from another store directly.

**Rule 2: No Cross-Store Mutations**
Stores do not call other stores' actions. Orchestration happens in components or hooks.

**Rule 3: IPC Calls Belong in Stores**
All `window.api.*` calls happen inside store actions, not in components.

**Rule 4: Derived State via Selectors**
Computed values (filtered lists, counts) are computed via `useMemo` in components, not stored.

### 4.1.3 useAppStore Decomposition

`useAppStore` is currently too broad. It owns songs, hymnals, screen routing, display state, toast, and workspace name. This creates unnecessary re-renders.

**Proposed decomposition:**

```
useAppStore (keep, reduce scope):
  - currentScreen: AppScreen
  - setScreen()
  - isLoading, setLoading()
  - loadingMessage
  - toast, showToast()
  - isFocusMode, toggleFocusMode()
  - isLyricsFullscreen, setLyricsFullscreen()
  - isMaximized, setMaximized()

useSongStore (NEW — extracted from useAppStore):
  - songs: Song[]
  - selectedSong: Song | null
  - editingSong: Song | null
  - searchQuery: string
  - activeFilter: FilterTab
  - searchOffset, hasMoreResults, isLoadingMore
  - loadSongs(), searchSongs(), loadMoreSongs()
  - setSelectedSong(), setEditingSong()
  - toggleFavorite() ← optimistic update

useHymnalStore (NEW — extracted from useAppStore):
  - hymnals: Hymnal[]
  - selectedHymnalId: number | null
  - loadHymnals()
  - setSelectedHymnalId()

useDisplayStore (NEW — extracted from useAppStore):
  - displayCount: number
  - isProjectionVisible: boolean
  - isStageDisplayVisible: boolean
  - workspaceName: string
  - serviceTimerStartTime: number | null
  - setDisplayCount(), setProjectionVisible(), setStageDisplayVisible()
  - startServiceTimer(), stopServiceTimer(), resetServiceTimer()
```

**Migration strategy:** Extract stores one at a time. Update imports. No breaking changes to existing components — use re-exports from `useAppStore` during transition.

### 4.1.4 usePlaylistStore Normalization

```typescript
// Add persistence for activePlaylist.id
export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      // ... existing state
      _persistedActivePlaylistId: null as number | null
    }),
    {
      name: 'sion-playlist-storage',
      partialize: (state) => ({
        _persistedActivePlaylistId: state.activePlaylist?.id ?? null
      })
    }
  )
)

// On bootstrap: restore active playlist
// In useAppBootstrap:
const persistedId = usePlaylistStore.getState()._persistedActivePlaylistId
if (persistedId) {
  const playlists = await window.api.playlists.getAll()
  const playlist = playlists.find((p) => p.id === persistedId)
  if (playlist) {
    usePlaylistStore.getState().setActivePlaylist(playlist)
    await usePlaylistStore.getState().loadPlaylistItems(persistedId)
  }
}
```

### 4.1.5 useProjectionStore Timer Persistence

```typescript
// Add timer persistence to usePanelLayoutStore (already persisted)
// OR add a dedicated useServiceStore

// Option A: Add to usePanelLayoutStore (simpler)
interface PanelLayoutState {
  // ... existing
  serviceTimer: {
    elapsed: number
    running: boolean
    startedAt: number | null
  }
}

// Option B: New useServiceStore (cleaner separation)
export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      timerElapsed: 0,
      timerRunning: false,
      timerStartedAt: null as number | null
      // ... timer actions
    }),
    { name: 'sion-service-storage' }
  )
)
```

**Decision:** Option B — `useServiceStore` — cleaner separation, avoids polluting panel layout store.

### 4.1.6 Projection Sync Architecture

```
Operator Action (keyboard/button)
  ↓
RuntimeCommandBus.execute(command)
  ↓
CommandHandler → useProjectionStore.action()
  ↓
Store mutation (slides, programSlide, projectionState)
  ↓
sendLiveSlide(slideData) [inside store action]
  ↓
window.api.projection.slideUpdate(slideData)
  ↓
IPC: 'projection:slide-update' → main process
  ↓
updateSlideData(slideData) → broadcast to:
  ├── projectionWindow.webContents.send('projection:slide-update', slideData)
  └── stageDisplayWindow.webContents.send('projection:slide-update', slideData)
```

**Reconnect behavior:**

```
projectionWindow reconnects (did-finish-load)
  ↓
sendProjectionSnapshot(projectionWindow)
  ↓
Send: latestProjectionState, latestSlideData, latestTheme
  ↓
ProjectionApp receives and renders current state
```

**Recovery sync:**

```
App crash → restart
  ↓
getRecoveryState() → { needsRecovery: true, playlistId, songId, slideIndex }
  ↓
CrashRecoveryDialog shown
  ↓
User confirms restore
  ↓
loadPlaylist(playlistId) → loadPlaylistItems()
  ↓
loadSong(songId) → generateSlidesForSong()
  ↓
useProjectionStore.setSlides(slides)
  ↓
useProjectionStore.setCurrentSlideIndex(slideIndex)
  ↓
markCleanExit() (clear recovery flag)
```

### 4.1.7 State Performance Rules

```typescript
// Rule 1: Selector granularity — subscribe to minimum needed
// BAD:
const store = useAppStore()
// GOOD:
const selectedSong = useAppStore((s) => s.selectedSong)

// Rule 2: Stable selectors — avoid inline object creation
// BAD:
const { songs, hymnals } = useAppStore((s) => ({ songs: s.songs, hymnals: s.hymnals }))
// GOOD (use shallow):
import { useShallow } from 'zustand/react/shallow'
const { songs, hymnals } = useAppStore(useShallow((s) => ({ songs: s.songs, hymnals: s.hymnals })))

// Rule 3: Memoize derived state
const filteredSongs = useMemo(() => songs.filter((s) => matchesSong(s, query)), [songs, query])

// Rule 4: Avoid store subscriptions in render-heavy components
// Use getState() for one-time reads in event handlers
const handleAction = () => {
  const { selectedSong } = useAppStore.getState() // not a subscription
}
```
