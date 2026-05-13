# SION Media — Foundation System Architecture v1.0
## Enterprise Design & Interface Infrastructure

**Document Status:** Production-Ready Implementation Specification  
**Phase:** Phase 1 — Foundation System Architecture  
**Based On:** enterprise-redesign-system-v1.md (Complete Audit)  
**Target:** Electron Desktop Application (React 19 + TypeScript 5.9 + Tailwind CSS v4)

---

## DOCUMENT PURPOSE

This document defines the **complete foundational design and interface system** for the entire SION Media ecosystem. Every page, mode, overlay, modal, and workflow will inherit from this foundation.

This is NOT visual decoration. This is **production-grade enterprise infrastructure** for:
- Design language consistency
- Component architecture scalability
- Layout framework maintainability
- Window behavior standards
- Interaction quality assurance
- Accessibility compliance
- Performance optimization

---

## TABLE OF CONTENTS

**PART 1:** Design Token System  
**PART 2:** Component Standard System  
**PART 3:** Layout Standard System  
**PART 4:** Window Standard System  
**PART 5:** Interaction Standards  
**PART 6:** Accessibility Standards  
**PART 7:** Engineering Standards  

---

# PART 1: DESIGN TOKEN SYSTEM

## 1.1 Color System

### 1.1.1 Surface Hierarchy (Dark Enterprise Theme)

```css
/* Base Surfaces — Deepest to Elevated */
--color-bg-base:           #0d0f17   /* Application canvas */
--color-bg-surface:        #151826   /* Card/panel base */
--color-bg-elevated:       #1b2031   /* Elevated panels */
--color-bg-elevated-hover: #23293f   /* Hover state */
--color-bg-active:         #2d3450   /* Active/selected state */

/* Layered Surface System (6 levels) */
--color-surface-0:         #0b0d14   /* Deepest (below base) */
--color-surface-1:         #11131c   /* Base level */
--color-surface-2:         #161925   /* Card level */
--color-surface-3:         #1d2133   /* Elevated card */
--color-surface-4:         #252a40   /* Floating panel */
--color-surface-5:         #2e3352   /* Modal/overlay */

/* Glassmorphism Surfaces */
--color-glass-bg:          rgba(17, 19, 28, 0.72)   /* Standard glass */
--color-glass-bg-strong:   rgba(17, 19, 28, 0.92)   /* Strong glass */
--color-glass-border:      rgba(255, 255, 255, 0.06)
--color-glass-border-strong: rgba(255, 255, 255, 0.12)
--color-glass-highlight:   rgba(255, 255, 255, 0.04)
```

**Usage Rules:**
- `bg-base`: Application shell, mode backgrounds
- `bg-surface`: Cards, panels, tables
- `bg-elevated`: Floating toolbars, dropdowns, popovers
- `surface-0-5`: Use for depth layering (0=deepest, 5=highest)
- Glass surfaces: Overlays, modals, floating panels with backdrop-blur

### 1.1.2 Brand & Accent Colors

```css
/* Primary Brand (Blue) */
--color-brand-primary:       #3b82f6   /* Primary actions, links */
--color-brand-primary-hover: #60a5fa   /* Hover state */

/* Secondary Brand (Violet) */
--color-brand-secondary:     #8b5cf6   /* Secondary actions */

/* Accent Colors */
--color-brand-accent:        #f59e0b   /* Amber — warnings, highlights */
--color-accent:              #38bdf8   /* Cyan — info, next state */
```

**Usage Rules:**
- Primary: Main CTAs, active states, focus rings, links
- Secondary: Alternative actions, secondary navigation
- Accent (Amber): Warnings, pending states, highlights
- Accent (Cyan): Info badges, NEXT state indicators

### 1.1.3 Semantic Status Colors

```css
/* Core Status Colors */
--color-status-success:  #10b981   /* Emerald-500 */
--color-status-error:    #ef4444   /* Red-500 */
--color-status-warning:  #f59e0b   /* Amber-500 */
--color-status-info:     #3b82f6   /* Blue-500 */

/* Extended Semantic Palette */
--color-emerald-400:     #34d399   /* Success hover */
--color-emerald-500:     #10b981   /* Success base */
--color-emerald-600:     #059669   /* Success active */

--color-rose-400:        #fb7185   /* Error hover */
--color-rose-500:        #f43f5e   /* Error base */
--color-rose-600:        #e11d48   /* Error active */

--color-amber-400:       #fbbf24   /* Warning hover */
--color-amber-500:       #f59e0b   /* Warning base */
--color-amber-600:       #d97706   /* Warning active */

--color-cyan-400:        #22d3ee   /* Info hover */
--color-cyan-500:        #06b6d4   /* Info base */
--color-cyan-600:        #0891b2   /* Info active */
```

**Usage Rules:**
- Success: Saved states, completed actions, online status
- Error: Validation errors, failed operations, critical alerts
- Warning: Pending changes, caution states, dirty flags
- Info: Informational badges, help text, neutral notifications

### 1.1.4 Live/Broadcast Colors

```css
/* Projection States */
--color-live-red:    #ff3b30   /* LIVE output indicator */
--color-live-green:  #34c759   /* Preview/ready indicator */
--color-live-orange: #ff9500   /* Freeze/warning state */

/* Semantic Broadcast Colors */
--color-live:        #34c759   /* Generic live/active */
--color-program:     #ff3b30   /* Program output (audience) */
--color-preview:     #34c759   /* Preview output (operator) */
--color-next-blue:   #38bdf8   /* NEXT state indicator */
```

**Usage Rules:**
- LIVE (red): Program output, audience-facing content
- Preview (green): Operator preview, cued content
- NEXT (cyan): Upcoming content, queued slides
- Freeze (orange): Frozen state, paused output

### 1.1.5 Text Hierarchy

```css
/* Text Colors */
--color-text-primary:    #f8fafc   /* Slate-50 — Headings, primary content */
--color-text-secondary:  #94a3b8   /* Slate-400 — Body text, labels */
--color-text-muted:      #64748b   /* Slate-500 — Subtle text, placeholders */
--color-text-disabled:   #475569   /* Slate-600 — Disabled states */
--color-text-on-brand:   #ffffff   /* Text on brand backgrounds */
```

**Usage Rules:**
- Primary: H1-H3, important data, active nav items
- Secondary: Body text, form labels, table headers
- Muted: Help text, timestamps, metadata
- Disabled: Disabled buttons, inactive states
- On-brand: Text on blue/violet backgrounds

### 1.1.6 Border System

```css
/* Border Hierarchy */
--color-border-subtle:   rgba(255, 255, 255, 0.06)   /* Dividers, subtle separators */
--color-border-default:  rgba(255, 255, 255, 0.08)   /* Card borders, input borders */
--color-border-strong:   rgba(255, 255, 255, 0.12)   /* Emphasized borders */
--color-border-brand:    rgba(59, 130, 246, 0.4)     /* Focus borders, active borders */
```

**Usage Rules:**
- Subtle: Section dividers, table borders, subtle separators
- Default: Card outlines, input fields, panel borders
- Strong: Emphasized cards, selected states (non-brand)
- Brand: Focus rings, active selections, brand highlights

---

## 1.2 Spacing System

### 1.2.1 Base Scale (8pt Grid)

```css
/* Core Spacing Scale */
--spacing-1:  4px    /* 0.5 unit */
--spacing-2:  8px    /* 1 unit — base */
--spacing-3:  12px   /* 1.5 units */
--spacing-4:  16px   /* 2 units */
--spacing-5:  20px   /* 2.5 units */
--spacing-6:  24px   /* 3 units */
--spacing-8:  32px   /* 4 units */
--spacing-10: 40px   /* 5 units */
--spacing-12: 48px   /* 6 units */
--spacing-14: 56px   /* 7 units */
--spacing-16: 64px   /* 8 units */
--spacing-20: 80px   /* 10 units */
```

**Usage Rules:**
- 1-2: Icon padding, badge padding, tight spacing
- 3-4: Button padding, input padding, card padding
- 5-6: Panel padding, section padding
- 8-10: Workspace padding, large section gaps
- 12+: Page margins, modal spacing

### 1.2.2 Semantic Spacing Tokens

```css
/* Component-Specific Spacing */
--spacing-card:      20px   /* Card internal padding */
--spacing-panel:     24px   /* Panel internal padding */
--spacing-section:   32px   /* Section vertical spacing */
--spacing-workspace: 40px   /* Workspace margins */
```

**Usage Rules:**
- Card: Internal padding for cards, list items
- Panel: Sidebar, inspector, floating panel padding
- Section: Vertical rhythm between major sections
- Workspace: Main content area margins

---

## 1.3 Typography System

### 1.3.1 Font Families

```css
--font-heading: 'Poppins', system-ui, sans-serif;   /* Headings, titles, emphasis */
--font-ui:      'Inter', system-ui, sans-serif;     /* Body, UI, data */
```

**Usage Rules:**
- Poppins: H1-H6, page titles, section headers, brand text
- Inter: Body text, buttons, inputs, tables, labels

### 1.3.2 Font Size Scale

```css
/* Size Scale */
--text-xs:   11px   /* Micro labels, badges */
--text-sm:   12px   /* Small labels, metadata */
--text-base: 13px   /* Body text, UI default */
--text-md:   14px   /* Emphasized body, data */
--text-lg:   15px   /* Large body, subheadings */
--text-xl:   16px   /* Small headings */
--text-2xl:  18px   /* Section headings */
--text-3xl:  20px   /* Page subheadings */
--text-4xl:  24px   /* Page headings */
--text-5xl:  28px   /* Workspace titles */
--text-6xl:  32px   /* Large titles */
--text-7xl:  40px   /* Hero titles */
```

### 1.3.3 Semantic Typography Tokens

```css
/* Context-Specific Sizes */
--text-workspace-title: 28px   /* Mode page titles */
--text-section-title:   18px   /* Section headers */
--text-card-header:     14px   /* Card titles */
--text-label:           11px   /* Form labels, badges */
--text-data:            14px   /* Table data, metrics */
--text-console:         12px   /* Logs, code, monospace */
```

### 1.3.4 Line Heights

```css
--leading-tight:    1.2    /* Headings, titles */
--leading-normal:   1.5    /* Body text, UI */
--leading-relaxed:  1.6    /* Long-form content */
--leading-loose:    1.8    /* Spacious reading */
```

**Usage Rules:**
- Tight: H1-H6, compact UI, badges
- Normal: Body text, buttons, inputs, tables
- Relaxed: Paragraphs, descriptions
- Loose: Long-form articles, help text

### 1.3.5 Font Weights

```css
/* Weight Scale */
--font-normal:    400   /* Body text */
--font-medium:    500   /* Emphasized text */
--font-semibold:  600   /* Subheadings */
--font-bold:      700   /* Headings */
--font-extrabold: 800   /* Titles, emphasis */
--font-black:     900   /* Hero text, brand */
```

**Usage Rules:**
- 400: Body paragraphs, descriptions
- 500: Labels, emphasized body
- 600: Subheadings, card titles
- 700: Section headings, buttons
- 800: Page titles, workspace titles
- 900: Brand text, hero titles

---

## 1.4 Border Radius System

```css
/* Radius Scale */
--radius-xs:   4px     /* Badges, tags */
--radius-sm:   8px     /* Small buttons, inputs */
--radius-md:   12px    /* Buttons, inputs, cards */
--radius-lg:   16px    /* Large cards, panels */
--radius-xl:   20px    /* Modals, large panels */
--radius-2xl:  24px    /* Hero cards */
--radius-3xl:  32px    /* Special surfaces */
--radius-full: 9999px  /* Pills, circles */

/* Semantic Radius Tokens */
--radius-card:   16px   /* Card corners */
--radius-panel:  12px   /* Panel corners */
--radius-button: 10px   /* Button corners */
--radius-input:  10px   /* Input corners */
--radius-badge:  6px    /* Badge corners */
```

**Usage Rules:**
- xs-sm: Small UI elements (badges, tags, small buttons)
- md: Standard UI (buttons, inputs, dropdowns)
- lg-xl: Cards, panels, modals
- 2xl-3xl: Hero elements, special surfaces
- full: Pills, avatars, status dots

---

## 1.5 Shadow System

### 1.5.1 Elevation Shadows

```css
/* Elevation Layers (1-5) */
--shadow-elevation-1: 0 1px 2px rgba(0, 0, 0, 0.12);
--shadow-elevation-2: 0 2px 6px rgba(0, 0, 0, 0.14), 0 1px 2px rgba(0, 0, 0, 0.1);
--shadow-elevation-3: 0 4px 12px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-elevation-4: 0 8px 24px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.14);
--shadow-elevation-5: 0 16px 48px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.18);
```

**Usage Rules:**
- 1: Subtle depth (table rows, list items)
- 2: Cards, panels
- 3: Floating toolbars, dropdowns
- 4: Modals, overlays
- 5: Critical dialogs, toasts

### 1.5.2 Semantic Shadows

```css
/* Contextual Shadows */
--shadow-sm:    0 1px 2px 0 rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08);
--shadow-md:    0 4px 12px -2px rgba(0, 0, 0, 0.18), 0 2px 4px -1px rgba(0, 0, 0, 0.12);
--shadow-lg:    0 12px 24px -4px rgba(0, 0, 0, 0.25), 0 4px 8px -2px rgba(0, 0, 0, 0.15);
--shadow-xl:    0 20px 40px -6px rgba(0, 0, 0, 0.35), 0 8px 16px -4px rgba(0, 0, 0, 0.2);
--shadow-inner: inset 0 1px 3px 0 rgba(0, 0, 0, 0.12);
```

### 1.5.3 Glow Shadows (Brand-Tinted)

```css
/* Brand Glows */
--shadow-glow-sm:    0 0 8px rgba(59, 130, 246, 0.18);
--shadow-glow-md:    0 0 16px rgba(59, 130, 246, 0.25), 0 0 4px rgba(59, 130, 246, 0.15);
--shadow-glow-lg:    0 0 32px rgba(59, 130, 246, 0.2), 0 0 8px rgba(59, 130, 246, 0.12);

/* State Glows */
--shadow-glow-green: 0 0 20px rgba(52, 199, 89, 0.3);   /* Success, preview */
--shadow-glow-red:   0 0 20px rgba(255, 59, 48, 0.3);   /* Live, error */
--shadow-glow-amber: 0 0 20px rgba(245, 158, 11, 0.25); /* Warning */
```

**Usage Rules:**
- Glow-sm/md/lg: Focus states, active selections, brand highlights
- Glow-green: Preview indicators, success states
- Glow-red: LIVE indicators, critical states
- Glow-amber: Warning states, pending changes

---

## 1.6 Animation System

### 1.6.1 Easing Curves

```css
/* Easing Functions */
--ease-out-expo:       cubic-bezier(0.16, 1, 0.3, 1);        /* Smooth deceleration */
--ease-spring:         cubic-bezier(0.34, 1.56, 0.64, 1);    /* Spring bounce */
--ease-in-out-smooth:  cubic-bezier(0.4, 0, 0.2, 1);         /* Material Design */
--ease-in-out-bounce:  cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Bounce */
--ease-premium:        cubic-bezier(0.22, 1, 0.36, 1);       /* Premium feel */
```

**Usage Rules:**
- out-expo: Hover states, micro-interactions, button presses
- spring: Modals, overlays, drawer animations
- in-out-smooth: Page transitions, mode switches
- in-out-bounce: Playful interactions (use sparingly)
- premium: High-quality transitions, hero animations

### 1.6.2 Duration Scale

```css
/* Duration Tokens */
--duration-instant: 50ms    /* Instant feedback */
--duration-fast:    150ms   /* Quick interactions */
--duration-normal:  200ms   /* Standard transitions */
--duration-slow:    300ms   /* Deliberate transitions */
--duration-slower:  400ms   /* Page transitions */
```

**Usage Rules:**
- instant: Hover states, active states
- fast: Button clicks, dropdown opens
- normal: Default for most transitions
- slow: Modal opens, panel slides
- slower: Page/mode transitions

### 1.6.3 Animation Presets

```typescript
// Framer Motion Presets
export const ANIMATION_PRESETS = {
  // Fade transitions
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  // Slide transitions
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  },
  
  // Scale transitions
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  },
  
  // Spring animations
  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30
  }
}
```

---

## 1.7 Z-Index System

```css
/* Z-Index Layers */
--z-base:            0      /* Base content */
--z-dropdown:        1000   /* Dropdowns, popovers */
--z-sticky:          1100   /* Sticky headers */
--z-floating:        1200   /* Floating toolbars */
--z-overlay:         1300   /* Overlay backgrounds */
--z-modal:           1400   /* Modal dialogs */
--z-toast:           1500   /* Toast notifications */
--z-tooltip:         1600   /* Tooltips */
--z-critical:        9999   /* Critical dialogs, emergency controls */
```

**Usage Rules:**
- base: Normal document flow
- dropdown: Context menus, select dropdowns
- sticky: Sticky headers, fixed toolbars
- floating: Floating action buttons, mini panels
- overlay: Modal backdrops, drawer overlays
- modal: Modal dialogs, confirmation dialogs
- toast: Notifications, alerts
- tooltip: Tooltips, hover cards
- critical: Emergency controls, system alerts

---

## 1.8 State Color System

### 1.8.1 Interactive States

```css
/* Hover States */
--color-hover-subtle:  rgba(255, 255, 255, 0.04);
--color-hover-default: rgba(255, 255, 255, 0.06);
--color-hover-strong:  rgba(255, 255, 255, 0.08);
--color-hover-brand:   rgba(59, 130, 246, 0.1);

/* Active/Pressed States */
--color-active-subtle:  rgba(255, 255, 255, 0.06);
--color-active-default: rgba(255, 255, 255, 0.08);
--color-active-strong:  rgba(255, 255, 255, 0.12);
--color-active-brand:   rgba(59, 130, 246, 0.15);

/* Selected States */
--color-selected-bg:     rgba(37, 99, 235, 0.18);
--color-selected-border: rgba(59, 130, 246, 0.24);
--color-selected-glow:   rgba(59, 130, 246, 0.08);

/* Focus States */
--color-focus-ring:      rgba(59, 130, 246, 0.6);
--color-focus-ring-offset: 2px;

/* Disabled States */
--color-disabled-bg:     rgba(255, 255, 255, 0.02);
--color-disabled-text:   var(--color-text-disabled);
--color-disabled-border: rgba(255, 255, 255, 0.04);
--opacity-disabled:      0.4;
```

---

## 1.9 Responsive & Scaling Tokens

### 1.9.1 Breakpoints

```css
/* Viewport Breakpoints */
--breakpoint-sm:  640px    /* Small tablets */
--breakpoint-md:  768px    /* Tablets */
--breakpoint-lg:  1024px   /* Small desktops */
--breakpoint-xl:  1280px   /* Standard desktops */
--breakpoint-2xl: 1536px   /* Large desktops */
--breakpoint-3xl: 1920px   /* Ultra-wide */
```

**Note:** SION Media is desktop-first. Minimum supported resolution: 1024×700px.

### 1.9.2 DPI Scaling

```css
/* DPI Scale Factors */
--scale-100: 1.0    /* Standard DPI (96) */
--scale-125: 1.25   /* 125% scaling (120 DPI) */
--scale-150: 1.5    /* 150% scaling (144 DPI) */
--scale-175: 1.75   /* 175% scaling (168 DPI) */
--scale-200: 2.0    /* 200% scaling (192 DPI) */
```

**Usage:** Electron handles DPI scaling automatically. Use these for manual adjustments if needed.

### 1.9.3 Projection Scaling

```css
/* Projection Output Scaling */
--projection-safe-zone: 5%;      /* Safe zone margin */
--projection-text-scale: 1.2;    /* Text size multiplier */
--projection-line-height: 1.4;   /* Tighter line height */
```

---

## 1.10 Theme Variants

### 1.10.1 Dark Enterprise Theme (Default)

All tokens above define the dark enterprise theme.

### 1.10.2 Projection Theme

```css
/* Projection-Specific Overrides */
[data-theme="projection"] {
  --color-bg-base: #000000;
  --color-text-primary: #ffffff;
  --text-base: 16px;  /* Larger base for readability */
  --leading-normal: 1.4;  /* Tighter for projection */
}
```

### 1.10.3 Stage Display Theme

```css
/* Stage Display Overrides */
[data-theme="stage"] {
  --color-bg-base: #0a0a0a;
  --color-text-primary: #ffffff;
  --text-base: 18px;  /* Even larger for musicians */
  --leading-normal: 1.5;
}
```

### 1.10.4 Light Theme (Future)

```css
/* Light Theme Overrides (Placeholder) */
[data-theme="light"] {
  --color-bg-base: #ffffff;
  --color-bg-surface: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  /* ... full light theme tokens */
}
```

**Note:** Light theme is planned but not currently implemented. Dark theme is the primary focus.

---

## 1.11 Token Usage Guidelines

### 1.11.1 Token Selection Matrix

| Element | Background | Text | Border | Shadow |
|---|---|---|---|---|
| Page | `bg-base` | `text-primary` | — | — |
| Card | `bg-surface` | `text-primary` | `border-default` | `elevation-2` |
| Panel | `bg-elevated` | `text-primary` | `border-subtle` | `elevation-3` |
| Button (primary) | `brand-primary` | `text-on-brand` | `border-brand` | `glow-sm` |
| Button (secondary) | `bg-elevated` | `text-primary` | `border-default` | `elevation-1` |
| Input | `surface-1` | `text-primary` | `border-default` | `inner` |
| Modal | `surface-5` | `text-primary` | `border-strong` | `elevation-5` |
| Dropdown | `bg-elevated` | `text-primary` | `border-default` | `elevation-3` |
| Toast | `surface-4` | `text-primary` | `border-strong` | `elevation-4` + `glow-md` |

### 1.11.2 State Transition Standards

```css
/* Standard Transition */
.interactive-element {
  transition: 
    transform var(--duration-fast) var(--ease-out-expo),
    border-color var(--duration-normal) var(--ease-out-expo),
    background var(--duration-normal) var(--ease-out-expo),
    color var(--duration-normal) var(--ease-out-expo),
    box-shadow var(--duration-normal) var(--ease-out-expo);
}

/* Hover State */
.interactive-element:hover {
  transform: translateY(-1px);
  border-color: var(--color-border-brand);
  background: var(--color-hover-brand);
  box-shadow: var(--shadow-elevation-3);
}

/* Active State */
.interactive-element:active {
  transform: translateY(0);
  background: var(--color-active-brand);
}

/* Focus State */
.interactive-element:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: var(--color-focus-ring-offset);
}

/* Disabled State */
.interactive-element:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
  transform: none;
}
```

---

*End of Part 1: Design Token System*

**Next:** Part 2 — Component Standard System

---

# PART 2: COMPONENT STANDARD SYSTEM

## 2.1 Atomic Components

### 2.1.1 Button

**Purpose:** Primary interactive trigger for all user actions.

**Variants:**

| Variant | Background | Border | Text | Use Case |
|---|---|---|---|---|
| `primary` | `brand-primary` gradient | `border-brand` | white | Main CTAs, save, confirm |
| `secondary` | `bg-elevated` | `border-default` | `text-primary` | Secondary actions |
| `ghost` | transparent | `border-default` | `text-secondary` | Tertiary actions |
| `danger` | `rose-600` gradient | `rose-400/30` | white | Destructive actions |
| `icon` | transparent | none | `text-secondary` | Icon-only actions |
| `live` | `live-red` gradient | `live-red/30` | white | Projection LIVE button |

**Sizes:**

| Size | Height | Padding | Font | Radius |
|---|---|---|---|---|
| `sm` | 28px | 0 10px | 11px/700 | 8px |
| `md` | 36px | 0 14px | 12px/750 | 10px |
| `lg` | 40px | 0 18px | 13px/800 | 12px |
| `xl` | 48px | 0 22px | 14px/800 | 14px |

**States:**
```
default  → base styles
hover    → translateY(-1px), border-brand, bg-hover-brand, shadow-elevation-3
active   → translateY(0), bg-active-brand
focus    → outline 2px brand-primary, outline-offset 2px
disabled → opacity 0.4, cursor not-allowed, no transform
loading  → spinner replaces icon, text dims to 0.7, no interaction
```

**Keyboard Interaction:**
- `Enter` / `Space`: Trigger action
- `Tab`: Move focus to next interactive element
- `Shift+Tab`: Move focus to previous

**Accessibility:**
- `role="button"` (implicit for `<button>`)
- `aria-disabled="true"` when disabled (not `disabled` attr for keyboard focus)
- `aria-busy="true"` when loading
- `aria-label` required for icon-only buttons
- Minimum touch target: 32×32px

**Implementation:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'live'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children?: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  className?: string
}
```

---

### 2.1.2 IconButton

**Purpose:** Compact icon-only action trigger.

**Variants:** `default`, `ghost`, `danger`, `brand`

**Sizes:**

| Size | Dimensions | Icon Size | Radius |
|---|---|---|---|
| `sm` | 28×28px | 14px | 8px |
| `md` | 32×32px | 16px | 10px |
| `lg` | 36×36px | 18px | 12px |
| `xl` | 40×40px | 20px | 12px |

**Requirements:**
- `aria-label` is REQUIRED (no visible text)
- `title` attribute for tooltip
- Focus ring must be visible

---

### 2.1.3 Input

**Purpose:** Text entry for forms, search, and data input.

**Variants:** `default`, `search`, `code`

**Sizes:**

| Size | Height | Padding | Font |
|---|---|---|---|
| `sm` | 32px | 0 10px | 12px |
| `md` | 36px | 0 12px | 13px |
| `lg` | 40px | 0 14px | 13px |

**States:**
```
default  → border-default, bg-surface-1
hover    → border-default/80, bg-surface-2
focus    → border-brand, bg-surface-1, shadow: 0 0 0 3px rgba(59,130,246,0.1)
error    → border-rose-500/40, bg-rose-500/5, shadow: 0 0 0 3px rgba(239,68,68,0.1)
disabled → opacity 0.4, cursor not-allowed
```

**Accessibility:**
- `id` + `<label for>` pairing required
- `aria-invalid="true"` on error
- `aria-describedby` pointing to error message
- `aria-required="true"` for required fields

---

### 2.1.4 Select / Dropdown

**Purpose:** Single-value selection from a list.

**Variants:** `native` (HTML select), `custom` (floating dropdown)

**Custom Dropdown Behavior:**
- Opens on click, closes on outside click or Escape
- Arrow keys navigate options
- Enter/Space selects focused option
- Type-ahead search for long lists
- Virtualized for lists > 50 items

**Accessibility:**
- `role="combobox"` + `aria-expanded`
- `role="listbox"` for options container
- `role="option"` + `aria-selected` for each option
- `aria-activedescendant` tracks focused option

---

### 2.1.5 Checkbox

**States:** `unchecked`, `checked`, `indeterminate`, `disabled`

**Size:** 16×16px with 4px border-radius

**Behavior:**
- Click toggles checked state
- Space toggles when focused
- Indeterminate state for partial selection (bulk select)

---

### 2.1.6 Toggle (Switch)

**Purpose:** Binary on/off control.

**Sizes:**

| Size | Track | Thumb |
|---|---|---|
| `sm` | 28×16px | 12×12px |
| `md` | 36×20px | 16×16px |
| `lg` | 44×24px | 20×20px |

**States:** `off`, `on`, `disabled`

**Animation:** Thumb slides with spring easing (200ms)

---

### 2.1.7 Badge

**Purpose:** Status indicators, counts, labels.

**Variants:**

| Variant | Background | Text | Border | Use Case |
|---|---|---|---|---|
| `success` | emerald-500/10 | emerald-300 | emerald-400/15 | Published, active |
| `warning` | amber-500/10 | amber-300 | amber-400/15 | Pending, review |
| `error` | rose-500/10 | rose-300 | rose-400/15 | Error, failed |
| `info` | blue-500/10 | blue-300 | blue-400/15 | Info, neutral |
| `neutral` | white/4 | text-muted | white/6 | Archived, inactive |
| `live` | live-red/15 | live-red | live-red/30 | LIVE state |
| `preview` | live-green/15 | live-green | live-green/30 | Preview state |

**Sizes:**

| Size | Height | Padding | Font |
|---|---|---|---|
| `sm` | 18px | 0 6px | 10px/800 |
| `md` | 22px | 0 8px | 11px/800 |
| `lg` | 26px | 0 10px | 12px/700 |

**Structure:** `[dot] [label]` — dot is 6px circle matching text color

---

### 2.1.8 Tooltip

**Purpose:** Contextual help text on hover.

**Behavior:**
- Appears after 400ms hover delay
- Disappears immediately on mouse leave
- Positioned using @floating-ui/react
- Max width: 240px
- Never covers the trigger element

**Accessibility:**
- `role="tooltip"` on tooltip element
- `aria-describedby` on trigger pointing to tooltip id
- Keyboard: appears on focus, disappears on blur

---

### 2.1.9 Loader / Spinner

**Variants:** `spinner` (circular), `dots` (3 dots), `skeleton` (content placeholder)

**Sizes:** `sm` (16px), `md` (24px), `lg` (32px), `xl` (48px)

**Skeleton:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
```

---

### 2.1.10 Kbd (Keyboard Shortcut)

**Purpose:** Display keyboard shortcuts inline.

```css
.kbd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xs);
  background: var(--color-bg-elevated);
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-ui);
}
```

---

## 2.2 Molecular Components

### 2.2.1 SearchInput

**Purpose:** Unified search field used across all modes.

**Structure:**
```
[Search Icon] [Input Field] [Clear Button] [Kbd Hint]
```

**Behavior:**
- Search icon dims on focus
- Clear button appears when value is non-empty
- Kbd hint shows shortcut (e.g., `Ctrl+K`)
- Debounced onChange (300ms default)
- Clears on Escape

**Props:**
```typescript
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  shortcut?: string
  autoFocus?: boolean
  debounce?: number
  onClear?: () => void
  className?: string
}
```

---

### 2.2.2 SegmentedControl

**Purpose:** Tab-like filter/view switcher.

**Structure:** Container with 4px padding, rounded-xl, dark background. Each option is a button with active state.

**Behavior:**
- Single selection
- Keyboard: Arrow keys navigate, Enter/Space selects
- Active item has brand background

**Props:**
```typescript
interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}
```

---

### 2.2.3 MetricCard

**Purpose:** Dashboard KPI display card.

**Structure:**
```
┌─────────────────────────────────┐
│ [Icon]              [Mini Bars] │
│ LABEL                           │
│ VALUE               [Trend]     │
│ Meta description                │
└─────────────────────────────────┘
```

**Requirements:**
- Icon: 30×30px gradient background
- Value: 18px/850 weight
- Label: 10px/800 uppercase tracking
- Trend: pill badge
- Mini bars: 7 bars, animated on hover
- Hover: translateY(-2px), border-brand/22, shadow-elevation-4

**Data binding:**
- `value`: Real computed value (NOT hardcoded)
- `trend`: Computed from actual data
- `meta`: Descriptive string

---

### 2.2.4 SongArtwork

**Purpose:** Visual identifier for songs in all views.

**Variants:** `sm` (32px), `md` (48px), `lg` (80px), `xl` (146px)

**Structure:**
```
Gradient background (blue→violet)
├── Flare overlay (radial gradient)
├── Hymnal code (top, small)
└── Song number (bottom, large, bold)
```

**Gradient:** `linear-gradient(145deg, rgba(37,99,235,0.96), rgba(124,58,237,0.84))`

---

### 2.2.5 StatusBadge

**Purpose:** Song/content status indicator.

**States:** `published`, `draft`, `review`, `archived`

**Structure:** `[dot] [label]` with colored border and background.

**Data binding:** Derived from song metadata (tags, lyrics_raw content).

---

### 2.2.6 EmptyState

**Purpose:** Placeholder when content is absent.

**Structure:**
```
[Icon Container (64×64px)]
[Title (13px/medium)]
[Description (11px/muted)]
[Action Button (optional)]
```

**Variants:** `default`, `search` (no results), `error` (load failed)

**Requirements:**
- Icon opacity: 40%
- Container opacity: 50%
- Action button: ghost variant

---

### 2.2.7 ContextMenu

**Purpose:** Right-click contextual actions.

**Behavior:**
- Opens at cursor position
- Closes on outside click, Escape, or item selection
- Arrow keys navigate items
- Enter/Space activates focused item
- Positioned using @floating-ui/react
- Stays within viewport bounds

**Structure:**
```
[Item]
[Item with icon]
[Separator]
[Danger Item]
```

**Accessibility:**
- `role="menu"` on container
- `role="menuitem"` on items
- `role="separator"` on dividers
- Focus management on open/close

---

### 2.2.8 CommandPalette

**Purpose:** Global search and action launcher.

**Trigger:** `Ctrl+P` or `Ctrl+K`

**Structure:**
```
[Search Input]
[Results List]
  [Category Header]
  [Result Item: Icon + Label + Shortcut]
```

**Behavior:**
- Opens as centered modal overlay
- Filters results as user types
- Arrow keys navigate results
- Enter executes selected action
- Escape closes
- Recent actions shown when empty

---

### 2.2.9 Toast Notification

**Purpose:** Transient feedback messages.

**Variants:** `info`, `success`, `error`, `warning`

**Behavior:**
- Appears from bottom-right
- Auto-dismisses after 3000ms
- Can be manually dismissed
- Stacks if multiple toasts

**Structure:**
```
[Icon] [Message] [Close Button]
```

**Animation:** Slide up + fade in, fade out

---

## 2.3 Organism Components

### 2.3.1 TitleBar

**Purpose:** Application command center and navigation hub.

**Layout:**
```
[Left: Identity + Menu] [Center: ModeSwitcher] [Right: Status + Utilities + Controls]
```

**Drag Region:** Entire bar is draggable except `.no-drag` elements.

**Height:** 40px (Win32 titleBarOverlay height)

**Components:**
- `TitleBarIdentity`: Logo + app name
- `TitleBarMenu`: File/Edit/View/Media/Presentation/Window/Help
- `TitleBarModeSwitcher`: Mode dropdown
- `TitleBarStatus`: Live indicator, display count, timer, state badge
- `TitleBarUtilityButtons`: Theme, Settings, Notifications
- `TitleBarControls`: Min/Max/Close (non-Windows only)

**State Rules:**
- During onboarding (`isFirstInstall`): Hide Menu, ModeSwitcher, Status, Utilities
- During lyrics fullscreen: Hide entire TitleBar
- PROJECTION mode: Show full status bar
- Other modes: Show minimal status

---

### 2.3.2 Sidebar Navigation

**Purpose:** Primary navigation within a mode.

**Variants:** `library` (240px), `management` (220px), `settings` (220px)

**Structure:**
```
[Brand Mark]
[Navigation Groups]
  [Group Label]
  [Nav Item: Icon + Label + Count/Badge]
[Footer: Operator Profile + DB Status]
```

**Behavior:**
- Active item: brand background, left accent bar
- Hover: subtle background
- Count badges: right-aligned
- "Coming Soon" items: `em` badge, disabled interaction
- Collapsible to icon-only (64px) via toggle

**Keyboard:**
- Arrow keys navigate items
- Enter activates item
- Home/End jump to first/last

---

### 2.3.3 CommandBar (Toolbar)

**Purpose:** Mode-specific action toolbar above content.

**Structure:**
```
[Mode Pill] [Search Input] [Filter Controls] [Action Buttons]
```

**Height:** 48-56px

**Rules:**
- Always visible within a mode
- Search input: min-width 240px, grows with available space
- Action buttons: right-aligned
- Responsive: collapse labels on narrow widths

---

### 2.3.4 DataTable

**Purpose:** Sortable, filterable, selectable data grid.

**Structure:**
```
[Column Headers: checkbox + columns + actions]
[Rows: checkbox + data cells + action buttons]
[Footer: count + pagination + bulk actions]
```

**Row States:**
- Default: transparent background
- Hover: subtle background, translateY(-1px)
- Selected: brand gradient background, left accent bar, brand border
- Multi-selected: checkbox checked, brand border

**Column Features:**
- Sortable: click header to sort, arrow indicator
- Resizable: drag column borders
- Fixed columns: checkbox, actions

**Keyboard:**
- Arrow keys navigate rows
- Space toggles row selection
- Shift+Click range select
- Ctrl+A select all visible

---

### 2.3.5 InspectorPanel

**Purpose:** Right-side detail panel for selected item.

**Width:** 320px default, 380px wide variant

**Structure:**
```
[Panel Tabs: Detail / Chord / Notes]
[Content Area]
  [Artwork]
  [Title Block]
  [Primary Actions]
  [Metadata Table]
  [Quick Actions]
```

**Behavior:**
- Empty state when nothing selected
- Tabs switch content sections
- Metadata table: 2-column grid (label + value)
- Actions: 2-column grid

---

### 2.3.6 Modal

**Purpose:** Focused dialog for user actions.

**Sizes:**

| Size | Width | Use Case |
|---|---|---|
| `sm` | 400px | Confirmations, simple forms |
| `md` | 520px | Standard forms, pickers |
| `lg` | 640px | Complex forms, editors |
| `xl` | 800px | Multi-step wizards |
| `full` | 90vw | Full-screen editors |

**Structure:**
```
[Backdrop: rgba overlay]
[Modal Container]
  [Header: Icon + Title + Subtitle + Close]
  [Body: scrollable content]
  [Footer: Cancel + Confirm]
```

**Behavior:**
- Opens with scale + fade animation
- Backdrop click closes (except destructive modals)
- Escape closes
- Focus trapped inside
- First focusable element receives focus on open
- Returns focus to trigger on close

**Loading State:**
- Footer buttons show spinner
- Body dims to 0.6 opacity
- No interaction during loading

**Error State:**
- Error message appears below body
- Primary button re-enables

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` → header title id
- `aria-describedby` → subtitle id

---

### 2.3.7 ConfirmDialog

**Purpose:** Destructive action confirmation.

**Extends:** Modal (sm size)

**Structure:**
```
[Warning Icon (amber/red)]
[Title: "Are you sure?"]
[Description: consequences]
[Footer: Cancel + Confirm (danger variant)]
```

**Rules:**
- Backdrop click does NOT close
- Escape closes (cancels)
- Confirm button is danger variant (red)
- Loading state during async operation
- Never use `window.confirm()` — always use this component

---

### 2.3.8 LivePreviewPanel

**Purpose:** Dual preview/program display for Projection Mode.

**Structure:**
```
[Preview Panel]          [Program Panel]
[Slide thumbnail]        [Slide thumbnail]
[Slide nav controls]     [State controls]
[NEXT indicator]         [Transition speed]
```

**State Indicators:**
- Preview: green border, "PREVIEW" badge
- Program: red border, "● LIVE" badge when LIVE
- FREEZE: amber border, "❄ FREEZE" badge
- BLACK: dark border, "■ BLACK" badge

**Keyboard:**
- Space: TAKE (cue → program)
- →: Next slide
- ←: Previous slide
- B: Black
- F: Freeze
- Esc: Clear

---

### 2.3.9 PlaylistPanel

**Purpose:** Worship rundown manager in Projection Mode.

**Structure:**
```
[Header: Playlist selector + New button]
[Items List: drag-reorderable]
  [Item: index + title + section + duration]
[Footer: Add Song + item count]
```

**Item States:**
- Default: transparent
- Active (currently live): red left bar, brand background
- Hover: subtle background
- Dragging: elevated shadow, opacity 0.8

**Drag Behavior:**
- @dnd-kit/sortable
- Visual placeholder during drag
- Auto-scroll when dragging near edges

---

### 2.3.10 SongCard (Library View)

**Purpose:** Song display in Library Mode title view.

**Structure:**
```
[Top: Artwork + Favorite button]
[Body: Number + Title + Subtitle]
[Meta: Key + Tempo + Verse count]
[Actions: Open + Add to Playlist]
```

**States:**
- Default: transparent border
- Selected: brand border, brand background
- Hover: translateY(-2px), shadow-elevation-3

**Interaction:**
- Single click: select
- Double click: open lyrics viewer
- Right click: context menu

---

### 2.3.11 NumberTile (Library View)

**Purpose:** Compact song number display in Library Mode number view.

**Size:** ~80×60px

**Structure:**
```
[Number (large, bold)]
[Sub: Favorite/Key/Hymnal code]
```

**States:** Default, selected (brand background), hover

---

### 2.3.12 RundownRow (Playlist View)

**Purpose:** Playlist item in Library Mode playlist view.

**Structure:**
```
[Index] [Title + Section] [Duration]
```

**States:** Default, selected, hover

---

### 2.3.13 SongEditorWorkspace

**Purpose:** Full-screen song creation/editing interface.

**Structure:**
```
[TopBar: Back + Title + Save State + Broadcast Rack + Actions]
[Workspace: 3 columns]
  [Left: Metadata Form]
  [Center: Lyrics Editor]
  [Right: Preview + Atmosphere]
```

**Save States:** `saved`, `dirty`, `saving`, `error`

**Broadcast Rack:** Shows live status (LIVE/PREVIEW/NEXT/TIMER) — read-only indicators

---

### 2.3.14 SettingsWorkspace

**Purpose:** System configuration interface.

**Structure:**
```
[Header: Back + Title + Breadcrumb]
[Body: Sidebar + Content]
  [Sidebar: Search + Nav items]
  [Content: Section-specific form]
```

**Sections:** Display, Hymnals, Appearance, Theme, Background, Shortcuts, Backup, About

---

### 2.3.15 MediaBrowser

**Purpose:** Media asset management interface.

**Structure:**
```
[Toolbar: Import + Filter + Search + View toggle]
[Content: Grid or List view]
  [Asset Card: Thumbnail + Name + Type + Actions]
[Inspector: Selected asset details]
```

**View Modes:** Grid (thumbnails), List (table)

**Asset Types:** Image, Video

**Actions:** Import, Edit metadata, Add to collection, Delete

---

*End of Part 2: Component Standard System*

---

# PART 3: LAYOUT STANDARD SYSTEM

## 3.1 Application Shell

### 3.1.1 Root Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px, fixed, -webkit-app-region: drag)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTENT AREA (flex-1, min-h-0, overflow-hidden)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MODE CONTENT (absolute inset-0, AnimatePresence)                   │   │
│  │  ├── LIBRARY MODE                                                   │   │
│  │  ├── PROJECTION MODE                                                │   │
│  │  ├── MANAGEMENT MODE                                                │   │
│  │  └── BROADCAST MODE                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OVERLAY LAYER (z-50, absolute inset-0)                                    │
│  ├── SongEditorScreen                                                       │
│  ├── SettingsScreen                                                         │
│  ├── ImportExportScreen                                                     │
│  └── BibleScreen                                                            │
│                                                                             │
│  FLOATING LAYER (z-[1000+])                                                 │
│  ├── CommandPalette                                                         │
│  ├── KeyboardCheatSheet                                                     │
│  ├── QuickJumpOverlay                                                       │
│  └── RuntimeInspector                                                       │
│                                                                             │
│  NOTIFICATION LAYER (z-[1500])                                              │
│  └── Toast                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**CSS Implementation:**
```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--color-bg-base);
  overflow: hidden;
}

.app-content {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}
```

---

## 3.2 Mode Layout Templates

### 3.2.1 Standard Mode Layout (Library, Management)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px)                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┬─────────────────────────────────────────┬───────────────┐ │
│  │              │  COMMAND BAR (48-56px, flex-shrink-0)   │               │ │
│  │  SIDEBAR     ├─────────────────────────────────────────┤  INSPECTOR    │ │
│  │  (240px)     │                                         │  (320-380px)  │ │
│  │  flex-shrink │  MAIN CONTENT AREA                      │  flex-shrink  │ │
│  │  -0          │  (flex-1, min-h-0, overflow-y-auto)     │  -0           │ │
│  │              │                                         │               │ │
│  │              │                                         │               │ │
│  └──────────────┴─────────────────────────────────────────┴───────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**CSS:**
```css
.mode-layout-standard {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.mode-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--color-border-subtle);
}

.mode-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mode-command-bar {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.mode-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.mode-inspector {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--color-border-subtle);
}
```

---

### 3.2.2 Projection Mode Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px)                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  OPERATOR TOOLBAR (48px, flex-shrink-0)                                      │
│  [State Controls] [TAKE] [Scene] [Theme]                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PREVIEW SECTION (flex-shrink-0, ~40% height)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  [PREVIEW PANEL]              [PROGRAM PANEL]                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BOTTOM WORKSPACE (flex-1, min-h-0)                                          │
│  ┌──────────────────┬──────────────────────────┬──────────────────────┐     │
│  │  SONG LIBRARY    │  PLAYLIST / RUNDOWN       │  SONG INFO           │     │
│  │  (resizable)     │  (resizable)              │  (resizable)         │     │
│  └──────────────────┴──────────────────────────┴──────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Panel Sizes (default):**
- Song Library: 25% (min 20%, max 40%)
- Playlist: 40% (min 30%, max 55%)
- Song Info: 35% (min 25%, max 45%)

**Resizable:** Uses `react-resizable-panels` with `usePanelLayoutStore` persistence.

---

### 3.2.3 Settings Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER (64px, drag-area)                                                    │
│  [Back] [Title + Subtitle] [Breadcrumb]                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┬───────────────────────────────────────────────────┐   │
│  │  SIDEBAR (220px) │  CONTENT AREA (flex-1)                            │   │
│  │                  │                                                   │   │
│  │  [Search]        │  [Section Content]                                │   │
│  │  [Nav Items]     │                                                   │   │
│  │                  │                                                   │   │
│  └──────────────────┴───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2.4 Song Editor Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (82px)                                                              │
│  [Back] [Title + Save State] [Broadcast Rack] [Actions]                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┬──────────────────────────┬──────────────────────┐     │
│  │  METADATA FORM   │  LYRICS EDITOR           │  PREVIEW             │     │
│  │  (flex-[3])      │  (flex-[5])              │  (flex-[4])          │     │
│  │                  │                          │                      │     │
│  └──────────────────┴──────────────────────────┴──────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Grid System

### 3.3.1 Content Grids

```css
/* Metric Cards Grid (Management Dashboard) */
.grid-metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

/* Song Card Grid (Library Title View) */
.grid-songs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px;
}

/* Number Tiles Grid (Library Number View) */
.grid-numbers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
  padding: 16px;
}

/* Settings Form Grid */
.grid-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Inspector Stats Grid */
.grid-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
```

---

## 3.4 Content Density Rules

### 3.4.1 Standard Mode (Default)

- Card padding: 16-20px
- Row height: 56-66px
- Gap between items: 8-12px
- Section spacing: 24-32px

### 3.4.2 Compact Mode (Focus/Dense Views)

- Card padding: 10-12px
- Row height: 44-52px
- Gap between items: 4-6px
- Section spacing: 16px

**Trigger:** `management-studio--focus` class, `isFocusMode` state

### 3.4.3 Presentation Mode (Projection)

- Larger text sizes
- Higher contrast
- Minimal UI chrome
- Maximum content area

---

## 3.5 Spacing Rhythm

### 3.5.1 Vertical Rhythm

```
Page Header → 18-24px top padding
Section Title → 16px bottom margin
Content Area → 12-16px gap between items
Card Internal → 14-20px padding
Footer → 12-16px padding
```

### 3.5.2 Horizontal Rhythm

```
Page Margins → 20-28px
Panel Padding → 16-24px
Card Padding → 14-20px
Inline Gap → 8-12px
Icon-to-text → 6-8px
```

---

## 3.6 Resizable Panel Standards

### 3.6.1 Panel Constraints

```typescript
// From usePanelLayoutStore.ts
export const PANEL_CONSTRAINTS = {
  'projection-bottom': {
    minSizes: [20, 30, 25],
    maxSizes: [40, 55, 45],
    defaultSizes: [25, 40, 35]
  },
  'library-main': {
    minSizes: [60, 20],
    maxSizes: [85, 40],
    defaultSizes: [72, 28]
  },
  'management-workspace': {
    minSizes: [55, 25],
    maxSizes: [80, 45],
    defaultSizes: [65, 35]
  }
}
```

### 3.6.2 Resize Handle Standard

```css
.resize-handle {
  width: 4px;
  background: transparent;
  cursor: col-resize;
  transition: background 150ms;
  flex-shrink: 0;
}

.resize-handle:hover,
.resize-handle[data-resize-handle-active] {
  background: var(--color-brand-primary);
  opacity: 0.6;
}
```

---

## 3.7 Scroll Regions

### 3.7.1 Scrollbar Styling

```css
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}
```

### 3.7.2 Scroll Container Rules

- All scrollable containers: `overflow-y: auto`, `min-height: 0`
- Virtualized lists: Use `@tanstack/react-virtual` for > 100 items
- Horizontal scroll: Avoid; use responsive layout instead
- Scroll restoration: Preserve scroll position on tab/workspace switch

---

## 3.8 Ambient Background System

### 3.8.1 Mode Ambient Backgrounds

Each mode has a unique ambient background using radial gradients:

```css
/* Library Mode Ambient */
.library-pro-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% -10%, rgba(59, 130, 246, 0.12), transparent 38%),
    radial-gradient(circle at 80% -15%, rgba(139, 92, 246, 0.08), transparent 32%),
    radial-gradient(circle at 50% 110%, rgba(59, 130, 246, 0.05), transparent 40%);
}

/* Management Mode Ambient */
.management-studio::before {
  background:
    radial-gradient(circle at 16% -12%, rgba(59, 130, 246, 0.16), transparent 36%),
    radial-gradient(circle at 72% -18%, rgba(56, 189, 248, 0.09), transparent 32%),
    radial-gradient(circle at 50% 118%, rgba(59, 130, 246, 0.06), transparent 42%);
}

/* Projection Mode Ambient */
.projection-layout::before {
  background:
    radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.1), transparent 40%),
    radial-gradient(circle at 0% 50%, rgba(139, 92, 246, 0.06), transparent 30%);
}
```

**Rules:**
- Ambient gradients are decorative only (`pointer-events: none`)
- Maximum opacity: 0.2 for primary, 0.1 for secondary
- Never interfere with content readability
- Consistent blue/violet palette across all modes

---

## 3.9 Multi-Monitor Layout Rules

### 3.9.1 Window Positioning

```typescript
// Main Window: Primary display, user-positioned
// Projection Window: External display (auto-detected)
// Stage Display: Third display or primary fallback

const displays = screen.getAllDisplays()
const externalDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id)
const stageDisplay = displays.length > 2 ? displays[2] : screen.getPrimaryDisplay()
```

### 3.9.2 DPI Normalization

- Electron handles DPI scaling automatically via `devicePixelRatio`
- CSS pixels are logical pixels (DPI-independent)
- Images: Use `srcset` or SVG for crisp rendering at all DPIs
- Canvas elements: Scale by `window.devicePixelRatio`

### 3.9.3 Projection Safe Zones

```css
/* Projection Output Safe Zone */
.projection-content {
  padding: 5%;  /* 5% safe zone on all sides */
}

/* Text must remain within safe zone */
.projection-text {
  max-width: 90%;
  margin: 0 auto;
}
```

---

*End of Part 3: Layout Standard System*

---

# PART 4: WINDOW STANDARD SYSTEM

## 4.1 Main Window

### 4.1.1 Specification

| Property | Value |
|---|---|
| Default size | 1280×800px |
| Minimum size | 1024×700px |
| Frame | `false` (frameless) |
| Title bar style | `hidden` (Win32 overlay) |
| Title bar overlay | `{ color: '#0b0f17', symbolColor: '#cbd5e1', height: 40 }` |
| Auto-hide menu bar | `true` |
| Sandbox | Optional (env var) |
| Context isolation | `true` |
| Node integration | `false` |

### 4.1.2 Lifecycle

```
App ready
  → initDatabase()
  → setupIPC()
  → setupIPCHealth()
  → setupDisplayMonitor()
  → createMainWindow()
  → createProjectionWindow()

Main window ready-to-show
  → show()

Main window closed
  → close projectionWindow
  → close stageDisplayWindow
  → markCleanExit()
  → app.quit() (non-macOS)
```

### 4.1.3 State Restoration

On startup:
1. Check `getRecoveryState()` — if `needsRecovery: true`, offer recovery
2. Load `useModeStore` from localStorage (currentMode, theme, isFirstInstall)
3. Load settings from DB
4. Load hymnals and songs
5. Restore active playlist if session state exists

### 4.1.4 Focus Management

- Main window always receives focus on app activation
- Modal dialogs trap focus within themselves
- Overlay screens (song-editor, settings) receive focus on open
- Return focus to previous element on overlay close

### 4.1.5 Maximize/Restore

```typescript
// Win32: titleBarOverlay handles native controls
// Non-Win32: Custom TitleBarControls component
// State tracked in useAppStore.isMaximized
// IPC: window:maximized-changed event
```

### 4.1.6 Theme Sync

```typescript
// Theme changes propagate:
// 1. useModeStore.setTheme() → applyEffectiveTheme()
// 2. ipcRenderer.send('app:theme-mode-set', payload)
// 3. Main: updateTitleBarOverlayForTheme() + broadcastAppTheme()
// 4. All windows receive 'app:theme-updated' event
```

---

## 4.2 Projection Window

### 4.2.1 Specification

| Property | Value |
|---|---|
| Position | External display bounds |
| Size | Full display bounds |
| Fullscreen | `true` |
| Frame | `false` |
| Show on create | `false` (operator-controlled) |
| Context isolation | `true` |
| Node integration | `false` |

### 4.2.2 Lifecycle

```
createProjectionWindow()
  → Load projection.html
  → On did-finish-load: sendProjectionSnapshot()
  → Hidden until operator shows

showProjectionWindow()
  → show()
  → setFullScreen(true)

hideProjectionWindow()
  → hide()

Main window closed
  → projectionWindow.close()
```

### 4.2.3 State Synchronization

```typescript
// Projection state is maintained in main process:
let latestSlideData: unknown = null
let latestProjectionState = 'CLEAR'

// On new projection window (reconnect):
sendProjectionSnapshot(window)
  → send('projection:state-change', latestProjectionState)
  → send('projection:slide-update', latestSlideData)
  → send('projection:theme-update', getLatestProjectionTheme())
```

### 4.2.4 IPC Flow

```
Renderer (ProjectionMode)
  → window.api.projection.slideUpdate(slideData)
  → IPC: 'projection:slide-update'
  → Main: updateSlideData(slideData)
  → Broadcast to projectionWindow + stageDisplayWindow

Renderer (ProjectionMode)
  → window.api.projection.stateChange('LIVE')
  → IPC: 'projection:state-change'
  → Main: updateProjectionState('LIVE')
  → Broadcast to projectionWindow + stageDisplayWindow
```

### 4.2.5 Error Recovery

- If projection window crashes: recreated on next `showProjectionWindow()` call
- State snapshot sent immediately after `did-finish-load`
- IPC health monitor detects projection window heartbeat loss

### 4.2.6 Performance

- Projection window renders only `PresentationCanvas`
- No React DevTools in production
- Minimal IPC overhead (direct send, no invoke)
- Canvas rendering uses GPU acceleration

---

## 4.3 Stage Display Window

### 4.3.1 Specification

| Property | Value |
|---|---|
| Position | Third display or primary |
| Fullscreen | `false` (windowed, moveable) |
| Frame | `true` (native frame) |
| Title | "SION Stage Display" |
| Show on create | `false` |

### 4.3.2 Purpose

Shows current slide + next slide for musicians and singers. Operator-controlled visibility.

### 4.3.3 Content

```
[Current Slide Text (large)]
[Section Label]
[Next Slide Preview (smaller)]
[Song Title + Key + Tempo]
[Service Timer]
```

### 4.3.4 State Sync

Same IPC channels as projection window. Receives `projection:slide-update` and `projection:state-change`.

---

## 4.4 Modal Windows

### 4.4.1 Modal Hierarchy

```
App Shell
└── FloatingPortal (via @floating-ui/react)
    ├── TitleBarMenu dropdowns (z-1000)
    ├── TitleBarModeSwitcher dropdown (z-1000)
    ├── ContextMenu (z-1000)
    ├── Tooltips (z-1600)
    └── Modal Backdrop (z-1300)
        └── Modal Container (z-1400)
            ├── ConfirmDialog
            ├── CreatePlaylistDialog
            ├── DeleteConfirmDialog
            ├── SongRelationsModal
            ├── BiblePickerDialog
            └── [other modals]
```

### 4.4.2 Modal Sizes

```typescript
const MODAL_SIZES = {
  sm:   { width: '400px', maxHeight: '80vh' },
  md:   { width: '520px', maxHeight: '85vh' },
  lg:   { width: '640px', maxHeight: '90vh' },
  xl:   { width: '800px', maxHeight: '90vh' },
  full: { width: '90vw',  maxHeight: '90vh' }
}
```

### 4.4.3 Modal Animation

```typescript
// Framer Motion
const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { 
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
  },
  exit: { 
    opacity: 0, scale: 0.96, y: 8,
    transition: { duration: 0.15 }
  }
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}
```

### 4.4.4 Focus Trap Implementation

```typescript
// Use tabbable library (already in node_modules)
import { tabbable } from 'tabbable'

// On modal open:
// 1. Get all tabbable elements within modal
// 2. Focus first element
// 3. Trap Tab/Shift+Tab within modal
// 4. On close: return focus to trigger element
```

### 4.4.5 Modal State Machine

```
CLOSED → OPENING → OPEN → CLOSING → CLOSED
                     ↓
                  LOADING (async action)
                     ↓
                  ERROR (action failed)
                     ↓
                  SUCCESS (action succeeded) → CLOSING
```

---

## 4.5 Overlay Windows (Full-Screen Screens)

### 4.5.1 Overlay Types

| Overlay | Trigger | Z-Index | Animation |
|---|---|---|---|
| SongEditorScreen | `setScreen('song-editor')` | z-50 | scale + fade |
| SettingsScreen | `setScreen('settings')` | z-50 | slide from right |
| ImportExportScreen | `setScreen('import-export')` | z-50 | slide from bottom |
| BibleScreen | `setScreen('bible')` | z-50 | slide from right |

### 4.5.2 Overlay Animation

```typescript
// Song Editor: Scale in
initial: { opacity: 0, scale: 1.05 }
animate: { opacity: 1, scale: 1 }
exit: { opacity: 0, scale: 0.95 }
transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }

// Settings: Slide from right
initial: { opacity: 0, x: 100 }
animate: { opacity: 1, x: 0 }
exit: { opacity: 0, x: 100 }
transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }

// Import/Export: Slide from bottom
initial: { opacity: 0, y: 100 }
animate: { opacity: 1, y: 0 }
exit: { opacity: 0, y: 100 }
transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
```

### 4.5.3 Overlay Navigation

- All overlays have a back button returning to the previous mode
- Escape key closes overlay (when not in a text input)
- Overlays do NOT stack — only one overlay at a time
- Mode content is preserved underneath (not unmounted)

---

## 4.6 Floating Tool Windows

### 4.6.1 CommandPalette

```
Position: Centered, top-third of screen
Size: 560px wide, auto height (max 480px)
Z-Index: z-[1400]
Backdrop: rgba(0,0,0,0.5) blur
Animation: scale(0.96) → scale(1), fade
```

### 4.6.2 QuickJumpOverlay

```
Position: Centered
Size: 480px wide
Z-Index: z-[1400]
Backdrop: rgba(0,0,0,0.4)
Animation: fade + slide up
```

### 4.6.3 RuntimeInspector

```
Position: Right side panel (slide in from right)
Size: 480px wide, full height
Z-Index: z-[1300]
Backdrop: None (side panel)
Animation: translateX(100%) → translateX(0)
```

### 4.6.4 KeyboardCheatSheet

```
Position: Centered
Size: 640px wide, auto height
Z-Index: z-[1400]
Backdrop: rgba(0,0,0,0.5)
Animation: fade + scale
```

---

## 4.7 Title Bar Standard

### 4.7.1 Drag Region Rules

```css
/* Entire title bar is draggable */
.title-bar {
  -webkit-app-region: drag;
}

/* Interactive elements opt out */
.no-drag {
  -webkit-app-region: no-drag;
}
```

**Elements that MUST have `.no-drag`:**
- All buttons
- All menu triggers
- Mode switcher
- Status indicators (clickable ones)
- Window controls

### 4.7.2 Menu Behavior

```
Menu trigger click → open dropdown
Menu trigger hover (when another menu is open) → switch to this menu
Outside click → close all menus
Escape → close open menu
Alt+[key] → open corresponding menu
Arrow keys → navigate menu items
Enter → activate focused item
```

### 4.7.3 Mode Switcher Behavior

```
Click trigger → open dropdown
Select mode → setMode(mode) + close dropdown
Outside click → close dropdown
Escape → close dropdown
```

**Mode Switch Side Effects:**
- LIBRARY/MANAGEMENT: Hide projection window
- PROJECTION/BROADCAST: Show/recreate projection window
- All modes: Animate content transition (AnimatePresence)

### 4.7.4 Status Indicators

| Indicator | Clickable | Action | Condition |
|---|---|---|---|
| LIVE/CLEAR badge | No | — | Always in PROJECTION |
| Projection ON/OFF | Yes | toggle projection window | PROJECTION mode |
| Stage Display | Yes | toggle stage window | PROJECTION mode |
| Display count | Yes | open Display Settings | Always |
| Timer | Yes | start/stop/reset | PROJECTION mode |
| Clock | No | — | Always |
| Focus badge | No | — | PROJECTION + focus mode |

---

## 4.8 Window Performance Standards

### 4.8.1 Memory Management

```typescript
// On mode switch to LIBRARY/MANAGEMENT:
// Hide projection window (don't destroy — preserves state)
if (mode === 'LIBRARY' || mode === 'MANAGEMENT') {
  projectionWindow?.hide()
}

// On mode switch to PROJECTION/BROADCAST:
// Show or recreate projection window
if (!projectionWindow || projectionWindow.isDestroyed()) {
  createProjectionWindow()
} else {
  projectionWindow.show()
}
```

### 4.8.2 IPC Performance

- Use `ipcMain.on` (fire-and-forget) for projection updates — no response needed
- Use `ipcMain.handle` (invoke) for data queries — response required
- Batch multiple settings updates when possible
- Debounce panel layout saves (200ms)

### 4.8.3 Render Performance

- Virtualize all lists > 100 items (`@tanstack/react-virtual`)
- Memoize expensive computations (`useMemo`)
- Memoize callbacks (`useCallback`)
- Avoid re-renders in projection window (minimal state)
- Use `React.memo` for pure display components

---

*End of Part 4: Window Standard System*

---

# PART 5: INTERACTION STANDARDS

## 5.1 Hover Interaction Standard

### 5.1.1 Standard Hover (Cards, Rows, Buttons)

```css
/* Standard hover: lift + border glow */
.hoverable {
  transition:
    transform 160ms var(--ease-out-expo),
    border-color 180ms var(--ease-out-expo),
    background 180ms var(--ease-out-expo),
    box-shadow 180ms var(--ease-out-expo);
}

.hoverable:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.08);
  box-shadow: var(--shadow-elevation-3);
}
```

### 5.1.2 Card Hover (Stronger Lift)

```css
.card-hoverable:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: var(--shadow-elevation-4), var(--shadow-glow-sm);
}
```

### 5.1.3 Icon Button Hover

```css
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-primary);
}
```

---

## 5.2 Selection Interaction Standard

### 5.2.1 Single Selection (Rows, Cards)

```css
.selectable.is-selected {
  border-color: rgba(59, 130, 246, 0.24);
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.18),
    rgba(59, 130, 246, 0.06) 46%,
    rgba(255, 255, 255, 0.02)
  );
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.08),
    0 18px 44px rgba(37, 99, 235, 0.12);
}

/* Left accent bar */
.selectable.is-selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 999px;
  background: var(--color-brand-primary);
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.45);
}
```

### 5.2.2 Multi-Selection

- Checkbox appears on hover and when any item is selected
- Shift+Click: range select
- Ctrl+Click: toggle individual selection
- Ctrl+A: select all visible
- Bulk action bar appears when items are selected

---

## 5.3 Drag & Drop Standard

### 5.3.1 Draggable Items

```typescript
// Using @dnd-kit/sortable
// Drag handle: entire row or dedicated handle icon
// Visual feedback during drag:
//   - Dragging item: opacity 0.8, elevated shadow
//   - Drop target: blue border, background highlight
//   - Placeholder: dashed border, same height as item
```

### 5.3.2 Drop Zones

```css
.drop-zone-active {
  border: 2px dashed rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.05);
}

.drop-zone-over {
  border-color: rgba(59, 130, 246, 0.7);
  background: rgba(59, 130, 246, 0.1);
}
```

---

## 5.4 Keyboard Navigation Standard

### 5.4.1 Global Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Ctrl+P` | Command Palette | Global |
| `Ctrl+K` | Command Palette / Search focus | Global |
| `?` | Keyboard shortcuts | Global |
| `Ctrl+Shift+I` | Runtime Inspector | Global |
| `Ctrl+Shift+F` | Focus Live Mode | PROJECTION |
| `Ctrl+1` | Library Mode | Global |
| `Ctrl+2` | Projection Mode | Global |
| `Ctrl+3` | Management Mode | Global |
| `Ctrl+4` | Broadcast Mode | Global |
| `Ctrl+N` | New Song | PROJECTION/MANAGEMENT |
| `Ctrl+,` | Settings | Global |
| `Ctrl+I` | Import/Export | Global |
| `Ctrl+B` | Bible Screen | Global |

### 5.4.2 Projection Mode Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | TAKE (cue → program) |
| `→` / `PageDown` | Next slide |
| `←` / `PageUp` | Previous slide |
| `Shift+→` | Cue next slide |
| `Shift+←` | Cue previous slide |
| `B` | Toggle Black |
| `F` | Toggle Freeze |
| `Esc` / `C` | Clear screen |
| `Ctrl+→` | Next song in playlist |
| `Ctrl+←` | Previous song in playlist |
| `1-9` | Jump to playlist item N |
| `G` | Quick Jump (slide) |
| `S` | Quick Jump (section) |
| `Ctrl+G` | Quick Jump overlay |
| `Ctrl+Enter` | Update live (dirty state) |
| `Ctrl+Esc` | Discard changes (dirty state) |

### 5.4.3 List/Grid Navigation

```
↑/↓: Navigate items
Enter: Select/activate item
Space: Toggle selection (multi-select)
Home: First item
End: Last item
PageUp/PageDown: Scroll by page
Ctrl+A: Select all
Delete: Delete selected (with confirmation)
F2: Rename/edit selected
```

### 5.4.4 Modal Navigation

```
Tab: Next focusable element
Shift+Tab: Previous focusable element
Enter: Confirm (primary action)
Escape: Cancel/close
```

---

## 5.5 Form Interaction Standard

### 5.5.1 Validation

```typescript
// Validation timing:
// - Required fields: on blur (not on change)
// - Format validation: on blur
// - Async validation (duplicate check): on blur with debounce
// - Submit validation: on submit attempt

// Error display:
// - Inline below field
// - Red border on field
// - Error icon in field
// - Error message: 11px, rose-400
```

### 5.5.2 Save States

```typescript
type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

// Visual indicators:
// saved:  green pill "Tersimpan"
// dirty:  amber pill "Belum disimpan"
// saving: spinner + "Menyimpan..."
// error:  red pill "Gagal disimpan"
```

### 5.5.3 Autosave (Future)

- Debounced autosave: 2000ms after last change
- Visual indicator: "Autosave..." → "Tersimpan"
- Manual save always available

---

## 5.6 Loading State Standard

### 5.6.1 Page Loading

```typescript
// Initial load: SplashScreen (full-screen)
// Mode switch: AnimatePresence fade (no loading indicator)
// Data loading: Skeleton placeholders in content area
// Search: Debounced, no loading indicator for < 300ms
```

### 5.6.2 Action Loading

```typescript
// Button loading: spinner replaces icon, text dims
// Form submit: disable all inputs + buttons
// Async operations: show progress if > 1 second
// Import: ImportProgressDialog for large operations
```

### 5.6.3 Skeleton Loading

```css
/* Skeleton for song rows */
.skeleton-row {
  height: 66px;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 5.7 Error State Standard

### 5.7.1 Toast Errors

```typescript
// Use for: transient errors, operation failures
// Duration: 3000ms
// Format: "Gagal [action]: [reason]"
// Example: "Gagal menyimpan lagu: Nomor sudah ada"
```

### 5.7.2 Inline Errors

```typescript
// Use for: form validation errors
// Position: Below the field
// Format: Short, actionable message
// Example: "Nomor lagu wajib diisi"
```

### 5.7.3 Error Boundaries

```typescript
// ErrorBoundary wraps each mode
// On error: Show error state with retry button
// Log error to console (dev) or error service (prod)
```

---

*End of Part 5: Interaction Standards*

---

# PART 6: ACCESSIBILITY STANDARDS

## 6.1 WCAG 2.1 AA Compliance Targets

| Criterion | Target | Implementation |
|---|---|---|
| Color contrast (text) | 4.5:1 minimum | Verify with contrast checker |
| Color contrast (large text) | 3:1 minimum | 18px+ or 14px+ bold |
| Focus indicators | Visible, 3:1 contrast | 2px brand-primary ring |
| Keyboard navigation | Full keyboard access | Tab order, arrow keys |
| Screen reader | Semantic HTML + ARIA | Labels, roles, descriptions |
| Reduced motion | Respect preference | `prefers-reduced-motion` |
| Touch targets | 44×44px minimum | All interactive elements |

## 6.2 Focus Management

### 6.2.1 Focus Ring Standard

```css
/* Global focus ring */
:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.7);
  outline-offset: 2px;
  border-radius: inherit;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 6.2.2 Focus Order

- Tab order follows visual reading order (left-to-right, top-to-bottom)
- Modal dialogs trap focus within themselves
- Overlay screens receive focus on open
- Focus returns to trigger on close

## 6.3 ARIA Standards

### 6.3.1 Required ARIA Attributes

```typescript
// Icon-only buttons
<button aria-label="Delete song" title="Delete song">
  <Trash2 size={16} />
</button>

// Loading states
<button aria-busy={isLoading} aria-disabled={isLoading}>
  {isLoading ? <Spinner /> : 'Save'}
</button>

// Modals
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Create Playlist</h2>
</div>

// Lists
<ul role="listbox" aria-label="Songs">
  <li role="option" aria-selected={isSelected}>...</li>
</ul>

// Status indicators
<div role="status" aria-live="polite">
  {projectionState === 'LIVE' ? 'Live' : 'Clear'}
</div>
```

## 6.4 Reduced Motion

```css
/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// Framer Motion: respect reduced motion
import { useReducedMotion } from 'framer-motion'

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion()
  
  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : 0 }}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
    />
  )
}
```

## 6.5 Keyboard Accessibility Checklist

- [ ] All interactive elements reachable by Tab
- [ ] All interactive elements activatable by Enter/Space
- [ ] Dropdowns navigable by Arrow keys
- [ ] Modals trap focus
- [ ] Escape closes modals/dropdowns
- [ ] Skip links for main content (future)
- [ ] Logical tab order
- [ ] No keyboard traps (except intentional modal traps)

---

# PART 7: ENGINEERING STANDARDS

## 7.1 Component File Structure

```
src/renderer/src/components/
├── design-system/           ← Atomic + molecular components
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── Input.tsx
│   ├── SearchInput.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Toggle.tsx
│   ├── Badge.tsx
│   ├── Tooltip.tsx
│   ├── Loader.tsx
│   ├── Kbd.tsx
│   ├── SegmentedControl.tsx
│   ├── MetricCard.tsx
│   ├── SongArtwork.tsx
│   ├── StatusBadge.tsx
│   ├── EmptyState.tsx          ← Exists, keep
│   ├── ContextMenu.tsx
│   ├── SurfacePanel.tsx        ← Exists, keep
│   ├── ToolbarGroup.tsx        ← Exists, keep
│   ├── ResizablePanels.tsx     ← Exists, keep
│   ├── EditorShell.tsx         ← Exists, keep
│   └── index.ts
├── modals/                  ← Modal components
│   ├── Modal.tsx            ← Base modal
│   ├── ConfirmDialog.tsx
│   ├── CreatePlaylistDialog.tsx
│   ├── DeleteConfirmDialog.tsx
│   ├── SongRelationsModal.tsx
│   ├── BiblePickerDialog.tsx
│   ├── AnnouncementEditor.tsx
│   ├── MediaImportDialog.tsx
│   └── index.ts
├── library/                 ← Library mode components (existing)
├── titlebar/                ← Title bar components (existing)
└── [other existing components]
```

## 7.2 TypeScript Standards

### 7.2.1 Component Props Pattern

```typescript
// Always use explicit interface, not inline type
interface ComponentProps {
  // Required props first
  value: string
  onChange: (value: string) => void
  
  // Optional props with defaults
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  
  // Event handlers
  onClick?: () => void
  onFocus?: () => void
  onBlur?: () => void
  
  // Children
  children?: React.ReactNode
}

// Default props via destructuring
function Component({
  size = 'md',
  disabled = false,
  className = '',
  ...props
}: ComponentProps): React.JSX.Element {
  // ...
}
```

### 7.2.2 Return Type

```typescript
// Always specify return type
function Component(): React.JSX.Element { ... }
```

### 7.2.3 Event Handlers

```typescript
// Explicit event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => { ... }
const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => { ... }
const handleKeyDown = (e: React.KeyboardEvent): void => { ... }
```

## 7.3 CSS Class Naming Convention

### 7.3.1 BEM-Inspired Pattern

```
[mode]-[component]__[element]--[modifier]

Examples:
.library-pro-song-card
.library-pro-song-card__body
.library-pro-song-card__body--selected
.management-browser__row
.management-browser__row.is-selected
.song-studio__topbar
```

### 7.3.2 State Classes

```
.is-active      ← Active/selected state
.is-open        ← Open state (dropdowns, panels)
.is-loading     ← Loading state
.is-disabled    ← Disabled state
.is-error       ← Error state
.is-dirty       ← Unsaved changes
.is-live        ← Live/broadcasting state
.is-selected    ← Selected in list/grid
.is-focused     ← Keyboard focused
```

## 7.4 Store Integration Standards

### 7.4.1 Store Access Pattern

```typescript
// Prefer selector pattern for performance
const selectedSong = useAppStore(s => s.selectedSong)
const { setScreen, showToast } = useAppStore()

// Avoid subscribing to entire store
// BAD: const store = useAppStore()
// GOOD: const { value } = useAppStore(s => ({ value: s.value }))
```

### 7.4.2 IPC Call Pattern

```typescript
// Always handle errors
const handleAction = async (): Promise<void> => {
  try {
    await window.api.songs.update(id, data)
    showToast('Lagu berhasil disimpan', 'success')
    await loadSongs()
  } catch (err) {
    logger.error('Failed to update song:', err)
    showToast('Gagal menyimpan lagu', 'error')
  }
}
```

### 7.4.3 Loading State Pattern

```typescript
const [isLoading, setIsLoading] = useState(false)

const handleAction = async (): Promise<void> => {
  setIsLoading(true)
  try {
    await window.api.songs.delete(id)
    showToast('Lagu berhasil dihapus', 'success')
  } catch (err) {
    showToast('Gagal menghapus lagu', 'error')
  } finally {
    setIsLoading(false)
  }
}
```

## 7.5 Performance Standards

### 7.5.1 Memoization Rules

```typescript
// Memoize expensive computations
const filteredSongs = useMemo(() => {
  return songs.filter(song => matchesSong(song, query))
}, [songs, query])

// Memoize callbacks passed to children
const handleSelect = useCallback((song: Song) => {
  setSelectedSong(song)
}, [setSelectedSong])

// Memoize pure display components
const SongRow = React.memo(({ song, onSelect }: SongRowProps) => {
  return <div onClick={() => onSelect(song)}>{song.title}</div>
})
```

### 7.5.2 Virtualization Rules

```typescript
// Use @tanstack/react-virtual for lists > 100 items
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: songs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 66, // row height
  overscan: 5
})
```

### 7.5.3 Debounce Rules

```typescript
// Search: 300ms debounce
// Panel layout save: 200ms debounce
// Autosave: 2000ms debounce
// Resize handler: 100ms debounce
```

## 7.6 Error Handling Standards

### 7.6.1 IPC Error Handling

```typescript
// All IPC calls wrapped in try/catch
// Errors logged with logger.error()
// User-facing errors shown via showToast()
// Never expose raw error messages to users
// Sanitize error messages (max 240 chars)
```

### 7.6.2 Component Error Boundaries

```typescript
// ErrorBoundary wraps each major section
// Fallback UI: EmptyState with error variant + retry button
// Log errors to console in development
```

### 7.6.3 Validation Errors

```typescript
// Form validation: Zod schemas
// IPC validation: safeIpcHandle wrapper
// User feedback: inline error messages
// Never crash on invalid data — show error state
```

---

## 7.7 Implementation Checklist

### 7.7.1 New Component Checklist

- [ ] TypeScript interface for props
- [ ] Explicit return type `React.JSX.Element`
- [ ] All interactive states (hover, focus, active, disabled, loading)
- [ ] `aria-label` on icon-only buttons
- [ ] `focus-visible` ring
- [ ] Error state handling
- [ ] Empty state handling
- [ ] Loading state handling
- [ ] Keyboard navigation
- [ ] `prefers-reduced-motion` support
- [ ] Exported from `design-system/index.ts`

### 7.7.2 New Page/Mode Checklist

- [ ] Ambient background layer
- [ ] Correct layout template (standard/projection/settings/editor)
- [ ] Command bar with search
- [ ] Empty state for no data
- [ ] Loading skeleton
- [ ] Error boundary
- [ ] Keyboard shortcuts registered
- [ ] IPC calls with error handling
- [ ] Store integration
- [ ] Mode-specific title bar menu items

### 7.7.3 New Modal Checklist

- [ ] Correct size variant
- [ ] Header with title + close button
- [ ] Body with scrollable content
- [ ] Footer with cancel + confirm
- [ ] Focus trap
- [ ] Escape closes
- [ ] Loading state during async
- [ ] Error state on failure
- [ ] `role="dialog"` + `aria-modal="true"`
- [ ] `aria-labelledby` pointing to title
- [ ] Animation (scale + fade)
- [ ] Backdrop click behavior defined

---

## 7.8 CSS Architecture

### 7.8.1 File Organization

```
src/renderer/src/assets/main.css
├── @import 'tailwindcss'
├── @theme { ... }           ← Design tokens (Tailwind v4)
├── /* Global resets */
├── /* Scrollbar styles */
├── /* Title bar styles */
├── /* Management Mode styles */
├── /* Library Mode styles */
├── /* Song Editor styles */
├── /* Settings styles */
├── /* Projection Mode styles */
├── /* Modal styles */
└── /* Utility classes */
```

### 7.8.2 Tailwind vs Custom CSS

**Use Tailwind for:**
- Layout (flex, grid, padding, margin)
- Typography (text-*, font-*)
- Colors (bg-*, text-*, border-*)
- Responsive utilities

**Use Custom CSS for:**
- Complex multi-property transitions
- Pseudo-elements (::before, ::after)
- Complex gradients
- Animation keyframes
- Mode-specific component styles
- Glassmorphism effects

### 7.8.3 CSS Custom Properties

All design tokens are defined as CSS custom properties in `@theme {}` block (Tailwind v4 syntax). This makes them available as Tailwind utilities AND as raw CSS variables.

```css
/* Available as Tailwind utility: */
<div class="bg-bg-surface text-text-primary border-border-default">

/* Available as CSS variable: */
.custom-element {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}
```

---

## 7.9 Foundation System Adoption Plan

### Phase 1 (Current): Foundation Documentation
- ✅ Design token system documented
- ✅ Component standards documented
- ✅ Layout standards documented
- ✅ Window standards documented

### Phase 2: Token Consolidation
- Audit existing CSS for hardcoded values
- Replace all hardcoded colors with token references
- Add missing tokens (state colors, responsive tokens)
- Add `prefers-reduced-motion` support

### Phase 3: Component Library Build
- Extract shared components from existing modes
- Build missing atomic components (Button, Input, Badge, etc.)
- Build missing molecular components (SearchInput, SegmentedControl, etc.)
- Build missing modal components (ConfirmDialog, CreatePlaylistDialog, etc.)
- Update design-system/index.ts exports

### Phase 4: Mode Standardization
- Apply standard layout templates to all modes
- Standardize command bars
- Standardize inspector panels
- Standardize empty states
- Standardize loading states

### Phase 5: Accessibility Pass
- Add focus rings to all interactive elements
- Add ARIA labels to all icon-only buttons
- Add `prefers-reduced-motion` to all animations
- Keyboard navigation audit
- Screen reader testing

---

## APPENDIX A: Quick Reference — Token Cheat Sheet

```
BACKGROUNDS:
bg-base (#0d0f17) → page canvas
bg-surface (#151826) → cards, panels
bg-elevated (#1b2031) → floating elements
bg-active (#2d3450) → selected state

BRAND:
brand-primary (#3b82f6) → primary actions
brand-secondary (#8b5cf6) → secondary
brand-accent (#f59e0b) → warnings
accent (#38bdf8) → info/next

TEXT:
text-primary (#f8fafc) → headings, data
text-secondary (#94a3b8) → body, labels
text-muted (#64748b) → help, timestamps
text-disabled (#475569) → disabled

BORDERS:
border-subtle (white/6%) → dividers
border-default (white/8%) → cards
border-strong (white/12%) → emphasis
border-brand (blue/40%) → focus, active

LIVE:
program (#ff3b30) → LIVE output
preview (#34c759) → preview output
next-blue (#38bdf8) → NEXT state

RADIUS:
button: 10px
input: 10px
card: 16px
panel: 12px
badge: 6px
modal: 20px

SPACING:
card: 20px
panel: 24px
section: 32px
workspace: 40px

ANIMATION:
fast: 150ms ease-out-expo
normal: 200ms ease-out-expo
slow: 300ms ease-premium
page: 400ms ease-premium
```

---

## APPENDIX B: Component Dependency Map

```
Button
  ← IconButton (extends)
  ← ToolbarButton (extends)

Input
  ← SearchInput (extends)

Modal (base)
  ← ConfirmDialog (extends)
  ← CreatePlaylistDialog (extends)
  ← DeleteConfirmDialog (extends)
  ← SongRelationsModal (extends)
  ← BiblePickerDialog (extends)

SurfacePanel
  ← MetricCard (uses)
  ← InspectorPanel (uses)

EmptyState
  ← Used in: Library, Management, Projection, Settings

SongArtwork
  ← SongCard (uses)
  ← NumberTile (uses)
  ← InspectorPanel (uses)
  ← ManagementInspector (uses)

StatusBadge
  ← ManagementBrowserRow (uses)
  ← SongCard (uses)

SegmentedControl
  ← LibraryMode tabs (uses)
  ← ManagementMode status filter (uses)
```

---

*Document: Foundation System Architecture v1.0*  
*SION Media Enterprise Redesign — Phase 1*  
*Generated: May 2026*  
*Status: Production-Ready Implementation Specification*
