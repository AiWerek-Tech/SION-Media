# SION Media — Library Mode UI/UX Audit & Refactor

**Date:** 2026-05-09
**Context:** Audit of `LibraryModeRedesigned` and related components, referencing best practices and `play.lagusion.org` layouts.

## 1. Initial State & Findings

### Disorientation in Master-Detail View

- **Issue:** `LyricStudioLite` was configured as an absolute overlay (`absolute inset-0`). When a song was clicked, it covered the entire list or shifted the list orientation incorrectly.
- **Lagusion Reference:** `play.lagusion.org` places the lyric preview (detail panel) on the **right side** in a clean split-view, maintaining the user's spatial orientation.
- **Fix:** Refactored `LibraryBrowserPanel.tsx` to use a true flex split-view. `LyricStudioLite` now renders in a fixed-width (`400px`) container on the right side with a `framer-motion` slide-in animation.

### Redundant Top Bars & Dead UI

- **Issue:** The Library mode had **three** stacked horizontal bars:
  1. Top Command Bar (52px)
  2. Hymnal Sidebar (52px)
  3. Tabs Bar (52px)
     This wasted ~156px of vertical screen real estate.
- **Issue:** `MultiHymnalSidebar` contained dummy Grid/List buttons with no `onClick` handlers and a duplicate search bar.
- **Fix:**
  - Renamed `MultiHymnalSidebar` to `HymnalTopBar`.
  - Stripped out all dummy UI and duplicate search inputs.
  - Combined the Top Command Bar, Hymnal Dropdown, and Navigation Tabs into a **Single Unified Top Bar** (56px) in `LibraryModeRedesigned.tsx`.
  - Reclaimed ~104px of vertical height for the main content list.

### Global Theme Synchronization

- **Issue:** The theme toggle in Library Mode only updated a local React state and `localStorage`, causing desynchronization if the user switched to Projection Mode or Settings.
- **Fix:** Bound the Theme toggle directly to `useModeStore` (`theme` and `setTheme`), ensuring cross-application consistency.

### Hover Card Clipping

- **Issue:** In `LibraryNumberView`, the rich hover preview card popped downwards. When hovering over songs at the bottom of the list, the card would clip off-screen.
- **Fix:** Updated the CSS positioning to pop the card **upwards** (`bottom-[100%] mb-2`), ensuring visibility for the most frequently accessed bottom-edge items.

### Codebase Cleanliness

- **Issue:** `WelcomeModeSelector.tsx` was an orphan file superseded by the multi-phase `WelcomeScreen.tsx`.
- **Fix:** Safely removed the dead file via terminal.

## 2. Technical Implementation Details

- Lifted `activeTab` state out of `LibraryBrowserPanel` into `LibraryModeRedesigned` to handle global tab switching from the unified top bar.
- Removed arbitrary `h-[52px]` constraints from child components to let the parent layout dictate spacing.
- Preserved `framer-motion` AnimatePresence for all tab transitions and sliding panels.
