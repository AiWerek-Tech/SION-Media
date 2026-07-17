# Dependency Maps

> **Status:** Dependency maps sudah terdefinisi di dokumen arsitektur. High-risk chains terdokumentasi di bawah.

This directory contains dependency graphs and maps.

## High-Risk Dependency Chains (Jangan Diputus)

```
1. Keyboard → RuntimeCommandBus → useProjectionStore → sendLiveSlide → IPC → projectionWindow
2. useAppBootstrap → registerCommandHandlers → commandBus (harus jalan sebelum projection command)
3. initDatabase → runMigrations → seedDatabase (harus berurutan)
4. createMainWindow → createProjectionWindow (projection window butuh main window reference)
```

## Store Dependency Map (Post Phase 9)

```
useAppStore (compatibility layer)
  ├── useSongStore      ← extracted Phase 9
  ├── useHymnalStore    ← extracted Phase 9
  └── useDisplayStore   ← extracted Phase 9

useProjectionStore (independent — JANGAN tambah cross-store reads)
usePlaylistStore (persisted via localStorage)
useModalStore (stack-based, max depth 3)
useAtmosphereStore (independent)
```

## IPC Channel Groups

```
IPC_WINDOW    → window controls
IPC_SYSTEM    → system ops, backup, reseed
IPC_PROJECTION → slide update, state change, theme
IPC_STAGE     → stage display show/hide
IPC_CONFIDENCE → confidence monitor
IPC_DISPLAY   → display info
IPC_HYMNALS   → hymnal CRUD
IPC_SONGS     → song CRUD + search + relations
IPC_PLAYLISTS → playlist CRUD + items
IPC_SETTINGS  → settings get/update
IPC_RECOVERY  → crash recovery
IPC_FILE      → file operations
IPC_BIBLE     → bible CRUD + search
IPC_SLIDES    → custom slides + groups
```

## Circular Dependency Check

```bash
npx madge --circular src/renderer/src/
npx madge --circular src/main/
```
