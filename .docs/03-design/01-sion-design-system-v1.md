# SION Design System v1

**Product**: SION Media (Electron Desktop)
**Stack**: Electron + React + TailwindCSS v4
**Date**: 2026-05-10
**Status**: Active / In Use

---

## 1. Design Principles

### 1.1 Layering over Borders

Use surface contrast, elevation shadows, and opacity layers instead of hard borders. When borders are necessary, keep them at very low opacity (`white/5`–`white/10`).

### 1.2 Depth System

All surfaces exist on a depth scale (0–5). Higher depth = more elevation shadow + slightly lighter surface. Never mix arbitrary shadows.

### 1.3 Typography Hierarchy

Visual hierarchy must be scannable from normal viewing distance. Use size + weight + color, not uppercase alone.

### 1.4 Motion Feel

- Duration: 150–200ms for micro-interactions
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (premium ease-out)
- Active press: `scale-[0.98]`
- No flashy/neon/gaming effects

### 1.5 Spacing Rhythm

8pt grid system. Key values:

- Panel padding: 24px
- Input gap: 16px
- Section gap: 28–36px
- Internal card padding: 20–24px

---

## 2. Tokens Reference

### 2.1 Colors

| Token                     | Dark Value | Usage                        |
| ------------------------- | ---------- | ---------------------------- |
| `--color-bg-base`         | `#0d0f17`  | Root background              |
| `--color-bg-surface`      | `#151826`  | Panels, cards                |
| `--color-bg-elevated`     | `#1b2031`  | Hover states, elevated items |
| `--color-text-primary`    | `#f8fafc`  | Primary text                 |
| `--color-text-secondary`  | `#94a3b8`  | Secondary text               |
| `--color-text-muted`      | `#64748b`  | Muted text                   |
| `--color-text-disabled`   | `#475569`  | Disabled text                |
| `--color-brand-primary`   | `#3b82f6`  | Primary accent               |
| `--color-brand-secondary` | `#8b5cf6`  | Secondary accent             |
| `--color-status-success`  | `#10b981`  | Success states               |
| `--color-status-error`    | `#ef4444`  | Error states                 |
| `--color-status-warning`  | `#f59e0b`  | Warning states               |

### 2.2 Surface Layers

| Depth | CSS Class   | Description           |
| ----- | ----------- | --------------------- |
| 0     | `surface-0` | Deepest background    |
| 1     | `surface-1` | Subtle raised surface |
| 2     | `surface-2` | Card-like surfaces    |
| 3     | `surface-3` | Elevated panels       |
| 4     | `surface-4` | Floating elements     |
| 5     | `surface-5` | Highest elevation     |

### 2.3 Shadows

| Token                  | Value                               | Usage               |
| ---------------------- | ----------------------------------- | ------------------- |
| `--shadow-sm`          | `0 1px 2px rgba(0,0,0,0.12)`        | Subtle elevation    |
| `--shadow-md`          | `0 4px 12px -2px rgba(0,0,0,0.18)`  | Buttons, inputs     |
| `--shadow-lg`          | `0 12px 24px -4px rgba(0,0,0,0.25)` | Cards, panels       |
| `--shadow-xl`          | `0 20px 40px -6px rgba(0,0,0,0.35)` | Modals, overlays    |
| `--shadow-elevation-3` | `0 4px 12px rgba(0,0,0,0.18)`       | Standard card depth |
| `--shadow-elevation-5` | `0 16px 48px rgba(0,0,0,0.30)`      | Maximum depth       |

### 2.4 Border Opacity

| Usage              | Opacity            |
| ------------------ | ------------------ |
| Subtle divider     | `white/5`          |
| Card ring          | `white/10`         |
| Hover ring         | `white/15`         |
| Focus ring (brand) | `brand-primary/50` |

### 2.5 Typography Scale

| Role            | Size    | Weight |
| --------------- | ------- | ------ |
| Page Title      | 28–32px | 700    |
| Section Title   | 18–20px | 600    |
| Label           | 11–12px | 600    |
| Input Text      | 14–15px | 500    |
| Secondary Text  | 12–13px | 400    |
| Caption / Micro | 10–11px | 600    |

### 2.6 Radius

| Token         | Value | Usage                   |
| ------------- | ----- | ----------------------- |
| `--radius-sm` | 8px   | Buttons, small elements |
| `--radius-md` | 12px  | Cards, panels           |
| `--radius-lg` | 16px  | Modals, large panels    |

### 2.7 Motion Timing

| Token             | Value                               | Usage                |
| ----------------- | ----------------------------------- | -------------------- |
| `--ease-premium`  | `cubic-bezier(0.22, 1, 0.36, 1)`    | Standard hover/press |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)`     | Exit animations      |
| `--ease-spring`   | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy micro         |

---

## 3. Reusable Components

All components live in `src/renderer/src/components/design-system/`.

### 3.1 WorkspaceCard

```tsx
import { WorkspaceCard } from '@/components/design-system'
;<WorkspaceCard padding="md">{/* content */}</WorkspaceCard>
```

- Elevated surface for grouping related content
- `padding`: none | sm | md | lg
- Default: rounded-2xl, bg-white/5, ring-white/10, shadow-lg

### 3.2 SectionHeader

```tsx
import { SectionHeader } from '@/components/design-system'
;<SectionHeader
  title="Informasi Dasar"
  description="Identitas lagu dan pengaturan buku lagu."
  action={<button>Action</button>}
/>
```

- Consistent section title + description pattern
- Action slot for buttons on the right

### 3.3 ToolbarGroup + ToolbarButton + ToolbarDivider

```tsx
import { ToolbarGroup, ToolbarButton, ToolbarDivider } from '@/components/design-system'

<ToolbarGroup label="Structure">
  <ToolbarButton onClick={...}>Bait</ToolbarButton>
  <ToolbarButton onClick={...} accent>Slide Break</ToolbarButton>
</ToolbarGroup>
<ToolbarDivider />
```

- Grouped tool palette pattern
- Built-in hover/active micro-interactions
- `accent` variant for primary actions

### 3.4 SurfacePanel

```tsx
import { SurfacePanel } from '@/components/design-system'
;<SurfacePanel depth={3}>{/* content */}</SurfacePanel>
```

- Generic elevated surface with configurable depth (0–5)
- Use for any container that needs elevation

### 3.5 PreviewBadge

```tsx
import { PreviewBadge } from '@/components/design-system'

<PreviewBadge label="LIVE" variant="live" pulse />
<PreviewBadge label="1920×1080" variant="resolution" />
```

- Broadcast/control-room style badges
- Variants: default | live | resolution | aspect
- Optional pulse indicator for live state

### 3.6 TimelineItem

```tsx
import { TimelineItem } from '@/components/design-system'

<TimelineItem
  index={0}
  label="Chorus"
  excerpt="Di hadapan hadiratMu..."
  lineCount={3}
  isActive={true}
  onClick={...}
/>
```

- Slide strip / timeline row item
- Built-in thumbnail, excerpt, line count, active state

### 3.7 EmptyState

```tsx
import { EmptyState } from '@/components/design-system'
;<EmptyState
  icon={SplitSquareHorizontal}
  title="Tidak ada lirik"
  description="Tambahkan lirik untuk melihat preview."
/>
```

- Cinematic, calm empty state
- Icon in subtle surface container

### 3.8 EditorShell + EditorWorkspace + EditorColumn

```tsx
import { EditorShell, EditorWorkspace, EditorColumn } from '@/components/design-system'
;<EditorShell>
  <Header />
  <EditorWorkspace>
    <EditorColumn flex="flex-[4]">...</EditorColumn>
    <EditorColumn flex="flex-[2]">...</EditorColumn>
    <EditorColumn flex="flex-[5]">...</EditorColumn>
  </EditorWorkspace>
</EditorShell>
```

- Standard 3-column editor layout scaffolding

---

## 4. Usage Guidelines

### 4.1 Surface Hierarchy

```
page background (bg-base)
  └── WorkspaceCard (depth 3)
        └── SurfacePanel (depth 2)
              └── input / button
```

### 4.2 When to Use Which Shadow

- `shadow-md` → inputs, small buttons
- `shadow-lg` → cards, panels
- `shadow-xl` → modals, dropdowns
- `shadow-elevation-3` → standard workspace cards
- `shadow-elevation-5` → floating overlays

### 4.3 Interaction Language

| State          | Visual                              |
| -------------- | ----------------------------------- |
| Default        | `bg-white/[0.03]`                   |
| Hover          | `bg-white/[0.05]` + slight ring     |
| Active/Pressed | `scale-[0.98]` + slightly darker bg |
| Focus          | `ring-brand-primary/50` + `ring-4`  |
| Disabled       | `opacity-40` + `cursor-not-allowed` |

### 4.4 Avoid These Patterns

- ❌ Hard borders (`border-white/30`+ without need)
- ❌ Uppercase-only hierarchy (use size/weight instead)
- ❌ Arbitrary spacing (stick to 8pt grid)
- ❌ Flashy/neon/gaming animations
- ❌ Admin-dashboard-style dense tables

---

## 5. File Structure

```
src/renderer/src/
  components/
    design-system/
      WorkspaceCard.tsx
      SectionHeader.tsx
      ToolbarGroup.tsx
      SurfacePanel.tsx
      PreviewBadge.tsx
      TimelineItem.tsx
      EmptyState.tsx
      EditorShell.tsx
      index.ts
```

---

## 6. CSS Tokens Source

All design tokens are defined in:

```
src/renderer/src/assets/main.css
```

This file contains:

- `@theme` block with Tailwind v4 CSS variables
- Surface colors, brand colors, semantic colors
- Spacing, radius, shadow, typography, animation tokens
- Light/dark theme variants via `:root[data-theme='light']`
- Utility classes (`.glass-panel`, `.btn-premium`, etc.)

---

## 7. Migration Notes

When building a new module:

1. Import from `@/components/design-system`
2. Use `WorkspaceCard` for content grouping
3. Use `SectionHeader` for every major section
4. Use `ToolbarGroup` for any tool palette
5. Use `SurfacePanel` for generic elevated containers
6. Reference `main.css` tokens instead of arbitrary values
7. Stick to the depth system (0–5) for consistency
