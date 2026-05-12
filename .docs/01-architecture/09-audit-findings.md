# SION Media — Audit Findings

> **Date**: May 2026 | **Version**: 2.1 | **Scope**: Full codebase audit

---

## Status Implementasi

| Item                                        | Severity | Status   | File Terkait                                                      |
| ------------------------------------------- | -------- | -------- | ----------------------------------------------------------------- |
| 1.1.1 Error Boundaries                      | 🔴 P0    | ✅ Fixed | `ErrorBoundary.tsx`, entrypoints                                  |
| 1.1.2 Toast Timer Leak                      | 🔴 P0    | ✅ Fixed | `useAppStore.ts`                                                  |
| 1.1.3 Missing Error Handling in Stores      | 🔴 P0    | ✅ Fixed | `useAppStore.ts`, `usePlaylistStore.ts`                           |
| 1.1.4 Video Preload Timeout                 | 🔴 P0    | ✅ Fixed | `mediaEngine.ts`                                                  |
| 1.1.5 Database Race Condition               | 🔴 P0    | ✅ Fixed | `database.ts`                                                     |
| 1.1.6 CSP Missing                           | 🔴 P0    | ✅ Fixed | `index.html`, `projection.html`                                   |
| 1.1.7 `console.*` in Production             | 🔴 P0    | ✅ Fixed | `SettingsScreen.tsx`                                              |
| — Hardening: Unhandled Promise Rejections   | 🔴 P0    | ✅ Fixed | Banyak file renderer                                              |
| — Hardening: IPC UI Actions (delete/toggle) | 🔴 P0    | ✅ Fixed | `PlaylistPanel.tsx`, `SongLibraryPanel.tsx`, `TitleBarStatus.tsx` |
| — IPC: Duplicate Handler Fix                | 🔴 P0    | ✅ Fixed | `ipc-handlers.ts`                                                 |
| — IPC: Display Channel Mismatch             | 🔴 P0    | ✅ Fixed | `ipc-handlers.ts`, `preload/index.ts`                             |
| — Renderer: BibleScreen Stability           | 🔴 P0    | ✅ Fixed | `BibleScreen.tsx`, `shared/types.ts`                              |

---

## 1.1 Critical Bugs & Stability Issues

### 1.1.1 No React Error Boundaries 🔴 P0

- **Files**: All renderer components
- **Problem**: No Error Boundaries anywhere. A single component crash takes down the entire app. During live projection, this is catastrophic.
- **Affected**: `App.tsx`, `ProjectionApp.tsx`, `StageDisplayApp.tsx`, all mode screens
- **Fix**: Add `ErrorBoundary` wrapper around each critical component with fallback UI + "Reload" button + IPC error logging

### 1.1.2 Toast Timer Memory Leak 🔴 P0

- **File**: `src/renderer/src/store/useAppStore.ts:146`
- **Problem**: `setTimeout` for toast auto-dismiss never cleaned up. Rapid toasts interfere — older timeout can clear newer toast.

```typescript
// Buggy: no timeout tracking
showToast: (message, type = 'info') => {
  set({ toast: { message, type } })
  setTimeout(() => {
    set((state) => (state.toast?.message === message ? { toast: null } : state))
  }, 3000)
}
```

- **Fix**: Track timeout IDs per toast, use unique IDs, or queue system

### 1.1.3 Missing Error Handling in Stores 🔴 P0

- **File**: `useAppStore.ts`, `usePlaylistStore.ts`
- **Problem**: `loadSongs()`, `loadHymnals()`, `loadPlaylists()` have no try/catch — IPC failure crashes silently
- **Fix**: Wrap all async store actions in try/catch with `showToast()` feedback

### 1.1.4 Video Preload Timeout 🔴 P0

- **File**: `src/renderer/src/engine/mediaEngine.ts:37`
- **Problem**: `oncanplaythrough` may never fire for large/corrupt videos — Promise hangs forever
- **Fix**: Add 10s timeout, `onstalled` handler, descriptive `onerror`

### 1.1.5 Database Race Condition on Startup 🔴 P0

- **File**: `src/main/database.ts:13-17`
- **Problem**: Opens tempDb, checks schema, closes, then re-opens — race window between close and re-open
- **Fix**: Use single connection, check schema within same connection

### 1.1.6 Content Security Policy Missing 🔴 P0

- **Files**: `index.html`, `projection.html`
- **Problem**: Only `stageDisplay.html` has CSP. Main and projection windows vulnerable to XSS
- **Fix**: Add CSP meta tag to both files

### 1.1.7 `console.error` in Production Code 🔴 P0

- **Files**: `SettingsScreen.tsx:240`, media engine preload calls
- **Problem**: Direct `console.*` bypasses `logger` utility, appears in production builds
- **Fix**: Replace all `console.*` with `logger.*`

---

## 1.2 Architecture Anti-Patterns

### 1.2.1 Monolithic Main Process 🟠 P1

- **File**: `src/main/index.ts` (~453 lines)
- **Problem**: Single file handles window creation, all IPC, display monitoring, theme merging, file parsing
- **Fix**: Split into `windows.ts`, `ipc-handlers.ts`, `display-monitor.ts`, `theme-manager.ts`

### 1.2.2 Monolithic Settings Screen 🟠 P1

- **File**: `src/renderer/src/screens/SettingsScreen.tsx` (~919 lines!)
- **Problem**: Massive single component — unmaintainable
- **Fix**: Split into `ProjectionSettings`, `ThemeSettings`, `HymnalManager`, `DatabaseSettings`, `AboutSection`

### 1.2.3 Unsafe Type Casting in IPC 🟠 P1

- **Files**: All renderer stores
- **Problem**: All IPC returns `unknown`, cast with `as Song[]` everywhere
- **Fix**: Create `src/shared/types.ts`, type-safe IPC wrapper, remove all casts

### 1.2.4 Hardcoded IPC Channel Strings 🟠 P1

- **Files**: `src/main/index.ts`, `src/preload/index.ts`
- **Problem**: Channel strings like `'db:get-songs'` hardcoded in both — typo risk, no compile-time check
- **Fix**: Create `src/shared/ipc-channels.ts` with constants

### 1.2.5 Destructive Database Migration 🟠 P1

- **File**: `src/main/database.ts:13-22`
- **Problem**: Old schema detection uses mandatory wipe-out — users lose all custom data
- **Fix**: Version tracking in `settings` table, incremental ALTER TABLE migrations, never wipe user data

### 1.2.6 Cross-Store Coupling 🟡 P2

- **Files**: `useAppStore.ts`, `usePlaylistStore.ts`, `useProjectionStore.ts`
- **Problem**: Stores use `.getState()` across stores (tight coupling)
- **Fix**: `subscribeWithSelector` or extract shared service functions

### 1.2.7 Mixed Language in UI 🟡 P2

- **Problem**: TitleBarMenu (English), Toast (Indonesian), Settings (mixed)
- **Fix**: i18n system with locale files (`id.json`, `en.json`)

---

## 1.3 Optimistic Update Without Rollback

### 1.3.1 Playlist Reorder 🟠 P1

- **File**: `usePlaylistStore.ts` — `reorderItems`
- **Problem**: Optimistic update before IPC call, no error rollback
- **Fix**: Save previous state, catch IPC errors, revert on failure

### 1.3.2 Playlist Item Label Update 🟠 P1

- **File**: `usePlaylistStore.ts` — `updateItemLabel`
- **Problem**: Same pattern — optimistic update without rollback
- **Fix**: Same — save previous state, catch errors, revert

---

## 1.4 Performance Issues

| Issue                        | Severity | File                       | Description                                                          |
| ---------------------------- | -------- | -------------------------- | -------------------------------------------------------------------- |
| Song list not virtualized    | 🟡 P2    | `SongLibraryPanel.tsx`     | 500+ songs as full DOM, `@tanstack/react-virtual` in deps but unused |
| MediaEngine cache unbounded  | 🟡 P2    | `mediaEngine.ts`           | `imageCache`/`videoCache` Maps grow without limit                    |
| IPC not debounced for slides | 🟡 P2    | `App.tsx` keyboard handler | Rapid arrow keys send many IPC messages                              |
| DB blocks main process       | 🟡 P2    | `database.ts`              | better-sqlite3 is synchronous, long queries block                    |

---

## 1.5 Security Concerns

| Issue                              | Severity | File                        | Description                           |
| ---------------------------------- | -------- | --------------------------- | ------------------------------------- |
| No CSP on main window              | 🔴 P0    | `index.html`                | Vulnerable to XSS                     |
| No CSP on projection               | 🔴 P0    | `projection.html`           | Vulnerable to XSS                     |
| Excel parse default `hymnal_id: 0` | 🟠 P1    | `index.ts:file:parse-excel` | FK violation if 0 is not valid hymnal |
| `confirm()` for destructive ops    | 🟡 P2    | `SettingsScreen.tsx`        | Blocking, not themed                  |
| Backup path in toast               | 🟡 P2    | `SettingsScreen.tsx:193`    | Full filesystem path exposed          |

---

## 1.6 Database Multi-Hymnal & IPC Stabilization Audit (2026-05-08)

### 1.6.1 IPC Duplicate Handler Registration 🔴 P0

- **Problem**: `ipcMain.handle` called multiple times for the same channel during setup.
- **Affected**: Bible, Custom Slides, and Slide Group handlers.
- **Fix**: Removed redundant registrations in `ipc-handlers.ts`.

### 1.6.2 Display Channel Naming Mismatch 🔴 P0

- **Problem**: Renderer expected `display:get-all` but main process used `display_get-all`.
- **Fix**: Synchronized channel naming in `ipc-handlers.ts` and `preload/index.ts`.

### 1.6.3 BibleScreen Renderer Instability 🔴 P0

- **Problem**: TypeScript and Lint errors prevented production build. 4 critical issues identified.
- **Fix**:
  - Defined missing `BibleTranslation`, `BibleBook`, and `BibleVerse` types in `shared/types.ts`.
  - Refactored `BibleScreen.tsx` to use async fetching pattern with `let mounted = true` inside `useEffect` to avoid cascading render errors.
  - Corrected IPC API references (`searchVerses`).
  - Cleaned up unused imports and fixed pathing.
