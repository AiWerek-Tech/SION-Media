# SION Media Design System V4

**Version:** 4.0.0  
**Last Updated:** 2026-05-12  
**Status:** Production Ready

---

## App-wide Consistency Rules

### Button System (required)

- Use `btn-premium` variants for all new UI.
- Do not introduce new usages of legacy `.btn`, `.btn-primary`, `.btn-ghost` for page-level CTAs.
- Recommended mapping:
  - Primary CTA → `btn-premium btn-premium-primary`
  - Secondary → `btn-premium btn-premium-ghost`
  - Destructive → `btn-premium btn-premium-danger`

### Form Controls (required)

- Inputs/selects should use `input-premium` to keep consistent height, focus ring, and surface treatment.

### Panel/Surface System (required)

- **Page-level panels**: Use `card-modern` (with `card-modern--interactive` for clickable cards).
- **Overlay surfaces only**: `glass-panel` / `glass-panel-strong` reserved for:
  - Toast notifications
  - Context menus
  - Dropdown menus
  - Modal dialogs
  - Overlay toolbars
- Do not use `glass-panel` for primary page content or workspace panels.

## Overview

SION Media Design System V4 adalah **production-grade design token system** untuk aplikasi broadcast-production. Fokus pada:

- **Semantic clarity** — Token yang bermakna, bukan sekadar nilai
- **Surface elevation** — Kedalaman visual tanpa border agresif
- **State awareness** — Warna untuk health, severity, status
- **Modern hierarchy** — Typography scale yang jelas
- **Breathing room** — Spacing yang nyaman untuk operator

---

## Token Categories

### 1. Semantic Colors (Emerald/Amber/Rose/Cyan/Zinc)

Modern palette untuk status dan severity:

| Palette     | Usage                              |
| ----------- | ---------------------------------- |
| **Emerald** | Success, OK, Completed             |
| **Amber**   | Warning, Degraded, Medium severity |
| **Rose**    | Error, Broken, Critical            |
| **Cyan**    | Info, Low severity                 |
| **Zinc**    | Neutral, Unknown, Idle             |

```css
/* State Colors */
--color-state-ok: var(--color-emerald-500);
--color-state-degraded: var(--color-amber-500);
--color-state-broken: var(--color-rose-500);
--color-state-unknown: var(--color-zinc-500);

/* Severity Colors */
--color-severity-low: var(--color-cyan-500);
--color-severity-medium: var(--color-amber-500);
--color-severity-high: var(--color-rose-400);
--color-severity-critical: var(--color-rose-600);
```

---

### 2. Typography Scale

```css
/* Semantic Sizes */
--text-workspace-title: 28px; /* Hero area */
--text-section-title: 18px; /* Panel headers */
--text-card-header: 14px; /* Card titles */
--text-label: 11px; /* Labels, badges */
--text-data: 14px; /* Data values */
--text-console: 12px; /* Console, logs */

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.6;
--leading-loose: 1.8;
```

---

### 3. Spacing System

```css
/* 8pt Grid with Breathing Room */
--spacing-card: 20px;
--spacing-panel: 24px;
--spacing-section: 32px;
--spacing-workspace: 40px;
```

---

### 4. Radius System

```css
/* Semantic Radius */
--radius-card: 16px;
--radius-panel: 12px;
--radius-button: 10px;
--radius-input: 10px;
--radius-badge: 6px;
```

---

## Component System

### Modern Card System

```html
<!-- Base card with surface elevation -->
<div class="card-modern">
  <div class="card-modern__header">
    <span class="card-modern__title">Title</span>
    <span class="card-modern__subtitle">SUBTITLE</span>
  </div>
  <div class="card-modern__body">Content</div>
</div>

<!-- Interactive card with hover lift -->
<div class="card-modern card-modern--interactive">...</div>

<!-- Status variants -->
<div class="card-modern card-modern--success">...</div>
<div class="card-modern card-modern--warning">...</div>
<div class="card-modern card-modern--danger">...</div>
```

**Key Principles:**

- No aggressive borders → surface elevation instead
- Subtle hover states → lift effect
- Glassmorphism-ready → backdrop-filter support

---

### Status Badges

```html
<!-- Provider health -->
<span class="status-badge status-badge--ok">
  <span class="status-badge__dot"></span>
  OK
</span>

<span class="status-badge status-badge--degraded">
  <span class="status-badge__dot"></span>
  DEGRADED
</span>

<span class="status-badge status-badge--broken">
  <span class="status-badge__dot"></span>
  BROKEN
</span>

<!-- Conflict severity -->
<span class="status-badge status-badge--low">LOW</span>
<span class="status-badge status-badge--medium">MEDIUM</span>
<span class="status-badge status-badge--high">HIGH</span>
<span class="status-badge status-badge--critical">CRITICAL</span>
```

---

### Empty States

```html
<div class="empty-state">
  <div class="empty-state__icon">
    <Icon name="inbox" />
  </div>
  <div class="empty-state__title">No active task</div>
  <div class="empty-state__description">Start a dry run to begin the acquisition workflow</div>
</div>
```

---

### Activity Stream (Modern Console)

```html
<div class="activity-stream">
  <div class="activity-item activity-item--success">
    <span class="activity-item__timestamp">12:01:22</span>
    <Icon class="activity-item__icon" name="check" />
    <span class="activity-item__message">Fetched song #1</span>
    <span class="activity-item__detail">234ms</span>
  </div>

  <div class="activity-item activity-item--warning">
    <span class="activity-item__timestamp">12:01:24</span>
    <Icon class="activity-item__icon" name="alert" />
    <span class="activity-item__message">Conflict detected</span>
  </div>
</div>
```

---

### Orchestration Timeline

```html
<div class="orchestration-timeline">
  <div class="timeline-step timeline-step--completed">
    <Icon class="timeline-step__icon" name="check" />
    FETCH
  </div>
  <div class="timeline-connector timeline-connector--active"></div>
  <div class="timeline-step timeline-step--active">
    <Icon class="timeline-step__icon" name="loader" />
    NORMALIZE
  </div>
  <div class="timeline-connector"></div>
  <div class="timeline-step">VALIDATE</div>
  <div class="timeline-connector"></div>
  <div class="timeline-step">IMPORT</div>
</div>
```

---

### Command Center Header

```html
<div class="command-header">
  <div class="command-header__left">
    <span class="status-badge status-badge--ok">
      <span class="status-badge__dot"></span>
      READY
    </span>
    <span class="text-label">Provider: Alkitab.app</span>
  </div>
  <div class="command-header__right">
    <div class="command-stat">
      <span class="command-stat__value">10</span>
      <span class="command-stat__label">Queue</span>
    </div>
    <div class="command-stat">
      <span class="command-stat__value">0</span>
      <span class="command-stat__label">Success</span>
    </div>
    <div class="command-stat">
      <span class="command-stat__value">0</span>
      <span class="command-stat__label">Failed</span>
    </div>
  </div>
</div>
```

---

## Migration Guide

### From Border-Heavy to Surface Elevation

**Before:**

```css
.panel {
  border: 1px solid #2a2a2a;
  background: #151826;
}
```

**After:**

```css
.panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: var(--shadow-elevation-2);
}
```

### From Flat Colors to Semantic Colors

**Before:**

```css
.status-success {
  color: #10b981;
}
.status-warning {
  color: #f59e0b;
}
.status-error {
  color: #ef4444;
}
```

**After:**

```css
.status-badge--ok {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-emerald-400);
}
```

---

## Design Principles

### 1. Surface Elevation > Borders

Modern UI menggunakan **depth** bukan **lines** untuk separation.

```
❌ Border-heavy: Terlihat kuno, WinForms-like
✅ Surface elevation: Premium, modern, depth-aware
```

### 2. Semantic Token Names

Gunakan nama yang bermakna:

```
❌ --color-green-500
✅ --color-state-ok

❌ --text-2xl
✅ --text-section-title
```

### 3. Breathing Room

Operator-facing UI perlu **visual rest**:

```
❌ padding: 8px everywhere
✅ --spacing-card: 20px, --spacing-panel: 24px
```

### 4. State-Aware Colors

Setiap state punya palette konsisten:

| State    | Background | Text        | Dot Glow    |
| -------- | ---------- | ----------- | ----------- |
| OK       | emerald-12 | emerald-400 | emerald-500 |
| DEGRADED | amber-12   | amber-400   | amber-500   |
| BROKEN   | rose-12    | rose-400    | rose-500    |

---

## Future Extensions

- **Motion Language** — Framer Motion integration
- **Keyboard-first UX** — Focus states, shortcuts
- **Adaptive Layout** — Responsive panels
- **Theme Variants** — High contrast, color-blind friendly

---

## Files

| File                               | Purpose                    |
| ---------------------------------- | -------------------------- |
| `src/renderer/src/assets/main.css` | Design tokens & components |
| `.dev-docs/design-system-v4.md`        | This documentation         |

---

**Document Version:** 1.0  
**Author:** Cascade (AI Assistant)
