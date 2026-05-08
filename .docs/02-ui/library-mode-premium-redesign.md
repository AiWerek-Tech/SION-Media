---
description: Premium Library Mode redesign (design system + layout foundation)
---

# Library Mode — Premium Redesign

## Goals

- Move Library Mode toward a premium desktop operator console aesthetic (ProPresenter / Spotify Desktop / Notion-level spacing).
- Establish a reusable design language (glassmorphism, layered surfaces, subtle borders, soft shadows).
- Improve hierarchy, spacing, and interaction states.
- Keep performance in mind (virtualization where needed).

## What changed

### Design System & Tokens

File: `src/renderer/src/assets/main.css`

- Added/expanded premium tokens:
  - Layered surfaces (`--color-surface-*`)
  - Glass surfaces (`--color-glass-*`)
  - Premium shadows & glows (`--shadow-*`)
  - Easing tokens for smoother motion
- Added utility classes used as a light-weight design system:
  - `.glass-panel`, `.glass-panel-strong`
  - `.surface-*`
  - `.pill-tabs` / `.pill-tab` / `.pill-tab-active`
  - `.btn-premium*`
  - `.number-cell*`
  - `.scrollbar-thin`

### Library Layout

File: `src/renderer/src/screens/modes/LibraryMode.tsx`

- Top command bar shell.
- Main workspace split:
  - Left: `LibraryBrowserPanel` (sidebar + main content)
  - Right: existing `PlaylistPanel` kept as the queue workspace.

### Library Browser (Modular)

Folder: `src/renderer/src/components/library/`

- `LibraryBrowserPanel.tsx`
  - Resizable sidebar.
  - Pill tab navigation.
  - Animated tab transitions.
- `LibrarySidebar.tsx`
  - Modern hymnal selector (dropdown, glass panel).
  - Search with debounce.
  - Sections: Search / Recent / Favorites.
  - Relative time indicator for recents.
- `LibraryNumberView.tsx`
  - Premium number grid cell styling.
  - Jump-to-number overlay (`/` shortcut).
  - Hover preview.
- `LibraryTitleView.tsx`
  - Virtualized modern card/list hybrid.
  - Smooth hover actions.
  - Sort modes.
- `LibraryPlaylistView.tsx`
  - “Playlist workspace” style grouping baseline (category groups and song cards).

## Next steps

- Add a true **Top Command Bar** with:
  - Global search (also usable in other modes)
  - Quick actions + theme toggle
  - Breadcrumb / view title
- Integrate playlist queue state into the center `Playlist` tab (so center view becomes the true centerpiece).
- Add keyboard navigation across the number grid and title list.
- Accessibility pass (focus rings, aria labels for icon-only buttons).

## Notes

- The existing `PlaylistPanel` on the right is intentionally retained as per UI requirement.
