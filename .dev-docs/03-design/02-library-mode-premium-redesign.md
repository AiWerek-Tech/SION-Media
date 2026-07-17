---
description: Premium Library Mode redesign (design system + layout foundation)
status: implemented
---

> **Status:** ✅ IMPLEMENTED — Library Mode sudah di-redesign. Lihat `04-implementation/03-impl-library-mode-redesign.md`

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

- Top command bar (LibraryCommandBar).
- Main workspace split:
  - Left: `LibraryBrowserPanel` (sidebar + main content)
  - Right: existing `PlaylistPanel` kept as the queue workspace (hidden when Focus Mode enabled).

### Library Browser (Modular)

Folder: `src/renderer/src/components/library/`

- `LibraryBrowserPanel.tsx`
  - Resizable sidebar.
  - Pill tab navigation.
  - Animated tab transitions.
- `LibraryCommandBar.tsx`
  - Global search entry (opens CommandPalette).
  - Hymnal selector.
  - Theme toggle + Focus mode toggle.
- `LibrarySidebar.tsx`
  - Modern hymnal selector (dropdown, glass panel).
  - Search with debounce.
  - Sections: Search / Recent / Favorites.
  - Relative time indicator for recents.
  - Collapsible + compact mode.
  - Pinned hymnals (stored in localStorage).
- `LibraryNumberView.tsx`
  - Premium number grid cell styling.
  - Jump-to-number overlay (`/` shortcut).
  - Hover preview.
  - Virtualized grid rows.
  - Keyboard navigation (arrow keys + Enter).
  - Compact mode toggle.
- `LibraryTitleView.tsx`
  - Virtualized modern card/list hybrid.
  - Smooth hover actions.
  - Sort modes.
- `LibraryPlaylistWorkspace.tsx`
  - Centerpiece playlist workspace driven by `usePlaylistStore`.
  - Drag-drop reorder, sections, export, clear.
  - Uses existing `PlaylistItemCard` for consistent queue styling.
- `SongContextMenu.tsx`
  - Contextual menu overlay used in Title view.
- `LibraryLyricsViewer.tsx` (NEW)
  - Full-screen lyrics viewer overlay.
  - Stanza-based pagination (1 bait per page, Reff combined with each verse).
  - Next/Previous song navigation buttons.
  - Keyboard navigation: ArrowDown/PageDown (next), ArrowUp/PageUp (prev).
  - Dot navigation on right side for quick stanza jump.
  - Progress indicator: `1/3` (current stanza / total stanzas).
  - Key & Time Signature badge (e.g., `Eb 3/4`).
  - Immersive fullscreen mode (F11 or icon button).
  - TitleBar auto-hides in fullscreen mode.

## Next steps

- Improve Top Command Bar quick actions beyond baseline (history, pin management, playlist shortcuts).
- Expand contextual menu actions (pin song, open details, copy lyrics).
- Performance profiling (React Profiler) for library views under large datasets.
- Accessibility pass (aria labels already started; expand to proper roles + focus order).

## Notes

- The existing `PlaylistPanel` on the right is intentionally retained as per UI requirement.
