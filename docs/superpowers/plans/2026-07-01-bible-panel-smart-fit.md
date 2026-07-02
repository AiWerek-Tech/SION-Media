# Bible Panel and Smart Verse Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mini Alkitab polished, scrollable, playlist-safe, and immune to long-verse clipping at large font settings.

**Architecture:** Centralize Bible slide creation as one verse per slide. Add a measured Bible-only text component that treats the configured font as a maximum and finds the largest safe size at render time.

**Tech Stack:** React 19, Electron, Zustand, SQLite snapshots, Vitest, Testing Library

---

### Task 1: Centralize Bible slide generation

- [ ] Write failing tests for one slide per verse and metadata preservation.
- [ ] Add a shared verse-to-slide builder.
- [ ] Route Mini Alkitab, Library Bible, and playlist playback through it.

### Task 2: Implement smart Bible text fit

- [ ] Write failing tests for the binary size search.
- [ ] Add a measured Bible text renderer with requested maximum and readable minimum.
- [ ] Use it in both animated and static PresentationCanvas paths.

### Task 3: Polish Mini Alkitab

- [ ] Write a failing layout/scroll contract test.
- [ ] Add semantic classes and scoped CSS for spacing, list height, and vertical scrolling.
- [ ] Keep selection controls and actions reachable at short window heights.

### Task 4: Verify playlist round-trip

- [ ] Test JSON snapshot conversion to one slide per verse.
- [ ] Confirm active playlist add, reload, Preview, and Live behavior.

### Task 5: Production gates

- [ ] Run focused tests.
- [ ] Run Electron visual QA with a long verse and oversized font.
- [ ] Run lint, all tests, and production build.
