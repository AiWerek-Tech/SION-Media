# Log: Projection Mode Modernization v9
## Professional Broadcast Console UI

**Date:** 2026-05-10

---

## Summary
Projection mode UI has been refactored to a **broadcast-console** layout with reduced border noise and clearer **PROGRAM ↔ PREVIEW ↔ TAKE** hierarchy.

---

## Visual / Layout Changes

### 1) `ProjectionMode.tsx`
- Layout now relies on `.projection-layout` (CSS grid) with stable rows:
  - `Monitor` (top)
  - `Mixer Bar` (middle)
  - `Management` (bottom)
- Focus mode (`Ctrl+Shift+F`) now collapses the bottom row by switching to `.projection-layout--focus` (smooth transition on `grid-template-rows`).
- Removed hard borders between major sections (no more `border-b`, `border-y`, `border-r` in the mode container). Separation is now achieved via:
  - Surface/background gradients
  - Shadows and subtle ring (`ring-1 ring-brand-primary/10`) in focus mode

### 2) `LivePreviewPanel.tsx`
- Monitor frames refactored to **borderless, glow-driven** "broadcast monitors":
  - Wrapper uses `.monitor-frame` plus mode modifiers:
    - `.monitor-frame--preview` (green ambient separation)
    - `.monitor-frame--program` (red ambient separation)
    - `.monitor-frame--live` (pulsing live glow)
- Title bars use `.monitor-title-bar` with glass-like subtle divider.
- Confidence monitor stays accurate `16:9`:
  - Standby uses `backgroundSize: contain` when configured and lyrics are not showing.

### 3) `ControlBar.tsx`
- Restructured into a mixer-style bar:
  - Cue status uses `.info-pill.info-pill--preview`
  - Program status uses `.info-pill.info-pill--program`
  - Fade speeds use `.segmented-control` + `.segmented-control__item(--active)`
  - Black/Freeze/Clear and cue nav use `.state-btn-group` + `.state-btn` (reduces per-button border noise)
  - TAKE sits inside `.mixer-center-well` (raised center zone)

---

## CSS Tokens / Utilities Added (`main.css`)

### Broadcast Console v9
- **Monitor**
  - `.monitor-frame`, `.monitor-frame--preview`, `.monitor-frame--program`, `.monitor-frame--live`
  - `@keyframes monitorLivePulse`
  - `.monitor-title-bar`

- **Mixer Bar**
  - `.mixer-bar` (glassmorphism 2.0)
  - `.mixer-center-well`

- **Controls**
  - `.info-pill`, `.info-pill--preview`, `.info-pill--program`
  - `.segmented-control`, `.segmented-control__item`, `.segmented-control__item--active`
  - `.state-btn-group`, `.state-btn`, `.state-btn--danger-active`, `.state-btn--warn-active`

- **Focus / Layout**
  - `.projection-layout`, `.projection-layout--focus` (grid row transition)

Light theme overrides were added for `.mixer-bar`, `.info-pill`, `.segmented-control`, `.state-btn-group`, and `.mixer-center-well`.

---

## State & Workflow Validation

### Cue vs Program Separation
- No store changes were required.
- Existing `useProjectionStore` separation remains:
  - `slides` / `currentSlideIndex` = CUE deck (preview)
  - `programSlides` / `programSlideIndex` = LIVE deck
  - `takeCue()` is the only path that moves cue → program.

### Keyboard-first Workflow
- `App.tsx` typing guard hardened:
  - Shortcuts are ignored when focus is in `INPUT`, `TEXTAREA`, `SELECT`, or `contentEditable`, or when element role is `textbox`/`searchbox`.
- Existing mappings remain:
  - `SPACE` → TAKE
  - `RIGHT/PAGE DOWN` & `LEFT/PAGE UP` → live navigation

### Multi-display Detection
- TitleBar already exposes `PROJECTOR LOST` badge when `displayCount <= 1`.

---

## Acceptance Checklist
- UI feels like broadcast console: **Improved** (border reduction + glass mixer + monitor dominance).
- TAKE workflow: **Preserved** (no change to store logic).
- SQLite FTS5 search: **Unaffected** (virtualized list remains).
- Focus mode: **Improved** (grid row transition; avoids DOM removal jump).
