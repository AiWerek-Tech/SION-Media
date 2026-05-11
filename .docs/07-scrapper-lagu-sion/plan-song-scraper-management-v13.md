# Plan — Song Scraper Management Mode (v13)

## 1) Scope & Core Objective

Management Mode mendapatkan sebuah **Dedicated Content Acquisition Workspace**: `Management Mode → Song Scraper`.

Operator dapat:

- **Memilih provider** website hymnal.
- **Memilih target hymnal lokal** (Multi-Hymnal System).
- **Menentukan range** nomor lagu.
- **Preview hasil scraping** sebelum ingest.
- **Import** ke SQLite dengan policy conflict.
- **Monitor progress realtime** (terminal-style log + progress metrics).
- **Abort/cancel kapan saja**.
- **Retry** untuk item yang gagal.

Non-goals (v13):

- Sync cloud.
- Auth/login provider.
- OCR/PDF extraction.

## 2) High-level Architecture

```text
Renderer UI
    ↓ IPC (invoke/send + push events)
Scraper Task Manager (main process)
    ↓
Provider Adapter Layer
    ↓
Website Scraper Engine
    ↓
Normalizer
    ↓
SQLite Transaction + FTS5 (re-index)
```

### Process boundaries

- **Renderer**: UI state, preview rendering, conflict decisions, log viewer (virtualized).
- **Main**: scraping network/browser, parsing HTML, rate-limiting, retries, DB writes, FTS rebuild, progress events.

Rationale: scraping dan ingest harus berjalan di **main** agar UI tidak freeze dan agar dapat memanfaatkan Node/Electron APIs dengan aman.

## 3) Scraper Engine Location & Module Layout

Folder (mandatory):

- `src/main/scraper/`

Proposed modules (v13):

- `src/main/scraper/types.ts`
- `src/main/scraper/providers/BaseScraperProvider.ts`
- `src/main/scraper/providers/AlkitabAppProvider.ts`
- `src/main/scraper/providers/LaguSionProvider.ts`
- `src/main/scraper/providerRegistry.ts`
- `src/main/scraper/lyricsNormalizer.ts`
- `src/main/scraper/task/ScraperTaskManager.ts`
- `src/main/scraper/task/ScraperTask.ts`
- `src/main/scraper/task/backoff.ts`
- `src/main/scraper/task/queue.ts`
- `src/main/scraper/dbIngestion.ts`

IPC integration (main):

- Extend existing `src/main/ipc-handlers.ts` (atau modul baru yang di-import di sana).

Preload API:

- Extend `src/preload/index.ts` untuk expose `window.api.scraper.*`.

Renderer:

- `src/renderer/src/pages/management/SongScraperPage.tsx`
- `src/renderer/src/components/scraper/*` (panels, console, progress, preview, conflict UI).

## 4) Provider Architecture (Extensible, non-hardcoded)

### Interface (mandatory)

Setiap provider implement:

```ts
fetchSong(number: string): Promise<ScrapedSong>
validate(): Promise<boolean>
getCapabilities(): ProviderCapabilities
```

### BaseScraperProvider responsibilities

- **Provider identity** (id, label, default baseUrl).
- **URL builder** (by number or slug).
- **Selector registry** (per field, per version).
- **Parse + normalize** minimal provider-specific (HTML → raw fields).
- **Health validation** (sample request, selector existence, CAPTCHA detection heuristic).

### ProviderCapabilities

- `supportsNumericRange`: boolean
- `supportsSlug`: boolean
- `supportsKeyMeter`: boolean
- `supportsTags`: boolean
- `rateLimitHints`: { minDelayMs?: number }
- `requiresBrowser`: boolean

### Hymnal mapping strategy

- Provider returns `sourceHymnalCode` (contoh: `LS`) + `sourceSongNumber`.
- Task request menentukan `targetHymnalId`.
- Ingestion menggunakan:

  - `hymnal_id = targetHymnalId`
  - `number = normalizedNumber(sourceSongNumber)`

Rationale: mapping tidak boleh implicit; operator selalu memilih target hymnal lokal.

## 5) Playwright vs Axios/Cheerio — Decision

### Why Playwright (recommended for v13)

- **Offline-first app** bukan berarti offline scraping; banyak provider memakai:

  - rendering dinamis
  - lazy-loaded sections
  - anti-bot (Cloudflare / JS challenge)

- Playwright memberi:

  - DOM yang lebih “realistic” seperti browser
  - kemampuan deteksi CAPTCHA / challenge (heuristic via page content)
  - selector validation lebih stabil (querySelector di DOM nyata)

- Workload adalah **operator-driven acquisition** (bukan high-frequency crawling massal), sehingga overhead browser masih acceptable.

### When Axios/Cheerio is still useful

- Provider dengan HTML static (lebih cepat, lebih ringan).
- Bisa menjadi fallback engine.

### Hybrid strategy (future-ready)

- Provider `getCapabilities().requiresBrowser` menentukan engine:

  - `requiresBrowser=true` → Playwright
  - `false` → Axios/Cheerio

Implementasi v13 tetap bisa memulai dari Playwright untuk konsistensi provider (dua provider awal berpotensi berubah HTML).

## 6) Selector Strategy Abstraction

### Problem

HTML struktur berubah; hardcode selector di provider code membuat maintenance mahal.

### Solution

- `selectorRegistry` per provider:

  - versioned selectors
  - map field → selector candidates (array)
  - optional transform hooks

Example concept:

- `title`: [`h1`, `.song-title`, `[data-testid="title"]`]
- `lyrics`: [`.lyrics`, `article pre`, `#content .text`]

Extraction strategy:

- Try selectors in order
- First non-empty wins
- If none found → `SELECTOR_MISSING` warning/error

Validation strategy:

- `validate()` loads a representative page and checks selectors resolvable.

## 7) Concurrency + Retry Strategy

### Concurrency

- Default: `3`
- Implemented as a **bounded worker pool**:

  - queue = numbers `[start..end]`
  - workers = `concurrency`
  - each worker pulls next job, processes pipeline

### Retry

- Default retry count: `3`
- Retry only on retryable failures:

  - timeout
  - transient network
  - rate limit
  - navigation failure

No retry for:

- selector missing after validation (config error)
- empty lyrics (treated as warning + skip, depends policy)

### Backoff

- Base delay is operator-specified `delayMs`.
- Exponential backoff on retry:

  - `delay = delayMs + (2^attempt * jitter)`

### Timeout

- Per-song timeout: **30s** hard limit.

## 8) Database Ingestion Flow (SQLite Transaction)

### Goals

- Bulk ingest cepat dan konsisten.
- Conflict handling yang dapat dipilih operator.

### Flow

1. Scrape range menghasilkan `ScrapedSong[]` (plus failures).
2. Renderer menampilkan preview + conflict strategy.
3. Import request ke main berisi:

   - `items` (normalized scraped items)
   - `targetHymnalId`
   - `conflictPolicy` (skip/overwrite/ask)
   - `perItemPolicy` (untuk Ask Per Song)
   - `dryRun` (untuk menampilkan conflict sebelum commit)

4. Main melakukan:

   - resolve duplicates (by `hymnal_id + normalized number`, plus optional title match)
   - run `db.transaction()` untuk insert/update

Existing baseline di project:

- `importSongsFromJson()` sudah memakai:

  - `db.transaction()`
  - `conflictPolicy` + `perItemPolicy`
  - `rebuildSongsFts()` setelah bulk

v13 akan memanfaatkan konsep yang sama untuk pipeline scraper agar konsisten.

## 9) FTS5 Re-index Flow

Requirement: searchable immediately.

Strategy:

- Setelah bulk insert/update selesai:

  - call `INSERT INTO songs_fts(songs_fts) VALUES('rebuild');`

Project already has `rebuildSongsFts()` used by JSON import.

For scraper import, use the same mechanism.

## 10) Cancellation / Abort Design

### Requirements

- Operator dapat abort kapan saja.
- UI tidak freeze.

### Design

- `ScraperTask` memiliki:

  - `taskId`
  - `abortController`
  - `state` (RUNNING/ABORTED/COMPLETED)

- `scraper:abort` IPC triggers:

  - `abortController.abort()`
  - stop pulling new jobs from queue
  - allow in-flight operations to observe abort and exit gracefully

### Propagation

- Playwright navigation / wait operations must respect abort:

  - if aborted, close page/context

- Retry loop checks `signal.aborted` before each attempt.

### UI behavior

- Abort button always enabled during run.
- After abort, show summary (processed/success/fail/aborted).

## 11) Queue System (Required)

- Implemented as:

  - `pendingJobs: number[]`
  - `inFlight: Map<number, JobState>`
  - `results: Map<number, ScrapeResult>`

- `retry-failed` uses `failedJobs` list to enqueue again without redoing successful ones.

## 12) Progress & IPC Event Model

### Required IPC

- `scraper:get-providers`
- `scraper:start`
- `scraper:abort`
- `scraper:progress`
- `scraper:preview`
- `scraper:retry-failed`

### Event payload design

- `scraper:progress` is **push** from main → renderer:

  - throttled (e.g. 100–250ms) to avoid UI overload
  - includes:

    - overall stats: total, processed, success, failed, skipped, retries
    - rate: songs/sec
    - ETA
    - per-song updates (last N)
    - log lines (bounded ring buffer)

- `scraper:preview`:

  - request preview for a single number without running full job

### UI anti-freeze tactics

- main sends updates in chunks
- renderer uses:

  - list virtualization for logs and per-song rows
  - state updates batched / throttled

## 13) Conflict Detection & Resolution

### Duplicate detection

Compare:

- `hymnal_code` (via selected target hymnal)
- `normalized number`
- `title` (secondary signal)

### Strategies

- Global:

  - Skip Existing
  - Overwrite Existing
  - Ask Per Song

- In `Ask Per Song`:

  - renderer asks operator to resolve detected duplicates
  - sends `perItemPolicy` map

Note: This aligns with existing `importSongsFromJson()` conflict model (`skip`/`overwrite`/`append`).

## 14) Lyrics Normalization Rules

Normalizer output must be compatible with Slide Engine.

Rules (mandatory):

- Remove duplicate spaces (within line).
- Normalize line endings to `\n`.
- Preserve stanza breaks.
- Preserve chorus labels.
- Convert triple newline → double newline.
- Trim trailing spaces per line.

Implementation plan:

- `normalizeLyrics(raw: string): string`

  - split lines, trim end, collapse inner spaces except indentation is not relevant
  - join with `\n`
  - replace `\n{3,}` with `\n\n`

Provider parsing should not aggressively modify content; normalization is centralized.

## 15) Edge Cases Handling

- **Website offline**: mark song failed with `NETWORK_ERROR`, retryable.
- **Selector changed**: `validate()` fails; start should block with actionable error.
- **Duplicate song**: resolved by conflict policy.
- **Empty lyrics**: warning + skip (configurable), not inserted.
- **CAPTCHA detected**:

  - pause task
  - emit event `CAPTCHA_DETECTED`
  - require operator action (v13: abort + manual retry after resolving)

- **Timeout**: retry with backoff.
- **Rate limit**: detect 429 / common text markers; exponential backoff.

## 16) Observability / Runtime Inspector Integration

- Emit structured log lines:

  - timestamp
  - level (INFO/WARN/ERROR)
  - phase (FETCH/PARSE/NORMALIZE/DB/FTS)
  - providerId
  - song number
  - duration

- Track metrics:

  - task duration
  - success rate
  - failed songs
  - retry count
  - provider health (validate result)

Renderer Live Task Console consumes these logs.

## 17) Future Extensibility

- Multiple providers via registry.
- Add `ProviderSelectorPack` external JSON (future) to update selectors without code push.
- Support slug-based providers (LaguSion) by adding:

  - `resolveSlug(number)` or `fetchSongBySlug(slug)`

- Add “import package” and remote repository integration later.

## 18) Deliverables Checklist (v13)

- Documentation:

  - `.docs/07-scrapper-lagu-sion/plan-song-scraper-management-v13.md` (this file)
  - `.docs/07-scrapper-lagu-sion/log-impl-song-scraper-management-v13.md` (Phase 2)

- UI:

  - `SongScraperPage.tsx` dedicated workspace
  - Panels: Provider Config, Live Console, Progress, Conflict, Preview

- Main:

  - `src/main/scraper/*` engine + providers
  - IPC channels + preload API

- Acceptance:

  - No UI freeze
  - Abort + retry works
  - Duplicate handling works
  - FTS searchable immediately
  - `npm run build` clean
  - `npm run lint` clean
