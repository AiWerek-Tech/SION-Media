# SION Media — Phase 2: Functional Refactor Architecture (Parts 5-10)

## Continuation of phase2-functional-refactor-architecture-v1.md

**Depends on:** phase2-functional-refactor-architecture-v1.md (Parts 1-4)
**Codebase:** Electron 39 / React 19 / Zustand 5 / RuntimeCommandBus / slideEngine / mediaEngine

---

# PART 5: RUNTIME ENGINE ARCHITECTURE

## 5.1 Projection Runtime Engine Overview

The projection runtime is the most critical subsystem in SION Media. It is a **live broadcast engine** — any failure during a worship service is immediately visible to the congregation. The existing architecture is already solid. This section defines the gaps, the missing pipelines, and the hardening required for production reliability.

### 5.1.1 Current Runtime Architecture (Confirmed from Source)

```
Operator Input (keyboard/button/command palette)
  ↓
RuntimeCommandBus.execute(command)          ← singleton, throttled, locked
  ↓
CommandHandler (runtimeCommandHandlers.ts)
  ↓
useProjectionStore.action()                 ← Zustand store
  ↓
sendLiveSlide(slideData)                    ← inside store action
  ↓
window.api.projection.slideUpdate(data)     ← preload bridge
  ↓
IPC: 'projection:slide-update'              ← main process
  ↓
updateSlideData(data)                       ← windows.ts
  ↓
projectionWindow.webContents.send(...)      ← broadcast
stageDisplayWindow.webContents.send(...)    ← broadcast
  ↓
ProjectionApp.tsx → PresentationCanvas      ← renders output
```

**What is working correctly:**

- Command bus throttling (50ms global, 150ms per-command)
- Reentrancy lock (prevents concurrent execution)
- LIVE_LOCK / LIVE_DIRTY protection
- NEXT state computation
- Section map for Quick Jump
- Slide cache in `slideEngine.ts` (hash-based invalidation)
- Projection snapshot on window reconnect

**What is missing:**

- Preload pipeline (next song slides not preloaded into renderer)
- Atmosphere/media preload coordination with slide transitions
- Overlay engine (announcements, Bible, lower thirds)
- Timer tick interval management (no global interval owner)
- Confidence payload broadcast to stage display
- Emergency fallback rendering

---

## 5.2 Slide Rendering Pipeline

### 5.2.1 Current Pipeline

```
Song selected → generateSlidesForSong(song)
  → parseSections(lyrics_raw)
  → splitIntoSlides(sections, maxLines=4, maxChars=40)
  → SlideData[] (cached by songId + hash)
  → useProjectionStore.setSlides(slides, meta)
  → sectionMap built (for Quick Jump)
  → currentSlideIndex = 0
```

### 5.2.2 Missing: Preload Pipeline

When an operator cues a song, the next song in the playlist should be pre-generated and cached **before** it is needed. Currently `loadNextSong()` exists in the store but is never called automatically.

**Preload Pipeline Architecture:**

```
PlaylistPanel: operator clicks song N
  ↓
handlePlaylistItemClick(item, index)
  ↓
generateSlidesForSong(song)         ← current song
setSlides(slides, meta)
  ↓
[NEW] scheduleNextSongPreload(index + 1)
  ↓
  setTimeout(() => {
    const nextItem = playlistItems[index + 1]
    if (!nextItem) return
    const nextSong = songs.find(s => s.id === nextItem.song_id)
    if (!nextSong) return
    const nextSlides = generateSlidesForSong(nextSong)  // cached
    loadNextSong(nextSong, nextSlides)
  }, 500)  // 500ms delay — after current song renders
```

**Where to implement:** `ProjectionMode.tsx` → `handlePlaylistItemClick`

### 5.2.3 Slide Generation Settings

Settings from DB control slide layout:

```
projection_max_lines: '4'   → maxLines parameter
projection_max_chars: '40'  → maxChars parameter
```

These are loaded in `SettingsScreen` but NOT passed to `generateSlidesForSong()`. The slide engine uses hardcoded defaults.

**Fix:** Load settings on bootstrap, store in `useDisplayStore` (or settings cache), pass to `generateSlidesForSong()`.

```typescript
// In useAppBootstrap:
const settings = await window.api.settings.getAll()
const maxLines = parseInt(settings['projection_max_lines'] || '4', 10)
const maxChars = parseInt(settings['projection_max_chars'] || '40', 10)
useDisplayStore.getState().setSlideConfig({ maxLines, maxChars })

// In generateSlidesForSong():
const { maxLines, maxChars } = useDisplayStore.getState().slideConfig
return generateSlides(song.id, song.lyrics_raw, { maxLines, maxChars }, meta)
```

---

## 5.3 Live Presentation State Machine

### 5.3.1 Complete State Diagram

```
                    ┌─────────────────────────────────────────────────────┐
                    │              PROJECTION STATE MACHINE               │
                    └─────────────────────────────────────────────────────┘

  App Start
      │
      ▼
  ┌────────┐
  │  IDLE  │  projectionState='CLEAR', programLockState='UNLOCKED'
  │        │  No slides loaded, projection window hidden
  └────────┘
      │ operator selects song + cues slides
      ▼
  ┌──────────────┐
  │  PREPARING   │  setSlides() called, sectionMap built
  │              │  currentSlideIndex=0, programSlides=[]
  └──────────────┘
      │ operator presses Space/TAKE
      ▼
  ┌──────────────┐
  │    LIVE      │  projectionState='LIVE', programLockState='LIVE_LOCK'
  │              │  programSlide set, IPC broadcast sent
  └──────────────┘
      │                    │                    │
      │ B key              │ F key              │ Esc key
      ▼                    ▼                    ▼
  ┌────────┐         ┌──────────┐         ┌──────────┐
  │ BLACK  │         │  FREEZE  │         │  CLEAR   │
  │        │         │          │         │ UNLOCKED │
  └────────┘         └──────────┘         └──────────┘
      │ B key              │ F key
      └──────────┬─────────┘
                 ▼
              ┌──────────────┐
              │    LIVE      │  (restored)
              └──────────────┘

  LIVE + song editor saves lyrics
      │
      ▼
  ┌──────────────┐
  │  LIVE_DIRTY  │  programLockState='LIVE_DIRTY'
  │              │  hasPendingLiveChanges=true
  └──────────────┘
      │ Ctrl+Enter          │ Ctrl+Esc
      ▼                     ▼
  ┌──────────────┐    ┌──────────────┐
  │  LIVE        │    │  LIVE        │
  │  (updated)   │    │  (reverted)  │
  └──────────────┘    └──────────────┘
```

### 5.3.2 State Transition Rules

| From       | To         | Trigger                           | Side Effects                                         |
| ---------- | ---------- | --------------------------------- | ---------------------------------------------------- |
| IDLE       | PREPARING  | `setSlides()`                     | sectionMap built, currentSlideIndex=0                |
| PREPARING  | LIVE       | `takeCue()` / `goToSlide()`       | programLockState=LIVE_LOCK, IPC broadcast            |
| LIVE       | BLACK      | `toggleBlack()`                   | IPC state-change('BLACK')                            |
| BLACK      | LIVE       | `toggleBlack()`                   | IPC state-change('LIVE'), re-send programSlide       |
| LIVE       | FREEZE     | `toggleFreeze()`                  | IPC state-change('FREEZE')                           |
| FREEZE     | LIVE       | `toggleFreeze()`                  | IPC state-change('LIVE'), re-send programSlide       |
| LIVE       | CLEAR      | `clearScreen()`                   | programLockState=UNLOCKED, IPC state-change('CLEAR') |
| LIVE       | LIVE_DIRTY | `hotSwapSlides()` while LIVE_LOCK | hasPendingLiveChanges=true                           |
| LIVE_DIRTY | LIVE       | `updateLive()`                    | Apply pending changes, IPC broadcast                 |
| LIVE_DIRTY | LIVE       | `discardChanges()`                | Revert preview to program                            |
| ANY        | LOGO       | `setProjectionState('LOGO')`      | IPC state-change('LOGO')                             |

### 5.3.3 Missing State: TRANSITIONING

Currently there is no transition state. Slide changes are instantaneous from the store's perspective. The `fadeSpeed` setting controls CSS transition duration in `PresentationCanvas`, but the store doesn't track "in transition."

**For v1:** This is acceptable. The CSS transition handles visual smoothness.
**For v2:** Add `isTransitioning: boolean` to track when a slide change animation is in progress, to prevent rapid-fire navigation during transitions.

---

## 5.4 Media Runtime System

### 5.4.1 Current MediaEngine (Confirmed from Source)

```typescript
class MediaEngine {
  private imageCache = new Map<string, HTMLImageElement>()
  private videoCache = new Map<string, HTMLVideoElement>()

  preloadImage(url: string): Promise<void> // caches HTMLImageElement
  preloadVideo(url: string): Promise<void> // caches HTMLVideoElement, 10s timeout
  clearCache(): void
}
```

**Problems identified:**

1. No cache size limit — unbounded memory growth with many media assets
2. No LRU eviction — old assets never removed
3. No preload queue — all preloads fire simultaneously
4. No error recovery — failed preloads are silently ignored
5. `clearCache()` exists but is never called
6. Video preload uses `canplaythrough` event — may never fire on some codecs

### 5.4.2 Media Runtime Architecture (Hardened)

```typescript
// Hardened MediaEngine — replaces current implementation

interface MediaCacheEntry {
  element: HTMLImageElement | HTMLVideoElement
  lastAccessed: number
  sizeEstimate: number // bytes (rough estimate)
  loadState: 'loading' | 'ready' | 'error'
}

class MediaEngine {
  private cache = new Map<string, MediaCacheEntry>()
  private loadQueue: Array<{ url: string; type: 'image' | 'video'; priority: number }> = []
  private activeLoads = 0
  private readonly MAX_CONCURRENT_LOADS = 2
  private readonly MAX_CACHE_SIZE_MB = 200
  private readonly MAX_CACHE_ENTRIES = 50
  private readonly VIDEO_PRELOAD_TIMEOUT_MS = 15000

  // Preload with priority (1=high, 2=normal, 3=background)
  preload(url: string, type: 'image' | 'video', priority = 2): Promise<void>

  // Get cached element (null if not cached)
  get(url: string): HTMLImageElement | HTMLVideoElement | null

  // Evict LRU entries when cache is full
  private evictLRU(): void

  // Process load queue (max concurrent loads)
  private processQueue(): void

  // Clear all caches
  clearCache(): void

  // Get cache stats for diagnostics
  getStats(): { entries: number; estimatedMB: number; hitRate: number }
}
```

### 5.4.3 Media Preload Strategy

```
Song cued (setSlides called)
  ↓
Extract song_background_config
  ↓
Parse AtmosphereConfig
  ↓
If config.media?.path:
  → mediaEngine.preload(path, type, priority=1)  // HIGH priority

Next song preloaded (loadNextSong called)
  ↓
Extract next song's background config
  ↓
If config.media?.path:
  → mediaEngine.preload(path, type, priority=2)  // NORMAL priority

Settings background (projection_bg_image)
  ↓
On settings load:
  → mediaEngine.preload(bgImage, type, priority=3)  // BACKGROUND priority
```

### 5.4.4 Atmosphere Resolution Pipeline

The `AtmosphereConfig` system has three layers that must be resolved in priority order:

```
Resolution Priority (highest to lowest):
  1. liveOverride (operator emergency override)
  2. song.song_background_config (per-song atmosphere)
  3. settings.projection_default_atmosphere (global default)
  4. settings.projection_bg_color (legacy fallback)

Resolution function (to be implemented in atmosphereStore):
  resolveAtmosphere(
    globalConfig: AtmosphereConfig,
    songConfig: SongBackgroundConfig | null,
    liveOverride: LiveAtmosphereOverride | null
  ): ResolvedAtmosphere
```

**Current gap:** `PresentationCanvas` reads settings directly. It should receive a `ResolvedAtmosphere` object from the store instead.

---

## 5.5 Overlay Engine Architecture

### 5.5.1 Overlay Types Required

The current projection output only renders song lyrics. The following overlays are needed:

| Overlay      | Trigger                       | Content                    | Priority    |
| ------------ | ----------------------------- | -------------------------- | ----------- |
| Announcement | Operator selects custom slide | `CustomSlide.content`      | 🔴 Critical |
| Bible Verse  | Operator selects verse        | `BibleVerse.text`          | 🔴 Critical |
| Lower Third  | Operator types text           | Free text                  | 🟡 High     |
| Timer        | Auto / operator               | Service elapsed time       | 🟡 High     |
| Logo         | `PROJ_LOGO` state             | `settings.projection_logo` | 🟡 High     |
| Emergency    | Panic button                  | Configurable message       | 🟠 Medium   |

### 5.5.2 Overlay Architecture

```
Overlay content is a superset of SlideData.
All overlay types are normalized to a unified ProjectionPayload:

interface ProjectionPayload {
  type: 'song' | 'bible' | 'announcement' | 'lower-third' | 'logo' | 'blank'

  // Song-specific
  slide?: SlideData

  // Bible-specific
  bibleVerse?: {
    text: string
    reference: string  // e.g. "Yohanes 3:16"
    translation: string
  }

  // Announcement-specific
  announcement?: {
    title: string
    content: string
    backgroundColor: string
    textColor: string
    fontSize: number
  }

  // Lower third
  lowerThird?: {
    text: string
    subtext?: string
  }

  // Shared
  background?: AtmosphereConfig
  projectionState: ProjectionState
}
```

### 5.5.3 Overlay Rendering in PresentationCanvas

```
PresentationCanvas receives ProjectionPayload (not just SlideData)
  ↓
Switch on payload.type:
  'song'         → render lyrics text (current behavior)
  'bible'        → render verse text + reference
  'announcement' → render announcement layout
  'lower-third'  → render lower third overlay ON TOP of current content
  'logo'         → render logo image
  'blank'        → render nothing (BLACK state)
```

**Migration:** `PresentationCanvas` currently accepts `slide: SlideData | null`. Extend to accept `payload: ProjectionPayload | null` while keeping backward compatibility via adapter.

---

## 5.6 Timer Tick Management

### 5.6.1 Current Problem

`timerTick()` exists in `useProjectionStore` but there is no global interval that calls it. The timer never advances.

**Root cause:** No component owns the timer interval. `TitleBarStatus` shows a clock but uses its own `Date.now()` — it does not use the projection store timer.

### 5.6.2 Timer Architecture Fix

```typescript
// src/renderer/src/hooks/useTimerTick.ts
// Single global hook — mounted once in App.tsx

export function useTimerTick(): void {
  useEffect(() => {
    const interval = setInterval(() => {
      useProjectionStore.getState().timerTick()
    }, 1000)
    return () => clearInterval(interval)
  }, []) // empty deps — runs once, never re-registers
}

// In App.tsx:
useTimerTick() // add alongside useAppBootstrap()
```

### 5.6.3 Timer Controls in Title Bar

```typescript
// TitleBarStatus.tsx — add timer controls
const { timerElapsed, timerRunning, timerStart, timerStop, timerReset } = useProjectionStore(
  useShallow((s) => ({
    timerElapsed: s.timerElapsed,
    timerRunning: s.timerRunning,
    timerStart: s.timerStart,
    timerStop: s.timerStop,
    timerReset: s.timerReset
  }))
)

const timerDisplay = formatTimer(timerElapsed) // "HH:MM:SS"

// Render: [⏱ 00:00:00] [▶/■] [↺]
// ▶ = start (when stopped), ■ = stop (when running)
// ↺ = reset (always visible)
```

---

## 5.7 Confidence Monitor Broadcast

### 5.7.1 Current State

`buildConfidencePayload()` exists and is called by `getConfidencePayload()` in the store. The payload is built correctly. But it is **never broadcast** to the stage display window.

### 5.7.2 Confidence Broadcast Architecture

```
useProjectionStore.goToSlide() / nextSlide() / prevSlide()
  ↓
sendLiveSlide(slideData)  ← already sends to projection + stage windows
  ↓
[NEW] broadcastConfidencePayload()
  ↓
const payload = getConfidencePayload()
window.api.confidence.update(payload)
  ↓
IPC: 'confidence:update' → main process
  ↓
stageDisplayWindow.webContents.send('confidence:update', payload)
  ↓
StageDisplayApp.tsx receives and renders
```

**New IPC handler needed:**

```typescript
// ipc-handlers.ts
ipcMain.on('confidence:update', (_event, payload) => {
  const stageWindow = getStageDisplayWindow()
  if (stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.webContents.send('confidence:update', payload)
  }
})
```

**New preload bridge:**

```typescript
confidence: {
  update: (payload: unknown): void =>
    ipcRenderer.send('confidence:update', payload),
  onUpdate: (callback: (payload: unknown) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: unknown): void => callback(payload)
    ipcRenderer.on('confidence:update', listener)
    return () => ipcRenderer.removeListener('confidence:update', listener)
  }
}
```

---

## 5.8 Performance Targets

| Metric                     | Target                                | Current State            | Gap                  |
| -------------------------- | ------------------------------------- | ------------------------ | -------------------- |
| Slide transition latency   | < 50ms (operator input → IPC send)    | ~20ms (estimated)        | None                 |
| Slide render latency       | < 100ms (IPC receive → canvas render) | Unknown                  | Needs measurement    |
| Song load time             | < 200ms (click → slides ready)        | ~50ms (cached)           | None                 |
| Media preload time         | < 2000ms (image), < 5000ms (video)    | 10s timeout              | Reduce video timeout |
| Memory (main window)       | < 200MB                               | Unknown                  | Needs measurement    |
| Memory (projection window) | < 100MB                               | Unknown                  | Needs measurement    |
| DB query (getSongs)        | < 100ms                               | ~20ms (indexed)          | None                 |
| DB search (FTS5)           | < 50ms                                | ~10ms                    | None                 |
| App startup                | < 3000ms                              | Unknown                  | Needs measurement    |
| Mode switch                | < 300ms                               | ~200ms (AnimatePresence) | None                 |

---

# PART 6: DATA LAYER ARCHITECTURE

## 6.1 Repository Pattern

### 6.1.1 Current Data Access Pattern

Currently all database operations are in `database.ts` as exported functions. `ipc-handlers.ts` calls them directly. This is acceptable for the current scale but creates coupling.

**Decision:** Do NOT refactor to full repository pattern in Phase 2. The current flat function approach is clean and maintainable. Add a service layer only where business logic is needed.

### 6.1.2 Service Layer (Where Needed)

```
Current (acceptable):
  ipc-handlers.ts → database.ts functions

Add service layer only for:
  - Song import (complex conflict resolution logic)
  - Backup/restore (multi-step operation)
  - Media import (file copy + DB insert + thumbnail generation)
  - Integrity check (multi-table analysis)
```

### 6.1.3 Database Access Rules

```
Rule 1: All DB access goes through ipc-handlers.ts → database.ts
  - No direct DB access from renderer
  - No direct DB access from windows.ts

Rule 2: Transactions for multi-step operations
  - Import: wrapped in db.transaction()
  - Reorder: wrapped in db.transaction()
  - Bulk delete: wrapped in db.transaction()

Rule 3: WAL checkpoint after destructive operations
  - After delete: checkpointWal('PASSIVE')
  - After import: checkpointWal('FULL')
  - After backup: checkpointWal('TRUNCATE')

Rule 4: FTS rebuild after bulk operations
  - After importSongsFromJson: rebuildSongsFts()
  - After reseed: rebuildSongsFts()
  - After clearLyrics: rebuildSongsFts()
```

---

## 6.2 Data Flow System

### 6.2.1 Standard CRUD Flow

```
UI Action (button click)
  ↓
Store action (e.g., usePlaylistStore.createPlaylist())
  ↓
window.api.[domain].[action](payload)    ← preload bridge
  ↓
IPC invoke → main process handler
  ↓
Input validation (safeIpcHandle wrapper)
  ↓
Database function (database.ts)
  ↓
SQLite operation (better-sqlite3)
  ↓
Return result → IPC response
  ↓
Store updates local state
  ↓
Component re-renders
```

### 6.2.2 Optimistic Update Pattern

For operations where immediate feedback is critical (favorites, reorder):

```typescript
// Pattern: optimistic update → async confirm → rollback on error

// 1. Capture previous state
const prevSongs = get().songs

// 2. Apply optimistic update immediately
set({ songs: songs.map((s) => (s.id === id ? { ...s, is_favorite: s.is_favorite ? 0 : 1 } : s)) })

// 3. Async DB operation
try {
  await window.api.songs.toggleFavorite(id)
  // Success: optimistic state is correct, no action needed
} catch (err) {
  // 4. Rollback on error
  set({ songs: prevSongs })
  showToast('Gagal mengubah favorit', 'error')
}
```

**Apply optimistic updates to:**

- `toggleFavorite` (DUI-001 fix)
- `reorderItems` in playlist (already implemented correctly)
- `updateItemLabel` in playlist (already implemented correctly)

### 6.2.3 Validation Checkpoints

```
Checkpoint 1: Preload bridge (renderer)
  - Type validation
  - Range validation (e.g., hymnalId must be positive integer)
  - Non-empty string validation

Checkpoint 2: IPC handler (main process)
  - safeIpcHandle wrapper catches all errors
  - ensureObject / ensureNonEmptyString helpers
  - Zod validation for complex payloads

Checkpoint 3: Database function
  - SQL constraints (UNIQUE, NOT NULL, FOREIGN KEY)
  - Application-level duplicate checks
  - normalizeSongNumber() for number fields
```

---

## 6.3 Migration Architecture

### 6.3.1 Current Migration System (Confirmed)

13 migrations applied via `runMigrations(db)` in `initDatabase()`. Each migration is idempotent (`IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). Version tracked in `schema_migrations` table.

### 6.3.2 Next Migrations Required

```typescript
// Migration 14: useServiceStore persistence table
{
  version: 14,
  name: 'service_state_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS service_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)
    // Seed default service state
    db.prepare("INSERT OR IGNORE INTO service_state (key, value) VALUES ('timer_elapsed', '0')").run()
    db.prepare("INSERT OR IGNORE INTO service_state (key, value) VALUES ('timer_running', '0')").run()
  }
}

// Migration 15: Song notes (for DUI-010 Notes tab)
{
  version: 15,
  name: 'song_notes_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS song_notes (
        song_id INTEGER PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );
    `)
  }
}

// Migration 16: Notification log
{
  version: 16,
  name: 'notification_log_table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT DEFAULT '',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)
  }
}
```

---

## 6.4 Media Storage System

### 6.4.1 Current Media Asset Flow

```
User selects files (dialog)
  ↓
window.api.media.importAssets({ filePaths, category, tags })
  ↓
IPC: 'db:import-media-assets'
  ↓
importMediaAssets({ filePaths, category, tags })
  ↓
For each file:
  - Generate UUID id
  - Copy file to userData/media/ directory
  - Insert into media_assets table
  - Return MediaAssetRecord[]
```

### 6.4.2 Missing: Thumbnail Generation

Currently `thumbnail_path` is stored in DB but never populated. Thumbnails are needed for the media browser grid view.

**Architecture:**

```typescript
// In importMediaAssets() — after file copy:
async function generateThumbnail(
  localPath: string,
  type: 'image' | 'video'
): Promise<string | null> {
  const thumbDir = join(app.getPath('userData'), 'thumbnails')
  const thumbPath = join(thumbDir, `${randomUUID()}.jpg`)

  if (type === 'image') {
    // Use Electron's nativeImage for resize
    const img = nativeImage.createFromPath(localPath)
    const resized = img.resize({ width: 200, height: 150, quality: 'good' })
    writeFileSync(thumbPath, resized.toJPEG(80))
    return thumbPath
  }

  if (type === 'video') {
    // Extract first frame using HTML5 video in a hidden BrowserWindow
    // OR use ffmpeg if available
    // For v1: skip video thumbnails, return null
    return null
  }

  return null
}
```

### 6.4.3 Duplicate Detection

```typescript
// Before importing a file, check if it already exists by path
function findExistingAsset(originalPath: string): MediaAssetRecord | null {
  return db
    .prepare('SELECT * FROM media_assets WHERE original_path = ? LIMIT 1')
    .get(originalPath) as MediaAssetRecord | null
}

// In importMediaAssets():
for (const filePath of filePaths) {
  const existing = findExistingAsset(filePath)
  if (existing) {
    results.push({ ...existing, _duplicate: true })
    continue
  }
  // ... proceed with import
}
```

---

## 6.5 Backup Architecture

### 6.5.1 Current Backup System (Confirmed)

```typescript
export function createBackup(customPath?: string): string {
  // Uses SQLite VACUUM INTO for atomic backup
  // Returns backup file path
}

export function restoreBackup(backupPath: string): boolean {
  // Validates path, copies backup over current DB
  // Requires app restart to take effect
}
```

### 6.5.2 Backup Integrity Validation

```typescript
// Add integrity check before restore
function validateBackupFile(backupPath: string): { valid: boolean; error?: string } {
  try {
    const testDb = new Database(backupPath, { readonly: true })
    // Check schema version
    const version = testDb.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as {
      v: number
    }
    testDb.close()

    if (!version?.v) return { valid: false, error: 'Invalid schema' }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: String(err) }
  }
}
```

### 6.5.3 Auto-Backup Strategy

```typescript
// Auto-backup on app startup (if last backup > 7 days ago)
function shouldAutoBackup(): boolean {
  const lastBackup = getAppState('last_auto_backup')
  if (!lastBackup) return true
  const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince > 7
}

// In initDatabase():
if (shouldAutoBackup()) {
  try {
    const path = createBackup()
    saveAppState('last_auto_backup', new Date().toISOString())
    console.log('[Auto-backup] Created:', path)
  } catch (err) {
    console.warn('[Auto-backup] Failed:', err)
  }
}
```

---

# PART 7: ERROR RECOVERY ARCHITECTURE

## 7.1 Global Error System

### 7.1.1 Error Boundary Hierarchy

```
App.tsx (root)
  └── ErrorBoundary (exists — wraps entire app)
      ├── TitleBar (no boundary — low risk)
      ├── Mode Content Area
      │   ├── ErrorBoundary (per-mode — NEW)
      │   │   ├── LibraryMode
      │   │   ├── ProjectionMode  ← CRITICAL: must never crash silently
      │   │   ├── ManagementMode
      │   │   └── BroadcastMode
      │   └── Overlay Screens
      │       ├── ErrorBoundary (per-overlay — NEW)
      │       │   ├── SongEditorScreen
      │       │   ├── SettingsScreen
      │       │   └── ImportExportScreen
      └── Floating Layer
          └── ErrorBoundary (per-overlay — NEW)
              ├── CommandPalette
              └── RuntimeInspector
```

### 7.1.2 Per-Mode Error Boundary Behavior

```typescript
// ProjectionMode ErrorBoundary — special handling
class ProjectionModeErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('[ProjectionMode] Render error:', error, info)

    // CRITICAL: Attempt to preserve live output
    // The projection window is separate — it continues running
    // Only the operator UI crashed, not the output

    // Notify operator
    useAppStore.getState().showToast(
      'Projection Mode mengalami error. Output tetap berjalan.',
      'error'
    )
  }

  render() {
    if (this.state.hasError) {
      return <ProjectionModeErrorFallback onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}

// Fallback UI: minimal controls to continue operating
function ProjectionModeErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="projection-error-fallback">
      <h2>Projection Mode Error</h2>
      <p>Output proyektor tetap berjalan. Klik Retry untuk memulihkan operator view.</p>
      <button onClick={onRetry}>Retry</button>
      <button onClick={() => executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')}>
        Clear Output (Emergency)
      </button>
    </div>
  )
}
```

### 7.1.3 IPC Error Recovery

```typescript
// Current: safeIpcHandle catches errors and re-throws with sanitized message
// Enhancement: Add retry logic for transient failures

function safeIpcHandleWithRetry<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult,
  maxRetries = 1
): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await handler(...args)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // Only retry on SQLite SQLITE_BUSY errors
        if (lastError.message.includes('SQLITE_BUSY') && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
          continue
        }
        break
      }
    }

    throw new Error(toSafeIpcErrorMessage(channel, lastError))
  })
}
```

### 7.1.4 Renderer Crash Recovery

```typescript
// Main process: detect renderer crash
mainWindow.webContents.on('render-process-gone', (_e, details) => {
  console.error('[mainWindow] render-process-gone', details)

  // Projection window continues independently
  // Main window needs reload
  if (details.reason !== 'clean-exit') {
    // Wait 1 second then reload
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload()
      }
    }, 1000)
  }
})
```

---

## 7.2 Recovery Strategies

### 7.2.1 Crash Recovery Flow (Complete)

```
App starts
  ↓
useAppBootstrap() → getRecoveryState()
  ↓
RecoveryState { needsRecovery: true, playlistId: 5, songId: 42, slideIndex: 3 }
  ↓
useModalStore.open('crash-recovery', { recoveryState })
  ↓
CrashRecoveryDialog shown (blocks interaction)
  ↓
User clicks "Pulihkan Session"
  ↓
1. loadPlaylists() → find playlist by id
2. setActivePlaylist(playlist)
3. loadPlaylistItems(playlistId)
4. find song by songId in songs[]
5. setSelectedSong(song)
6. generateSlidesForSong(song) → setSlides(slides, meta)
7. setCurrentSlideIndex(slideIndex)
8. markCleanExit()  ← clear recovery flag
9. close modal
10. showToast('Session dipulihkan', 'success')
  ↓
User clicks "Mulai Baru"
  ↓
1. markCleanExit()
2. close modal
```

### 7.2.2 Session Save Strategy

```typescript
// Current: saveSessionState() called manually
// Fix: Auto-save on every projection state change

// In useProjectionStore.goToSlide():
// After sendLiveSlide():
window.api.system
  .saveSession({
    playlistId: usePlaylistStore.getState().activePlaylist?.id,
    songId: slideData.songId,
    slideIndex: index,
    projectionState: 'LIVE'
  })
  .catch(() => {}) // fire-and-forget, never block projection

// Debounce: 2000ms — don't save on every rapid slide change
const debouncedSaveSession = debounce((state: SessionState) => {
  window.api.system.saveSession(state).catch(() => {})
}, 2000)
```

### 7.2.3 Safe-Mode Startup

```typescript
// If app crashes 3 times in < 60 seconds, start in safe mode
// Safe mode: skip media preload, skip atmosphere, minimal UI

function checkSafeMode(): boolean {
  const crashes = getAppState('crash_count') || '0'
  const lastCrash = getAppState('last_crash_time') || '0'
  const count = parseInt(crashes, 10)
  const elapsed = Date.now() - parseInt(lastCrash, 10)

  if (count >= 3 && elapsed < 60000) {
    saveAppState('crash_count', '0') // reset
    return true
  }

  // Increment crash counter (will be cleared on clean exit)
  saveAppState('crash_count', String(count + 1))
  saveAppState('last_crash_time', String(Date.now()))
  return false
}

// In initDatabase():
const isSafeMode = checkSafeMode()
if (isSafeMode) {
  console.warn('[SafeMode] Starting in safe mode due to repeated crashes')
}
// Pass isSafeMode to renderer via initial settings
```

---

## 7.3 Logging System

### 7.3.1 Current Logger (Confirmed)

```typescript
// src/renderer/src/utils/logger.ts
// Simple console wrapper — exists but not read in audit
// Assumed to be: { info, warn, error, debug }
```

### 7.3.2 Structured Logging Architecture

```typescript
// Enhanced logger — replaces current implementation

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  timestamp: string
  module: string
  message: string
  data?: unknown
}

class StructuredLogger {
  private buffer: LogEntry[] = []
  private readonly MAX_BUFFER = 500

  private log(level: LogEntry['level'], module: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      module,
      message,
      data
    }

    // Console output (dev only)
    if (import.meta.env.DEV) {
      const prefix = `[${entry.module}]`
      console[level === 'debug' ? 'log' : level](prefix, message, data ?? '')
    }

    // Buffer for RuntimeInspector
    this.buffer.push(entry)
    if (this.buffer.length > this.MAX_BUFFER) this.buffer.shift()
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', this.getModule(), message, data)
  }
  info(message: string, data?: unknown): void {
    this.log('info', this.getModule(), message, data)
  }
  warn(message: string, data?: unknown): void {
    this.log('warn', this.getModule(), message, data)
  }
  error(message: string, data?: unknown): void {
    this.log('error', this.getModule(), message, data)
  }

  getBuffer(limit = 100): LogEntry[] {
    return this.buffer.slice(-limit)
  }

  private getModule(): string {
    // Extract caller module from stack trace
    const stack = new Error().stack?.split('\n')[3] || ''
    const match = stack.match(/\/([^/]+)\.[tj]sx?/)
    return match?.[1] || 'unknown'
  }
}

export const logger = new StructuredLogger()
```

### 7.3.3 RuntimeInspector Integration

The `RuntimeInspector` component already exists. It should display:

1. Runtime command log (from `commandBus.getEventLog()`) — already works
2. Structured log buffer (from `logger.getBuffer()`) — needs wiring
3. IPC health status (from `useHealthStore`) — already works
4. Store state snapshot — needs wiring

```typescript
// In RuntimeInspector.tsx — add log tab:
const logEntries = logger.getBuffer(100)

// Render log entries with level-colored badges
```

---

# PART 8: PERFORMANCE ARCHITECTURE

## 8.1 Render Performance

### 8.1.1 Virtualization Rules

```
Apply @tanstack/react-virtual when:
  - List has > 100 items
  - Items have consistent height
  - List is scrollable

Current virtualization status:
  - SongLibraryPanel: ✅ virtualized (confirmed from component)
  - Management song list: ❌ NOT virtualized (uses .map() directly)
  - Library number grid: ❌ NOT virtualized (paginated instead — acceptable)
  - Library title grid: ❌ NOT virtualized (needs virtualization for 1000+ songs)
  - Playlist items: ❌ NOT virtualized (acceptable — max ~50 items)
```

**Priority fix:** Management Mode song list — can have 1000+ songs, renders all at once.

```typescript
// ManagementMode.tsx — virtualize song list
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)
const rowVirtualizer = useVirtualizer({
  count: filteredSongs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 66,  // management-browser__row min-height
  overscan: 5
})

// Replace .map(song => <Row />) with:
<div ref={parentRef} className="management-browser__viewport">
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
    {rowVirtualizer.getVirtualItems().map(virtualRow => (
      <div
        key={filteredSongs[virtualRow.index].id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`
        }}
      >
        <SongRow song={filteredSongs[virtualRow.index]} />
      </div>
    ))}
  </div>
</div>
```

### 8.1.2 Memoization Rules

```typescript
// Rule: Memoize all list items that receive callbacks
const SongRow = React.memo(
  ({ song, isSelected, onSelect, onEdit, onDelete }: SongRowProps) => {
    // ...
  },
  (prev, next) => {
    // Custom comparison: only re-render if song data or selection changed
    return (
      prev.song.id === next.song.id &&
      prev.song.updated_at === next.song.updated_at &&
      prev.isSelected === next.isSelected
    )
  }
)

// Rule: Memoize expensive derived state
const songStats = useMemo(() => computeSongStats(songs), [songs])
const filteredSongs = useMemo(
  () => filterSongs(songs, query, statusFilter, sortMode),
  [songs, query, statusFilter, sortMode]
)
const counts = useMemo(() => computeCounts(songs, playlists, hymnals), [songs, playlists, hymnals])
```

### 8.1.3 Render Batching

```typescript
// React 19 automatic batching handles most cases
// For manual batching of multiple state updates:
import { flushSync } from 'react-dom'

// Only use flushSync when immediate DOM update is required
// (e.g., measuring DOM after state change)
// Avoid in projection-critical paths
```

---

## 8.2 Database Performance

### 8.2.1 Index Strategy (Current — Confirmed from migrations.ts)

```sql
-- Existing indexes (migration 6):
idx_songs_hymnal_number ON songs(hymnal_id, number)
idx_songs_hymnal_title  ON songs(hymnal_id, title)
idx_song_history_song_id ON song_history(song_id)
idx_songs_number ON songs(number)
idx_songs_title  ON songs(title)
idx_songs_hymnal_id ON songs(hymnal_id)

-- Media indexes (migration 11):
idx_media_assets_type ON media_assets(type)
idx_media_assets_category ON media_assets(category)
idx_media_assets_favorite ON media_assets(is_favorite)
idx_media_assets_usage ON media_assets(usage_count DESC)
```

**Missing indexes to add in migration 17:**

```sql
-- For Management Mode sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);

-- For song history analytics (last 7 days)
CREATE INDEX IF NOT EXISTS idx_song_history_played_at ON song_history(played_at DESC);

-- For custom slides by type
CREATE INDEX IF NOT EXISTS idx_custom_slides_type ON custom_slides(slide_type);
CREATE INDEX IF NOT EXISTS idx_custom_slides_active ON custom_slides(is_active);
```

### 8.2.2 Query Optimization

```typescript
// Current getSongs() loads ALL fields including lyrics_raw
// For list views, lyrics_raw is not needed — add lightweight query

export function getSongsSummary(hymnalId?: number): SongSummary[] {
  // Excludes lyrics_raw — much faster for large libraries
  const sql = hymnalId
    ? `SELECT s.id, s.hymnal_id, s.number, s.title, s.alternate_title,
              s.category, s.language, s.author, s.key_note, s.tempo,
              s.tags, s.theme, s.is_favorite, s.updated_at,
              s.song_background_config,
              h.code as hymnal_code, h.name as hymnal_name
       FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
       WHERE s.hymnal_id = ?
       ORDER BY CAST(s.number AS INTEGER), s.number`
    : `SELECT s.id, s.hymnal_id, s.number, s.title, s.alternate_title,
              s.category, s.language, s.author, s.key_note, s.tempo,
              s.tags, s.theme, s.is_favorite, s.updated_at,
              s.song_background_config,
              h.code as hymnal_code, h.name as hymnal_name
       FROM songs s JOIN hymnals h ON s.hymnal_id = h.id
       ORDER BY h.code, CAST(s.number AS INTEGER), s.number`

  return hymnalId
    ? (db.prepare(sql).all(hymnalId) as SongSummary[])
    : (db.prepare(sql).all() as SongSummary[])
}
```

---

## 8.3 Multi-Window Performance

### 8.3.1 IPC Optimization

```typescript
// Current: projection:slide-update sends full SlideData on every slide change
// SlideData is small (~500 bytes) — acceptable

// Optimization: batch theme updates
// Current: multiple settings changes each trigger projection:theme-update
// Fix: debounce theme updates in renderer

const debouncedThemeUpdate = debounce((theme: Record<string, string>) => {
  window.api.projection.themeUpdate(theme)
}, 300)

// In SettingsScreen.updateSetting():
// Replace: window.api.projection.themeUpdate(newSettings)
// With: debouncedThemeUpdate(newSettings)
```

### 8.3.2 Memory Isolation

```typescript
// Projection window should have minimal memory footprint
// Current: ProjectionApp only renders PresentationCanvas — correct

// Ensure projection window does NOT:
// - Load song library
// - Load playlists
// - Subscribe to health store
// - Run command bus

// Projection window ONLY needs:
// - IPC listeners for slide-update, state-change, theme-update
// - PresentationCanvas renderer
// - AtmosphereRenderer
```

### 8.3.3 Projection Window Heartbeat

```typescript
// Current: projection window sends heartbeat every 1000ms
// This is correct — 3000ms timeout in health registry

// Enhancement: reduce heartbeat interval to 500ms for faster detection
// In ProjectionApp.tsx:
const heartbeatInterval = setInterval(() => {
  window.api.health?.sendHeartbeat('PROJECTION_WINDOW')
}, 500) // was 1000ms
```

---

# PART 9: FEATURE COMPLETION MATRIX

## 9.1 Dead UI Completion Tracker

| ID      | Feature              | Severity    | Status | Complexity | Order | Risk | Test Required            |
| ------- | -------------------- | ----------- | ------ | ---------- | ----- | ---- | ------------------------ |
| DUI-001 | Favorite button wire | 🔴 Critical | ❌     | XS         | 1     | Low  | Toggle persists          |
| DUI-002 | New Playlist dialog  | 🔴 Critical | ❌     | S          | 2     | Low  | Create + appear in list  |
| DUI-003 | Bible Screen access  | 🔴 Critical | ❌     | XS         | 3     | Low  | Ctrl+B opens screen      |
| DUI-004 | Theme button wire    | 🟡 High     | ❌     | S          | 4     | Low  | Cycles dark/light/system |
| DUI-005 | Notifications panel  | 🟡 High     | ❌     | M          | 8     | Low  | Bell opens panel         |
| DUI-006 | Real storage metric  | 🔴 Critical | ❌     | S          | 5     | Low  | Shows real MB values     |
| DUI-007 | Real trend bars      | 🟡 High     | ❌     | M          | 9     | Low  | Bars from history data   |
| DUI-008 | Layout toggle        | 🟠 Medium   | ❌     | S          | 12    | Low  | Switches table/grid      |
| DUI-009 | Filter dropdown      | 🟠 Medium   | ❌     | M          | 13    | Low  | Filters apply to list    |
| DUI-010 | Chord/Notes tabs     | 🟡 High     | ❌     | M          | 10    | Low  | Tabs show content        |

## 9.2 Missing Modal Tracker

| ID     | Modal                 | Priority    | Backend | Complexity | Order | Dependencies             |
| ------ | --------------------- | ----------- | ------- | ---------- | ----- | ------------------------ |
| MM-001 | CreatePlaylistDialog  | 🔴 Critical | ✅      | S          | 2     | useModalStore            |
| MM-002 | DeleteConfirmDialog   | 🔴 Critical | ✅      | S          | 1     | useModalStore            |
| MM-003 | CrashRecoveryDialog   | 🔴 Critical | ✅      | S          | 3     | useModalStore            |
| MM-004 | SongRelationsModal    | 🟡 High     | ✅      | M          | 7     | useModalStore            |
| MM-005 | ImportProgressDialog  | 🟡 High     | ✅      | M          | 6     | useModalStore            |
| MM-006 | IntegrityCheckDialog  | 🟡 High     | ✅      | M          | 11    | useModalStore            |
| MM-007 | BiblePickerDialog     | 🟡 High     | ✅      | H          | 14    | BibleScreen refactor     |
| MM-008 | AnnouncementEditor    | 🟡 High     | ✅      | H          | 15    | Custom slides system     |
| MM-009 | MediaImportDialog     | 🟡 High     | ✅      | M          | 16    | Media browser            |
| MM-010 | DuplicateSongDialog   | 🟠 Medium   | ❌      | S          | 17    | db:duplicate-song IPC    |
| MM-011 | NotificationPanel     | 🟠 Medium   | ❌      | M          | 8     | useNotificationStore     |
| MM-012 | FilterDropdown        | 🟠 Medium   | ✅      | S          | 13    | —                        |
| MM-013 | SceneConfigDialog     | 🟠 Medium   | ✅      | H          | 18    | AtmosphereStore          |
| MM-014 | TagManagerDialog      | 🟠 Medium   | ✅      | M          | 19    | —                        |
| MM-015 | PlaylistPickerDialog  | 🟠 Medium   | ✅      | S          | 4     | useModalStore            |
| MM-016 | ExportSongDialog      | 🟠 Medium   | ✅      | S          | 20    | —                        |
| MM-017 | SongHistoryPanel      | 🟠 Medium   | ✅      | S          | 21    | —                        |
| MM-018 | StorageStatsDialog    | 🟠 Medium   | ❌      | S          | 5     | system:get-storage-stats |
| MM-019 | HymnalIntegrityDialog | 🟠 Medium   | ✅      | M          | 22    | —                        |
| MM-020 | BackupProgressDialog  | 🟠 Medium   | ✅      | S          | 23    | —                        |

## 9.3 Broken Workflow Tracker

| ID     | Workflow                | Severity    | Status | Complexity | Order | Dependencies             |
| ------ | ----------------------- | ----------- | ------ | ---------- | ----- | ------------------------ |
| MW-001 | Create Playlist         | 🔴 Critical | ❌     | S          | 2     | MM-001                   |
| MW-002 | Delete Confirmation     | 🔴 Critical | ❌     | S          | 1     | MM-002                   |
| MW-003 | Bible Projection        | 🔴 Critical | ❌     | H          | 14    | DUI-003, MM-007          |
| MW-004 | Announcement Projection | 🟡 High     | ❌     | H          | 15    | MM-008, Overlay Engine   |
| MW-005 | Song Relations          | 🟡 High     | ❌     | M          | 7     | MM-004                   |
| MW-006 | Crash Recovery Dialog   | 🔴 Critical | ❌     | S          | 3     | MM-003                   |
| MW-007 | Import Progress         | 🟡 High     | ❌     | M          | 6     | MM-005                   |
| BS-001 | Active Playlist Persist | 🟡 High     | ❌     | S          | 4     | usePlaylistStore persist |
| BS-002 | 3-Panel Layout Persist  | 🟠 Medium   | ❌     | S          | 9     | usePanelLayoutStore      |
| BS-003 | Timer Persist           | 🟠 Medium   | ❌     | S          | 10    | useServiceStore          |
| BS-004 | Auto Session Save       | 🟡 High     | ❌     | S          | 5     | debounced save           |

## 9.4 Projection Runtime Tracker

| Feature                                 | Status | Complexity | Order | Risk   |
| --------------------------------------- | ------ | ---------- | ----- | ------ |
| Timer tick interval (useTimerTick hook) | ❌     | XS         | 1     | Low    |
| Timer controls in TitleBarStatus        | ❌     | S          | 2     | Low    |
| Next song preload pipeline              | ❌     | S          | 3     | Low    |
| Slide config from settings              | ❌     | S          | 4     | Low    |
| Confidence payload broadcast            | ❌     | S          | 5     | Low    |
| StageDisplayApp confidence render       | ❌     | M          | 6     | Low    |
| MediaEngine LRU cache                   | ❌     | M          | 7     | Medium |
| Atmosphere resolution pipeline          | ❌     | M          | 8     | Medium |
| Overlay engine (ProjectionPayload)      | ❌     | H          | 9     | High   |
| PresentationCanvas overlay support      | ❌     | H          | 10    | High   |
| Per-mode ErrorBoundary                  | ❌     | S          | 11    | Low    |
| ProjectionMode ErrorBoundary fallback   | ❌     | S          | 12    | Low    |
| Auto session save (debounced)           | ❌     | S          | 13    | Low    |
| Safe-mode startup                       | ❌     | M          | 14    | Low    |

## 9.5 IPC Migration Tracker

| Channel                    | Current State           | Action                                 | Priority    |
| -------------------------- | ----------------------- | -------------------------------------- | ----------- |
| `display_get-all`          | Underscore naming       | Add normalized alias `display:get-all` | 🟠 Medium   |
| `system:get-storage-stats` | Missing                 | Add new handler                        | 🔴 Critical |
| `db:duplicate-song`        | Missing                 | Add new handler + DB function          | 🟠 Medium   |
| `confidence:update`        | Missing                 | Add new handler                        | 🟡 High     |
| All `ipcMain.handle` reads | Unvalidated args        | Wrap in `safeIpcHandle`                | 🟡 High     |
| `db:get-songs`             | Returns full lyrics_raw | Add `db:get-songs-summary` variant     | 🟠 Medium   |
| `db:get-recent-songs`      | Returns Song[]          | Add analytics grouping                 | 🟠 Medium   |

## 9.6 State Migration Tracker

| Store                  | Action                          | Priority    | Complexity |
| ---------------------- | ------------------------------- | ----------- | ---------- |
| `useAppStore`          | Extract `useSongStore`          | 🟠 Medium   | M          |
| `useAppStore`          | Extract `useHymnalStore`        | 🟠 Medium   | M          |
| `useAppStore`          | Extract `useDisplayStore`       | 🟠 Medium   | S          |
| `usePlaylistStore`     | Add activePlaylist persistence  | 🔴 Critical | S          |
| `useProjectionStore`   | Move timer to `useServiceStore` | 🟠 Medium   | S          |
| `usePanelLayoutStore`  | Extend to 3-panel projection    | 🟡 High     | S          |
| `useModalStore`        | Create new store                | 🔴 Critical | M          |
| `useNotificationStore` | Create new store                | 🟠 Medium   | M          |
| `useServiceStore`      | Create new store                | 🟠 Medium   | S          |

## 9.7 Accessibility Completion Tracker

| Item                                   | Status      | Priority    | Component                |
| -------------------------------------- | ----------- | ----------- | ------------------------ |
| `aria-label` on all icon buttons       | ❌ Partial  | 🟡 High     | All modes                |
| Focus ring on all interactive elements | ❌ Partial  | 🟡 High     | Global CSS               |
| `prefers-reduced-motion` support       | ❌ Missing  | 🟡 High     | main.css + Framer Motion |
| Focus trap in modals                   | ❌ Missing  | 🔴 Critical | useModalStore            |
| Escape closes modals                   | ❌ Missing  | 🔴 Critical | useModalStore            |
| Keyboard navigation in song grids      | ❌ Missing  | 🟡 High     | Library/Management       |
| `role="dialog"` on modals              | ❌ Missing  | 🔴 Critical | Modal base component     |
| `aria-live` on toast notifications     | ❌ Missing  | 🟡 High     | Toast.tsx                |
| `aria-busy` on loading buttons         | ❌ Missing  | 🟠 Medium   | Button component         |
| Screen reader testing                  | ❌ Not done | 🟠 Medium   | Full app                 |

## 9.8 Performance Completion Tracker

| Item                            | Status     | Priority  | Component                 |
| ------------------------------- | ---------- | --------- | ------------------------- |
| Virtualize Management song list | ❌ Missing | 🟡 High   | ManagementMode.tsx        |
| Virtualize Library title grid   | ❌ Missing | 🟠 Medium | LibraryModeRedesigned.tsx |
| Memoize SongRow in Management   | ❌ Missing | 🟡 High   | ManagementMode.tsx        |
| MediaEngine LRU eviction        | ❌ Missing | 🟡 High   | mediaEngine.ts            |
| Debounce theme IPC updates      | ❌ Missing | 🟠 Medium | SettingsScreen.tsx        |
| getSongsSummary (no lyrics_raw) | ❌ Missing | 🟠 Medium | database.ts               |
| Migration 17 (missing indexes)  | ❌ Missing | 🟠 Medium | migrations.ts             |
| Projection heartbeat 500ms      | ❌ Missing | 🟠 Medium | ProjectionApp.tsx         |
| Slide config from settings      | ❌ Missing | 🟡 High   | slideEngine.ts            |
| Auto-backup on startup          | ❌ Missing | 🟠 Medium | database.ts               |

---

# PART 10: IMPLEMENTATION PREPARATION

## 10.1 Implementation Order (Dependency-Sequenced)

### Sprint 0 — Infrastructure (No UI, No Breaking Changes)

These changes are pure additions with zero risk of breaking existing functionality.

| #    | Task                                 | File(s)                                              | Effort |
| ---- | ------------------------------------ | ---------------------------------------------------- | ------ |
| 0.1  | Create `useModalStore.ts`            | `src/renderer/src/store/`                            | S      |
| 0.2  | Create `useServiceStore.ts`          | `src/renderer/src/store/`                            | S      |
| 0.3  | Create `useNotificationStore.ts`     | `src/renderer/src/store/`                            | S      |
| 0.4  | Add `useTimerTick` hook              | `src/renderer/src/hooks/`                            | XS     |
| 0.5  | Add `system:get-storage-stats` IPC   | `ipc-handlers.ts`, `preload/index.ts`                | S      |
| 0.6  | Add `db:duplicate-song` IPC          | `database.ts`, `ipc-handlers.ts`, `preload/index.ts` | S      |
| 0.7  | Add `confidence:update` IPC          | `ipc-handlers.ts`, `preload/index.ts`                | S      |
| 0.8  | Add `display:get-all` alias          | `ipc-handlers.ts`                                    | XS     |
| 0.9  | Add migration 14 (service_state)     | `migrations.ts`                                      | XS     |
| 0.10 | Add migration 15 (song_notes)        | `migrations.ts`                                      | XS     |
| 0.11 | Add migration 16 (notifications)     | `migrations.ts`                                      | XS     |
| 0.12 | Add migration 17 (missing indexes)   | `migrations.ts`                                      | XS     |
| 0.13 | Extend `PanelLayoutSizes` to 3-panel | `usePanelLayoutStore.ts`                             | XS     |
| 0.14 | Add `getSongsSummary()` DB function  | `database.ts`                                        | S      |

### Sprint 1 — Critical Dead UI Fixes

These fix the most impactful broken interactions. Each is self-contained.

| #   | Task                                 | File(s)                     | Effort | Depends On |
| --- | ------------------------------------ | --------------------------- | ------ | ---------- |
| 1.1 | Wire favorite button (DUI-001)       | `LibraryModeRedesigned.tsx` | XS     | —          |
| 1.2 | Wire theme button (DUI-004)          | `TitleBar.tsx`              | S      | —          |
| 1.3 | Add Bible to View menu (DUI-003)     | `TitleBarMenu.tsx`          | XS     | —          |
| 1.4 | Add Ctrl+B shortcut                  | `useGlobalShortcuts.ts`     | XS     | —          |
| 1.5 | Fix storage metric (DUI-006)         | `ManagementMode.tsx`        | S      | 0.5        |
| 1.6 | Wire timer tick                      | `App.tsx`                   | XS     | 0.4        |
| 1.7 | Add timer controls to TitleBarStatus | `TitleBarStatus.tsx`        | S      | 1.6        |
| 1.8 | Mount `ModalRegistry` in App.tsx     | `App.tsx`                   | XS     | 0.1        |

### Sprint 2 — Modal System Foundation

Build the modal infrastructure and the three most critical modals.

| #   | Task                                  | File(s)                       | Effort | Depends On |
| --- | ------------------------------------- | ----------------------------- | ------ | ---------- |
| 2.1 | Build `Modal` base component          | `components/modals/Modal.tsx` | M      | 0.1        |
| 2.2 | Build `DeleteConfirmDialog` (MM-002)  | `components/modals/`          | S      | 2.1        |
| 2.3 | Build `CreatePlaylistDialog` (MM-001) | `components/modals/`          | S      | 2.1        |
| 2.4 | Build `CrashRecoveryDialog` (MM-003)  | `components/modals/`          | S      | 2.1        |
| 2.5 | Wire DeleteConfirmDialog everywhere   | Multiple files                | M      | 2.2        |
| 2.6 | Wire CreatePlaylistDialog to menu     | `TitleBarMenu.tsx`            | XS     | 2.3        |
| 2.7 | Wire CrashRecovery to bootstrap       | `useAppBootstrap.ts`          | S      | 2.4        |
| 2.8 | Persist activePlaylist (BS-001)       | `usePlaylistStore.ts`         | S      | —          |
| 2.9 | Auto session save (BS-004)            | `useProjectionStore.ts`       | S      | —          |

### Sprint 3 — Projection Runtime Hardening

| #   | Task                              | File(s)                                    | Effort | Depends On |
| --- | --------------------------------- | ------------------------------------------ | ------ | ---------- |
| 3.1 | Next song preload pipeline        | `ProjectionMode.tsx`                       | S      | —          |
| 3.2 | Slide config from settings        | `useAppBootstrap.ts`, `slideEngine.ts`     | S      | —          |
| 3.3 | Confidence payload broadcast      | `useProjectionStore.ts`, `ipc-handlers.ts` | S      | 0.7        |
| 3.4 | StageDisplayApp confidence render | `StageDisplayApp.tsx`                      | M      | 3.3        |
| 3.5 | Per-mode ErrorBoundary            | `App.tsx`, new `ErrorBoundary` variants    | S      | —          |
| 3.6 | MediaEngine LRU cache             | `mediaEngine.ts`                           | M      | —          |
| 3.7 | Atmosphere resolution pipeline    | `atmosphereStore.ts`                       | M      | —          |
| 3.8 | Virtualize Management song list   | `ManagementMode.tsx`                       | M      | —          |

### Sprint 4 — Workflow Completion

| #    | Task                                  | File(s)              | Effort | Depends On |
| ---- | ------------------------------------- | -------------------- | ------ | ---------- |
| 4.1  | Build `ImportProgressDialog` (MM-005) | `components/modals/` | M      | 2.1        |
| 4.2  | Build `SongRelationsModal` (MM-004)   | `components/modals/` | M      | 2.1        |
| 4.3  | Build `PlaylistPickerDialog` (MM-015) | `components/modals/` | S      | 2.1        |
| 4.4  | Build `IntegrityCheckDialog` (MM-006) | `components/modals/` | M      | 2.1        |
| 4.5  | Wire Duplikat action (FI-003)         | `ManagementMode.tsx` | S      | 0.6        |
| 4.6  | Wire Relasi action (FI-004)           | `ManagementMode.tsx` | S      | 4.2        |
| 4.7  | Notes tab implementation (DUI-010)    | Multiple             | M      | 0.10       |
| 4.8  | Real trend bars (DUI-007)             | `ManagementMode.tsx` | M      | —          |
| 4.9  | Notification panel (DUI-005)          | Multiple             | M      | 0.3        |
| 4.10 | Filter dropdown (DUI-009)             | `ManagementMode.tsx` | M      | —          |

### Sprint 5 — Advanced Features

| #   | Task                               | File(s)                         | Effort | Depends On |
| --- | ---------------------------------- | ------------------------------- | ------ | ---------- |
| 5.1 | Bible projection integration       | `ProjectionMode.tsx`, new panel | H      | DUI-003    |
| 5.2 | Announcement panel                 | `ProjectionMode.tsx`, new panel | H      | MM-008     |
| 5.3 | Overlay engine (ProjectionPayload) | `PresentationCanvas.tsx`        | H      | 5.1, 5.2   |
| 5.4 | Media Library management page      | `ManagementMode.tsx`            | H      | —          |
| 5.5 | Custom Slides management page      | `ManagementMode.tsx`            | H      | —          |
| 5.6 | Scene config dialog                | `components/modals/`            | H      | —          |
| 5.7 | Store decomposition (useSongStore) | Multiple                        | M      | —          |
| 5.8 | Safe-mode startup                  | `database.ts`, `main/index.ts`  | M      | —          |

---

## 10.2 Codebase Restructuring Plan

### 10.2.1 New Directory Structure

```
src/renderer/src/
├── components/
│   ├── design-system/          ← existing, extend
│   ├── modals/                 ← NEW
│   │   ├── Modal.tsx           ← base modal
│   │   ├── ConfirmDialog.tsx
│   │   ├── CreatePlaylistDialog.tsx
│   │   ├── CrashRecoveryDialog.tsx
│   │   ├── SongRelationsModal.tsx
│   │   ├── ImportProgressDialog.tsx
│   │   ├── IntegrityCheckDialog.tsx
│   │   ├── PlaylistPickerDialog.tsx
│   │   ├── ModalRegistry.tsx   ← renders active modals
│   │   └── index.ts
│   ├── library/                ← existing
│   ├── titlebar/               ← existing
│   └── [existing components]
├── store/
│   ├── useAppStore.ts          ← existing, reduce scope
│   ├── useModeStore.ts         ← existing, keep
│   ├── useProjectionStore.ts   ← existing, keep
│   ├── usePlaylistStore.ts     ← existing, add persistence
│   ├── usePanelLayoutStore.ts  ← existing, extend
│   ├── useHealthStore.ts       ← existing, keep
│   ├── useAtmosphereStore.ts   ← existing, verify
│   ├── useAnnouncementStore.ts ← existing, verify
│   ├── useCacheStore.ts        ← existing, keep
│   ├── useModalStore.ts        ← NEW
│   ├── useServiceStore.ts      ← NEW
│   ├── useNotificationStore.ts ← NEW
│   ├── useSongStore.ts         ← NEW (extracted from useAppStore)
│   ├── useHymnalStore.ts       ← NEW (extracted from useAppStore)
│   └── useDisplayStore.ts      ← NEW (extracted from useAppStore)
├── hooks/
│   ├── useAppBootstrap.ts      ← existing, extend
│   ├── useCrashRecovery.ts     ← existing, wire to modal
│   ├── useGlobalShortcuts.ts   ← existing, add Ctrl+B
│   └── useTimerTick.ts         ← NEW
├── engine/
│   ├── mediaEngine.ts          ← existing, harden
│   └── slideEngine.ts          ← existing, extend
└── [existing structure]
```

### 10.2.2 Modal Extraction Strategy

```
Phase A: Build useModalStore + Modal base component
  → No existing code changes
  → Mount ModalRegistry in App.tsx

Phase B: Build critical modals (DeleteConfirm, CreatePlaylist, CrashRecovery)
  → Replace window.confirm() calls one at a time
  → Each replacement is isolated

Phase C: Wire modals to existing dead UI
  → Wire buttons that currently have empty onClick handlers
  → Each wire is isolated

Phase D: Build advanced modals (SongRelations, ImportProgress, etc.)
  → New functionality, no existing code changes
```

### 10.2.3 Store Decomposition Strategy

```
Phase A: Create new stores (useSongStore, useHymnalStore, useDisplayStore)
  → Copy state/actions from useAppStore
  → Keep useAppStore as-is (no breaking changes)

Phase B: Update useAppStore to delegate to new stores
  → useAppStore.songs → useSongStore.songs (re-export for compatibility)
  → Gradual migration, component by component

Phase C: Remove re-exports from useAppStore
  → Update all component imports
  → Final cleanup
```

---

## 10.3 Testing Strategy

### 10.3.1 Runtime Testing

```typescript
// Test: RuntimeCommandBus throttling
test('command bus throttles rapid commands', () => {
  const bus = new RuntimeCommandBus()
  bus.registerHandler('PROJ_BLACK', () => ({ success: true }))

  const result1 = bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))
  const result2 = bus.execute(bus.createCommand('PROJ_BLACK', undefined, 'KEYBOARD'))

  expect(result1.status).toBe('SUCCESS')
  expect(result2.status).toBe('BLOCKED') // throttled
})

// Test: LIVE_LOCK prevents navigation
test('LIVE_LOCK blocks live navigation', () => {
  const store = useProjectionStore.getState()
  store.goToSlide(0) // sets LIVE_LOCK

  const result = executeRuntimeCommand('NAV_GOTO_SLIDE', { slideIndex: 2 }, 'KEYBOARD')
  expect(result.status).toBe('BLOCKED')
})
```

### 10.3.2 Projection Testing

```typescript
// Test: Slide generation cache
test('slide engine caches by song id + hash', () => {
  const slides1 = generateSlidesForSong(mockSong)
  const slides2 = generateSlidesForSong(mockSong)
  expect(slides1).toBe(slides2) // same reference (cached)

  const modifiedSong = { ...mockSong, lyrics_raw: 'different lyrics' }
  const slides3 = generateSlidesForSong(modifiedSong)
  expect(slides3).not.toBe(slides1) // cache miss
})

// Test: Section map building
test('section map correctly indexes sections', () => {
  const slides = generateSlidesForSong(songWithSections)
  const sectionMap = buildSectionIndexMap(slides)

  expect(sectionMap['verse 1']).toContain(0)
  expect(sectionMap['chorus']).toContain(2)
})
```

### 10.3.3 IPC Testing

```typescript
// Test: safeIpcHandle catches and sanitizes errors
test('safeIpcHandle sanitizes error messages', async () => {
  // Mock handler that throws
  const handler = jest
    .fn()
    .mockRejectedValue(new Error('SQLITE: table songs has no column named xyz'))

  // Should not expose raw SQL error
  await expect(safeIpcHandle('test:channel', handler)).rejects.toThrow(
    expect.not.stringContaining('SQLITE')
  )
})
```

### 10.3.4 Modal Testing

```typescript
// Test: useModalStore stack management
test('modal stack pushes and pops correctly', () => {
  const { open, close, stack } = useModalStore.getState()

  open('create-playlist')
  expect(stack).toHaveLength(1)

  open('playlist-picker')
  expect(stack).toHaveLength(2)

  close()
  expect(stack).toHaveLength(1)
  expect(stack[0].id).toBe('create-playlist')
})

// Test: Promise-based modal resolves correctly
test('openAsync resolves with user choice', async () => {
  const { openAsync, stack } = useModalStore.getState()

  const promise = openAsync<boolean>('confirm-delete', { title: 'Delete?' })

  // Simulate user clicking confirm
  stack[0].resolve?.(true)

  const result = await promise
  expect(result).toBe(true)
})
```

### 10.3.5 Database Testing

```typescript
// Existing: src/main/database.test.ts
// Extend with:

test('duplicateSong creates copy with modified number and title', () => {
  const original = addSong({ hymnal_id: 1, number: '42', title: 'Test Song', lyrics_raw: 'lyrics' })
  const copy = duplicateSong(original.id)

  expect(copy.number).toBe('42-copy')
  expect(copy.title).toBe('Test Song (Salinan)')
  expect(copy.lyrics_raw).toBe('lyrics')
  expect(copy.id).not.toBe(original.id)
})

test('getSongsSummary excludes lyrics_raw', () => {
  const songs = getSongsSummary()
  songs.forEach((song) => {
    expect(song).not.toHaveProperty('lyrics_raw')
  })
})
```

---

## 10.4 Risk Assessment

### 10.4.1 High-Risk Changes

| Change                             | Risk                                  | Mitigation                                                |
| ---------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Overlay engine (ProjectionPayload) | High — changes PresentationCanvas API | Adapter pattern; backward compatible                      |
| Store decomposition                | Medium — many import changes          | Gradual migration with re-exports                         |
| useProjectionStore timer move      | Low — isolated change                 | Keep timerTick in projection store, sync to service store |
| MediaEngine LRU                    | Low — internal change                 | No API change                                             |
| IPC safeIpcHandle wrapping         | Low — error handling only             | Test each channel after wrapping                          |

### 10.4.2 Zero-Risk Changes

- Adding new IPC channels (additive)
- Adding new stores (additive)
- Adding new migrations (additive, idempotent)
- Adding new modal components (additive)
- Wiring dead UI buttons (isolated)
- Adding keyboard shortcuts (additive)
- Adding `useTimerTick` hook (additive)

### 10.4.3 Rollback Strategy

```
Each sprint is independently deployable.
If a sprint introduces a regression:
  → Revert only that sprint's changes
  → Previous sprints remain intact

Critical path (must not regress):
  - Projection slide navigation (Space, →, ←)
  - Black/Freeze/Clear controls
  - IPC projection:slide-update broadcast
  - Playlist reorder
  - Song search (FTS5)
```

---

## APPENDIX A: Complete New File List

Files to CREATE (not modify):

```
src/renderer/src/store/useModalStore.ts
src/renderer/src/store/useServiceStore.ts
src/renderer/src/store/useNotificationStore.ts
src/renderer/src/store/useSongStore.ts          (Sprint 5)
src/renderer/src/store/useHymnalStore.ts        (Sprint 5)
src/renderer/src/store/useDisplayStore.ts       (Sprint 5)
src/renderer/src/hooks/useTimerTick.ts
src/renderer/src/components/modals/Modal.tsx
src/renderer/src/components/modals/ConfirmDialog.tsx
src/renderer/src/components/modals/CreatePlaylistDialog.tsx
src/renderer/src/components/modals/CrashRecoveryDialog.tsx
src/renderer/src/components/modals/SongRelationsModal.tsx
src/renderer/src/components/modals/ImportProgressDialog.tsx
src/renderer/src/components/modals/IntegrityCheckDialog.tsx
src/renderer/src/components/modals/PlaylistPickerDialog.tsx
src/renderer/src/components/modals/ModalRegistry.tsx
src/renderer/src/components/modals/index.ts
```

Files to MODIFY (targeted changes only):

```
src/renderer/src/App.tsx                        (mount ModalRegistry, useTimerTick)
src/renderer/src/components/titlebar/TitleBar.tsx (wire theme button)
src/renderer/src/components/titlebar/TitleBarMenu.tsx (add Bible, Media, Window menus)
src/renderer/src/components/titlebar/TitleBarStatus.tsx (add timer controls)
src/renderer/src/hooks/useAppBootstrap.ts       (crash recovery, session restore)
src/renderer/src/hooks/useGlobalShortcuts.ts    (add Ctrl+B)
src/renderer/src/hooks/useCrashRecovery.ts      (wire to useModalStore)
src/renderer/src/store/usePlaylistStore.ts      (add persistence)
src/renderer/src/store/usePanelLayoutStore.ts   (extend to 3-panel)
src/renderer/src/store/useProjectionStore.ts    (auto session save)
src/renderer/src/screens/modes/LibraryModeRedesigned.tsx (wire favorite)
src/renderer/src/screens/modes/ManagementMode.tsx (storage metric, virtualize, wire actions)
src/renderer/src/screens/modes/ProjectionMode.tsx (next song preload, 3-panel)
src/renderer/src/engine/mediaEngine.ts          (LRU cache)
src/renderer/src/engine/slideEngine.ts          (settings-aware config)
src/main/ipc-handlers.ts                        (new channels, safeIpcHandle wrapping)
src/main/database.ts                            (duplicateSong, getSongsSummary, auto-backup)
src/main/migrations.ts                          (migrations 14-17)
src/preload/index.ts                            (new channel bridges)
```

---

## APPENDIX B: Architecture Decision Log

| Decision                               | Rationale                                  | Alternative Considered                |
| -------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Zustand for modal store                | Already used throughout; no new dependency | React Context — more boilerplate      |
| Promise-based modals                   | Enables clean async workflows              | Callback-based — harder to compose    |
| Optimistic updates for favorites       | Instant feedback; rollback on error        | Wait for DB — 50-100ms lag            |
| Keep flat DB functions (no repository) | Current scale doesn't need abstraction     | Repository pattern — over-engineering |
| Adapter for ProjectionPayload          | Zero breaking change to PresentationCanvas | Rewrite canvas — high risk            |
| Gradual store decomposition            | No big-bang refactor; safe migration       | Full rewrite — high risk              |
| useTimerTick as separate hook          | Single interval owner; no duplication      | Interval in store — harder to test    |
| LRU eviction in MediaEngine            | Prevents memory growth                     | No eviction — memory leak risk        |
| Auto-backup on startup                 | Protects against data loss                 | Manual only — operator may forget     |
| safeIpcHandle for all channels         | Consistent error handling                  | Per-channel try/catch — inconsistent  |

---

_Document: Phase 2 Functional Refactor Architecture — Parts 5-10_
_SION Media Enterprise Transformation_
_Generated: May 2026_
_Status: Implementation-Ready Engineering Blueprint_
