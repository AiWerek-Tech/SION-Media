# Log — Conflict Resolution Engine Implementation (v13)

## Overview

Implementasi **Conflict Resolution Engine** untuk Song Scraper, mengubah workflow dari "scrape → langsung ingest" menjadi **"Dry Run → Conflict Report → Import"**.

---

## 1) Workflow Baru

### Sebelum (v13 awal)
```text
SCRAPER START → SCRAPE → NORMALIZE → DB INGEST → FTS REBUILD
```

### Sesudah (Conflict Resolution)
```text
DRY RUN: SCRAPE → NORMALIZE → VALIDATE → CONFLICT REPORT (tanpa DB insert)
IMPORT: operator confirm → DB TRANSACTION + FTS REBUILD → SUMMARY REPORT
```

**Key principle:** Tidak ada data yang masuk ke database sebelum operator melihat conflict report dan mengkonfirmasi import.

---

## 2) Files Created

### `src/main/scraper/conflictEngine.ts`

**Purpose:** Core conflict detection engine yang berjalan **sebelum** DB ingestion.

**Exports:**
- `detectConflicts(params: { targetHymnalId: number; items: ScrapedSong[] }): ScraperConflictItem[]`
- `computeLyricsHash(lyrics: string): string`
- `normalizeTitleForComparison(title: string): string`
- `jaccardSimilarity(a: Set<string>, b: Set<string>): number`

**Conflict Detection Rules:**

1. **Primary Duplicate (NUMBER_DUPLICATE)**
   - Compare: `hymnal_id + song_number`
   - Query existing songs via `getSongForConflictByNumber()`
   - Jika ditemukan → conflict candidate

2. **Fuzzy Duplicate (TITLE_SIMILAR)**
   - Normalize title (lowercase, strip punctuation, tokenize)
   - Query similar titles via `findSongsForConflictByTitle()`
   - Compute Jaccard similarity
   - Threshold: `>= 0.7` → conflict candidate

3. **Identical Song (LYRICS_IDENTICAL)**
   - Compute SHA1 hash dari normalized lyrics
   - Compare dengan existing songs' lyrics hash
   - Jika match → conflict candidate

**Severity Classification:**

| Severity | Condition | Description |
|----------|-----------|-------------|
| `CRITICAL` | Target hymnal official + number match + lyrics beda | Berpotensi overwrite data resmi |
| `HIGH` | Number match + lyrics beda | Konflik signifikan |
| `MEDIUM` | Number match + lyrics sama, atau title similarity >= 0.85 | Kemungkinan duplikat |
| `LOW` | Title similarity >= 0.7 atau sinyal lain | Perlu review |

---

## 3) Files Modified

### `src/main/database.ts`

**Added helper functions:**

```ts
export function getSongForConflictByNumber(
  hymnalId: number,
  number: string
): { id, hymnal_id, hymnal_code, hymnal_name, hymnal_is_official, number, title, lyrics_raw, ... } | null

export function findSongsForConflictByTitle(
  hymnalId: number,
  title: string,
  limit: number
): Array<{ id, hymnal_id, hymnal_code, hymnal_name, hymnal_is_official, number, title, lyrics_raw, ... }>
```

**Purpose:** Query existing songs untuk conflict detection tanpa memuat seluruh tabel.

**Note:** Ada syntax error yang sempat terjadi (extra closing brace) dan sudah diperbaiki.

---

### `src/main/scraper/types.ts`

**Added types:**

```ts
export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ExistingSongSnapshot {
  id: number
  hymnal_id: number
  hymnal_code?: string
  hymnal_name?: string
  hymnal_is_official?: number
  number: string
  title: string
  lyrics_raw: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  category?: string
  tags?: string
}

export interface ScraperConflictItem {
  key: string
  type: 'NUMBER_DUPLICATE' | 'TITLE_SIMILAR' | 'LYRICS_IDENTICAL'
  severity: ConflictSeverity
  reason: string
  scraped: ScrapedSong
  existing: ExistingSongSnapshot
  lyricsHashMatch: boolean
  titleSimilarity: number
}

export interface PerSongResolutionDecision {
  action: 'skip' | 'overwrite' | 'rename' | 'merge_metadata'
  renameTitle?: string
}

export interface ScraperImportSummary {
  taskId: string
  imported: number
  skipped: number
  overwritten: number
  renamed: number
  merged: number
  failed: number
  duplicates: number
  durationMs: number
  generatedAt: string
}
```

---

### `src/main/scraper/task/ScraperTask.ts`

**Added methods:**

```ts
getSongs(): ScrapedSong[]       // Return scraped items
getStartedAt(): number          // Return task start timestamp

async scrapeOnly(numbers?: string[]): Promise<ScrapedSong[]>  // Scrape tanpa ingest
```

**Refactored:**

- `run()` sekarang memanggil `scrape()` internal lalu ingest
- `scrape()` di-extract sebagai private method untuk reuse oleh `scrapeOnly()`
- State reset dipindahkan ke `scrape()` agar dry run bisa multiple kali

---

### `src/main/scraper/task/ScraperTaskManager.ts`

**Added methods:**

```ts
async dryRun(request: ScraperStartRequest): Promise<{
  taskId: string
  items: ScrapedSong[]
  conflicts: ScraperConflictItem[]
}>

async importFromDryRun(params: {
  taskId: string
  request: ScraperStartRequest
  items: ScrapedSong[]
  decisions: Record<string, PerSongResolutionDecision>
  defaultAction: 'skip' | 'overwrite' | 'rename' | 'merge_metadata'
}): Promise<ScraperImportSummary>
```

**Behavior:**

- `dryRun()`: Jalankan scraper, return items + conflicts, **tidak ada DB write**
- `importFromDryRun()`: Terima decisions dari operator, jalankan DB ingestion, return summary

---

### `src/shared/ipc-channels.ts`

**Added IPC channels:**

```ts
export const IPC_SCRAPER = {
  // ... existing channels
  DRY_RUN: 'scraper:dry-run',
  IMPORT: 'scraper:import',
} as const
```

---

### `src/main/ipc-handlers.ts`

**Added handlers:**

```ts
ipcMain.handle(IPC_SCRAPER.DRY_RUN, async (_event, payload) => {
  return scraperTaskManager.dryRun(payload)
})

ipcMain.handle(IPC_SCRAPER.IMPORT, async (_event, payload) => {
  return scraperTaskManager.importFromDryRun(payload)
})
```

---

### `src/preload/index.ts`

**Added API methods:**

```ts
scraper: {
  // ... existing
  dryRun: (payload: unknown): Promise<unknown> => 
    ipcRenderer.invoke(IPC_SCRAPER.DRY_RUN, payload),
  importFromDryRun: (payload: unknown): Promise<unknown> =>
    ipcRenderer.invoke(IPC_SCRAPER.IMPORT, payload),
}
```

---

### `src/preload/index.d.ts`

**Added type declarations:**

```ts
interface ScraperAPI {
  // ... existing
  dryRun: (payload: unknown) => Promise<unknown>
  importFromDryRun: (payload: unknown) => Promise<unknown>
}
```

---

### `src/renderer/src/pages/management/SongScraperPage.tsx`

**Added state:**

```ts
const [dryRunTaskId, setDryRunTaskId] = useState<string | null>(null)
const [dryRunItems, setDryRunItems] = useState<ScrapedSongPreview[]>([])
const [dryRunConflicts, setDryRunConflicts] = useState<ScraperConflictItem[]>([])
const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
```

**Changed behavior:**

- `handleStart()` sekarang memanggil `window.api.scraper.dryRun()` bukan `start()`
- Setelah dry run selesai, simpan `taskId`, `items`, `conflicts`
- Tombol "Start" di UI berubah menjadi "Dry Run"

**Added handler:**

```ts
const handleImport = useCallback(async () => {
  // Call importFromDryRun with decisions
  // Store import summary
}, [dependencies...])
```

---

### `src/renderer/src/components/scraper/ProviderConfigPanel.tsx`

**Changed:**
- Tombol utama label: `Start` → `Dry Run`

---

### `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx`

**Added props:**

```ts
{
  // ... existing
  conflicts: ScraperConflictItem[]
  canImport: boolean
  onImport: () => void
  importSummary: ImportSummary | null
}
```

**Added UI sections:**

1. **Dry Run Conflict Report**
   - Menampilkan jumlah conflicts
   - List conflicts (max 30 ditampilkan)
   - Setiap conflict menampilkan: severity, type, reason, scraped title, existing title
   - Severity di-color-code: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (green)

2. **Import Button**
   - Label: "Import to SQLite"
   - Enabled hanya jika `canImport` (dry run selesai dan tidak sedang running)

3. **Import Summary**
   - Ditampilkan setelah import selesai
   - Menampilkan: Imported, Skipped, Overwritten, Failed, Duplicates, Duration

---

### `src/main/scraper/lyricsNormalizer.ts`

**Hardened normalization:**

```ts
export function normalizeLyrics(raw: string): string {
  let text = raw
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Strip zero-width chars
    .replace(/\u00A0/g, ' ')          // nbsp → space

  text = text.normalize('NFKC')       // Unicode normalization

  const lines = text.split('\n')
  const normalized = lines.map(line => 
    line.trimEnd().replace(/\s+/g, ' ')
  )

  return normalized
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')       // Collapse triple+ newlines
}
```

**Purpose:**
- Menjamin konsistensi data untuk slide projection
- Mengurangi noise untuk FTS search
- Preserve stanza breaks (double newline)

---

## 4) IPC Channels Summary

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `scraper:dry-run` | Renderer → Main | Run scrape without DB ingest, return items + conflicts |
| `scraper:import` | Renderer → Main | Import with per-song decisions, return summary |
| `scraper:progress` | Main → Renderer | Push progress updates (existing) |
| `scraper:get-providers` | Renderer → Main | Get provider list (existing) |
| `scraper:preview` | Renderer → Main | Preview single song (existing) |
| `scraper:start` | Renderer → Main | Direct ingest mode (existing, less used now) |
| `scraper:abort` | Renderer → Main | Abort running task (existing) |
| `scraper:retry-failed` | Renderer → Main | Retry failed items (existing) |

---

## 5.5) Per-Song Decision UI (Added 2026-05-11)

### `src/renderer/src/components/scraper/ConflictDecisionTable.tsx`

**Purpose:** Virtualized table untuk menampilkan conflicts dan memungkinkan operator memilih action per conflict.

**Features:**

1. **Virtualized Rendering**
   - Menggunakan `@tanstack/react-virtual` untuk performa
   - Support ratusan conflicts tanpa UI freeze

2. **Severity Sorting**
   - Conflicts diurutkan: CRITICAL → HIGH → MEDIUM → LOW
   - Warna badge: red, orange, yellow, green

3. **Per-Row Actions**
   - Dropdown: `—` (pending), `Skip`, `Overwrite`, `Rename`, `Merge`
   - Input field untuk rename title (muncul saat action = Rename)
   - Expandable row untuk melihat detail conflict

4. **Guards for CRITICAL Severity**
   - Jika existing song berasal dari **official hymnal**, opsi Overwrite disabled
   - Visual warning untuk conflicts yang belum diputuskan

5. **Statistics Bar**
   - Menampilkan jumlah: Pending, Skip, Overwrite, Rename, Merge
   - Warning jika ada conflicts yang masih pending

**Integration:**

- `ConflictResolutionPanel` menggunakan component ini saat `policy === 'ask'`
- Decisions di-pass ke `handleImport()` dan dikonversi ke backend format
- Backend menerima decisions dan apply per-song resolution

---

## 5.6) Export JSON Report (Added 2026-05-11)

### IPC Channels Added

```ts
// src/shared/ipc-channels.ts
export const IPC_FILE = {
  PARSE_EXCEL: 'file:parse-excel',
  SHOW_SAVE_DIALOG: 'file:show-save-dialog',  // NEW
  WRITE_JSON: 'file:write-json'               // NEW
} as const
```

### IPC Handlers Added

```ts
// src/main/ipc-handlers.ts

// Show save dialog
ipcMain.handle('file:show-save-dialog', async (_e, options) => {
  const { dialog, BrowserWindow } = await import('electron')
  const mainWindow = BrowserWindow.getFocusedWindow()
  return dialog.showSaveDialog(mainWindow!, options)
})

// Write JSON to file
ipcMain.handle('file:write-json', async (_e, filePath, data) => {
  const { writeFileSync, mkdirSync, existsSync } = await import('fs')
  const { dirname } = await import('path')

  // Ensure parent directory exists
  const parentDir = dirname(filePath)
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true })
  }

  // Write JSON with pretty formatting
  const jsonStr = JSON.stringify(data, null, 2)
  writeFileSync(filePath, jsonStr, 'utf8')
  return { success: true, path: filePath }
})
```

### Preload API Added

```ts
// src/preload/index.ts
file: {
  parseExcel: (filePath: string) => Promise<unknown[]>,
  showSaveDialog: (options: unknown) => Promise<unknown>,  // NEW
  writeJson: (filePath: string, data: unknown) => Promise<unknown>  // NEW
}
```

### UI Integration

- `ConflictResolutionPanel` menampilkan "Export Report" button setelah import selesai
- Button memanggil `showSaveDialog` untuk pilih lokasi file
- Report berisi:
  - `summary`: Import summary (imported, skipped, overwritten, failed, etc.)
  - `conflicts`: Array of conflict details dengan decision yang diambil
  - `generatedAt`: Timestamp report dibuat

### Report JSON Structure

```json
{
  "summary": {
    "taskId": "xxx",
    "imported": 10,
    "skipped": 2,
    "overwritten": 1,
    "renamed": 0,
    "merged": 0,
    "failed": 0,
    "duplicates": 3,
    "durationMs": 5432,
    "generatedAt": "2026-05-11T02:00:00.000Z"
  },
  "conflicts": [
    {
      "key": "1:123",
      "type": "NUMBER_DUPLICATE",
      "severity": "HIGH",
      "reason": "Song #123 already exists in hymnal",
      "scraped": { "number": "123", "title": "New Title", "url": "..." },
      "existing": { "id": 456, "number": "123", "title": "Old Title", "hymnal": "LS" },
      "decision": "overwrite"
    }
  ],
  "generatedAt": "2026-05-11T02:00:00.000Z"
}
```

---

## 6) Type Definitions Summary

### ConflictSeverity
```ts
type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
```

### ScraperConflictItem
```ts
interface ScraperConflictItem {
  key: string                                    // "hymnalId:number"
  type: 'NUMBER_DUPLICATE' | 'TITLE_SIMILAR' | 'LYRICS_IDENTICAL'
  severity: ConflictSeverity
  reason: string                                 // Human-readable explanation
  scraped: ScrapedSong                           // Incoming song
  existing: ExistingSongSnapshot                 // Existing song in DB
  lyricsHashMatch: boolean                       // True if lyrics hash identical
  titleSimilarity: number                        // 0.0 - 1.0
}
```

### PerSongResolutionDecision
```ts
interface PerSongResolutionDecision {
  action: 'skip' | 'overwrite' | 'rename' | 'merge_metadata'
  renameTitle?: string                           // Required if action === 'rename'
}
```

### ScraperImportSummary
```ts
interface ScraperImportSummary {
  taskId: string
  imported: number
  skipped: number
  overwritten: number
  renamed: number
  merged: number
  failed: number
  duplicates: number
  durationMs: number
  generatedAt: string                            // ISO timestamp
}
```

---

## 6) Build & Lint Status

- `npm run build` ✅ Success
- `npm run lint` ✅ No errors (1 pre-existing warning in ManagementMode.tsx unrelated to scraper)

---

## 7) Known Limitations & Future Work

### Current Limitations

1. **Per-Song Decision UI belum ada**
   - Backend sudah support `decisions` map
   - UI saat ini hanya menampilkan conflict report
   - Operator belum bisa memilih action per conflict secara individual

2. **Default Action hanya global**
   - Saat import, digunakan `defaultAction` berdasarkan `conflictPolicy`
   - Belum ada UI untuk override per-song

3. **Export JSON & Audit Log belum ada**
   - Import summary ditampilkan di UI
   - Belum ada fitur export ke JSON file
   - Belum ada audit log table di database

4. **Rename & Merge Metadata belum fully implemented**
   - Backend menerima decision, tapi logic merge metadata masih basic
   - Rename hanya mengubah title, belum ada suffix auto-generator

### Recommended Next Steps

1. ~~**Per-Conflict Resolution Table (UI)**~~ ✅ **COMPLETED (2026-05-11)**
   - Virtualized table untuk list conflicts
   - Dropdown per row: Skip / Overwrite / Rename / Merge Metadata
   - Input field untuk rename title
   - Guard untuk CRITICAL severity (overwrite disabled for official hymnals)

2. ~~**Export Import Summary to JSON**~~ ✅ **COMPLETED (2026-05-11)**
   - Button "Export Report" di Import Summary section
   - Save dialog untuk pilih lokasi file
   - Include: summary, conflict details, decisions made, timestamp

3. **Audit Log Table** (next priority)
   - New table: `scraper_audit_log`
   - Columns: id, task_id, action, song_number, old_data, new_data, timestamp
   - Write on each import action

---

## 5.7) CRITICAL Protection Layer (Added 2026-05-11)

### Purpose
Mencegah accidental overwrite terhadap **official hymnal** data.

### Implementation

**Confirmation Modal:**
- Muncul ketika operator memilih "Overwrite" untuk CRITICAL conflict dengan `hymnal_is_official === 1`
- Harus mengetik `OVERWRITE OFFICIAL` secara eksplisit
- Baru kemudian action di-apply

**Code Flow:**
```ts
// ConflictDecisionTable.tsx
const handleActionChange = (key, action) => {
  if (action === 'overwrite' && conflict.severity === 'CRITICAL' && conflict.existing.hymnal_is_official === 1) {
    // Show confirmation modal
    setCriticalConfirmKey(key)
    return
  }
  // Normal flow
  applyDecision(key, action)
}
```

### Rationale
- Official hymnal = canonical worship data
- Tidak boleh rusak karena salah klik atau selector website berubah
- Membutuhkan **explicit intent** untuk overwrite

---

## 5.8) Diff Viewer (Added 2026-05-11)

### `src/renderer/src/components/scraper/ConflictDiffViewer.tsx`

**Purpose:** Split-view comparison antara existing lyrics dan incoming lyrics.

**Features:**

1. **Side-by-side Layout**
   - Left: EXISTING lyrics (orange header)
   - Right: INCOMING lyrics (blue header)

2. **Line-by-line Diff**
   - Highlight baris yang berbeda (yellow background)
   - Line numbers untuk referensi

3. **Statistics**
   - Total lines
   - Identical lines (green)
   - Different lines (yellow)
   - Similarity percentage

4. **Integration**
   - "Diff" button di setiap conflict row
   - Modal overlay dengan scroll untuk lagu panjang

### Use Cases
- Operator bisa melihat apakah perbedaan hanya typo, beda stanza, atau translasi lain
- Membantu decision antara Skip, Overwrite, atau Rename

---

## 5.9) Enhanced Conflict Table (Updated 2026-05-11)

### New Columns Added

| Field | Purpose |
|-------|---------|
| Severity Badge | CRITICAL/HIGH/MEDIUM/LOW dengan warna |
| Type Badge | NUMBER/TITLE/LYRICS |
| Title Preview | #number + title |
| Expand Button | Detail conflict |
| **Diff Button** | Buka lyrics comparison (NEW) |
| Action Dropdown | Skip/Overwrite/Rename/Merge |
| Rename Input | Conditional, muncul saat action=Rename |

### Guards Implemented

1. **CRITICAL + Official Hymnal**
   - Overwrite option disabled di dropdown
   - Harus klik Overwrite → muncul confirmation modal
   - Harus ketik "OVERWRITE OFFICIAL"

2. **Visual Warnings**
   - Red border untuk CRITICAL overwrite
   - Yellow warning untuk pending conflicts
   - Statistics bar menampilkan counts per action

---

## 5.10) Remaining Tasks

1. ~~**Audit Log Table**~~ ✅ **COMPLETED (2026-05-11)**
   - Tables: `scraper_import_audit` + `scraper_import_audit_items`
   - Full audit trail per import session
   - Per-song decision logging with old/new data

2. ~~**Merge Metadata Logic**~~ ✅ **COMPLETED (2026-05-11)**
   - Strategy engine: `MERGE_PREFER_EXISTING`, `MERGE_PREFER_INCOMING`, `MERGE_FILL_EMPTY`, `MERGE_SMART`
   - Intelligent field merging: author, composer, key_note, time_signature, category, tags
   - Tags combination from both sources
   - Lyrics length preference for completeness

---

## 5.12) Merge Metadata Logic (Added 2026-05-11)

### Strategy Engine

```ts
type MergeStrategy =
  | 'MERGE_PREFER_EXISTING' // Keep existing, fill empty from incoming
  | 'MERGE_PREFER_INCOMING' // Use incoming, keep existing only if incoming empty
  | 'MERGE_FILL_EMPTY'      // Only fill empty fields, never overwrite
  | 'MERGE_SMART'           // Intelligent merge (default)
```

### MERGE_SMART Behavior (Default)

| Field | Strategy |
|-------|----------|
| title | Always preserve existing (titles should not change) |
| author | Prefer existing, fill from incoming if empty |
| composer | Prefer existing, fill from incoming if empty |
| key_note | Prefer existing, fill from incoming if empty |
| time_signature | Prefer existing, fill from incoming if empty |
| category | Prefer existing, fill from incoming if empty |
| tags | **Combine** from both sources (union) |
| lyrics_raw | Prefer longer content (>20% more = more complete) |

### Example Merge

**Existing:**
```json
{
  "title": "Amazing Grace",
  "author": "John Newton",
  "key_note": "G",
  "tags": "classic, hymn"
}
```

**Incoming:**
```json
{
  "title": "Amazing Grace (New Version)",
  "author": "",
  "composer": "Traditional",
  "key_note": "D",
  "tags": "grace, salvation",
  "lyrics_raw": "Amazing grace! How sweet the sound...\n\n(5 verses)"
}
```

**Result (MERGE_SMART):**
```json
{
  "title": "Amazing Grace",
  "author": "John Newton",
  "composer": "Traditional",
  "key_note": "G",
  "tags": "classic, hymn, grace, salvation",
  "lyrics_raw": "Amazing grace! How sweet the sound...\n\n(5 verses)"
}
```

### File: `src/main/scraper/mergeMetadata.ts`

**Functions:**
- `mergeMetadata(existing, incoming, strategy)` → merged metadata
- `applyMergeToScrapedSong(scraped, existing, strategy)` → ScrapedSong with merged fields

### Integration

```ts
// ScraperTaskManager.importFromDryRun
if (action === 'merge_metadata') {
  const mergedSong = applyMergeToScrapedSong(s, existingSong, 'MERGE_SMART')
  toImport.push(mergedSong)
}
```

---

## 5.11) Audit Log System (Added 2026-05-11)

### Database Schema

**Main Table: `scraper_import_audit`**
```sql
CREATE TABLE scraper_import_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  provider_id TEXT NOT NULL,
  target_hymnal_id INTEGER NOT NULL,
  range_start TEXT,
  range_end TEXT,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  overwritten_count INTEGER DEFAULT 0,
  renamed_count INTEGER DEFAULT 0,
  merged_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  critical_conflicts INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  report_json TEXT
);
```

**Items Table: `scraper_import_audit_items`**
```sql
CREATE TABLE scraper_import_audit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id INTEGER NOT NULL,
  song_number TEXT NOT NULL,
  song_title TEXT,
  action TEXT NOT NULL,
  conflict_type TEXT,
  conflict_severity TEXT,
  old_data TEXT,
  new_data TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (audit_id) REFERENCES scraper_import_audit(id) ON DELETE CASCADE
);
```

### IPC Channels Added

```ts
// src/shared/ipc-channels.ts
export const IPC_SCRAPER = {
  // ... existing channels
  GET_AUDIT_HISTORY: 'scraper:get-audit-history',
  GET_AUDIT_DETAIL: 'scraper:get-audit-detail'
}
```

### Database Functions Added

```ts
// src/main/database.ts
createScraperAudit(params) → auditId
completeScraperAudit(params) → void
addScraperAuditItem(params) → itemId
getScraperAuditByTaskId(taskId) → audit | null
getScraperAuditItems(auditId) → items[]
getRecentScraperAudits(limit) → audits[]
getScraperAuditsByHymnal(hymnalId, limit) → audits[]
```

### Integration Flow

1. **Import Start**: `createScraperAudit()` creates audit record with task_id, provider, hymnal, range
2. **Per-Song Decision**: `addScraperAuditItem()` logs each decision with old/new data
3. **Import Complete**: `completeScraperAudit()` updates counts and duration

### Use Cases

- **Debugging**: Trace what happened during import
- **Rollback Analysis**: See old data before overwrite
- **Governance**: Audit trail for official hymnal changes
- **Moderator Review**: Verify operator decisions
- **Sync Cloud**: Export audit for remote repository sync

---

## 8) Testing Checklist

### Manual Testing Required

- [ ] Dry Run dengan range kecil (5-10 lagu)
- [ ] Verify conflict report muncul dengan benar
- [ ] Import dengan default action "skip"
- [ ] Import dengan default action "overwrite"
- [ ] Verify FTS search menemukan lagu baru
- [ ] Abort during dry run
- [ ] Retry failed items

### Edge Cases to Test

- [ ] Empty lyrics handling
- [ ] Network timeout during scrape
- [ ] Invalid hymnal ID
- [ ] Range dengan nomor tidak ada di website
- [ ] Conflict dengan official hymnal
- [ ] Multiple conflicts for same song

---

## 9) Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SongScraperPage.tsx                                     │   │
│  │  ├─ ProviderConfigPanel (Dry Run button)                 │   │
│  │  ├─ LiveTaskConsole (logs)                               │   │
│  │  ├─ ProgressPanel (metrics)                              │   │
│  │  ├─ ConflictResolutionPanel                              │   │
│  │  │   ├─ Conflict Report (severity, type, reason)         │   │
│  │  │   ├─ Import Button                                    │   │
│  │  │   └─ Import Summary                                   │   │
│  │  └─ PreviewInspector                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ IPC (invoke)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ScraperTaskManager                                      │   │
│  │  ├─ dryRun(request) ─────────────────────────────────┐   │   │
│  │  │   ├─ ScraperTask.scrapeOnly()                     │   │   │
│  │  │   ├─ conflictEngine.detectConflicts()             │   │   │
│  │  │   └─ return { taskId, items, conflicts }          │   │   │
│  │  ├─ importFromDryRun(params) ◄───────────────────────┘   │   │
│  │  │   ├─ Apply per-song decisions                          │   │
│  │  │   ├─ dbIngestion.importScrapedSongs()                  │   │
│  │  │   ├─ rebuildSongsFts()                                 │   │
│  │  │   └─ return ScraperImportSummary                      │   │
│  │  └─ start() [direct mode, less used]                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  conflictEngine.ts                                       │   │
│  │  ├─ detectConflicts()                                    │   │
│  │  │   ├─ Check hymnal_id + number (PRIMARY)               │   │
│  │  │   ├─ Check title similarity (FUZZY)                    │   │
│  │  │   └─ Check lyrics hash (IDENTICAL)                    │   │
│  │  ├─ computeLyricsHash()                                  │   │
│  │  ├─ normalizeTitleForComparison()                        │   │
│  │  └─ classifySeverity()                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  database.ts                                             │   │
│  │  ├─ getSongForConflictByNumber()                         │   │
│  │  └─ findSongsForConflictByTitle()                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10) References

- Original plan: `.docs/07-scrapper-lagu-sion/plan-song-scraper-management-v13.md`
- Implementation log (initial): `.docs/07-scrapper-lagu-sion/log-impl-song-scraper-management-v13.md`
- Conflict resolution implementation: **this file**

---

## 5.13) Confidence Scoring System (Added 2026-05-12)

### Purpose
Memberikan **weighted multi-factor confidence score** untuk setiap conflict, membantu operator memprioritaskan review berdasarkan kecocokan antara scraped song dan existing song.

### Weighted Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Title Similarity | 25% | Jaccard similarity normalized titles |
| Lyrics Similarity | 40% | Line-by-line comparison dengan hashing |
| Metadata Similarity | 20% | Author, composer, key_note, category match |
| Structure Similarity | 15% | Stanza count, verse/chorus pattern |

### Confidence Labels

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 0.85 - 1.0 | `VERY_HIGH_MATCH` | Sangat cocok, kemungkinan duplikat identik |
| 0.70 - 0.84 | `HIGH_MATCH` | Cocok, perlu review cepat |
| 0.50 - 0.69 | `POSSIBLE_MATCH` | Mungkin cocok, review detail |
| 0.0 - 0.49 | `LOW_MATCH` | Kurang cocok, kemungkinan song berbeda |

### Implementation

**File: `src/main/scraper/conflictEngine.ts`**

```ts
function computeConfidenceScore(scraped: ScrapedSong, existing: ExistingSongSnapshot): {
  score: number
  label: ConfidenceLabel
  why: {
    title: number
    lyrics: number
    metadata: number
    structure: number
    weightedTotal: number
    notes: string[]
  }
}
```

**Why Breakdown:**
- `title`: 0.0 - 1.0 (Jaccard similarity)
- `lyrics`: 0.0 - 1.0 (Line match ratio)
- `metadata`: 0.0 - 1.0 (Field match count / total fields)
- `structure`: 0.0 - 1.0 (Stanza pattern similarity)
- `weightedTotal`: Final score after applying weights
- `notes`: Array of human-readable explanations

### UI Integration

- Confidence badge ditampilkan di setiap conflict row
- Color coding: Green (HIGH+), Yellow (POSSIBLE), Red (LOW)
- Tooltip menampilkan breakdown "why" saat hover

---

## 5.14) Operator-Centric Sorting & Filtering (Added 2026-05-12)

### Sorting Modes

| Mode | Description |
|------|-------------|
| `SEVERITY_THEN_CONFIDENCE_ASC` | CRITICAL dulu, lalu lowest confidence first (default) |
| `SEVERITY_DESC` | CRITICAL → HIGH → MEDIUM → LOW |
| `CONFIDENCE_ASC` | Lowest confidence first (most uncertain) |
| `CONFIDENCE_DESC` | Highest confidence first (most certain) |
| `NUMBER_ASC` | Song number ascending |

### Filter Modes

| Mode | Description |
|------|-------------|
| `ALL` | Show all conflicts |
| `PENDING` | Only conflicts without decision |
| `DECIDED` | Only conflicts with decision made |
| `CRITICAL_ONLY` | Only CRITICAL severity conflicts |

### Hide Resolved Toggle

- When enabled: conflicts with decision are hidden from view
- Useful for focusing on remaining work
- Counter shows "X hidden" when active

### localStorage Persistence

**Keys:**
- `scraper-sort-mode`: Selected sort mode
- `scraper-filter-mode`: Selected filter mode
- `scraper-hide-resolved`: Hide resolved toggle state

**Behavior:**
- Preferences saved on every change
- Restored on component mount
- Persisted across sessions

### Sticky Review Toolbar

**Features:**
- Fixed position at top of conflict table
- Sort dropdown with mode selection
- Filter dropdown with mode selection
- Hide Resolved toggle switch
- Decision counters: Pending / Skip / Overwrite / Rename / Merge
- Warning indicator if pending conflicts remain

**Code Location:**
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx`
- `src/renderer/src/components/scraper/ConflictDecisionTable.tsx`

---

## 5.15) Remaining Tasks

1. ~~**Review Session State Persistence**~~ ✅ **COMPLETED (2026-05-12)**
   - Persist per-taskId decisions to localStorage
   - Enable pause & resume of review sessions
   - Restore decisions when returning to a task
   - Clear decisions after successful import

---

## 5.16) Review Session State Persistence (Added 2026-05-12)

### Purpose
Memungkinkan operator untuk **pause dan resume** review session tanpa kehilangan decisions yang sudah dibuat.

### Versioned Persistence Schema

```ts
interface PersistedReviewStateV1 {
  version: 1                    // Schema version for migration
  taskId: string                // Task association
  providerId: string            // Provider for audit/replay
  targetHymnalId: number | null // Target hymnal context
  decisions: Record<string, ConflictDecision>
  sortMode: string              // UI preference
  filterMode: string            // UI preference
  hideResolved: boolean         // UI preference
  updatedAt: string             // ISO timestamp for stale detection
}
```

### Migration Layer

```ts
function migratePersistedState(raw: unknown): PersistedReviewStateV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const state = raw as Record<string, unknown>
  
  switch (state.version) {
    case 1:
      return raw as PersistedReviewStateV1
    default:
      return null  // Unknown version - discard
  }
}
```

### Stale Session Detection

**Threshold:** 72 hours (`SESSION_MAX_AGE_HOURS`)

**Logic:**
```ts
function checkSessionStale(updatedAt: string): boolean {
  const age = Date.now() - new Date(updatedAt).getTime()
  const maxAge = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
  return age > maxAge
}
```

**Visual Indicator:**
- Badge "Session restored" (blue) — valid restored session
- Badge "⚠ May be outdated" (yellow) — session older than 72 hours

### localStorage Key Pattern

- `scraper_review_state_{taskId}` — Versioned state (new)
- `scraper_decisions_{taskId}` — Legacy format (deprecated, will be migrated)

### Behavior

1. **On Mount**: Load state, migrate if needed, check staleness
2. **On Change**: Persist full state with timestamp
3. **On Import Complete**: Clear persisted state
4. **On Version Mismatch**: Discard incompatible state

### Use Cases

- **Long Review Sessions**: Operator dapat meninggalkan halaman dan kembali tanpa kehilangan progress
- **Breaks**: Operator dapat istirahat dan melanjutkan review nanti
- **Context Switching**: Operator dapat mengerjakan multiple tasks secara bergantian
- **Crash Recovery**: Jika app crash atau browser tertutup, decisions tetap tersimpan
- **App Upgrade**: State dari versi lama di-migrate atau di-discard dengan aman

### Future-Proofing

Schema versioning memungkinkan:
- Penambahan field baru tanpa breaking
- Perubahan scoring model
- Perubahan merge strategy
- Audit replay dengan context lengkap
- Multi-provider analytics

---

## 5.17) Bulk Decision Actions (Added 2026-05-12)

### Purpose
Mengubah workflow dari "review satu per satu" menjadi "review exceptions only" — meningkatkan operator throughput untuk batch besar (500+ lagu).

### Core Principle

**Bulk actions TIDAK langsung execute.**

Mereka:
- Hanya memodifikasi `decisions` state
- Tetap reversible via undo
- Tetap terlihat di queue
- Tidak mempengaruhi conflicts yang sudah decided

### Bulk Action Types

| Action | Condition | Decision |
|--------|-----------|----------|
| `overwrite_empty_lyrics` | `existing.lyrics_raw` empty AND `scraped.lyrics_raw` exists | `overwrite` |
| `merge_identical_lyrics` | `lyricsHashMatch === true` | `merge_metadata` |
| `skip_low_confidence` | `confidenceScore < 0.5` | `skip` |
| `approve_high_confidence` | `confidenceScore >= 0.9` | `overwrite` |

### Preview Counts

Setiap action menampilkan jumlah conflicts yang akan terpengaruh:

```text
[Overwrite Empty Lyrics ▼] → affects 312 songs
```

Count dihitung berdasarkan:
- Conflicts yang masih `pending`
- Conditions yang sesuai dengan action type

### Undo Mechanism

```ts
const [lastBulkAction, setLastBulkAction] = useState<Record<string, ConflictDecision> | null>(null)

// Save before applying
setLastBulkAction(decisions)

// Restore on undo
setDecisions(lastBulkAction)
setLastBulkAction(null)
```

**One-level undo** — hanya bisa undo action terakhir.

### UI Location

```
┌─────────────────────────────────────┐
│ Bulk Actions                        │
│ [Select action... ▼] [Undo Bulk]    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Per-song Resolution                 │
│ Filter: [All ▼] ☐ Hide Resolved     │
│ Sort: [Severity + Confidence ▼]     │
│ Total: 525 | Pending: 213 | ...     │
└─────────────────────────────────────┘
```

### Use Cases

**Scenario: 525 songs, 480 conflicts, 300 empty lyrics**

1. **Overwrite Empty Lyrics** → 300 decisions filled instantly
2. **Merge Identical Lyrics** → 120 decisions filled
3. **Review remaining 60** → manual per-song
4. **Import** → execute all decisions

**Time saved:** ~90% untuk batch besar.

### Code Location

**File: `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx`**

```tsx
// Compute preview counts
const bulkActionCounts = useMemo(() => {
  let overwriteEmptyLyrics = 0
  for (const c of props.conflicts) {
    if (decisions[c.key]?.action !== 'pending') continue
    if (!c.existing.lyrics_raw && c.scraped.lyrics_raw) {
      overwriteEmptyLyrics++
    }
  }
  return { overwriteEmptyLyrics, ... }
}, [props.conflicts, decisions])

// Apply bulk action
const applyBulkAction = useCallback((actionType: BulkActionType) => {
  const newDecisions = { ...decisions }
  for (const c of props.conflicts) {
    if (decisions[c.key]?.action !== 'pending') continue
    if (matchesCondition(c, actionType)) {
      newDecisions[c.key] = { key: c.key, action: getAction(actionType) }
    }
  }
  setLastBulkAction(decisions)  // Save for undo
  setDecisions(newDecisions)
}, [props.conflicts, decisions])
```

---

## 5.18) Provider Abstraction Registry (Added 2026-05-12)

### Purpose
Menjadikan provider sebagai **runtime contract system** — bukan sekadar daftar URL — untuk survivability jangka panjang terhadap:
- Selector drift (website berubah)
- Anti-bot behavior
- Provider instability
- Silent scraping corruption

### Core Definition

```ts
interface ScraperProviderDefinition {
  id: string
  name: string
  version: string

  capabilities: {
    supportsNumericRange: boolean
    supportsSlug: boolean
    supportsMetadata: boolean
    supportsPreview: boolean
  }

  transport: {
    mode: 'HTTP' | 'PLAYWRIGHT'
    concurrency: number
    timeoutMs: number
    retryLimit: number
    delayMs: number
  }

  selectors: {
    title: string
    lyrics: string
    author?: string
    composer?: string
    keyNote?: string
    category?: string
    tags?: string
  }

  normalization: {
    stanzaStrategy: 'DOUBLE_BREAK' | 'SINGLE_BREAK' | 'XML_TAGS'
    trimWhitespace: boolean
    unicodeNormalize: boolean
    removeEmptyStanzas: boolean
  }

  health: {
    status: 'OK' | 'DEGRADED' | 'BROKEN' | 'UNKNOWN'
    lastValidatedAt?: string
    lastFailureReason?: string
    consecutiveFailures: number
    diagnostics?: ProviderValidationDiagnostics
  }
}
```

### Selector Validation Test

```ts
async validateWithDiagnostics(baseUrl?: string): Promise<ProviderValidationDiagnostics>
```

**Process:**
1. Fetch sample page
2. Test each selector with cheerio
3. Count found elements
4. Extract sample text
5. Calculate fetch latency
6. Determine overall status

**Result:**
```text
Provider: alkitab-app-ls
Status: DEGRADED

✓ title selector OK (found: 1, sample: "Amazing Grace")
✓ lyrics selector OK (found: 1, sample: "Amazing grace! How sweet...")
✗ author selector MISSING (found: 0)
✗ composer selector MISSING (found: 0)

Fetch latency: 234ms
HTML size: 45,678 bytes
Warnings: 2
Errors: 0
```

### Health Status

| Status | Meaning | Action |
|--------|---------|--------|
| `OK` | All selectors working | Ready for use |
| `DEGRADED` | Some selectors missing | Usable with limitations |
| `BROKEN` | Critical selectors failed | Do not use |
| `UNKNOWN` | Not yet validated | Run validation first |

### Registry Functions

```ts
// Get all providers with health
getAllProviderDefinitions(): ScraperProviderDefinition[]

// Get single provider definition
getProviderDefinition(providerId: string): ScraperProviderDefinition

// Run validation and update health
validateProvider(providerId: string, baseUrl?: string): Promise<ProviderValidationDiagnostics>

// Get current health status
getProviderHealth(providerId: string): ProviderHealthStatus

// Check if usable
isProviderHealthy(providerId: string): boolean
```

### IPC Endpoints

| Channel | Purpose |
|---------|---------|
| `scraper:get-provider-definitions` | Get all providers with health |
| `scraper:validate-provider` | Run validation diagnostics |
| `scraper:get-provider-health` | Get health status |

### Use Cases

**1. Pre-scrape Validation**
```ts
const diagnostics = await window.api.scraper.validateProvider({ providerId: 'alkitab_app_ls' })
if (diagnostics.overallStatus === 'BROKEN') {
  showToast('Provider tidak dapat digunakan', 'error')
  return
}
```

**2. Health Dashboard**
```ts
const providers = await window.api.scraper.getProviderDefinitions()
providers.forEach(p => {
  console.log(`${p.name}: ${p.health.status}`)
})
```

**3. Selector Drift Detection**
```ts
// Run weekly validation
setInterval(async () => {
  for (const p of providers) {
    const d = await validateProvider(p.id)
    if (d.warnings.length > 0) {
      notify(`Provider ${p.name} may need selector update`)
    }
  }
}, 7 * 24 * 60 * 60 * 1000)
```

### Future Extensions

- **Persistent health** — Store in database for historical tracking
- **Auto-disable** — Skip broken providers automatically
- **Fallback chain** — Use alternative provider when primary fails
- **Alert webhooks** — Notify team on provider degradation
- **Provider versioning** — Track selector changes over time

---

**Document Version:** 1.1  
**Last Updated:** 2026-05-12  
**Author:** Cascade (AI Assistant)
