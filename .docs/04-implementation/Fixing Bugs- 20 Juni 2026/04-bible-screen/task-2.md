# External SQLite Content Pack — Task Tracker

## Phase 1: Foundation

- [x] Directory structure + .gitignore
- [x] Database migration v18 (content_packs table)
- [x] Shared types (ContentPack, BiblePack types)

## Phase 2: Main Process Services

- [x] contentPackPaths.ts
- [x] contentPackRegistry.ts
- [x] contentPackManager.ts
- [x] bibleExternalSqliteRepository.ts
- [x] bibleReferenceParser.ts

## Phase 3: IPC Layer

- [x] IPC channels (ipc-channels.ts)
- [x] Content Pack IPC handlers
- [x] Bible Pack IPC handlers
- [x] Wire into setupIPC()

## Phase 4: Preload Bridge

- [x] preload/index.ts — add contentPacks + biblePack
- [x] preload/index.d.ts — type declarations

## Phase 5: Renderer

- [x] Bible feature types (shared/types.ts)
- [x] useBiblePacks hook
- [x] useBibleReader hook
- [x] useBibleSearch hook
- [x] BiblePackManager component
- [x] BibleScreen rewrite
- [x] SettingsScreen integration (Bible Pack tab)
- [x] SlideData extended (bibleVersionCode, bibleCopyright)

## Phase 6: App Lifecycle

- [x] main/index.ts — startup (ensureContentPackDirectories) + shutdown (closeAllBibleConnections)
- [x] database.ts — setRegistryDb injection

## Phase 7: Verification

- [x] typecheck (0 errors)
- [x] build (0 errors, 5.35s)
- [x] git check (.gitignore updated, no .sqlite tracked)

## Phase 8: UI/UX Redesign

- [x] Sidebar Search & Book Filtering
- [x] Custom Chapter Grid Picker popover
- [x] Styled Translation selector
- [x] Typography Grid & Reading View layout
- [x] Floating actions bar for selected verses
- [x] Enhanced Search Results view & parsed reference card
- [x] Final compilation, builds & verification

## Phase 9: UI Polish & Runtime Hardening

- [x] Chapter picker clipping and Escape key closing
- [x] Swap right panel layout grid to responsive sidebar/reading pane flex columns
- [x] Search input alignment and filter buttons spacing on 1366px/1920px
- [x] Dynamic padding-bottom on reading pane when floating action bar is active
- [x] Add version shortname (` · TB`) to slide reference output
- [x] Standardize slide copyright small notice
- [x] Implement book alias checking in book search sidebar
- [x] User-friendly translations for SQLite schema/missing file exceptions
- [x] Build check verification (`npx tsc --noEmit` and `npm run build`)

- [x] Setup external SQLite API integration in `BiblePanel.tsx` (versions registry, books, verses, search, and parsedReference)
- [x] Implement search/reference parsing spotlight preview flow (instant check, preview card, Kirim Preview / Kirim Live)
- [x] Refactor browse mode with compact nested directory grid (Book list -> Chapter list -> Verse list)
- [x] Implement recent verses history selection & reload
- [x] Apply premium dark-mode styling with framer-motion animations
- [x] Compile and verify build (`npx tsc --noEmit` and `npm run build`)
- [x] Implement non-contiguous verse formatting in projection engine using `formatVerseRanges`
- [x] Support double-clicking selected verses to project the entire multi-choice selection
- [x] Add Enter (Preview) and Ctrl+Enter (Live) keyboard actions inside the Search box
- [x] Add "Pilih Semua" (Select All) and "Bersihkan" (Clear All) toggles in Search card and Browse lists
- [x] Remove line-through and adjust checkmark dimming typography for premium aesthetics
- [x] Add inline guide icon (`HelpCircle`) next to "Mini Alkitab" title with descriptive shortcuts popover overlay
