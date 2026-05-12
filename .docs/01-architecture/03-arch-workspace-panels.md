# SION Media Workspace Architecture

> Documented: May 10, 2026
> Status: Production-ready

## Overview

SION Media implements a **suite-class desktop workspace architecture** with professional-grade panel resizing, adaptive density, and polished scroll interactions. This document covers the architectural decisions and implementation details.

---

## 1. Resizable Panels System

### Architecture

The resizable panel system is built on `react-resizable-panels` with a custom design-system wrapper that provides:

- **Persistent layouts** via Zustand + localStorage
- **Intelligent constraints** (min/max sizes per workspace)
- **Debounced saves** (200ms) to avoid excessive writes
- **Subtle resize handles** with design-system aesthetics

### Key Files

| File                                                            | Purpose                                           |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `src/renderer/src/store/usePanelLayoutStore.ts`                 | Zustand store for panel size persistence          |
| `src/renderer/src/components/design-system/ResizablePanels.tsx` | `ResizablePanels` and `TwoPanelLayout` components |
| `src/renderer/src/components/design-system/ResizeHandle.tsx`    | Subtle, accessible resize handle                  |

### Usage Pattern

```tsx
<TwoPanelLayout
  layoutKey="managementMain"
  className="h-full min-h-0"
  leftClassName="min-w-0 min-h-0"
  rightClassName="min-w-0 min-h-0"
  left={<SongListPanel />}
  right={<DetailPanel />}
/>
```

### Persistence Schema

```typescript
// localStorage key: 'sion-panel-layout'
{
  sizes: {
    projectionBottom: [50, 50],      // SongLibrary | Playlist
    dashboardBottom: [50, 50],       // SongLibrary | Playlist
    managementMain: [40, 60]         // SongList | Detail
  }
}
```

### Constraints

| Workspace      | Panel        | Default | Min | Max |
| -------------- | ------------ | ------- | --- | --- |
| ProjectionMode | Bottom Left  | 50%     | 25% | 75% |
| ProjectionMode | Bottom Right | 50%     | 25% | 75% |
| Dashboard      | Bottom Left  | 50%     | 25% | 75% |
| Dashboard      | Bottom Right | 50%     | 25% | 75% |
| ManagementMode | Main Left    | 40%     | 25% | 60% |
| ManagementMode | Main Right   | 60%     | 40% | 75% |

---

## 2. Adaptive Density System

### Philosophy

Desktop workspaces face **multi-dimensional pressure**:

- Width compression (panel resize)
- Height compression (split workspace)
- Dynamic runtime layout changes

SION uses **container queries** (`@container`) for precise, component-level responsiveness rather than viewport-based breakpoints.

### Container Query Architecture

```css
/* List panel becomes a container */
.management-list-panel {
  container-type: inline-size;
  container-name: list;
}

/* Inspector panel supports height-based queries */
.management-inspector-panel {
  container-type: size;
  container-name: inspector;
}
```

### Adaptive Behaviors

#### List Panel Compression (`@container (max-width: 520px)`)

| Element                             | Behavior                    |
| ----------------------------------- | --------------------------- |
| Secondary metadata (category, date) | Hidden                      |
| Row actions                         | Always visible (opacity: 1) |
| Title typography                    | Reduced to 13px             |
| Number badge                        | Compact (20px)              |

#### Inspector Panel Compression

| Query                           | Effect                              |
| ------------------------------- | ----------------------------------- |
| `@container (max-width: 520px)` | Title 16px, subtitle hidden         |
| `@container (max-width: 400px)` | Lyrics font 10.5px, reduced padding |

---

## 3. Nested Scroll Harmony

### Problem

Nested scroll regions in desktop apps often suffer from:

- **Scroll chaining** (unwanted propagation)
- **Scroll fight** (competing scroll targets)
- **Janky resize** (scrollbar appearance/disappearance)

### Solution Architecture

```
┌─────────────────────────────────────┐
│  Inspector Panel (container)        │
│  ┌───────────────────────────────┐  │
│  │ Sticky Header                 │  │ ← position: sticky
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Inspector Body                │  │ ← Primary scroll region
│  │ (overflow-y: auto)            │  │   overscroll-behavior: contain
│  │  ┌─────────────────────────┐  │  │
│  │  │ Lyrics Preview          │  │  │ ← Secondary scroll region
│  │  │ (max-height: adaptive)  │  │  │   overscroll-behavior: contain
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Implementation

```css
/* Primary scroll container */
.management-inspector-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

/* Secondary scroll region */
.management-lyrics-content {
  max-height: 340px;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}
```

---

## 4. Adaptive Max-Height (Container Queries)

### Height-Based Responsiveness

The lyrics preview adapts its max-height based on **container height**, not viewport:

```css
/* Default */
.management-lyrics-content {
  max-height: 340px;
}

/* Compressed inspector */
@container (max-height: 600px) {
  .management-lyrics-content {
    max-height: 200px;
  }
}

/* Severely compressed */
@container (max-height: 450px) {
  .management-lyrics-content {
    max-height: 120px;
  }
}
```

### Why Height-Based Queries?

Desktop workspaces face **vertical pressure** from:

- Split panel layouts
- Dynamic inspector content
- Runtime state changes

Height-based container queries provide **suite-class** adaptivity vs. fixed max-height.

---

## 5. Scroll Shadows & Edge Awareness

### Purpose

Visual indicators that content extends beyond visible area, providing **edge awareness** for professional feel.

### Implementation

```css
/* Shadow pseudo-elements */
.management-lyrics-scroll-wrapper::before,
.management-lyrics-scroll-wrapper::after {
  content: '';
  position: absolute;
  height: 24px;
  background: linear-gradient(...);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-premium);
}

/* Show when scrollable */
.management-lyrics-scroll-wrapper.has-scroll::before,
.management-lyrics-scroll-wrapper.has-scroll::after {
  opacity: 1;
}
```

### JS Detection

```typescript
// ResizeObserver detects scrollable state
useEffect(() => {
  const el = lyricsScrollRef.current
  if (!el) return

  const checkScroll = () => {
    const content = el.querySelector('.management-lyrics-content')
    if (content) {
      setLyricsHasScroll(content.scrollHeight > content.clientHeight)
    }
  }

  checkScroll()
  const ro = new ResizeObserver(checkScroll)
  ro.observe(el)
  return () => ro.disconnect()
}, [selectedSong])
```

---

## 6. Sticky Interaction Zones

### Purpose

Keep critical controls accessible during scroll, enabling **continuous workflow**.

### Implementation

```css
/* Inspector header stays fixed */
.management-inspector-panel > .flex-1 > .shrink-0 {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(12px);
}
```

### Future Scalability

The sticky architecture supports future inspector evolution:

- Metadata workspace
- Contextual controls
- Quick edit panel
- Live state inspector

---

## 7. Overflow Resilience

### Typography Safeguards

```css
/* Long metadata values */
.management-inspector-panel .truncate {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Long titles */
.management-inspector-title {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
```

---

## 8. Resize Stress Stability

### Problem

Rapid panel resizing can cause:

- Content flashing
- Layout thrashing
- Scrollbar jitter
- Visual instability

### Solution Stack

```css
/* Prevent scrollbar jitter */
.management-list-panel,
.management-inspector-body {
  scrollbar-gutter: stable;
}

/* Prevent content flashing */
.management-inspector-panel,
.management-list-panel {
  will-change: auto;
  contain: layout style;
}

/* GPU-accelerated smoothness */
.management-inspector-body,
.management-lyrics-content {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

---

## 9. Semantic Class Structure

### Purpose

Semantic classes enable **targeted CSS adjustments** without brittle selectors.

| Class                               | Purpose                     |
| ----------------------------------- | --------------------------- |
| `.management-list-panel`            | Song list container         |
| `.management-inspector-panel`       | Detail panel container      |
| `.management-row`                   | Virtualized song row        |
| `.secondary-meta`                   | Category, date metadata     |
| `.row-actions`                      | Action buttons              |
| `.management-inspector-body`        | Primary scroll region       |
| `.management-inspector-title`       | Song title                  |
| `.management-inspector-subtitle`    | Alternate title             |
| `.management-inspector-actions`     | Action button zone          |
| `.management-lyrics-preview`        | Lyrics card container       |
| `.management-lyrics-scroll-wrapper` | Scroll wrapper with shadows |
| `.management-lyrics-content`        | Actual lyrics content       |

---

## 10. Applied Modes

### ProjectionMode

- Two-panel bottom layout (SongLibrary | Playlist)
- Persisted resize split
- Responsive desktop detection

### Dashboard

- Two-panel bottom layout (SongLibrary | Playlist)
- Persisted resize split
- Consistent with ProjectionMode

### ManagementMode

- Two-panel main layout (SongList | Detail)
- Full adaptive density system
- Nested scroll harmony
- Scroll shadows
- Sticky inspector header
- Overflow resilience

---

## Quality Indicators

This architecture delivers:

- **Visual identity** — consistent design language
- **Interaction identity** — predictable, professional behavior
- **Workspace architecture** — scalable panel system
- **Adaptive behavior** — container-query responsiveness
- **Desktop-class resizing** — stable, smooth, persistent
- **Compression hierarchy** — graceful degradation
- **Motion language** — consistent transitions
- **Scroll language** — harmonious nested scrolling

---

## Next Phase: Workflow Architecture

With visual and adaptive foundations mature, the next focus area is:

### Projection / Live Workflow Architecture

- Preview vs Program architecture
- Live transition flow
- Active/Live/Next hierarchy
- Keyboard projection workflow
- Operator state visibility
- Confidence monitor feel
- Runtime interaction polish

This will differentiate SION from "song apps" to **professional presentation suite**.
