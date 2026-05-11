# Log — Implementation Song Scraper Management Mode (v13)

## Files created

- `src/main/scraper/types.ts`
- `src/main/scraper/lyricsNormalizer.ts`
- `src/main/scraper/providerRegistry.ts`
- `src/main/scraper/dbIngestion.ts`
- `src/main/scraper/providers/BaseScraperProvider.ts`
- `src/main/scraper/providers/AlkitabAppProvider.ts`
- `src/main/scraper/providers/LaguSionProvider.ts`
- `src/main/scraper/task/backoff.ts`
- `src/main/scraper/task/queue.ts`
- `src/main/scraper/task/ScraperTask.ts`
- `src/main/scraper/task/ScraperTaskManager.ts`

- `src/renderer/src/pages/management/SongScraperPage.tsx`
- `src/renderer/src/components/scraper/ProviderConfigPanel.tsx`
- `src/renderer/src/components/scraper/LiveTaskConsole.tsx`
- `src/renderer/src/components/scraper/ProgressPanel.tsx`
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx`
- `src/renderer/src/components/scraper/PreviewInspector.tsx`

## Files modified

- `package.json`
- `src/shared/ipc-channels.ts`
- `src/main/ipc-handlers.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/types.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/components/titlebar/TitleBarMenu.tsx`

## IPC added

- `scraper:get-providers` (invoke)
- `scraper:preview` (invoke)
- `scraper:start` (invoke)
- `scraper:abort` (invoke)
- `scraper:retry-failed` (invoke)
- `scraper:progress` (push event via `webContents.send`)

## Preload API

Exposed under:

- `window.api.scraper.getProviders()`
- `window.api.scraper.preview({ providerId, input, baseUrl? })`
- `window.api.scraper.start(payload)`
- `window.api.scraper.abort()`
- `window.api.scraper.retryFailed()`
- `window.api.scraper.onProgress(cb)`

## Selector registry

v13 implementation uses a lightweight strategy (provider tries multiple selector candidates):

- Title: `h1`, `.song-title`, `title` fallback
- Lyrics: `.lyrics`, `pre`, `article`, `[data-testid="lyrics"]` fallback (provider-specific)

No external selector-pack file yet (planned for future).

## Supported providers (v13)

- Provider 1: `Alkitab.app (LS)`

  - Base: `https://alkitab.app`
  - URL pattern: `/LS/{number}`
  - Mode: numeric range

- Provider 2: `play.lagusion.org (LS — slug)`

  - Base: `https://play.lagusion.org`
  - URL pattern: `/play/song/LS--Edisi-Baru/{slug}`
  - Mode: slug input (preview supports slug; range scraping still numeric by default UI)

## Known limitations

- `LaguSionProvider` is slug-based; range scraping UI currently generates numeric inputs. For this provider, operators should use Preview first and future v13.x will add slug list import.
- CAPTCHA detection heuristic not implemented yet (planned).
- Playwright engine not integrated yet; current v13 uses `fetch + cheerio`.

## Performance benchmark (initial)

- Concurrency: default 3
- Progress updates: throttled by manager pump interval (150ms)
- UI: console and per-song list avoid freezing by virtualizing console and limiting rows rendered.

---

## Phase 2 — Conflict Resolution Engine (2026-05-11)

**See detailed documentation:** `.docs/07-scrapper-lagu-sion/log-conflict-resolution-v13.md`

### Summary of Phase 2 changes

Workflow berubah dari "scrape → langsung ingest" menjadi **"Dry Run → Conflict Report → Import"**.

**Files created:**
- `src/main/scraper/conflictEngine.ts` — Core conflict detection engine

**Files modified:**
- `src/main/database.ts` — Added conflict query helpers
- `src/main/scraper/types.ts` — Added conflict types
- `src/main/scraper/task/ScraperTask.ts` — Added `scrapeOnly()` method
- `src/main/scraper/task/ScraperTaskManager.ts` — Added `dryRun()` and `importFromDryRun()`
- `src/shared/ipc-channels.ts` — Added `DRY_RUN` and `IMPORT` channels
- `src/main/ipc-handlers.ts` — Added handlers for dry-run and import
- `src/preload/index.ts` — Exposed new API methods
- `src/preload/index.d.ts` — Added type declarations
- `src/renderer/src/pages/management/SongScraperPage.tsx` — Switched to dry-run workflow
- `src/renderer/src/components/scraper/ProviderConfigPanel.tsx` — Changed button label
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Added conflict report UI
- `src/main/scraper/lyricsNormalizer.ts` — Hardened normalization

**IPC added:**
- `scraper:dry-run` — Run scrape without DB ingest
- `scraper:import` — Import with per-song decisions

**Current status:**
- ✅ Dry Run mode working
- ✅ Conflict detection engine implemented
- ✅ Conflict report UI showing
- ✅ Import to SQLite working
- ✅ Import summary displayed
- ✅ Per-song decision UI (completed 2026-05-11)
- ✅ Export JSON report (completed 2026-05-11)
- ✅ CRITICAL protection & Diff Viewer (completed 2026-05-11)
- ✅ Audit log system (completed 2026-05-11)
- ✅ Merge metadata logic (completed 2026-05-11)

**Phase 3 — Per-Song Decision UI (2026-05-11)**

**Files created:**
- `src/renderer/src/components/scraper/ConflictDecisionTable.tsx` — Virtualized table for per-conflict resolution

**Files modified:**
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Integrated ConflictDecisionTable
- `src/renderer/src/pages/management/SongScraperPage.tsx` — Updated handleImport to accept decisions

**Features:**
- Virtualized rendering for large conflict lists
- Severity-based sorting (CRITICAL → HIGH → MEDIUM → LOW)
- Per-row action dropdown: Skip / Overwrite / Rename / Merge Metadata
- Rename title input field
- Guard for CRITICAL severity (overwrite disabled for official hymnals)
- Statistics bar showing pending/skip/overwrite/rename/merge counts

**Phase 4 — Export JSON Report (2026-05-11)**

**Files modified:**
- `src/shared/ipc-channels.ts` — Added `SHOW_SAVE_DIALOG` and `WRITE_JSON` to IPC_FILE
- `src/main/ipc-handlers.ts` — Added handlers for save dialog and JSON write
- `src/preload/index.ts` — Exposed showSaveDialog and writeJson APIs
- `src/preload/index.d.ts` — Added type declarations for FileAPI
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Added Export Report button

**Features:**
- "Export Report" button in Import Summary section
- Save dialog for choosing file location
- JSON report includes: summary, conflicts, decisions, timestamp

**Phase 5 — CRITICAL Protection & Diff Viewer (2026-05-11)**

**Files created:**
- `src/renderer/src/components/scraper/ConflictDiffViewer.tsx` — Side-by-side lyrics comparison

**Files modified:**
- `src/renderer/src/components/scraper/ConflictDecisionTable.tsx` — Added CRITICAL confirmation modal and Diff button

**Features:**
- CRITICAL Protection: Typed confirmation "OVERWRITE OFFICIAL" required for official hymnal overwrites
- Diff Viewer: Side-by-side lyrics comparison with line-by-line diff highlighting
- Statistics: Total/Identical/Different lines count and similarity percentage
- Visual guards: Red border for CRITICAL overwrites, yellow warning for pending conflicts

**Phase 6 — Audit Log System (2026-05-11)**

**Files modified:**
- `src/main/migrations.ts` — Added migration v10 for scraper audit tables
- `src/main/database.ts` — Added audit functions (create, complete, add items, query)
- `src/main/ipc-handlers.ts` — Added handlers for audit history and detail queries
- `src/shared/ipc-channels.ts` — Added GET_AUDIT_HISTORY and GET_AUDIT_DETAIL channels
- `src/preload/index.ts` — Exposed getAuditHistory and getAuditDetail APIs
- `src/main/scraper/task/ScraperTaskManager.ts` — Integrated audit logging into importFromDryRun

**Features:**
- Full audit trail per import session (task_id, provider, hymnal, range, counts, duration)
- Per-song decision logging with old/new data snapshots
- Query APIs: get recent audits, get by hymnal, get detail with items
- Use cases: debugging, rollback analysis, governance, moderator review

**Phase 7 — Merge Metadata Logic (2026-05-11)**

**Files created:**
- `src/main/scraper/mergeMetadata.ts` — Strategy engine for intelligent metadata merging

**Files modified:**
- `src/main/scraper/types.ts` — Added MergeStrategy, MergeMetadataOptions, SongMetadata types
- `src/main/scraper/task/ScraperTaskManager.ts` — Integrated merge logic into importFromDryRun

**Features:**
- Strategy engine: MERGE_PREFER_EXISTING, MERGE_PREFER_INCOMING, MERGE_FILL_EMPTY, MERGE_SMART
- Intelligent field merging: author, composer, key_note, time_signature, category, tags
- Tags combination (union from both sources)
- Lyrics length preference (>20% longer = more complete)
- Title preservation (titles never change in merge)

**Phase 8 — Confidence Scoring System (2026-05-12)**

**Files modified:**
- `src/main/scraper/types.ts` — Added confidence score fields to ScraperConflictItem
- `src/main/scraper/conflictEngine.ts` — Implemented weighted multi-factor confidence scoring
- `src/renderer/src/pages/management/SongScraperPage.tsx` — Extended renderer-side interface

**Features:**
- Weighted multi-factor scoring: Title (25%), Lyrics (40%), Metadata (20%), Structure (15%)
- Confidence labels: VERY_HIGH_MATCH, HIGH_MATCH, POSSIBLE_MATCH, LOW_MATCH
- "Why" breakdown with per-factor scores and notes
- Computed in main process to avoid renderer performance issues

**Phase 9 — Operator-Centric Sorting & Filtering (2026-05-12)**

**Files modified:**
- `src/renderer/src/components/scraper/ConflictDecisionTable.tsx` — Added configurable sorting modes
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Added sticky toolbar with filters

**Features:**
- Sorting modes: SEVERITY_THEN_CONFIDENCE_ASC (default), SEVERITY_DESC, CONFIDENCE_ASC/DESC, NUMBER_ASC
- Filter modes: ALL, PENDING, DECIDED, CRITICAL_ONLY
- Hide Resolved toggle
- localStorage persistence for sort/filter/hideResolved preferences
- Sticky review toolbar with decision counters
- Counter warnings for pending conflicts

**Phase 10 — Review Session State Persistence (2026-05-12)**

**Files modified:**
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Added decision persistence per taskId
- `src/renderer/src/pages/management/SongScraperPage.tsx` — Pass taskId prop to panel

**Features:**
- Per-taskId decision persistence to localStorage
- Pause & resume review sessions without losing progress
- Visual "Session restored" indicator when decisions loaded from storage
- Automatic cleanup after successful import
- Crash recovery for unexpected app closure

**Phase 11 — Versioned Persistence Schema (2026-05-12)**

**Files modified:**
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Versioned state with migration layer

**Features:**
- `PersistedReviewStateV1` schema with version field
- Migration layer `migratePersistedState()` for future-proofing
- Stale session detection (72 hour threshold)
- `providerId` and `targetHymnalId` for audit/replay context
- `updatedAt` timestamp for staleness detection
- Visual "⚠ May be outdated" badge for stale sessions
- Safe discard on version mismatch

**Phase 12 — Bulk Decision Actions (2026-05-12)**

**Files modified:**
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Added bulk actions UI and logic

**Features:**
- Bulk action dropdown with preview counts
- 4 bulk action types:
  - `overwrite_empty_lyrics` — Overwrite targets with empty lyrics
  - `merge_identical_lyrics` — Merge metadata for lyrics hash match
  - `skip_low_confidence` — Skip conflicts with score < 0.5
  - `approve_high_confidence` — Approve conflicts with score >= 0.9
- One-level undo for bulk actions
- Only modifies decisions (does not execute)
- Skips already-decided conflicts

**Phase 13 — Provider Abstraction Registry (2026-05-12)**

**Files modified:**
- `src/main/scraper/types.ts` — Extended provider types with health, transport, selectors, normalization
- `src/main/scraper/providers/BaseScraperProvider.ts` — Added abstract methods and `validateWithDiagnostics()`
- `src/main/scraper/providers/AlkitabAppProvider.ts` — Implemented new abstract methods
- `src/main/scraper/providers/LaguSionProvider.ts` — Implemented new abstract methods
- `src/main/scraper/providerRegistry.ts` — Health tracking, validation, extended definitions
- `src/main/ipc-handlers.ts` — New IPC handlers for provider validation
- `src/preload/index.ts` — Preload API for provider validation
- `src/shared/ipc-channels.ts` — New IPC channels

**Features:**
- `ScraperProviderDefinition` with full configuration:
  - `capabilities` — supportsNumericRange, supportsSlug, supportsMetadata, supportsPreview
  - `transport` — mode, concurrency, timeoutMs, retryLimit, delayMs
  - `selectors` — CSS selectors for title, lyrics, metadata fields
  - `normalization` — stanzaStrategy, trimWhitespace, unicodeNormalize
  - `health` — status, lastValidatedAt, consecutiveFailures, diagnostics
- `validateWithDiagnostics()` — Comprehensive selector validation
- Provider health tracking (OK, DEGRADED, BROKEN, UNKNOWN)
- IPC endpoints:
  - `getProviderDefinitions()` — All providers with health
  - `validateProvider()` — Run validation diagnostics
  - `getProviderHealth()` — Get health status

**Phase 14 — Design Token System V4 (2026-05-12)**

**Files modified:**
- `src/renderer/src/assets/main.css` — Enhanced design tokens & component system
- `.docs/design-system-v4.md` — Design system documentation

**Design Token Enhancements:**
- **Semantic Colors** — Emerald/Amber/Rose/Cyan/Zinc palette for status & severity
- **State Colors** — OK, DEGRADED, BROKEN, UNKNOWN for provider health
- **Severity Colors** — Low, Medium, High, Critical for conflict classification
- **Typography Scale** — Workspace title, section title, card header, label, data, console
- **Spacing System** — Card, panel, section, workspace semantic tokens
- **Radius System** — Card, panel, button, input, badge semantic tokens

**Component System:**
- `card-modern` — Surface elevation cards (no aggressive borders)
- `status-badge` — Health & severity badges with dot indicators
- `empty-state` — Centered empty states with icon, title, description
- `activity-stream` — Modern console with timeline feel
- `orchestration-timeline` — Visual workflow steps
- `command-header` — Operational status bar

**Design Principles:**
- Surface elevation > borders
- Semantic token names
- Breathing room for operators
- State-aware colors with glow effects

**Phase 15 — Song Scraper Pilot Redesign (2026-05-12)**

**Files created:**
- `src/renderer/src/components/scraper/ActivityStream.tsx` — Modern console with icons, semantic colors, timeline feel
- `src/renderer/src/components/scraper/OrchestrationTimeline.tsx` — Visual workflow steps (FETCH → NORMALIZE → VALIDATE → IMPORT)

**Files modified:**
- `src/renderer/src/components/scraper/ProviderConfigPanel.tsx` — card-modern, input-premium, btn-premium
- `src/renderer/src/components/scraper/ProgressPanel.tsx` — OrchestrationTimeline, status-badge, command-stat
- `src/renderer/src/pages/management/SongScraperPage.tsx` — command-header, ActivityStream, better spacing

**Component Architecture:**

```
SongScraperPage
├── command-header (operational status bar)
│   ├── status-badge (RUNNING/COMPLETED/IDLE)
│   ├── text-label (Provider, Target)
│   └── command-stat (Done, Success, Failed)
├── ProviderConfigPanel (card-modern)
│   ├── card-modern__header
│   ├── input-premium fields
│   └── btn-premium actions
├── ActivityStream (card-modern)
│   ├── activity-item with icons
│   └── Semantic variants (success/warning/error/info)
├── ProgressPanel (card-modern)
│   ├── OrchestrationTimelineCompact
│   ├── command-stat grid
│   └── activity-stream for per-song status
└── ConflictResolutionPanel + PreviewInspector
```

**Key Transformations:**
- Console → ActivityStream (icon-based, semantic, timeline feel)
- Progress text → OrchestrationTimeline (visual workflow steps)
- Border-heavy panels → card-modern (surface elevation)
- Basic inputs → input-premium (focus states, subtle backgrounds)
- Flat buttons → btn-premium (gradients, hover glow)
- Header → command-header (realtime operational telemetry)

**Visual Improvements:**
- Breathing room with `p-4` instead of `p-3`
- Surface elevation via `box-shadow` instead of aggressive borders
- Semantic colors for state (emerald/amber/rose)
- Status badges with glowing dots

**Phase 15b — Productization Layer: CTA Hierarchy + Unified Surfaces (2026-05-12)**

**Files modified:**
- `src/renderer/src/assets/main.css` — Added `btn-premium-danger` for destructive actions
- `src/renderer/src/components/scraper/ProviderConfigPanel.tsx` — Abort button uses destructive styling (`btn-premium-danger`)
- `src/renderer/src/components/scraper/PreviewInspector.tsx` — Migrated to `card-modern` + `input-premium` + empty-state
- `src/renderer/src/components/scraper/ConflictResolutionPanel.tsx` — Migrated container chrome to `card-modern`
- `src/renderer/src/pages/management/SongScraperPage.tsx` — Command header now exposes more operational telemetry (Queue/Conflicts/Rate/ETA)
- `src/renderer/src/components/scraper/ProgressPanel.tsx` — Timeline now receives `hasConflicts` to surface review state

**Implemented outcomes (mapped to redesign priorities):**

- **Hierarchy**
  - Command header is now a true operational strip (state + Provider/Target/Queue + telemetry stats)
  - Destructive action is visually separated (Abort is no longer visually equal to primary action)
- **Spacing & Surface Elevation**
  - Preview + Conflict panels now use unified bento card surfaces (`card-modern`) instead of border-heavy boxes
- **Typography & Label/Data separation**
  - Card headers use `card-modern__title` / `card-modern__subtitle`
  - Empty states now provide operator guidance (not blank black areas)
- **Progress / Orchestration visibility**
  - Progress timeline can display conflict-aware review state (`hasConflicts`)
- Gradient progress bars (blue → emerald)
- Icon-based activity items with phase detection

**Phase 16 — Runtime Inspector Redesign (2026-05-12)**

**Files modified:**
- `src/renderer/src/components/RuntimeInspector.tsx` — Complete redesign with design system

**Component Transformations:**

| Before | After |
|--------|-------|
| Basic header | command-header with status-badge |
| Text-heavy health strip | command-stat grid with icons |
| Inline metrics | 6-column command-stat grid |
| Plain event rows | activity-item with semantic variants |
| Gray tabs | Modern rounded tabs with hover states |
| Basic filter buttons | Semantic color buttons (emerald/amber) |
| Dropdown menu | card-modern dropdown |
| Divider-based inputs list | card-modern adapter cards |
| Empty text | empty-state components |

**Key Improvements:**

1. **Header** — Terminal icon with cyan accent, status-badge for event count
2. **HealthStrip** — 5-column command-stat: Runtime Health, Latency, Blocked %, Projection, Stage
3. **MetricsHeader** — 6-column grid: Total, Rate/s, Success, Blocked, Errors, Avg
4. **EventRow** — activity-item with success/warning/error variants, SourceBadge with semantic colors
5. **FilterBar** — Modern buttons with emerald (success) and amber (blocked) colors
6. **InputsTab** — card-modern per adapter with status-badge (LIVE/OFF) and command-stat metrics
7. **EventDetails** — card-modern command section, cyan syntax highlighting, rose error styling
8. **Empty States** — Proper empty-state components with title and description

**Visual Language:**
- Runtime health: emerald (healthy) / rose (degraded)
- Latency: amber accent
- Blocked ratio: amber warning
- Connected status: emerald LIVE / zinc OFF
- Event status: emerald SUCCESS / amber BLOCKED / rose ERROR
- Source badges: Semantic colors per input type (purple KEYBOARD, blue UI_BUTTON, etc.)

**Height increased:** 280px → 320px for better visibility

**Phase 17 — IPC Contracts, Error Taxonomy & Crash Recovery (2026-05-12)**

**Files created:**
- `src/shared/contracts/scraper.ts` — Zod schemas for all scraper IPC payloads
- `src/shared/errors/scraperErrors.ts` — Centralized error taxonomy with `ScraperError` class

**Files modified:**
- `package.json` — Added `zod` dependency for runtime validation
- `src/shared/ipc-channels.ts` — Added channels for saved state persistence and resume
- `src/main/ipc-handlers.ts` — Integrated Zod validation, ScraperError, persistence lifecycle
- `src/main/scraper/task/ScraperTask.ts` — Error taxonomy mapping for low-level errors
- `src/main/scraper/task/ScraperTaskManager.ts` — Added `startForNumbers()` and `onProgressSnapshot`
- `src/main/windows.ts` — Security hardening (webviewTag disabled, navigation blocked)
- `src/preload/index.ts` — Exposed new APIs for saved state and resume
- `src/preload/index.d.ts` — TypeScript declarations for new APIs
- `src/renderer/src/pages/management/SongScraperPage.tsx` — UI confirmation modal, error code display

**Feature 1: Typed IPC Contracts with Runtime Validation**

All scraper IPC payloads are now validated at runtime using Zod schemas:

```typescript
// src/shared/contracts/scraper.ts
export const ScraperStartPayloadSchema = z.object({
  providerId: z.string().min(1),
  baseUrl: z.string().url().optional(),
  targetHymnalId: z.number().int().positive(),
  startNumber: z.number().int().positive(),
  endNumber: z.number().int().positive(),
  concurrency: z.number().int().min(1).max(10).default(3),
  retryCount: z.number().int().min(0).max(5).default(2),
  delayMs: z.number().int().min(0).max(10000).default(500),
  conflictPolicy: z.enum(['skip', 'overwrite', 'ask']).default('skip'),
  perItemPolicy: z.record(z.enum(['skip', 'overwrite', 'append'])).optional()
})
```

Schemas defined:
- `ScraperStartPayloadSchema` — Start/dry-run request validation
- `ScraperDryRunResultSchema` — Dry-run response validation
- `ScraperImportFromDryRunSchema` — Import request validation
- `ScraperSavedDryRunStateSchema` — Persisted dry-run state
- `ScraperSavedRunningTaskStateSchema` — Persisted running task state

**Feature 2: Centralized Error Taxonomy**

`ScraperError` class provides structured error handling:

```typescript
// src/shared/errors/scraperErrors.ts
export type ScraperErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'RATE_LIMITED'
  | 'INVALID_HTML'
  | 'PARSE_FAILED'
  | 'PROVIDER_BROKEN'
  | 'VALIDATION_FAILED'
  | 'INVALID_PAYLOAD'
  | 'IMPORT_CONFLICT_FATAL'
  | 'DB_FAILED'
  | 'ABORTED'
  | 'INTERNAL'

export class ScraperError extends Error {
  readonly code: ScraperErrorCode
  readonly retryable: boolean
  constructor(code: ScraperErrorCode, message: string, opts?: { retryable?: boolean })
}
```

Error format: `[SCRAPER:CODE] message` — Stable, parseable by renderer.

**Feature 3: Crash Recovery for Dry-Run State**

Dry-run state persisted to `app_state` table:
- Key: `scraper_saved_dry_run_state`
- Saved on dry-run completion
- Restored on app init (provider, range, items, conflicts)
- Cleared on successful import or new dry-run start

**Feature 4: Crash Recovery for Running Tasks**

Running task state persisted via `onProgressSnapshot` callback:
- Key: `scraper_saved_running_task_state`
- Snapshot includes: taskId, request, failedNumbers, progress counts, state
- Persisted during scraping (every progress update)
- Cleared on task completion (COMPLETED/ABORTED)

**Feature 5: UI Confirmation Modal for Resume**

Instead of auto-resume, user sees confirmation dialog:
- Shows: Provider, Range, Failed Numbers count, Timestamp
- Actions: "Resume" (calls `resumeFailed`) or "Dismiss" (clears state)
- Modal appears when saved running task with `state=RUNNING` detected

**Feature 6: Full Error Mapping to UI**

Renderer parses error codes from IPC errors:
```typescript
// Parse [SCRAPER:CODE] message format
function parseScraperError(err: unknown): ParsedScraperError | null

// UI displays code badge + message
<span className="badge">{lastError.code}</span>
<span className="message">{lastError.message}</span>
```

All error states now include structured `ParsedScraperError` with code and message.

**Feature 7: Electron Security Hardening**

Windows security improvements:
- `webviewTag: false` — Disables webview tag in all windows
- `will-navigate` blocked — Prevents navigation away from app
- `new-window` → `shell.openExternal` — External links open in browser

Applied to:
- Main window (`src/main/windows.ts`)
- Projection window
- Stage display window

**IPC Channels Added:**

| Channel | Direction | Description |
|---------|-----------|-------------|
| `scraper:get-saved-dry-run-state` | Invoke | Retrieve persisted dry-run state |
| `scraper:clear-saved-dry-run-state` | Invoke | Clear persisted dry-run state |
| `scraper:get-saved-running-task-state` | Invoke | Retrieve persisted running task state |
| `scraper:clear-saved-running-task-state` | Invoke | Clear persisted running task state |
| `scraper:resume-failed` | Invoke | Resume scraping from failed numbers |

**Preload API Extended:**

```typescript
interface ScraperAPI {
  // ... existing methods
  getSavedDryRunState(): Promise<ScraperSavedDryRunState | null>
  clearSavedDryRunState(): Promise<boolean>
  getSavedRunningTaskState(): Promise<ScraperSavedRunningTaskState | null>
  clearSavedRunningTaskState(): Promise<boolean>
  resumeFailed(payload: { request: unknown; failedNumbers: unknown }): Promise<string>
}
```

**Error Mapping in ScraperTask:**

Low-level errors mapped to `ScraperErrorCode`:
- `fetch` abort → `ABORTED`
- `fetch` timeout → `PROVIDER_TIMEOUT`
- Network errors → `NETWORK_OFFLINE`
- HTTP 429 → `RATE_LIMITED`
- HTML parse failures → `PARSE_FAILED` / `INVALID_HTML`

Retry log messages tagged with error code prefix for audit clarity.

