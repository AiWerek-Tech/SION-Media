# Projection Panel Scroll Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable internal scrolling to Song Info and every Bible mode, compact the Bible header, and remove the unused Projection Notifications tab.

**Architecture:** Preserve existing stores and callbacks. Introduce explicit semantic mode viewport classes and one fixed compact Bible control bar, then remove only the Projection-specific notification surface while retaining shared notification infrastructure.

**Tech Stack:** React 19, TypeScript, Zustand, CSS, Vitest, Testing Library, Electron Vite.

---

### Task 1: Add failing layout-contract tests

**Files:**

- Modify: `src/renderer/src/components/projection/__tests__/BiblePanel.test.tsx`
- Create: `src/renderer/src/screens/modes/__tests__/ProjectionPanelLayout.test.ts`

- [ ] Add assertions that Bible no longer renders “MINI ALKITAB”, the version selector shares the mode bar, and Cari/Browse/Manual each expose a `projection-bible-panel__mode-scroll` viewport.
- [ ] Add source-contract assertions that Song Info exposes `projection-song-panel__scroll--info` and Projection tabs no longer define or render `notifications`.
- [ ] Run the focused tests and verify they fail for the missing Bible structure and remaining Notifications tab.

### Task 2: Fix Song Info scrolling and remove Notifications

**Files:**

- Modify: `src/renderer/src/screens/modes/ProjectionMode.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/screens/modes/__tests__/ProjectionPanelLayout.test.ts`

- [ ] Remove the Notification import, tab type, unread selector, tab configuration, and render branch.
- [ ] Make the Song Info body a bounded scroll container with stable scrollbar gutter, visible thin scrollbar, and fixed action footer.
- [ ] Run the source-contract test and verify it passes.

### Task 3: Compact Bible header and add mode scrolling

**Files:**

- Modify: `src/renderer/src/components/projection/BiblePanel.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/components/projection/__tests__/BiblePanel.test.tsx`

- [ ] Remove the heading row and move the existing version selector into the Cari/Browse/Manual control bar.
- [ ] Wrap the Cari, Browse, and Manual content roots with the shared `projection-bible-panel__mode-scroll` class while retaining their internal functional regions.
- [ ] Ensure history remains isolated and action controls remain reachable at short heights.
- [ ] Run Bible tests and verify they pass.

### Task 4: Full verification

**Files:**

- Modify only if a scoped regression is found.

- [ ] Run focused tests, lint, typecheck, full tests, and `npm run build`.
- [ ] Verify Song Info, Cari, Browse, Manual, version selection, and absence of Notif directly in Electron at normal and constrained panel sizes.
- [ ] Confirm Timer behavior is unchanged.
