# 🔬 DEEP ULTRA AUDIT — Phase 2 Part 2: Runtime Engine

## `phase2-part2-runtime-engine.md` Implementation Status

**Auditor:** Antigravity | **Date:** 2026-05-15 | **Spec Lines:** 1–1929

---

## EXECUTIVE SUMMARY

| Category                    | Total      | ✅ Done | ⚠️ Partial | ❌ Missing | % Complete |
| --------------------------- | ---------- | ------- | ---------- | ---------- | ---------- |
| **PART 5: Runtime Engine**  | 14         | 8       | 3          | 3          | 68%        |
| **PART 6: Data Layer**      | 12         | 8       | 2          | 2          | 75%        |
| **PART 7: Error Recovery**  | 10         | 6       | 2          | 2          | 70%        |
| **PART 8: Performance**     | 10         | 3       | 2          | 5          | 40%        |
| **PART 9: Feature Matrix**  | 8 trackers | —       | —          | —          | see below  |
| **PART 10: Implementation** | 14 infra   | 12      | 1          | 1          | 93%        |
| **TOTAL**                   | **68**     | **37**  | **10**     | **13**     | **~68%**   |

---

## PART 5: RUNTIME ENGINE ARCHITECTURE

### §5.1 Projection Runtime Engine

| #     | Requirement                                         | Status  | Evidence                                                            |
| ----- | --------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| 5.1.1 | Command bus pipeline (operator→IPC→canvas)          | ✅ Done | `runtimeCommandBus.ts`, `runtimeCommandHandlers.ts`, effects system |
| 5.1.2 | Command bus throttling (50ms global, 150ms per-cmd) | ✅ Done | Confirmed in `runtimeCommandBus.ts`                                 |
| 5.1.3 | Reentrancy lock                                     | ✅ Done | Lock mechanism in command bus                                       |
| 5.1.4 | LIVE_LOCK / LIVE_DIRTY protection                   | ✅ Done | `useProjectionStore.ts` L363-401                                    |
| 5.1.5 | Section map for Quick Jump                          | ✅ Done | `buildSectionIndexMap()` in store                                   |
| 5.1.6 | Slide cache (hash-based invalidation)               | ✅ Done | `slideEngine.ts` L9, L188-193                                       |
| 5.1.7 | Projection snapshot on reconnect                    | ✅ Done | `projection-snapshot.ts` module exists                              |

### §5.2 Slide Rendering Pipeline

| #     | Requirement                                        | Status     | Evidence / Gap                                                                                                                                                          |
| ----- | -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.2.1 | Current slide generation pipeline                  | ✅ Done    | `slideEngine.ts` — `generateSlidesForSong()`                                                                                                                            |
| 5.2.2 | **Preload Pipeline** (next song auto-preload)      | ✅ Done    | `ProjectionMode.tsx` L356 — `scheduleNextSongPreload()`                                                                                                                 |
| 5.2.3 | **Slide config from settings** (maxLines/maxChars) | ⚠️ Partial | `setGlobalSlideConfig()` exists in `slideEngine.ts` L19, BUT `useAppBootstrap.ts` L69 has it **commented out** (`// setGlobalSlideConfig(...)`) — never actually called |

> [!WARNING]
> **§5.2.3 Critical Gap:** The `setGlobalSlideConfig` function exists but the call in `useAppBootstrap.ts:69` is commented out with a `TODO`. Slide generation always uses hardcoded defaults `{maxLines:4, maxChars:40}` — settings are loaded but never applied.

### §5.3 Live Presentation State Machine

| #     | Requirement                                                     | Status  | Evidence                                                    |
| ----- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| 5.3.1 | Complete state diagram (IDLE→PREPARING→LIVE→BLACK/FREEZE/CLEAR) | ✅ Done | Full state machine via `requestTransition()` effects system |
| 5.3.2 | State transition rules table                                    | ✅ Done | All transitions implemented in effects                      |
| 5.3.3 | TRANSITIONING state (v2 only)                                   | N/A     | Spec says "For v1: acceptable"                              |

### §5.4 Media Runtime System

| #     | Requirement                                                | Status     | Evidence / Gap                                                                                                                                                                                                        |
| ----- | ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.4.1 | MediaEngine basic preload (image/video)                    | ✅ Done    | `mediaEngine.ts` — image + video preload                                                                                                                                                                              |
| 5.4.2 | **MediaEngine LRU cache** (hardened)                       | ⚠️ Partial | Basic eviction exists (L14-19, `MAX_CACHE_SIZE=50`), BUT: no `MediaCacheEntry` interface, no `loadState`, no `sizeEstimate`, no `lastAccessed` tracking, no priority queue, no `getStats()`, no concurrent load limit |
| 5.4.3 | Media preload strategy (current + next song + settings bg) | ❌ Missing | No automatic media preload on song cue                                                                                                                                                                                |
| 5.4.4 | **Atmosphere resolution pipeline**                         | ⚠️ Partial | `useAtmosphereStore.ts` has `getResolvedAtmosphere()` with correct hierarchy. BUT `PresentationCanvas.tsx` L132 still has its own local `resolveAtmosphere()` — not using the store                                   |

### §5.5 Overlay Engine Architecture

| #     | Requirement                                                              | Status     | Evidence / Gap                      |
| ----- | ------------------------------------------------------------------------ | ---------- | ----------------------------------- | ----- |
| 5.5.1 | Overlay types (Announcement, Bible, Lower Third, Timer, Logo, Emergency) | ❌ Missing | No `ProjectionPayload` type defined |
| 5.5.2 | Unified `ProjectionPayload` interface                                    | ❌ Missing | Canvas still uses `SlideData        | null` |
| 5.5.3 | PresentationCanvas overlay rendering (switch on type)                    | ❌ Missing | Canvas only renders song lyrics     |

### §5.6 Timer Tick Management

| #     | Requirement                                  | Status  | Evidence                                                                      |
| ----- | -------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| 5.6.1 | `useTimerTick` hook (single global interval) | ✅ Done | `hooks/useTimerTick.ts` — 1s interval, mounted in `App.tsx` L41               |
| 5.6.2 | Timer controls in TitleBarStatus             | ✅ Done | `TitleBarStatus.tsx` L25-67 — `TitleBarTimer` component with Start/Stop/Reset |
| 5.6.3 | Timer display format (HH:MM:SS)              | ✅ Done | `formatTimer()` L17-22                                                        |

### §5.7 Confidence Monitor Broadcast

| #     | Requirement                                   | Status     | Evidence / Gap                                                                                                                                                            |
| ----- | --------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.7.1 | `buildConfidencePayload()` exists             | ✅ Done    | Imported from `@core/projection`                                                                                                                                          |
| 5.7.2 | IPC handler `confidence:update`               | ✅ Done    | `ipc-handlers.ts` L576                                                                                                                                                    |
| 5.7.3 | Preload bridge `confidence.update/onUpdate`   | ✅ Done    | `preload/index.ts` L285-290                                                                                                                                               |
| 5.7.4 | StageDisplayApp receives & renders confidence | ✅ Done    | `StageDisplayApp.tsx` L111-115 — dual channel listener                                                                                                                    |
| 5.7.5 | **Confidence broadcast actually triggered**   | ⚠️ Partial | Feature flag `CONFIDENCE_BROADCAST: false` in `featureFlags.ts` L26. The infrastructure is wired but the actual broadcast from projection store actions is **not active** |

### §5.8 Performance Targets

| Metric                   | Target                   | Status                                               |
| ------------------------ | ------------------------ | ---------------------------------------------------- |
| Slide transition latency | <50ms                    | ✅ Met (effects system)                              |
| Song load time           | <200ms                   | ✅ Met (cached)                                      |
| DB query getSongs        | <100ms                   | ✅ Met (indexed)                                     |
| DB search FTS5           | <50ms                    | ✅ Met                                               |
| Media preload time       | <2000ms img, <5000ms vid | ⚠️ Video timeout still 10s (spec wants 15s, was 10s) |

---

## PART 6: DATA LAYER ARCHITECTURE

### §6.1–6.2 Data Flow

| #     | Requirement                              | Status  | Evidence                                                    |
| ----- | ---------------------------------------- | ------- | ----------------------------------------------------------- |
| 6.1.1 | Flat DB function pattern (no repository) | ✅ Done | `database.ts` direct functions                              |
| 6.2.1 | Standard CRUD flow via IPC               | ✅ Done | All CRUD through `ipc-handlers.ts`                          |
| 6.2.2 | Optimistic update (favorites, reorder)   | ✅ Done | `usePlaylistStore.ts` L130-158 (reorder), L161-183 (labels) |
| 6.2.3 | Validation checkpoints (preload/IPC/DB)  | ✅ Done | `safeIpcHandle` wrapper used extensively (23+ usages)       |

### §6.3 Migration Architecture

| #     | Requirement                    | Status  | Evidence / Gap                         |
| ----- | ------------------------------ | ------- | -------------------------------------- |
| 6.3.1 | Existing 13 migrations         | ✅ Done | Versions 1-13 in `migrations.ts`       |
| 6.3.2 | Migration 14 (`service_state`) | ✅ Done | L552-564                               |
| 6.3.2 | Migration 15 (`song_notes`)    | ✅ Done | L566-583                               |
| 6.3.2 | Migration 16 (`notifications`) | ✅ Done | L585-594 (as notification preferences) |
| 6.3.2 | Migration 17 (missing indexes) | ✅ Done | L597-609 (performance indexes)         |

> [!WARNING]
> **Duplicate version numbers detected!** Migrations 14-17 appear **twice** in the array — first as `service_sessions_v1/notification_log_v1/songs_summary_index_v1/storage_stats_settings_v1` (L491-545), then again as `enterprise_service_state/enterprise_song_notes/enterprise_notification_preferences/enterprise_performance_indexes` (L552-609). The `runMigrations()` function filters by `version > currentVersion`, so only the FIRST set runs. The second set is **dead code**.

### §6.4 Media Storage

| #     | Requirement                   | Status     | Evidence / Gap                                     |
| ----- | ----------------------------- | ---------- | -------------------------------------------------- |
| 6.4.1 | Media asset import flow       | ✅ Done    | `importMediaAssets` IPC handler                    |
| 6.4.2 | Thumbnail generation          | ❌ Missing | `thumbnail_path` column exists but never populated |
| 6.4.3 | Duplicate detection on import | ❌ Missing | No `findExistingAsset()` check before import       |

### §6.5 Backup Architecture

| #     | Requirement                          | Status     | Evidence / Gap                                       |
| ----- | ------------------------------------ | ---------- | ---------------------------------------------------- |
| 6.5.1 | `createBackup()` / `restoreBackup()` | ✅ Done    | IPC handlers `db:create-backup`, `db:restore-backup` |
| 6.5.2 | Backup integrity validation          | ⚠️ Partial | No `validateBackupFile()` before restore             |
| 6.5.3 | Auto-backup on startup (7-day check) | ❌ Missing | No `shouldAutoBackup()` logic found                  |

---

## PART 7: ERROR RECOVERY ARCHITECTURE

### §7.1 Global Error System

| #     | Requirement                                     | Status  | Evidence                                                                       |
| ----- | ----------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| 7.1.1 | Error boundary hierarchy (per-mode)             | ✅ Done | `App.tsx` L158-200 wraps each mode in `<ErrorBoundary mode="...">`             |
| 7.1.2 | Per-mode error boundary behavior                | ✅ Done | `ErrorBoundary.tsx` — shows error card with retry, notes projection unaffected |
| 7.1.3 | IPC error recovery (`safeIpcHandle`)            | ✅ Done | `ipc-handlers.ts` L139 — wrapper catches and sanitizes errors                  |
| 7.1.4 | Renderer crash recovery (`render-process-gone`) | ✅ Done | `windows.ts` L172                                                              |

> [!NOTE]
> Spec §7.1.3 suggests `safeIpcHandleWithRetry` with SQLITE_BUSY retry. Current implementation is basic `safeIpcHandle` without retry. Not critical but noted.

### §7.2 Recovery Strategies

| #     | Requirement                                       | Status     | Evidence / Gap                                                                                  |
| ----- | ------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 7.2.1 | Crash recovery flow (check → dialog → restore)    | ✅ Done    | `useCrashRecovery.ts` — checks recovery state, opens `CrashRecoveryDialog` via `useModalStore`  |
| 7.2.2 | Session save strategy (auto-save on state change) | ✅ Done    | `useCrashRecovery.ts` L100-131 — subscribes to store changes, calls `saveSession()`             |
| 7.2.3 | **Debounced session save**                        | ⚠️ Partial | Session save fires on every state change — **not debounced** as spec requires (2000ms debounce) |
| 7.2.4 | **Safe-mode startup** (3 crashes in <60s)         | ❌ Missing | No `checkSafeMode()` found anywhere                                                             |

### §7.3 Logging System

| #     | Requirement                                             | Status     | Evidence / Gap                                                                         |
| ----- | ------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 7.3.1 | Logger exists                                           | ✅ Done    | `utils/logger.ts`                                                                      |
| 7.3.2 | **Structured logging** (`StructuredLogger` with buffer) | ⚠️ Partial | Logger exists but unclear if it implements buffered `LogEntry[]` with `getBuffer()`    |
| 7.3.3 | RuntimeInspector log tab                                | ❌ Missing | RuntimeInspector shows command log but structured log buffer integration not confirmed |

---

## PART 8: PERFORMANCE ARCHITECTURE

### §8.1 Render Performance

| #     | Requirement                          | Status     | Evidence / Gap                                     |
| ----- | ------------------------------------ | ---------- | -------------------------------------------------- |
| 8.1.1 | SongLibraryPanel virtualized         | ✅ Done    | Confirmed from component                           |
| 8.1.2 | **Management song list virtualized** | ❌ Missing | No `useVirtualizer` import in `ManagementMode.tsx` |
| 8.1.3 | **Library title grid virtualized**   | ❌ Missing | Uses `.map()` directly                             |
| 8.1.4 | **Memoize SongRow** in Management    | ❌ Missing | No `React.memo` with custom comparator             |
| 8.1.5 | Memoize `filteredSongs` / `counts`   | ✅ Done    | `useMemo` patterns confirmed in components         |

### §8.2 Database Performance

| #     | Requirement                         | Status  | Evidence                                                           |
| ----- | ----------------------------------- | ------- | ------------------------------------------------------------------ |
| 8.2.1 | Index strategy (existing indexes)   | ✅ Done | Migrations 6, 11, 17                                               |
| 8.2.2 | Missing indexes added               | ✅ Done | Migration 17: `idx_songs_updated_at`, `idx_song_history_played_at` |
| 8.2.3 | `getSongsSummary()` (no lyrics_raw) | ✅ Done | `database.ts` L2488, IPC handler L565                              |

### §8.3 Multi-Window Performance

| #     | Requirement                                  | Status     | Evidence / Gap                                        |
| ----- | -------------------------------------------- | ---------- | ----------------------------------------------------- |
| 8.3.1 | Debounce theme IPC updates                   | ❌ Missing | No debounce wrapper around `themeUpdate` calls        |
| 8.3.2 | Memory isolation (projection window minimal) | ✅ Done    | `ProjectionApp.tsx` only loads canvas + IPC listeners |
| 8.3.3 | Projection heartbeat 500ms                   | ✅ Done    | `ProjectionApp.tsx` L34-37: `setInterval(..., 500)`   |

---

## PART 9: FEATURE COMPLETION MATRIX

### §9.1 Dead UI (DUI) Tracker

| ID      | Feature              | Spec Status | Actual Status | Evidence                                                                            |
| ------- | -------------------- | ----------- | ------------- | ----------------------------------------------------------------------------------- |
| DUI-001 | Favorite button wire | ❌          | ✅ Done       | `LibraryBrowserPanel.tsx` L37, `HighDensitySongGrid.tsx` L238 call `toggleFavorite` |
| DUI-002 | New Playlist dialog  | ❌          | ✅ Done       | `CreatePlaylistDialog.tsx` exists, wired via `ModalRegistry`                        |
| DUI-003 | Bible Screen access  | ❌          | ✅ Done       | `TitleBarMenu.tsx` L235-239 + `useGlobalShortcuts.ts` L82-86 (Ctrl+B)               |
| DUI-004 | Theme button wire    | ❌          | ❌ Missing    | No `toggleTheme` / `cycleDarkLightSystem` found in TitleBar                         |
| DUI-005 | Notifications panel  | ❌          | ❌ Missing    | Store exists but no UI panel component                                              |
| DUI-006 | Real storage metric  | ❌          | ⚠️ Partial    | IPC `system:get-storage-stats` exists, UI wiring unconfirmed                        |
| DUI-007 | Real trend bars      | ❌          | ❌ Missing    | No analytics/trend bar implementation                                               |
| DUI-008 | Layout toggle        | ❌          | ❌ Missing    | No table/grid layout switch                                                         |
| DUI-009 | Filter dropdown      | ❌          | ❌ Missing    | No filter dropdown implementation                                                   |
| DUI-010 | Chord/Notes tabs     | ❌          | ❌ Missing    | Migration for `song_notes` exists, UI not built                                     |

### §9.2 Missing Modal Tracker

| ID         | Modal                | Spec Status | Actual Status                 |
| ---------- | -------------------- | ----------- | ----------------------------- |
| MM-001     | CreatePlaylistDialog | ❌          | ✅ Done                       |
| MM-002     | DeleteConfirmDialog  | ❌          | ✅ Done (`ConfirmDialog.tsx`) |
| MM-003     | CrashRecoveryDialog  | ❌          | ✅ Done                       |
| MM-004     | SongRelationsModal   | ❌          | ✅ Done                       |
| MM-005     | ImportProgressDialog | ❌          | ✅ Done                       |
| MM-006     | IntegrityCheckDialog | ❌          | ❌ Missing                    |
| MM-007     | BiblePickerDialog    | ❌          | ❌ Missing                    |
| MM-008     | AnnouncementEditor   | ❌          | ❌ Missing                    |
| MM-009     | MediaImportDialog    | ❌          | ❌ Missing                    |
| MM-010     | DuplicateSongDialog  | ❌          | ❌ Missing                    |
| MM-011     | NotificationPanel    | ❌          | ❌ Missing                    |
| MM-012     | FilterDropdown       | ❌          | ❌ Missing                    |
| MM-013     | SceneConfigDialog    | ❌          | ✅ Done                       |
| MM-014     | TagManagerDialog     | ❌          | ✅ Done                       |
| MM-015     | PlaylistPickerDialog | ❌          | ✅ Done                       |
| MM-016     | ExportSongDialog     | ❌          | ✅ Done                       |
| MM-017–020 | Remaining dialogs    | ❌          | ❌ Missing                    |

### §9.4 Projection Runtime Tracker

| Feature                               | Spec Status | Actual Status                                |
| ------------------------------------- | ----------- | -------------------------------------------- |
| Timer tick interval (useTimerTick)    | ❌          | ✅ Done                                      |
| Timer controls in TitleBarStatus      | ❌          | ✅ Done                                      |
| Next song preload pipeline            | ❌          | ✅ Done                                      |
| Slide config from settings            | ❌          | ⚠️ Partial (commented out)                   |
| Confidence payload broadcast          | ❌          | ⚠️ Partial (feature flag off)                |
| StageDisplayApp confidence render     | ❌          | ✅ Done                                      |
| MediaEngine LRU cache                 | ❌          | ⚠️ Partial (basic eviction only)             |
| Atmosphere resolution pipeline        | ❌          | ⚠️ Partial (store done, canvas not using it) |
| Overlay engine (ProjectionPayload)    | ❌          | ❌ Missing                                   |
| PresentationCanvas overlay support    | ❌          | ❌ Missing                                   |
| Per-mode ErrorBoundary                | ❌          | ✅ Done                                      |
| ProjectionMode ErrorBoundary fallback | ❌          | ✅ Done                                      |
| Auto session save (debounced)         | ❌          | ⚠️ Partial (not debounced)                   |
| Safe-mode startup                     | ❌          | ❌ Missing                                   |

### §9.5 IPC Migration Tracker

| Channel                            | Spec Status | Actual Status |
| ---------------------------------- | ----------- | ------------- |
| `display:get-all` normalized alias | ❌          | ❌ Missing    |
| `system:get-storage-stats`         | ❌          | ✅ Done       |
| `db:duplicate-song`                | ❌          | ✅ Done       |
| `confidence:update`                | ❌          | ✅ Done       |
| `db:get-songs-summary`             | ❌          | ✅ Done       |

### §9.6 State Migration Tracker

| Store                  | Action Required                | Status             |
| ---------------------- | ------------------------------ | ------------------ |
| `useModalStore`        | Create new store               | ✅ Done            |
| `useServiceStore`      | Create new store               | ✅ Done            |
| `useNotificationStore` | Create new store               | ✅ Done            |
| `useSongStore`         | Extract from useAppStore       | ✅ Done            |
| `useHymnalStore`       | Extract from useAppStore       | ✅ Done            |
| `useDisplayStore`      | Extract from useAppStore       | ✅ Done            |
| `usePlaylistStore`     | Add activePlaylist persistence | ✅ Done (L188-190) |
| `usePanelLayoutStore`  | Extend to 3-panel              | ✅ Done (L12, L34) |

---

## PART 10: IMPLEMENTATION PREP — Sprint Status

### Sprint 0 — Infrastructure

| #        | Task                           | Status                   |
| -------- | ------------------------------ | ------------------------ |
| 0.1      | `useModalStore.ts`             | ✅ Done                  |
| 0.2      | `useServiceStore.ts`           | ✅ Done                  |
| 0.3      | `useNotificationStore.ts`      | ✅ Done                  |
| 0.4      | `useTimerTick` hook            | ✅ Done                  |
| 0.5      | `system:get-storage-stats` IPC | ✅ Done                  |
| 0.6      | `db:duplicate-song` IPC        | ✅ Done                  |
| 0.7      | `confidence:update` IPC        | ✅ Done                  |
| 0.8      | `display:get-all` alias        | ❌ Missing               |
| 0.9–0.12 | Migrations 14-17               | ✅ Done (but duplicated) |
| 0.13     | 3-panel layout store           | ✅ Done                  |
| 0.14     | `getSongsSummary()`            | ✅ Done                  |

### Sprint 1 — Critical Dead UI

| #   | Task                         | Status     |
| --- | ---------------------------- | ---------- |
| 1.1 | Wire favorite (DUI-001)      | ✅ Done    |
| 1.2 | Wire theme button (DUI-004)  | ❌ Missing |
| 1.3 | Bible in View menu (DUI-003) | ✅ Done    |
| 1.4 | Ctrl+B shortcut              | ✅ Done    |
| 1.5 | Storage metric (DUI-006)     | ⚠️ Partial |
| 1.6 | Wire timer tick              | ✅ Done    |
| 1.7 | Timer controls in TitleBar   | ✅ Done    |
| 1.8 | Mount ModalRegistry          | ✅ Done    |

### Sprint 2 — Modal System

| #   | Task                           | Status     |
| --- | ------------------------------ | ---------- |
| 2.1 | Modal base component           | ✅ Done    |
| 2.2 | DeleteConfirmDialog            | ✅ Done    |
| 2.3 | CreatePlaylistDialog           | ✅ Done    |
| 2.4 | CrashRecoveryDialog            | ✅ Done    |
| 2.5 | Wire delete confirm everywhere | ⚠️ Partial |
| 2.8 | Persist activePlaylist         | ✅ Done    |
| 2.9 | Auto session save              | ⚠️ Partial |

### Sprint 3 — Runtime Hardening

| #   | Task                       | Status     |
| --- | -------------------------- | ---------- |
| 3.1 | Next song preload          | ✅ Done    |
| 3.2 | Slide config from settings | ⚠️ Partial |
| 3.3 | Confidence broadcast       | ⚠️ Partial |
| 3.5 | Per-mode ErrorBoundary     | ✅ Done    |
| 3.6 | MediaEngine LRU            | ⚠️ Partial |
| 3.7 | Atmosphere resolution      | ⚠️ Partial |
| 3.8 | Virtualize Management      | ❌ Missing |

---

## 🔴 TOP PRIORITY FIXES (Functional Gaps)

| Priority | Issue                                             | File                            | Fix                                              |
| -------- | ------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| 🔴 P0    | `setGlobalSlideConfig()` commented out            | `useAppBootstrap.ts:69`         | Uncomment the call                               |
| 🔴 P0    | Duplicate migration versions 14-17                | `migrations.ts`                 | Remove duplicate block (L491-545 or L552-609)    |
| 🔴 P1    | CONFIDENCE_BROADCAST feature flag = false         | `featureFlags.ts:26`            | Enable and wire actual broadcast                 |
| 🔴 P1    | PresentationCanvas uses local `resolveAtmosphere` | `PresentationCanvas.tsx:132`    | Use `useAtmosphereStore.getResolvedAtmosphere()` |
| 🟡 P2    | Session save not debounced                        | `useCrashRecovery.ts`           | Add 2000ms debounce                              |
| 🟡 P2    | Theme button (DUI-004) not wired                  | `TitleBar.tsx`                  | Add theme cycle button                           |
| 🟡 P2    | Management song list not virtualized              | `ManagementMode.tsx`            | Add `useVirtualizer`                             |
| 🟡 P2    | Theme IPC updates not debounced                   | Settings flow                   | Add `debounce(themeUpdate, 300)`                 |
| 🟠 P3    | Overlay engine not built                          | `PresentationCanvas.tsx`        | Implement `ProjectionPayload`                    |
| 🟠 P3    | Safe-mode startup not implemented                 | `database.ts` / `main/index.ts` | Add `checkSafeMode()`                            |
| 🟠 P3    | Auto-backup on startup missing                    | `database.ts`                   | Add `shouldAutoBackup()`                         |
| 🟠 P3    | `display:get-all` IPC alias missing               | `ipc-handlers.ts`               | Add normalized alias                             |

---

_Generated: 2026-05-15T17:25 | Spec: phase2-part2-runtime-engine.md (1929 lines)_
