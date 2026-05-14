# Document Migration Map

## Purpose

This document maps every existing enterprise architecture document to its new canonical location in the `10-enterprise-refactor-system/` directory.

---

## Source → Destination Map

### From `.docs/05-guides/`

| Original File                                   | New Canonical Location     | Renamed To                      | Authority Level | Status           |
| ----------------------------------------------- | -------------------------- | ------------------------------- | --------------- | ---------------- |
| `enterprise-redesign-system-v1.md`              | `01-foundation/`           | `01-audit-and-architecture.md`  | Level 2         | Source preserved |
| `foundation-system-architecture-v1.md`          | `01-foundation/`           | `02-foundation-system.md`       | Level 2         | Source preserved |
| `phase2-functional-refactor-architecture-v1.md` | `02-runtime-architecture/` | `01-functional-refactor.md`     | Level 2         | Source preserved |
| `phase2-part2-runtime-engine.md`                | `02-runtime-architecture/` | `02-runtime-engine.md`          | Level 1         | Source preserved |
| `phase3-ui-modernization-system-v1.md`          | `03-ui-modernization/`     | `01-ui-system-parts1-6.md`      | Level 2         | Source preserved |
| `phase3-part2-ui-parts7-11.md`                  | `03-ui-modernization/`     | `02-ui-system-parts7-11.md`     | Level 2         | Source preserved |
| `phase4-production-system-architecture-v1.md`   | `04-production-system/`    | `01-production-architecture.md` | Level 2         | Source preserved |

**Note:** Original files in `.docs/05-guides/` are preserved for backward compatibility. The files in `10-enterprise-refactor-system/` subdirectories are the canonical, reorganized references. They currently point to the originals via README.md files. Physical copies will be created if the originals are moved.

---

## Content Distribution Map

The 7 source documents contain content distributed across the new directory structure:

### `01-foundation/01-audit-and-architecture.md`

**Source:** `enterprise-redesign-system-v1.md` (96.5 KB)

Contains:

- Part 1: Reverse-engineered application architecture
- Part 2: Title bar system analysis
- Part 3: Library Mode analysis
- Part 4: Projection Mode analysis
- Part 5: Management Mode analysis
- Part 6: Overlay screens analysis
- Part 7: Modal & dialog system audit
- Part 8: Unified design system
- Part 9: Backend validation
- Part 10: UX standards audit
- Part 11: System engineering validation
- Part 12: Feature completion matrix (initial)
- Part 13: Complete page & workflow registry
- Part 14: Redesign specifications
- Part 15: Production readiness checklist (initial)

Key data:

- Complete IPC channel map (60+ channels)
- SQLite schema (13 tables + FTS5)
- Zustand store inventory (9 stores)
- Dead UI registry (10 issues)
- Missing modal registry (20 modals)
- Missing workflow registry (7 workflows)

---

### `01-foundation/02-foundation-system.md`

**Source:** `foundation-system-architecture-v1.md` (93.2 KB)

Contains:

- Part 1: Design token system (colors, spacing, typography, radius, shadows, animation, z-index)
- Part 2: Component standard system (atomic, molecular, organism)
- Part 3: Layout standard system (grids, templates, density, rhythm)
- Part 4: Window standard system (main, projection, stage, modal, overlay)
- Part 5: Interaction standards
- Part 6: Accessibility standards
- Part 7: Engineering standards

Key data:

- All CSS custom property values
- Component variant specifications
- Layout template specifications
- Window lifecycle specifications
- Keyboard shortcut standards

---

### `02-runtime-architecture/01-functional-refactor.md`

**Source:** `phase2-functional-refactor-architecture-v1.md` (41.8 KB)

Contains:

- Part 1: Dead UI elimination system (DUI-001 through DUI-010)
- Part 2: Modal orchestration architecture (useModalStore design)
- Part 3: IPC refactor architecture (channel normalization, new channels)
- Part 4: State management refactor (store decomposition plan)

Key data:

- Exact fix for each dead UI issue
- useModalStore TypeScript interface
- Promise-based modal pattern
- IPC channel normalization map
- Store ownership rules
- useAppStore decomposition phases

---

### `02-runtime-architecture/02-runtime-engine.md`

**Source:** `phase2-part2-runtime-engine.md` (65.2 KB)

Contains:

- Part 5: Runtime engine architecture (slide pipeline, preload, state machine)
- Part 6: Data layer architecture (repository, migrations, backup)
- Part 7: Error recovery architecture (boundaries, recovery strategies, logging)
- Part 8: Performance architecture (virtualization, DB optimization, multi-window)
- Part 9: Feature completion matrix (detailed)
- Part 10: Implementation preparation (sprint order, file lists)

Key data:

- Complete projection state machine diagram
- Slide rendering pipeline
- Media runtime LRU architecture
- Atmosphere layering system
- Migration 14-17 specifications
- Auto-backup strategy
- Per-mode ErrorBoundary design

---

### `03-ui-modernization/01-ui-system-parts1-6.md`

**Source:** `phase3-ui-modernization-system-v1.md` (102.2 KB)

Contains:

- Part 1: Global enterprise UI language (surfaces, glows, elevation, motion)
- Part 2: Title bar + navigation redesign (complete menu structure)
- Part 3: Library Mode redesign (layout, sidebar, inspector, context menu)
- Part 4: Projection Mode redesign (broadcast command center, NEXT strip)
- Part 5: Management Mode redesign (dashboard, sections, diagnostics)
- Part 6: Modal ecosystem redesign (all 14 modal specifications)

Key data:

- Complete redesigned menu structure (7 menus)
- Library Mode layout specification
- Projection Mode broadcast command center layout
- Management Mode sidebar navigation
- All modal size/behavior specifications

---

### `03-ui-modernization/02-ui-system-parts7-11.md`

**Source:** `phase3-part2-ui-parts7-11.md` (81.4 KB)

Contains:

- Part 7: Overlay + floating UI redesign
- Part 8: Projection visual system (typography, atmosphere, stage display)
- Part 9: Workflow UX modernization (all operator workflows)
- Part 10: Page-by-page redesign registry (11 pages, 4 overlays, 3 panels)
- Part 11: Design-to-engineering handoff (component dependency map, interaction mapping)

Key data:

- Projection typography specifications (86px, weight 560)
- All 6 atmosphere preset visual identities
- Stage display typography for 3-8m readability
- Complete operator workflow specifications
- Component dependency tree
- Modal mapping table (17 modals)
- State dependency mapping

---

### `04-production-system/01-production-architecture.md`

**Source:** `phase4-production-system-architecture-v1.md` (104.3 KB)

Contains:

- Part 1: Master implementation roadmap (11 phases)
- Part 2: Migration architecture (component, state, IPC, DB, runtime)
- Part 3: Component dependency map
- Part 4: Feature completion tracking (91 features, 9 matrices)
- Part 5: Refactor safety system (rollback, feature flags, deployment)
- Part 6: Testing architecture (unit, integration, E2E, multi-window, performance)
- Part 7: Release + deployment architecture (channels, flow, monitoring)
- Part 8: Coding agent execution strategy (file-by-file order, code standards)
- Part 9: Engineering governance system (ADRs, review, quality gates)
- Part 10: Final production readiness system (checklists, simulations)

Key data:

- 11-phase implementation roadmap with exact deliverables
- 91-feature completion matrix
- 12-step projection validation gate
- Complete test specifications
- Release channel architecture
- v1.1.0 minimum viable release scope

---

## Naming Convention Rationale

| Old Name Pattern                                | New Name Pattern                | Reason                                  |
| ----------------------------------------------- | ------------------------------- | --------------------------------------- |
| `enterprise-redesign-system-v1.md`              | `01-audit-and-architecture.md`  | Describes content (audit) not phase     |
| `foundation-system-architecture-v1.md`          | `02-foundation-system.md`       | Shorter, clearer                        |
| `phase2-functional-refactor-architecture-v1.md` | `01-functional-refactor.md`     | Phase number in directory, not filename |
| `phase2-part2-runtime-engine.md`                | `02-runtime-engine.md`          | Part number in directory order          |
| `phase3-ui-modernization-system-v1.md`          | `01-ui-system-parts1-6.md`      | Content range explicit                  |
| `phase3-part2-ui-parts7-11.md`                  | `02-ui-system-parts7-11.md`     | Content range explicit                  |
| `phase4-production-system-architecture-v1.md`   | `01-production-architecture.md` | Shorter, clearer                        |
