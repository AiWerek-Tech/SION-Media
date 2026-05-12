# UI Modernization Plan — Premium Visual System (Modern Enterprise Web App)

## Goals

- Premium, clean, depth-aware “Professional Broadcast Console” aesthetic for Electron renderer
- Maintain high information density (dense but breathable)
- Strict 4px base grid spacing discipline
- Typography system: Poppins (headings) + Inter (UI/body), min font size 12px
- Dark glassmorphism surfaces + subtle borders
- Micro-interactions: 0.2s transitions, premium bezier `[0.22, 1, 0.36, 1]`, staggered list entrance

## Design System Decisions

- Color tokens are defined in `src/renderer/src/assets/main.css` using `@theme` variables.
- Depth layering model (L1–L4):
  - L1: Base background
  - L2: Surface panels (glass)
  - L3: Elevated cards/rows
  - L4: Active/Live states with soft glow

## Phase 1 — Implementation Milestones

1. Global styling foundations
   - Align tokens to required base/surface/elevated palette
   - Ensure focus rings and borders use subtle rgba whites (0.06 / 0.08 / 0.12)
   - Normalize 4px grid spacing usage across key UI containers (lists, cards, toolbars)
   - Apply typography architecture consistently (heading vs UI text)

2. Core UI primitives
   - Card system: rounded-xl (12px), subtle border, elevation + hover scaling
   - Dense list rows: zebra striping, compact padding, consistent row height
   - Action affordance: icon actions default 20% opacity; hover/focus 100% with smooth transitions
   - Glass panels: title bar, dropdown, primary side panels use backdrop blur (10px) + translucent background

3. High-impact screen refactors
   - Library song list (`SongCard`) redesign with thumbnails (abstract gradients + number)
   - Playlist list (`PlaylistItemCard`) modernization (consistent density, active/live glow)
   - Control bar “Take” button dominant center-focused with pulsing glow
   - Focus Live Mode: verify management panels remain hideable and program monitor remains dominant

4. Motion & interaction
   - Staggered animation on list mount (Framer Motion)
   - Hover scaling: `hover:scale-[1.02]` on interactive cards/rows
   - Transition curves: unify to `[0.22, 1, 0.36, 1]` where applicable

## Phase 2 — Documentation

- Create `/.docs/log-impl-ui-modernization.md` entries for:
  - Token changes
  - Component refactors (SongCard, PlaylistItemCard, TitleBar/Dropdown, ControlBar Take)
  - Motion rules and interaction standards
