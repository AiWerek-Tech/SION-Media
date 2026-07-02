# Reusable Playlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make playlists reusable without a date while retaining an explicit dated option, and polish every playlist entry point without a broad redesign.

**Architecture:** Keep the database's existing empty-string representation for an undated playlist, then centralize schedule normalization and Indonesian display formatting in one renderer utility. Reuse the same explicit `Kapan saja`/`Bertanggal` interaction in Projection, Library, and the global create dialog; update list and picker surfaces to consume the formatter.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Electron/Vite, CSS.

---

### Task 1: Playlist schedule model

**Files:**

- Create: `src/renderer/src/utils/playlistSchedule.ts`
- Create: `src/renderer/src/utils/__tests__/playlistSchedule.test.ts`

- [x] Write tests proving blank/invalid dates render as `Kapan saja`, valid ISO dates format safely without timezone drift, and dated mode normalizes an absent date.
- [x] Run the focused test and verify it fails because the utility does not exist.
- [x] Implement schedule normalization and display helpers.
- [x] Run the focused test and verify it passes.

### Task 2: Store creation hygiene

**Files:**

- Modify: `src/renderer/src/store/usePlaylistStore.ts`
- Modify: `src/renderer/src/store/__tests__/playlist.integration.test.ts`

- [x] Write a failing test proving an undated playlist sends an empty date and starts with an empty, inactive item list.
- [x] Update playlist creation to trim inputs, normalize the date, reset stale queue state, and rethrow errors to callers.
- [x] Run the store test and verify it passes.

### Task 3: Consistent creation and display UI

**Files:**

- Modify: `src/renderer/src/components/PlaylistPanel.tsx`
- Modify: `src/renderer/src/components/library/LibraryPlaylistWorkspace.tsx`
- Modify: `src/renderer/src/components/modals/CreatePlaylistDialog.tsx`
- Modify: `src/renderer/src/components/modals/PlaylistPickerDialog.tsx`
- Modify: `src/renderer/src/assets/main.css`

- [x] Make `Kapan saja` the default and reveal the date input only for `Bertanggal`.
- [x] Replace raw date rendering with the centralized formatter in headers, menus, and picker rows.
- [x] Improve compact metadata, labels, accessible icon actions, disabled actions, and empty-state wording while retaining the current layout.
- [x] Preserve an empty date during import instead of silently replacing it with today.

### Task 4: Automated verification

**Files:**

- Verify all modified files only.

- [x] Run focused playlist tests.
- [x] Run renderer and node typechecks.
- [x] Run lint on modified TypeScript files.
- [x] Run the production build; do not open a browser or Electron window.
