# Implementation Log: Management Mode Refactor v10

**Phase**: Backend Hardening & Conflict Resolution
**Date**: 2026-05-10
**Status**: In Progress

---

## Summary

This log documents the implementation progress of the Management Mode refactor, focusing on backend data integrity, hardened import/export, and conflict resolution UI.

---

## Completed Tasks

### 1. WAL Checkpoint Integration

**File**: `src/main/database.ts`

- Added `checkpointWal()` helper function to enforce SQLite WAL checkpointing
- Integrated checkpoint calls after all write operations:
  - Hymnal operations: `addHymnal`, `updateHymnal`, `deleteHymnal`
  - Song operations: `addSong`, `updateSong`, `deleteSong`
  - Song relations: `addSongRelation`, `deleteSongRelation`
  - Favorites: `toggleFavorite`
  - Playlist operations: `addPlaylist`, `updatePlaylist`, `deletePlaylist`, `updatePlaylistItem`, `addPlaylistItem`, `deletePlaylistItem`, `reorderPlaylistItems`
  - Settings: `updateSetting`
  - History: `logSongHistory`
  - App state: `saveAppState`
  - Bible operations: `addBibleTranslation`, `deleteBibleTranslation`, `addBibleBook`, `addBibleVerse`, `addBibleVersesBatch`
  - Custom slides: `addCustomSlide`, `updateCustomSlide`, `deleteCustomSlide`
  - Slide groups: `addSlideGroup`, `updateSlideGroup`, `deleteSlideGroup`, `addSlideToGroup`, `removeSlideFromGroup`, `reorderGroupSlides`
- Used `TRUNCATE` mode for batch operations (`reseedDatabase`, `addBibleVersesBatch`)

### 2. Excel Import Safety Limits

**File**: `src/main/ipc-handlers.ts`

Already implemented with the following limits:

- **Max file size**: 10MB
- **Max rows**: 5000
- **Max columns**: 50
- **Allowed extensions**: `.xlsx` only
- **Parse timeout**: 30 seconds
- **Safe parsing options**: `cellFormula: false`, `cellHTML: false`, no dense mode

### 3. Conflict Resolution UI

**File**: `src/renderer/src/screens/ImportExportScreen.tsx`

Implemented comprehensive conflict resolution for duplicate imports:

**Features**:

- **Per-song resolution**: Each conflict can be resolved individually
- **Three resolution options**:
  - **Skip**: Keep existing song, don't modify
  - **Overwrite**: Replace existing song with imported data
  - **Merge**: Append imported lyrics to existing with separator, update metadata
- **Bulk resolution**: "Skip All", "Overwrite All", "Merge All" buttons
- **Merge preview**: View merged lyrics before confirming
- **Visual feedback**: Color-coded buttons showing selected resolution
- **Validation**: Import button disabled until all conflicts resolved
- **Summary message**: Shows count of imported, skipped, overwritten, and merged songs

**State Management**:

- `conflictResolutions`: `Record<number, ConflictResolution>` - tracks resolution per song index
- `showMergePreview`: `number | null` - toggles merge preview panel
- `allConflictsResolved`: computed check before allowing import

### 4. Non-Destructive Migrations

**File**: `src/main/migrations.ts`

Verified existing migrations are non-destructive:

- `version 7 - songs_time_signature`: Checks column existence before adding
- All migrations use `IF NOT EXISTS` or existence checks

### 5. Lint Fixes

**Files**:

- `src/renderer/src/components/HymnalSidebar.tsx`: Removed unused `FolderOpen` import
- `src/renderer/src/components/SongCard.tsx`: Removed unused `setScreen`, `setEditingSong` from destructuring
- All prettier formatting issues resolved with `--fix`

---

## Technical Decisions

### Merge Strategy for Lyrics

When merging, the following format is used:

```
[Existing lyrics]

--- [IMPORTED CONTENT] ---

[Imported lyrics]
```

This provides clear separation and traceability of merged content.

### FTS5 Re-indexing

All song modifications (add, update, delete) automatically trigger FTS5 re-indexing via SQLite triggers defined in migrations. No manual re-indexing required.

---

## Session 2 (2026-05-10)

### Metadata Validation Utilities

**File**: `src/renderer/src/utils/metadataValidation.ts`

- `validateKeyNote(value)` - Validates musical notation: `^[A-Ga-g][#b]?m?$`
  - Accepts: C, G, Ab, F#, Am, Dbm
  - Empty string is valid (optional field)
- `validateTempo(value)` - Validates BPM: integer 40-240
  - Empty string is valid (optional field)
- `formatKeyNote(value)` - Canonical formatting (uppercase root, lowercase accidental/mode)
- `formatTempo(value)` - Rounds to integer

### Validation Integration

**SongEditorScreen.tsx** (`src/renderer/src/screens/SongEditorScreen.tsx`):

- Added real-time validation for Key Note and Tempo inputs
- Error messages displayed inline below fields
- Format on blur (auto-corrects casing)
- Save blocked if metadata invalid
- Tempo input restricted to numeric-only via `replace(/[^0-9]/g, '')`

**ManagementMode.tsx** (Quick Edit):

- Added Key Note validation to quick edit form
- Real-time error display
- Format on blur

**ImportExportScreen.tsx**:

- Metadata formatting applied during import (new songs, overwrite, merge)
- Invalid values logged as warnings but import continues with formatted values

### Bento Grid Dashboard

**ManagementMode.tsx** (`src/renderer/src/screens/modes/ManagementMode.tsx`):

- Transformed header into "Enterprise Content Hub" dashboard
- Added Bento Grid cards (2-5 columns responsive):
  - **Total Hymnals**: Count + official count
  - **Total Songs**: Across all hymnals
  - **Coverage**: Global lyric completion % + empty count
  - **Selected Hymnal**: Code + song count + coverage (conditional)
  - **Quick Add**: Tambah Lagu button (disabled if no hymnal selected)
- Cards have hover effects with colored borders
- Removed unused `ChevronDown` import

### Lint Fixes

- `ManagementMode.tsx`: Fixed missing closing `</div>` for Main Layout Area (previous session regression)
- All files passing lint (exit code 0)

---

## Session 3 (2026-05-10) — Professional Lyric Studio

### 3-Column Layout Transformation

**File**: `src/renderer/src/screens/SongEditorScreen.tsx`

Transformed from 2-column into Professional Lyric Studio:

**Column 1 — Metadata & Lyrics Editor** (`flex-[4]`):

- Compact metadata form (hymnal, number, title, category, sub-title)
- Musical metadata row: Key Note + Time Signature + Tempo (BPM)
- Real-time validation with inline errors
- Auto-format on blur for key note and tempo
- Lyrics editor with smart tools toolbar (Insert Bait/Chorus/Bridge/Ending/Pre-Chorus)
- Slide Break (`---`) insertion button
- Character/line counter

**Column 2 — Slide Strip** (`flex-[3]`):

- Vertical thumbnail strip showing all generated slides
- Full-width aspect-video buttons with slide preview
- Section labels (Bait/Chorus/etc.) badges on thumbnails
- Click-to-navigate to specific slide
- Active slide highlighted with brand-primary border + ring

**Column 3 — Live Presentation Preview 16:9** (`flex-[5]`):

- Large 16:9 projection-accurate preview frame
- Theme-aware (font family, text color, background color/image, opacity)
- Slide navigation controls (prev/next with counter)
- **Metadata Overlay** at bottom center: Shows Key Note, Time Signature, and Tempo BPM directly on the preview frame — giving the operator 100% visual accuracy of what appears on the projector
- "PREVIEW MODE" status badge
- Slide Info Panel below preview showing active slide details (section label, text, character count, line count)

### Lint

All files passing `npm run lint` (exit code 0).

---

## Session 4 (2026-05-10) — Final Implementation

### Time Signature Input Component

**File**: `src/renderer/src/screens/SongEditorScreen.tsx`

- Replaced free-text input with dedicated `<select>` dropdown
- Common time signatures: 2/2, 2/4, 3/4, 4/4, 6/8
- Complex time signatures: 3/8, 5/4, 7/8, 9/8, 12/8
- Other: C (Common Time), C| (Alla Breve)
- Grouped with `<optgroup>` for better UX

### Dirty State Guard

**File**: `src/renderer/src/screens/SongEditorScreen.tsx`

- Added `initialSnapshot` state to track original values on mount
- Computed `isDirty` via `useMemo` comparing current vs initial
- Header shows "Belum Disimpan" badge with pulse animation when dirty
- Save button has ring highlight when dirty
- Exit attempts (Back button, Batal button) trigger confirmation dialog
- Modal: "Perubahan Belum Disimpan" with "Lanjutkan Edit" / "Buang Perubahan" options

### Bulk Actions in Song Library

**File**: `src/renderer/src/screens/modes/ManagementMode.tsx`

- Added `selectedSongIds: Set<number>` state for multi-select
- Checkbox column in song list table header (select all / clear all)
- Per-row checkbox for individual selection
- Bulk Actions Toolbar appears when songs selected:
  - Shows count: "X lagu dipilih"
  - "Batal" button to clear selection
  - "Hapus" button for bulk delete with confirmation
- Selected rows get subtle accent background highlight

### Projection Output Metadata Integration

**Files**:

- `src/renderer/src/types.ts` — Added `keyNote`, `timeSignature`, `tempo` to `SlideData`
- `src/renderer/src/engine/slideEngine.ts` — Updated `generateSlides` to accept metadata param
- `src/renderer/src/projection/ProjectionApp.tsx` — Added metadata overlay layer

**ProjectionApp Metadata Overlay**:

- Appears below lyrics on live projection
- Shows: Nada (key note), Birama (time signature), Tempo (BPM)
- Styled with semi-transparent pill badge
- Uses `clamp()` for responsive font sizing
- Only displays if metadata exists on slide

**Helper Functions**:

- `generateSlidesForSong(song)` — Auto-extracts metadata from Song object
- `generateSlidesForPlaylistItem(item)` — Auto-extracts metadata from PlaylistItem

**Database**:

- `getPlaylistItems` query now includes `time_signature` column
- `PlaylistItem` type updated with `time_signature?: string`

### Lint

All files passing `npm run lint` (exit code 0).

---

## All Tasks Completed ✓

| Task                                          | Status |
| --------------------------------------------- | ------ |
| WAL Checkpoint Integration                    | ✅     |
| Conflict Resolution UI (Skip/Overwrite/Merge) | ✅     |
| Excel Safety Limits (10MB/5000rows/50cols)    | ✅     |
| Non-destructive Migrations                    | ✅     |
| Key Note & Tempo Validation                   | ✅     |
| Bento Grid Dashboard                          | ✅     |
| Professional Lyric Studio (3-column)          | ✅     |
| Metadata Overlay in Preview                   | ✅     |
| Time Signature Dropdown                       | ✅     |
| Dirty State Guard                             | ✅     |
| Bulk Actions (multi-select + delete)          | ✅     |
| Projection Output Metadata                    | ✅     |

---

## Files Modified

| File                                                | Changes                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| `src/main/database.ts`                              | WAL checkpoint + time_signature in playlist query       |
| `src/renderer/src/types.ts`                         | SlideData metadata fields + PlaylistItem.time_signature |
| `src/renderer/src/engine/slideEngine.ts`            | Metadata param + helper functions                       |
| `src/renderer/src/projection/ProjectionApp.tsx`     | Metadata overlay on projection                          |
| `src/renderer/src/screens/SongEditorScreen.tsx`     | Lyric Studio + Dirty Guard + Time Signature dropdown    |
| `src/renderer/src/screens/modes/ManagementMode.tsx` | Bento Grid + Bulk Actions                               |
| `src/renderer/src/screens/Dashboard.tsx`            | Use generateSlidesForSong                               |
| `src/renderer/src/screens/modes/ProjectionMode.tsx` | Use generateSlidesForSong                               |
| `src/renderer/src/components/SongLibraryPanel.tsx`  | Use generateSlidesForSong                               |
| `src/renderer/src/components/PlaylistPanel.tsx`     | Use generateSlidesForPlaylistItem                       |
| `src/renderer/src/components/PlaylistItemCard.tsx`  | Use generateSlidesForPlaylistItem                       |
| `src/renderer/src/components/CommandPalette.tsx`    | Use generateSlidesForSong                               |
| `src/renderer/src/App.tsx`                          | Use generateSlidesForSong                               |
| `src/renderer/src/screens/ImportExportScreen.tsx`   | Conflict Resolution + metadata validation               |
| `src/renderer/src/utils/metadataValidation.ts`      | Validation utilities                                    |

---

## Architecture Summary

### Metadata Flow

```
Song (DB) → generateSlidesForSong() → SlideData (with metadata)
                                              ↓
                              ProjectionApp → Overlay Display
```

### Lyric Studio Layout

```
┌──────────────────┬─────────────────┬────────────────────┐
│ Metadata + Lyrics│ Slide Strip     │ Live Preview 16:9  │
│ Editor           │ (thumbnails)    │ + Metadata Overlay │
│ flex-[4]         │ flex-[3]        │ flex-[5]           │
└──────────────────┴─────────────────┴────────────────────┘
```

### Bulk Actions Flow

```
User clicks checkbox → selectedSongIds.add(id)
                         ↓
               Toolbar appears (count + actions)
                         ↓
               "Hapus" → confirm → delete loop → reload
```
