# Song Library Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the lower-left song library panel for reliable production use without redesigning its established layout.

**Architecture:** Keep `SongLibraryPanel` and the existing Zustand stores as the UI boundary. Fix request ordering and pagination context in `useSongStore`, propagate playlist write failures instead of reporting false success, and make recent-song queries hymnal-aware through the existing Electron IPC boundary. Add focused regression tests before each behavior change.

**Tech Stack:** React 19, TypeScript, Zustand, Electron IPC, SQLite, Vitest, Testing Library, CSS.

---

### Task 1: Search and pagination correctness

**Files:**

- Create: `src/renderer/src/store/__tests__/useSongStore.test.ts`
- Modify: `src/renderer/src/store/useSongStore.ts`

- [x] Add failing tests proving load-more preserves the active hymnal and stale responses cannot replace newer results.
- [x] Implement persisted search context, request sequencing, explicit search loading, and error state.
- [x] Run focused tests until green.

### Task 2: Reliable playlist feedback

**Files:**

- Modify: `src/renderer/src/store/__tests__/playlist.integration.test.ts`
- Modify: `src/renderer/src/store/usePlaylistStore.ts`
- Modify: song-library consumers that display success feedback.

- [x] Add a failing regression test proving an IPC write failure is propagated.
- [x] Make playlist writes throw after centralized error feedback.
- [x] Only display success after the write and playlist refresh succeed.

### Task 3: Hymnal-aware history and production UI states

**Files:**

- Modify: `src/main/database.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/renderer/src/components/SongLibraryPanel.tsx`
- Modify: `src/renderer/src/components/SongCard.tsx`
- Modify: `src/renderer/src/assets/main.css`

- [x] Pass the selected hymnal through the recent-song IPC query.
- [x] Add loading, retry/error, loaded-result semantics, cleanup, and localized labels.
- [x] Preserve the compact layout while improving keyboard focus and visible action affordances.

### Task 4: Verification

- [x] Run formatting and lint on modified files.
- [x] Run focused tests, full tests, typechecks, and production build.
- [x] Review the final diff for unrelated changes and production regressions.
