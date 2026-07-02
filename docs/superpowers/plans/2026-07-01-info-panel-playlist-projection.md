# Info Panel Playlist and Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Info panel content to active playlists and render its title/body with a clear hierarchy in Preview and Live.

**Architecture:** Extend mixed playlist items with an `info` type using existing title/notes columns. Convert Info items into custom slides and render those slides through a focused branch in the shared PresentationCanvas.

**Tech Stack:** React 19, Zustand, Electron IPC, SQLite, Vitest, Testing Library

---

### Task 1: Define Info playlist contracts

- [ ] Extend playlist item type unions with `info`.
- [ ] Add typed preload API for adding an Info item.
- [ ] Add database and IPC functions using existing columns.

### Task 2: Generate Info slides

- [ ] Write a failing slide generation test.
- [ ] Generate one custom slide with title in `sectionLabel` and body in `text`.
- [ ] Verify the focused test passes.

### Task 3: Add Info panel playlist action

- [ ] Write failing interaction tests.
- [ ] Add a store action that targets the active playlist.
- [ ] Add the compact “Tambah ke Playlist” button.
- [ ] Verify success and missing-playlist states.

### Task 4: Render title/body hierarchy

- [ ] Write a failing PresentationCanvas test.
- [ ] Render a small subdued title and dominant body for custom Info slides.
- [ ] Keep existing song and Bible rendering unchanged.

### Task 5: Complete playlist integration

- [ ] Make PlaylistItemCard identify Info items.
- [ ] Handle Info items in Projection Mode and legacy Dashboard selection.
- [ ] Preserve Info items in playlist import/export.

### Task 6: Verify

- [ ] Run focused tests.
- [ ] Verify Preview and Live visually in Electron.
- [ ] Run lint, all tests, and production build.
