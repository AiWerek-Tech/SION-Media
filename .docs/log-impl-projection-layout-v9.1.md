# Log: Projection Mode Resizable Layout v9.1

**Date:** 2026-05-10

---

## Summary
Implemented a **Resizable Dual-Monitor** split (Preview ↔ Program) inspired by vMix/OBS using `react-resizable-panels`, while preserving **16:9 confidence monitors**, the **TAKE workflow**, and focus-mode behavior.

---

## Changes

### `LivePreviewPanel.tsx`
- Replaced the fixed `grid-cols-[40%_60%]` layout with `PanelGroup` + `Panel` + `PanelResizeHandle`.
- Default sizes:
  - Preview: `40%`
  - Program: `60%`
- Persistence:
  - Uses `PanelGroup` `autoSaveId="sion:projection:monitorSplit"`.
- Added an elegant center handle with a thin rail and hover/drag affordance.
- Added **PROJECTOR LOST** badge on Program monitor when `displayCount <= 1`.

### `ProjectionMode.tsx`
- Focus Mode behavior updated to ensure monitor area expands naturally:
  - Management section is conditionally rendered with Framer Motion so it animates out.
  - The main layout no longer relies on `grid-template-rows` switching to hide the bottom.

### `main.css`
- Added styles for the monitor resize handle:
  - `.monitor-resize-handle`
  - Hover + dragging states
- Adjusted `.projection-layout` to use an `auto` third row so that when management is hidden, monitors can occupy ~90%+ of the screen.

---

## Validation Checklist
- Operator can drag resize handle to adjust Preview/Program widths.
- 16:9 confidence area remains intact (aspect container unchanged).
- Cue selection affects Preview only; Program changes only via TAKE / live nav.
- Projector lost warning visible in Title Bar (existing) and Program monitor (new).
- `npm run typecheck` and `npm run lint` should pass.
