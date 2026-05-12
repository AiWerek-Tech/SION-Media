# SION Media — Detailed Improvement Plan

> **Date**: May 2026 | **Version**: 2.1 | **Total Items**: 40+

---

## Priority Legend

- 🔴 **P0** = Critical (must fix, bugs/security)
- 🟠 **P1** = High (core features, architecture)
- 🟡 **P2** = Medium (important enhancements)
- 🟢 **P3** = Low (nice-to-have, future)

---

## PHASE 1: Critical Fixes & Stability (P0)

## Phase 1 Status (Implementation)

- [x] **1.1 Error Boundaries**
- [x] **1.2 Toast Timer Memory Leak**
- [x] **1.3 Missing Error Handling in Stores**
- [x] **1.4 Video Preload Timeout**
- [x] **1.5 Database Race Condition on Startup**
- [x] **1.6 Content Security Policy Missing**
- [x] **1.7 `console.*` in Production Code**

- [x] **(Hardening) Unhandled Promise Rejection Prevention**
- [x] **(Hardening) Guard IPC UI Actions (Projection/Stage toggles, delete ops) with error handling**

Notes:

- Implementasi `ErrorBoundary` yang dipakai di codebase berada di `src/renderer/src/components/ErrorBoundary.tsx` dan dipasang di entrypoint (`src/renderer/src/main.tsx`, `src/renderer/src/projection/main.tsx`, `src/renderer/src/stageDisplay/main.tsx`).
- Selain itu, dilakukan hardening tambahan untuk mencegah _unhandled promise rejection_ dan meningkatkan diagnosa error melalui `logger`, termasuk:
  - `settings.getAll()` dan `window.isMaximized()` yang sebelumnya `.then(...)` tanpa `.catch(...)`.
  - `settings.update(...)` yang dipanggil dari UI (mis. pengaturan tema/transisi) agar tidak crash saat IPC gagal.
  - beberapa operasi delete/toggle yang sebelumnya `await` tanpa `try/catch`.

### 1.1 Error Boundaries

**Problem**: No React Error Boundaries anywhere — a single component crash takes down the entire app.

**Files**: `App.tsx`, `ProjectionApp.tsx`, `StageDisplayApp.tsx`, all mode screens

**Implementation**:

```typescript
// src/renderer/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to main process via IPC
    window.api?.system?.logError?.({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-bg-base">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary mb-4">Terjadi Kesalahan</h2>
            <p className="text-text-muted mb-4">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Usage**:

```typescript
// App.tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>

// ProjectionApp.tsx
<ErrorBoundary fallback={<div>Projection Error - Check Logs</div>}>
  <ProjectionApp />
</ErrorBoundary>
```

---

### 1.2 Toast Timer Memory Leak

**Problem**: `setTimeout` for toast auto-dismiss is never cleaned up on unmount.

**File**: `src/renderer/src/store/useAppStore.ts:146`

**Implementation**:

```typescript
// Option 1: Use useRef in Toast component (recommended)
// src/renderer/src/components/Toast.tsx
import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export function Toast() {
  const { toast } = useAppStore()
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (toast) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        useAppStore.getState().showToast(null)
      }, 3000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [toast])

  if (!toast) return null
  return <div className={`toast toast-${toast.type}`}>{toast.message}</div>
}
```

---

### 1.3 Missing Error Handling in Stores

**Problem**: `loadSongs()`, `loadHymnals()`, `loadPlaylists()` have no try/catch.

**Implementation**:

```typescript
// src/renderer/src/store/useAppStore.ts
loadSongs: async (hymnalId?: number) => {
  try {
    const id = hymnalId !== undefined ? hymnalId : get().selectedHymnalId
    const songs = (await window.api.songs.getAll(id || undefined)) as Song[]
    set({ songs })
  } catch (err) {
    logger.error('Failed to load songs:', err)
    get().showToast('Gagal memuat lagu', 'error')
  }
},

loadHymnals: async () => {
  try {
    const hymnals = (await window.api.hymnals.getAll()) as Hymnal[]
    set({ hymnals })
  } catch (err) {
    logger.error('Failed to load hymnals:', err)
    get().showToast('Gagal memuat buku lagu', 'error')
  }
},
```

---

### 1.4 Video Preload Timeout

**Problem**: `oncanplaythrough` may never fire — Promise hangs forever.

**File**: `src/renderer/src/engine/mediaEngine.ts`

**Implementation**:

```typescript
preloadVideo(url: string): Promise<void> {
  if (this.videoCache.has(url)) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const src = url.startsWith('http') ? url : `file://${url.replace(/\\/g, '/')}`
    video.src = src
    video.preload = 'auto'

    let resolved = false
    const cleanup = () => {
      if (!resolved) {
        resolved = true
        video.oncanplaythrough = null
        video.onerror = null
        video.onstalled = null
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Video preload timeout: ${src}`))
    }, 10000)

    video.oncanplaythrough = () => {
      clearTimeout(timeout)
      cleanup()
      this.videoCache.set(url, video)
      resolve()
    }

    video.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error(`Video preload failed: ${src}`))
    }

    video.onstalled = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error(`Video preload stalled: ${src}`))
    }
  })
}
```

---

### 1.5 Database Race Condition on Startup

**Problem**: Opens tempDb, checks schema, closes, then re-opens — race window.

**File**: `src/main/database.ts:13-17`

**Implementation**:

```typescript
function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sion.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Check schema within same connection
  const hymnalTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hymnals'")
    .get()

  if (!hymnalTableExists) {
    console.log('Old schema detected. Migrating...')
    // Perform migration instead of wipe-out
    migrateDatabase(db)
  }

  createTables()
  setupFTS()
  seedDatabase()
}
```

---

### 1.6 Content Security Policy Missing

**Problem**: No CSP on `index.html` and `projection.html`.

**Implementation**:

```html
<!-- src/renderer/index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
/>

<!-- src/projection/index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data: https:; font-src 'self' data:;"
/>
```

---

### 1.7 `console.error` in Production Code

**Problem**: Direct `console.*` bypasses `logger` utility.

**Implementation**: Search and replace all occurrences:

```bash
# Find all console.* calls in renderer
grep -r "console\." src/renderer/src --include="*.ts" --include="*.tsx"

# Replace with logger.*
# console.error → logger.error
# console.log → logger.log
# console.warn → logger.warn
```

---

## PHASE 2: Architecture & Code Quality (P1)

## Phase 2 Status (Implementation)

- [x] **2.1 Split `index.ts` Main Process** — Completed
  - `src/main/index.ts` reduced from 453 lines to 82 lines (orchestrator)
  - `src/main/windows.ts` — Window creation and lifecycle
  - `src/main/ipc-handlers.ts` — All IPC handlers centralized
  - `src/main/display-monitor.ts` — Display change detection
  - `src/main/theme-manager.ts` — Theme state management
- [x] **2.2 Split `SettingsScreen.tsx`** — Completed
  - `src/renderer/src/screens/settings/DisplaySettings.tsx`
  - `src/renderer/src/screens/settings/ThemeSettings.tsx`
  - `src/renderer/src/screens/settings/BackgroundSettings.tsx`
  - `src/renderer/src/screens/settings/ShortcutsSettings.tsx`
  - `src/renderer/src/screens/settings/HymnalSettings.tsx`
  - `src/renderer/src/screens/settings/BackupSettings.tsx`
  - `src/renderer/src/screens/settings/AboutSettings.tsx`
  - `src/renderer/src/screens/SettingsScreen.tsx` (935 lines → 213 lines orchestrator)
- [x] **2.3 Type Safety for IPC** — Completed
  - `src/shared/types.ts` — Shared type definitions
  - `src/shared/ipc-channels.ts` — IPC channel constants
- [x] **2.4 Implement DB Migration System** — Completed
  - `src/main/migrations.ts` — Non-destructive schema migrations with version tracking
  - `schema_migrations` table for migration history
  - Legacy DB wipe for pre-multi-hymnal schemas
- [x] **2.5 Decouple Zustand Stores** — Completed
  - `src/renderer/src/services/toast-service.ts` — Decoupled toast from store imports
  - Removed `useAppStore` import from `usePlaylistStore`
- [x] **2.6 i18n Foundation** — Completed
  - `i18next` + `react-i18next` installed
  - `src/renderer/src/i18n/` — `en.json`, `id.json`, `index.ts`
  - Initialized in `main.tsx` with default language `id`
- [x] **2.7 Security Hardening (xlsx)** — Completed
  - File size limit (10MB), row limit (5000), column limit (50)
  - Extension validation (`.xlsx` only)
  - Parse timeout (30s), disabled formula evaluation

### 2.1 Split `index.ts` Main Process

**New File Structure**:

```
src/main/
├── index.ts           # Entry point only
├── windows.ts         # Window creation & management
├── ipc-handlers.ts    # All IPC handler registrations
├── display-monitor.ts # Display change detection & recovery
├── theme-manager.ts   # Projection theme merging logic
└── database.ts
```

**Implementation**:

```typescript
// src/main/windows.ts
import { BrowserWindow } from 'electron'
import { join } from 'path'

export function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  // ... rest of window creation logic
}

export function createProjectionWindow() {
  // ... projection window creation
}

export function createStageDisplayWindow() {
  // ... stage display window creation
}
```

---

### 2.2 Split `SettingsScreen.tsx`

**New File Structure**:

```
src/renderer/src/screens/settings/
├── ProjectionSettings.tsx
├── ThemeSettings.tsx
├── HymnalManager.tsx
├── DatabaseSettings.tsx
└── AboutSection.tsx
```

---

### 2.3 Type Safety for IPC

**New File**: `src/shared/types.ts`

```typescript
export interface Song {
  id: number
  hymnal_id: number
  number: string
  title: string
  alternate_title: string
  lyrics_raw: string
  category: string
  language: string
  author: string
  composer: string
  key_note: string
  tempo: string
  tags: string
}

export interface Hymnal {
  id: number
  code: string
  name: string
  language: string
  publisher: string
  is_official: number
}

// Type-safe IPC return types
export interface IPCResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

---

### 2.4 IPC Channel Constants

**New File**: `src/shared/ipc-channels.ts`

```typescript
export const IPC_CHANNELS = {
  // Database
  DB_GET_SONGS: 'db:get-songs',
  DB_GET_HYMNALS: 'db:get-hymnals',
  DB_ADD_SONG: 'db:add-song',
  DB_UPDATE_SONG: 'db:update-song',
  DB_DELETE_SONG: 'db:delete-song',

  // Playback
  PROJECTION_SHOW: 'projection:show',
  PROJECTION_HIDE: 'projection:hide',
  PROJECTION_SET_SLIDE: 'projection:set-slide',

  // System
  SYSTEM_SET_MODE: 'system:set-mode',
  SYSTEM_GET_RECOVERY: 'system:get-recovery-state',
  SYSTEM_SAVE_SESSION: 'system:save-session',

  // File
  FILE_PARSE_EXCEL: 'file:parse-excel'
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
```

---

### 2.5 Database Migration System

**New Table**: `schema_migrations`

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT
);
```

**Implementation**:

```typescript
// src/main/database.ts
const CURRENT_SCHEMA_VERSION = 2

function migrateDatabase(db: Database.Database): void {
  const currentVersion = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined

  const fromVersion = currentVersion?.version || 0

  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migration = migrations[v]
    if (migration) {
      console.log(`Applying migration v${v}: ${migration.description}`)
      db.exec(migration.up)
      db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(
        v,
        migration.description
      )
    }
  }
}

const migrations: Record<number, { up: string; description: string }> = {
  1: {
    description: 'Add hymnals table',
    up: `
      CREATE TABLE IF NOT EXISTS hymnals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        language TEXT DEFAULT 'Indonesia',
        publisher TEXT,
        is_official INTEGER DEFAULT 0
      );
      ALTER TABLE songs ADD COLUMN hymnal_id INTEGER DEFAULT 0;
    `
  },
  2: {
    description: 'Add bible support',
    up: `
      CREATE TABLE IF NOT EXISTS bibles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'Indonesia',
        abbreviation TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bible_verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bible_id INTEGER NOT NULL,
        book TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (bible_id) REFERENCES bibles(id)
      );
    `
  }
}
```

---

## PHASE 3: Feature Parity (P1-P2)

### 3.1 Bible Module

**DB Schema**:

```sql
CREATE TABLE bibles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'Indonesia',
  abbreviation TEXT NOT NULL,
  copyright TEXT
);

CREATE TABLE bible_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bible_id INTEGER NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (bible_id) REFERENCES bibles(id)
);

CREATE INDEX idx_bible_lookup ON bible_verses(bible_id, book, chapter, verse);
```

**New Screen**: `src/renderer/src/screens/BibleScreen.tsx`

- Book picker (Genesis, Exodus, etc.)
- Chapter/verse selector
- Search by text (FTS5)
- Add to playlist
- Projection support

---

### 3.2 Announcement Slides

**DB Schema**:

```sql
CREATE TABLE custom_slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  bg_image TEXT,
  duration INTEGER DEFAULT 5,
  transition TEXT DEFAULT 'dissolve',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE playlist_custom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  custom_slide_id INTEGER,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_slide_id) REFERENCES custom_slides(id)
);
```

---

### 3.3 NDI Output

**Dependencies**: `npm install @aspect/ndi`

**Implementation**:

```typescript
// src/main/ndi-output.ts
import { NDISender } from '@aspect/ndi'

let ndiSender: NDISender | null = null

export function startNDIOutput(width: number, height: number): void {
  if (ndiSender) return

  ndiSender = new NDISender({
    name: 'SION Media Projection',
    width,
    height,
    frameRate: 60,
    isProgressive: true
  })
}

export function sendNDIFrame(buffer: Buffer): void {
  if (ndiSender) {
    ndiSender.sendVideoFrame(buffer)
  }
}

export function stopNDIOutput(): void {
  if (ndiSender) {
    ndiSender.close()
    ndiSender = null
  }
}
```

---

### 3.4 Presenter Remote / MIDI

**Dependencies**: `npm install midi`

**Implementation**:

```typescript
// src/main/hid-detection.ts
import { input } from 'midi'

const midiInput = new input()

midiInput.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message

  // Map MIDI CC to actions
  if (status === 176) {
    // Control Change
    if (data1 === 1) {
      // CC 1 → Next slide
      mainWindow?.webContents.send('midi:next-slide')
    } else if (data1 === 2) {
      // CC 2 → Previous slide
      mainWindow?.webContents.send('midi:prev-slide')
    }
  }
})
```

---

## PHASE 4: Projection Enhancements (P1-P2)

### 4.1 Layer-Based Looks System

**DB Schema**:

```sql
CREATE TABLE looks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  background_layer INTEGER DEFAULT 1,
  video_layer INTEGER DEFAULT 1,
  overlay_layer INTEGER DEFAULT 0,
  lyrics_layer INTEGER DEFAULT 1,
  logo_layer INTEGER DEFAULT 0,
  clock_layer INTEGER DEFAULT 0
);

CREATE TABLE output_looks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  look_id INTEGER NOT NULL,
  output_type TEXT NOT NULL, -- 'projection' or 'stage'
  FOREIGN KEY (look_id) REFERENCES looks(id)
);
```

---

### 4.2 Alpha Key / Transparent Output

**Implementation**:

```typescript
// src/main/windows.ts - createProjectionWindow
export function createProjectionWindow() {
  projectionWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true, // Enable transparency
    backgroundColor: '#00000000', // Fully transparent
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
}
```

---

## PHASE 5-8: Additional Enhancements

See feature-gap-analysis.md for detailed breakdown of:

- UX Polish (drag-and-drop, multi-select, undo/redo)
- Performance (virtualization, debouncing, LRU cache)
- Import/Export (USFM Bible, OpenLP, ProPresenter)
- Testing (Vitest, Playwright, CI/CD)
