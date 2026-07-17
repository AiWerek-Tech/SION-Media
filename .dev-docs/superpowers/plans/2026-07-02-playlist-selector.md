# Playlist Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every saved playlist discoverable and selectable directly from the playlist panel header.

**Architecture:** Add a focused `PlaylistSelector` component that owns its dropdown interaction while the existing playlist store remains the source of truth. Replace the passive title and ambiguous folder action with the selector; retain the full modal as an empty-state fallback.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Selector behavior

**Files:**

- Create: `src/renderer/src/components/playlist/PlaylistSelector.tsx`
- Create: `src/renderer/src/components/playlist/__tests__/PlaylistSelector.test.tsx`

- [x] Write failing tests for listing all playlists, active state, selection, creation, Escape, and click-outside behavior.
- [x] Run the focused test and confirm it fails because the component does not exist.
- [x] Implement the accessible controlled dropdown.
- [x] Run the focused test and confirm it passes.

### Task 2: Panel integration and styling

**Files:**

- Modify: `src/renderer/src/components/PlaylistPanel.tsx`
- Modify: `src/renderer/src/assets/main.css`

- [x] Replace the passive title block with the selector and remove the ambiguous header folder action.
- [x] Connect playlist selection to the existing load workflow.
- [x] Add Electron-safe dropdown geometry, scrolling, active state, and responsive rules.

### Task 3: Verification

**Files:**

- Verify all modified files.

- [x] Run focused and full tests.
- [x] Run lint, typecheck, and production build.
- [x] Verify playlist switching in Electron without modifying playlist contents.
