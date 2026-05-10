# Plan: Projection Mode Modernization v9
## Professional Worship Multimedia Production Console

**Date:** 2026-05-10
**Scope:** `ProjectionMode.tsx`, `LivePreviewPanel.tsx`, `ControlBar.tsx`, `main.css`
**Target:** vMix / OBS / ProPresenter-grade broadcast console aesthetic

---

## Phase 0 — Audit Findings

### A. Hierarchy & Layout Issues
1. **Border Overload:** `ProjectionMode` uses `border-b`, `border-y`, `border-r` on every section. This creates a "boxed admin panel" feel rather than a seamless console.
2. **Weak Depth Layering:** Monitor section background (`preview-section-bg`) is okay but monitor frames themselves rely on heavy border colors (`borderColor: color-mix(...)`) which feel cheap.
3. **ControlBar Visual Weight:** The mixer bar is 70px tall but feels like a toolbar, not a broadcast transition panel. Cue/Program info blocks use hard borders.
4. **Focus Mode Transition:** The bottom panel is simply removed from the DOM. No animation means a jarring layout shift.

### B. State & Functionality Audit
| Requirement | Status | Notes |
|-------------|--------|-------|
| Cue vs Program separation | **PASS** | `slides` / `programSlides` split exists in `useProjectionStore.ts` |
| SPACE → TAKE | **PASS** | Handled in `App.tsx` keyboard handler |
| Arrow/Page Nav on LIVE | **PASS** | `nextSlide()` / `prevSlide()` correctly guard on `LIVE`/`FREEZE` |
| Shortcut typing guard | **PASS** | `isTyping` check in `App.tsx` handler |
| Confidence Monitor 16:9 | **PASS** | `aspect-video` container + `object-contain` standby logic exists |
| Virtualization | **PASS** | `@tanstack/react-virtual` used in `SongLibraryPanel.tsx` |
| PROJECTOR LOST badge | **PASS** | `TitleBarStatus.tsx` shows red badge when `displayCount <= 1` |
| Zebra striping | **PASS** | `SongCard.tsx` and `PlaylistItemCard.tsx` implement `index % 2` logic |
| Action affordance (20% → 100%) | **PASS** | `opacity-20 group-hover:opacity-100` on action groups |

### C. Identified Gaps
1. **Focus Mode Glitch:** `isFocusMode` toggles a grid row count change instantly. Needs CSS transition/animation for height.
2. **Monitor Frame Glow Inconsistency:** Live glow is conditional but the preview monitor has no "active cue" glow state.
3. **Take Button Dominance:** While the `.take-button` has `takeGlow`, it is surrounded by clutter. Needs a cleaner, wider mixer context.
4. **Missing CSS Animation for Focus Mode:** No transition on the bottom panel collapse.
5. **Subtle Border Token Abuse:** Some borders are still `rgba(255,255,255,0.08)` which is too visible for a premium dark surface.

---

## Phase 1 — Implementation Plan

### 1.1 `ProjectionMode.tsx` — Layout Architecture
- **Goal:** Top-Bottom split with seamless depth.
- **Changes:**
  - Remove all explicit section borders (`border-b`, `border-y`, `border-r`). Replace with **inset shadows** and **surface color shifts**.
  - Monitor section: keep 40/60 ratio inside `LivePreviewPanel`, but make the outer wrapper use a deep surface (`surface-1`) with a subtle top-down gradient.
  - Mixer section: shrink to a compact, **glassmorphic bar** (`backdrop-blur(12px)`) with no hard top/bottom borders. Use a `box-shadow` to lift it above the lower panel.
  - Management section: keep the `grid-cols-[45%_55%]` but remove the vertical border. Use a `gap-px` with background color as the divider, or use `shadow-[inset_...]` for separation.
  - Focus mode: wrap the bottom section in a `motion.div` or CSS transition so height collapse is animated over `300ms`.

### 1.2 `LivePreviewPanel.tsx` — Broadcast Monitors
- **Goal:** Eliminate border overload on monitors; replace with glow depth.
- **Changes:**
  - `MonitorFrame` wrapper: remove the `border` on the outer frame. Use `box-shadow` colored by monitor mode for separation.
  - Title bar of each monitor: replace `border border-white/[0.06]` with a subtle bottom divider (`bg-white/[0.04]` + bottom shadow).
  - Live state: strengthen the glow. Use a CSS variable-driven pulse for the frame border shadow.
  - Preview state: when a cue is loaded, add a faint green ambient glow (`shadow-glow-green` at low opacity) to signal "armed".
  - Empty state: keep `SION MEDIA` logo but make it slightly more refined (reduce opacity to 12%, increase letter-spacing).
  - Confidence monitor `16:9` badge: keep it but style with monospace and a pill shape.

### 1.3 `ControlBar.tsx` — Professional Mixer Bar
- **Goal:** Center-focused TAKE with cleaner surrounding context.
- **Changes:**
  - Restructure grid to give the center TAKE group more visual isolation.
  - Cue/Program info: convert from bordered boxes to **glass pills** with no border, using background tints (`bg-preview/8`, `bg-program/8`) and left-colored edge indicators (`border-l-2`).
  - Fade speed buttons: replace bordered container with a unified **segmented control** look (single rounded pill background, active slot highlighted).
  - State buttons (Black/Freeze/Clear): unify into a **button group** with shared background and subtle separators instead of individual borders.
  - TAKE button: keep existing gradient and `takeGlow`, but increase its horizontal padding and ensure it sits in a visually "raised" center zone.

### 1.4 `main.css` — Token & Component Updates
- **Additions:**
  - `.monitor-frame` — base broadcast monitor styling (no border, shadow-driven).
  - `.monitor-frame--live` — red ambient glow pulse.
  - `.monitor-frame--preview` — green ambient glow (armed state).
  - `.mixer-bar` — glassmorphism 2.0 mixin for the transition area.
  - `.segmented-control` — unified button group for fade speeds.
  - Focus mode transition utility `.focus-transition { transition: grid-template-rows 0.35s var(--ease-premium), opacity 0.3s ease; }`.
  - Ensure `EffectiveTheme` tokens (Light/Dark/System) already present are consistent. Add missing `--color-glass-bg` and `--color-glass-border` overrides if needed.

### 1.5 Keyboard & Focus Mode Hardening
- Verify `App.tsx` shortcuts remain intact.
- Add `focus-visible` rings to TAKE and state buttons for accessibility.
- In `ProjectionMode`, apply `AnimatePresence` or CSS grid transition so focus mode toggles smoothly.

---

## Phase 2 — Log Structure
After implementation, document in `log-impl-projection-modernization-v9.md`:
1. Visual diff summary (before/after mental model).
2. New CSS tokens and utilities added.
3. Component prop/state changes (none expected for stores).
4. Animation & transition specifications.
5. Acceptance criteria checklist.
