# Foundation System Architecture — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.docs/05-guides/foundation-system-architecture-v1.md`  
> Authority Level: **Level 2**  
> Size: 93.2 KB | 3,353 lines | 7 Parts

---

## How to Access This Document

```
.docs/05-guides/foundation-system-architecture-v1.md
```

---

## Document Contents

| Part   | Title                     | Key Information                                                                                                                               |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 1 | Design Token System       | All CSS custom properties: colors, spacing, typography, radius, shadows, animation, z-index, state colors, responsive tokens, theme variants  |
| Part 2 | Component Standard System | Atomic (Button, Input, Badge, etc.), Molecular (SearchInput, MetricCard, etc.), Organism (TitleBar, Modal, DataTable, etc.)                   |
| Part 3 | Layout Standard System    | Application shell, mode layout templates, grid system, content density, spacing rhythm, resizable panels, scroll regions, ambient backgrounds |
| Part 4 | Window Standard System    | Main window, projection window, stage display, modal windows, overlay windows, floating tools, title bar standards                            |
| Part 5 | Interaction Standards     | Hover/selection/drag-drop CSS, keyboard navigation, form interaction, loading states, error states                                            |
| Part 6 | Accessibility Standards   | WCAG 2.1 AA targets, focus management, ARIA standards, reduced motion                                                                         |
| Part 7 | Engineering Standards     | Component file structure, TypeScript standards, CSS architecture, foundation adoption plan                                                    |

---

## Critical Data in This Document

### Design Token Quick Reference (Part 1)

All CSS custom properties defined in `@theme {}` block of `main.css`. Reference before using any color, spacing, or typography value.

### Component Specifications (Part 2)

Every component variant, size, state, and accessibility requirement. Reference before building any new component.

### Layout Templates (Part 3)

Standard Mode Layout, Projection Mode Layout, Settings Layout, Song Editor Layout. Reference before building any new page.

### Window Lifecycle (Part 4)

Main window, projection window, and stage display lifecycle, state restoration, and IPC expectations.

### Projection Validation Gate (Part 4)

The 12-step gate is defined here. Also in `implementation-master-order-v1.md` Part 5.3.

---

## When This Document Changes

Update this document when:

- New design tokens are added to `main.css @theme`
- New component variants are defined
- New layout templates are created
- Window behavior changes
- Accessibility requirements are updated
