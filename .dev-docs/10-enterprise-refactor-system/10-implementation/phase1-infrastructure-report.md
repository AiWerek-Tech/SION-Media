# Phase 1 — Infrastructure Additions

**Status:** ✅ COMPLETE  
**Date:** 2026-05-15  
**Validation:** `npm run typecheck` ✅ | `npm run test` 16/16 ✅  
**Risk Level:** LOW — additive only, zero breaking changes

---

## Objective

Add all new systems without modifying any existing behavior. Every change is purely additive. At the end of this phase, the application runs identically to before — new systems exist but are not yet mounted or activated.

---

## Sequence 1.1 — New Store Files (Already Existed, Verified)

### `src/renderer/src/store/useModalStore.ts` ✅

Stack-based modal manager with Promise-based async pattern.

Key design decisions:

- Max stack depth: 3 (prevents modal inception)
- `openAsync<T>()` returns `Promise<T>` — resolves when modal closes
- `closeById(id, result?)` resolves the promise with `result`
- `closeAll()` resolves all pending promises with `undefined`

### `src/renderer/src/store/useServiceStore.ts` ✅

Service session persistence via `zustand/middleware persist`.

- localStorage key: `sion-service-storage`
- Tracks active service name, date, notes

### `src/renderer/src/store/useNotificationStore.ts` ✅

Notification queue with unread count tracking.

- `add(notification)` — pushes to queue
- `markRead(id)` / `markAllRead()` — updates unread count
- `clear()` — empties queue

---

## Sequence 1.2 — New Hook File (Already Existed, Verified)

### `src/renderer/src/hooks/useTimerTick.ts` ✅

Owns the 1-second interval that drives the projection timer.

Key design decisions:

- **Single owner rule:** This hook is the SOLE owner of the timer interval. No other component creates a competing interval.
- Uses `useRef` to keep `timerTick` reference stable (avoids stale closure)
- `timerTick()` internally checks `timerRunning` — zero overhead when stopped
- Mounted exactly once in `App.tsx`

---

## Sequence 1.3 — Database Migrations (Added)

### `src/main/migrations.ts` — Migrations 14-17 added at END

```typescript
// v14: service_sessions table
CREATE TABLE IF NOT EXISTS service_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  service_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)

// v15: notification_log table + indexes
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  message TEXT DEFAULT '',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)
CREATE INDEX IF NOT EXISTS idx_notification_log_is_read ON notification_log(is_read)
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC)

// v16: idx_songs_summary composite index
CREATE INDEX IF NOT EXISTS idx_songs_summary
  ON songs(hymnal_id, id, number, title, alternate_title, is_favorite, category, language)

// v17: storage_stats_last_checked setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('storage_stats_last_checked', '')
```

**Safety:** All migrations use `IF NOT EXISTS` — idempotent on existing databases.

---

## Sequence 1.4 — Database Functions (Already Existed, Verified)

### `src/main/database.ts`

Three new functions already present:

```typescript
getSongsSummary(hymnalId?: number): unknown[]
// Lightweight query without lyrics_raw — for Library Mode grid/list views

duplicateSong(songId: number): { id: number; number: string; title: string } | null
// Creates copy with modified number/title

getStorageStats(): { dbSizeBytes: number; dbSizeMB: string; memoryMB: string }
// Returns actual database size + process memory usage
```

---

## Sequence 1.5 — IPC Handlers (Already Existed, Verified)

### `src/main/ipc-handlers.ts`

Four new channels already present at END of `setupIPC()`:

```typescript
safeIpcHandle('system:get-storage-stats', () => getStorageStats())
safeIpcHandle('db:duplicate-song', (songId) => duplicateSong(songId))
ipcMain.on('confidence:update', (_event, payload) => {
  stageWindow.webContents.send('confidence:update', payload)
})
ipcMain.handle('display:get-all', () => getAllDisplays()) // normalized alias
```

---

## Sequence 1.6 — Preload Bridge (Already Existed, Verified)

### `src/preload/index.ts`

Four new bridge entries already present:

```typescript
system.getStorageStats(): Promise<unknown>
songs.duplicate(id: number): Promise<unknown>
songs.getSummary(hymnalId?: number): Promise<unknown[]>
confidence.update(payload): void
confidence.onUpdate(callback): () => void
```

---

## Sequence 1.7 — Store Extensions (Modified)

### `src/renderer/src/store/usePanelLayoutStore.ts`

**Change:** Extended `PanelLayoutSizes` interface with 3-panel layout key.

```typescript
// Added:
projectionBottom3: [number, number, number] // [Library%, Playlist%, Detail%]

// Default values:
projectionBottom3: [35, 40, 25]

// Constraints:
PANEL_CONSTRAINTS.projectionBottom3 = {
  minSizes: [25, 30, 15],
  maxSizes: [50, 50, 35]
}
```

**Why:** Phase 7 (Projection Mode improvements) will add a 3-panel layout. The type extension is done now so Phase 7 can use it without modifying the store interface.

### `src/renderer/src/store/usePlaylistStore.ts`

**Change:** Added `persist` middleware for active playlist session continuity.

```typescript
// Added to state:
_persistedActivePlaylistId: number | null

// setActivePlaylist now also updates:
_persistedActivePlaylistId: playlist?.id ?? null

// Persist config:
{
  name: 'sion-playlist-storage',
  partialize: (state) => ({ _persistedActivePlaylistId: state._persistedActivePlaylistId })
}
```

**Why:** When app restarts, `useCrashRecovery` can use `_persistedActivePlaylistId` to restore the active playlist without needing a full crash recovery flow.

---

## Test Mock Updates

### `src/renderer/src/test-utils/setup.ts`

Added mocks for new Phase 1 IPC channels:

```typescript
system.getStorageStats: vi.fn().mockResolvedValue({
  dbSizeBytes: 0, dbSizeMB: '0.00', memoryMB: '0.00'
})
songs.duplicate: vi.fn().mockResolvedValue({ id: 2, number: '1a', title: 'Copy' })
songs.getSummary: vi.fn().mockResolvedValue([])
confidence.update: vi.fn()
confidence.onUpdate: vi.fn().mockReturnValue(() => {})
```

---

## Validation Results

```
npm run typecheck  → Exit 0 ✅
npm run test       → 16/16 pass ✅
```

---

## Rollback

- Delete new store files (useServiceStore, useNotificationStore — useModalStore and useTimerTick already existed)
- Remove migrations 14-17 from migrations array
- Revert usePanelLayoutStore type extension
- Revert usePlaylistStore persist middleware
- Revert test-utils/setup.ts mock additions
