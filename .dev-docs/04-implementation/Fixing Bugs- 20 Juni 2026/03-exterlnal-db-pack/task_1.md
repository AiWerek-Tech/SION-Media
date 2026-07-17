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
