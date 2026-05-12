# Plan: Projection Mode Resizable Broadcast Console v9.1

**Date:** 2026-05-10
**Scope:** `ProjectionMode.tsx`, `LivePreviewPanel.tsx`, `main.css`
**Objective:** Dynamic dual-monitor layout with resizable split (vMix/OBS style) while preserving 16:9 confidence monitors and strict CUE vs PROGRAM state separation.

---

## Goals

### UX / Layout

- Provide **operator-controlled** resizable split between **PREVIEW (CUE)** and **PROGRAM (LIVE)** monitors.
- Default split ratio: **40% Preview / 60% Program**.
- Maintain **16:9** display area inside each monitor regardless of panel width.
- Add an elegant **drag handle** with “visual silence”:
  - Idle: subtle (low contrast)
  - Hover/drag: higher contrast + slight glow

### Broadcast Hierarchy

- Preview must read as **armed** (green accent, clear label).
- Program must read as **live / output** (red glow accent, stronger label).
- If projector is not detected, show **PROJECTOR LOST**:
  - Already in Title Bar
  - Add a badge on Program monitor frame/title bar.

### Focus Mode

- When `Ctrl+Shift+F` is active:
  - Hide Library/Playlist.
  - Monitors occupy ~90%+ of available height.
  - Transition must be **Framer Motion** based to avoid CSS grid/max-height glitches.

---

## Technical Approach

### Resizable Panels Library

- Use **`react-resizable-panels`**:
  - `PanelGroup` + `Panel` + `PanelResizeHandle`
  - Supports constraints (`minSize`, `maxSize`) and smooth drag.

### State & Persistence

- Persist panel sizes (percentage) in `localStorage` under key:
  - `sion:projection:monitorSplit`
- On mount:
  - Try to load stored layout; fallback to `[40, 60]`.

### Component Responsibilities

#### `LivePreviewPanel.tsx`

- Own the **horizontal resizable split** between Preview and Program monitors.
- Keep existing rendering logic (slides, theme, states), only refactor layout container.
- Add `isProjectorLost` prop to Program monitor to display badge.

#### `ProjectionMode.tsx`

- Keep top/mixer/bottom architecture.
- Focus mode should be implemented using **`AnimatePresence`** + `motion.section` for management panel.
  - Avoid relying on `grid-template-rows` transitions.

#### `main.css`

- Add handle styling:
  - `.monitor-resize-handle`
  - `.monitor-resize-handle__rail` (1px line)
  - hover/drag states with subtle glow.

---

## Rollout Plan

### Phase 1 Implementation Steps

1. Add dependency `react-resizable-panels`.
2. Refactor `LivePreviewPanel` to `PanelGroup` split with default `[40,60]` and persistence.
3. Add handle styling and active/hover affordance.
4. Update `ProjectionMode` focus mode management panel to Framer Motion transition.
5. Add Program-side **PROJECTOR LOST** badge when `displayCount <= 1`.
6. Validate:
   - CUE changes don’t affect PROGRAM until TAKE.
   - 16:9 stays correct at all widths.
   - `npm run typecheck` + `npm run lint` pass.

---

## Risks & Mitigations

- **Dependency not installed**: add to `package.json` and document `npm i` step.
- **Layout jitter on resize**: enforce `minSize` constraints and keep internal aspect container stable.
- **Focus mode animations**: use Framer Motion for mount/unmount and avoid CSS-only height tricks.

---

## Acceptance Checklist

- Drag handle works and resizes monitors.
- Default 40/60 applied on first run.
- Layout persists across reopen.
- 16:9 confidence monitor remains intact.
- Program shows PROJECTOR LOST badge when needed.
- Focus mode hides management section with smooth Framer Motion transition.
- Typecheck + lint pass.
