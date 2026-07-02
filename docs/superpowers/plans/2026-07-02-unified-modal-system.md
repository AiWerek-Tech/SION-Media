# Unified Modal System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace clipped and inconsistent Electron dialogs with one portal-based modal system while preserving all business behavior.

**Architecture:** Extend the existing shared `Modal` into a controlled-or-store-driven portal primitive. Move playlist dialogs onto that primitive, then enforce one CSS geometry contract for shared and legacy modal consumers.

**Tech Stack:** React 19 portals, TypeScript, Framer Motion, Vitest, Testing Library, Electron/Vite, CSS.

---

### Task 1: Portal and interaction contract

**Files:**

- Modify: `src/renderer/src/components/modals/Modal.tsx`
- Create: `src/renderer/src/components/modals/__tests__/Modal.test.tsx`

- [x] Write failing tests for body-level portal mounting, a controlled close callback, Escape, dismissible backdrop, focus containment, and focus restoration.
- [x] Run the focused test and confirm it fails against the current non-portal component.
- [x] Implement `createPortal`, controlled `onClose`, dialog-layer semantics, scroll locking, and focus containment.
- [x] Run the focused test and confirm it passes.

### Task 2: Unified modal geometry

**Files:**

- Modify: `src/renderer/src/assets/main.css`

- [x] Define a single overlay, viewport, surface, header, body, footer, form-control, and responsive contract.
- [x] Add compatible sizing for direct legacy `.sp-modal-overlay > .sp-modal` consumers.
- [x] Preserve theme tokens and danger variants.

### Task 3: Playlist dialog migration

**Files:**

- Modify: `src/renderer/src/components/PlaylistPanel.tsx`
- Modify: `src/renderer/src/components/library/LibraryPlaylistWorkspace.tsx`
- Modify: `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`
- Create: `src/renderer/src/components/__tests__/PlaylistPanel.modal.test.tsx`

- [x] Write a failing structural test proving playlist dialogs mount through the shared body-level dialog system.
- [x] Replace local fixed/absolute overlays with controlled shared `Modal` instances.
- [x] Retain creation, loading, cancellation, validation, and scheduling behavior.
- [x] Run focused tests and confirm they pass.

### Task 4: Verification

**Files:**

- Verify all modified files.

- [x] Format and lint modified files with zero errors.
- [x] Run all tests.
- [x] Run node and renderer typechecks.
- [x] Run the production build.
- [x] Perform visual QA for the supplied clipped-playlist case and remove temporary QA artifacts.
