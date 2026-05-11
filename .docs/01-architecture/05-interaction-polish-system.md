# Interaction Polish System

> Desktop-class interaction language for SION Media

## Overview

This document defines the interaction polish layer — motion consistency, focus behavior, scroll UX, and perceived performance patterns that make the application feel like professional desktop software.

---

## Motion System

### Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 50ms | Toolbar buttons, icon toggles |
| `--duration-fast` | 150ms | Buttons, hover states, opacity changes |
| `--duration-normal` | 200ms | Surface transitions, list items, cards |
| `--duration-slow` | 300ms | Panel transitions, dense list hover |
| `--duration-slower` | 400ms | Modal transitions, large area changes |

### Easing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-premium` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for all UI transitions |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations, reveals |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful micro-interactions |
| `--ease-in-out-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Fade transitions |

### Interaction Utility Classes

```css
/* Standard hover transition for clickable surfaces */
.interaction-surface {
  transition:
    background-color var(--duration-normal) var(--ease-premium),
    box-shadow var(--duration-normal) var(--ease-premium),
    border-color var(--duration-normal) var(--ease-premium),
    transform var(--duration-normal) var(--ease-premium);
}

/* Fast interaction for buttons/icons */
.interaction-fast {
  transition:
    background-color var(--duration-fast) var(--ease-premium),
    color var(--duration-fast) var(--ease-premium),
    opacity var(--duration-fast) var(--ease-premium);
}

/* Fade for opacity-only changes */
.interaction-fade {
  transition: opacity var(--duration-normal) var(--ease-in-out-smooth);
}
```

---

## Focus System

### Desktop-Class Focus Ring

All interactive elements use a **double-ring focus indicator** for accessibility and desktop feel:

```css
button:focus-visible,
input:focus-visible,
[tabindex]:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-bg-base),      /* Inner ring (background) */
    0 0 0 4px rgba(59, 130, 246, 0.45);  /* Outer ring (brand) */
  border-radius: var(--radius-sm);
}
```

### Keyboard Navigation Classes

| Class | Purpose |
|-------|---------|
| `.keyboard-item` | Focusable item in a list/grid with visible focus ring |
| `.keyboard-active` | Selected item (not focused) — subtle background highlight |

### Focus Visibility Rules

1. **Never use `outline: none` without replacement** — always provide a visible focus indicator
2. **Focus ring uses brand color** — consistent with overall design language
3. **Focus ring respects border-radius** — matches element shape
4. **Focus is always visible** — no hidden focus states

---

## Scroll Behavior

### Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 5px;  /* Subtle, non-intrusive */
  height: 5px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);  /* Very subtle */
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);  /* Slightly visible on hover */
}
```

### Scroll Shadow Indicators

Visual cues for scrollable content:

| Class | Usage |
|-------|-------|
| `.scroll-shadow-top` | Content extends above viewport |
| `.scroll-shadow-bottom` | Content extends below viewport |
| `.scroll-shadow-both` | Content extends both directions |

### Scrollbar Hiding

For edge areas where scrollbar is not needed:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Loading States

### Skeleton Loading

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

**Variants:**
- `.skeleton-text` — Text placeholder (small radius)
- `.skeleton-card` — Card placeholder (medium radius)
- `.skeleton-avatar` — Avatar placeholder (full radius)

### Loading Spinner

```css
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-brand-primary);
  border-radius: 50%;
  animation: spinner-rotate 0.6s linear infinite;
}
```

---

## Hover Affordance

### Subtle Lift

For cards and elevated items:

```css
.hover-lift:hover {
  transform: translateY(-1px);
}
```

### Glow Effect

For primary actions:

```css
.hover-glow:hover {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}
```

### Drag Cursor Hint

For draggable items:

```css
.grab-hint {
  cursor: grab;
}

.grab-hint:active {
  cursor: grabbing;
}
```

---

## Perceived Performance

### Instant Click Feedback

```css
.click-feedback:active {
  transform: scale(0.98);
}
```

### Optimistic Animations

For new items appearing:

```css
.fade-in-up {
  animation: fade-in-up var(--duration-normal) var(--ease-premium);
}
```

For items being removed:

```css
.fade-out {
  animation: fade-out var(--duration-fast) var(--ease-premium) forwards;
}
```

---

## Interaction Density Tuning

### Quieter Hover

For dense lists where hover should not be distracting:

```css
.quiet-hover {
  transition: background-color var(--duration-slow) var(--ease-premium);
}
```

### Instant Hover

For toolbar buttons where immediate feedback is expected:

```css
.instant-hover {
  transition: background-color var(--duration-instant) linear;
}
```

---

## Accessibility

### Reduced Motion

All animations respect user preferences:

```css
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

---

## Implementation Guidelines

### When to Use Each Duration

| Context | Duration | Reason |
|---------|----------|--------|
| Toolbar icons | `instant` | Immediate feedback expected |
| Buttons | `fast` | Quick but not jarring |
| List items | `normal` | Smooth scanning |
| Panel transitions | `slow` | Spatial awareness |
| Modal/dialog | `slower` | Attention shift |

### Transition Property Guidelines

**Avoid `transition: all`** — it's expensive and can cause unintended side effects.

**Use explicit properties:**
```css
/* Good */
transition: background-color var(--duration-normal) var(--ease-premium),
            box-shadow var(--duration-normal) var(--ease-premium);

/* Avoid */
transition: all var(--duration-normal) var(--ease-premium);
```

### Button Active States

All buttons should have a subtle press effect:

```css
.btn:active:not(:disabled) {
  transform: scale(0.97);
}
```

---

## Checklist for New Components

- [ ] Uses explicit transition properties (not `all`)
- [ ] Uses duration tokens (not hardcoded values)
- [ ] Has focus-visible state with double-ring
- [ ] Has active/press state for buttons
- [ ] Scrollable areas have custom scrollbar
- [ ] Loading states use skeleton or spinner
- [ ] Respects `prefers-reduced-motion`
