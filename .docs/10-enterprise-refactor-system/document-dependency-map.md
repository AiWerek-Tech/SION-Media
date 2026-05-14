# Document Dependency Map

## Purpose

This map defines which documents depend on which other documents. When a document changes, all documents that depend on it must be reviewed for consistency.

---

## Dependency Hierarchy

```
Level 0 — Source of Truth (no dependencies):
  implementation-master-order-v1.md
    ← depends on nothing
    ← all other documents must be consistent with this

Level 1 — Foundation (depends on Level 0):
  01-foundation/01-audit-and-architecture.md
    ← provides: codebase facts, IPC map, schema, store inventory
    ← consumed by: all other documents

  01-foundation/02-foundation-system.md
    ← provides: design tokens, component specs, layout templates
    ← consumed by: 03-ui-modernization/*, implementation work

Level 2 — Runtime Architecture (depends on Level 0 + Level 1):
  02-runtime-architecture/01-functional-refactor.md
    ← depends on: 01-foundation/01-audit-and-architecture.md (audit findings)
    ← provides: dead UI fixes, modal system, IPC refactor, state normalization
    ← consumed by: 04-production-system/*, implementation work

  02-runtime-architecture/02-runtime-engine.md
    ← depends on: 01-functional-refactor.md (state architecture)
    ← provides: projection engine, media runtime, error recovery, performance
    ← consumed by: 04-production-system/*, implementation work

Level 3 — UI Modernization (depends on Level 0 + Level 1 + Level 2):
  03-ui-modernization/01-ui-system-parts1-6.md
    ← depends on: 01-foundation/02-foundation-system.md (design tokens)
    ← depends on: 02-runtime-architecture/01-functional-refactor.md (modal system)
    ← provides: UI redesign specs for all modes
    ← consumed by: implementation work (Phases 5-8)

  03-ui-modernization/02-ui-system-parts7-11.md
    ← depends on: 01-ui-system-parts1-6.md (visual language)
    ← depends on: 02-runtime-architecture/02-runtime-engine.md (projection visual)
    ← provides: overlays, projection visuals, workflows, page registry
    ← consumed by: implementation work (Phases 5-8)

Level 4 — Production System (depends on all above):
  04-production-system/01-production-architecture.md
    ← depends on: ALL Level 0-3 documents
    ← provides: implementation roadmap, feature tracking, testing, release
    ← consumed by: implementation work (all phases)
```

---

## Dependency Matrix

| Document                                             | Depends On                                             | Consumed By                |
| ---------------------------------------------------- | ------------------------------------------------------ | -------------------------- |
| `implementation-master-order-v1.md`                  | Nothing                                                | Everything                 |
| `01-foundation/01-audit-and-architecture.md`         | Codebase (source of truth)                             | All other docs             |
| `01-foundation/02-foundation-system.md`              | `01-audit-and-architecture.md`                         | UI docs, implementation    |
| `02-runtime-architecture/01-functional-refactor.md`  | `01-audit-and-architecture.md`                         | Runtime engine, production |
| `02-runtime-architecture/02-runtime-engine.md`       | `01-functional-refactor.md`                            | Production system          |
| `03-ui-modernization/01-ui-system-parts1-6.md`       | `02-foundation-system.md`, `01-functional-refactor.md` | UI implementation          |
| `03-ui-modernization/02-ui-system-parts7-11.md`      | `01-ui-system-parts1-6.md`, `02-runtime-engine.md`     | UI implementation          |
| `04-production-system/01-production-architecture.md` | All above                                              | Implementation execution   |

---

## Impact Analysis: What Changes When a Document Changes

### If `implementation-master-order-v1.md` changes:

- Review ALL other documents for consistency
- Update README.md quick reference
- Create ADR documenting the change
- Notify all active implementers

### If `01-audit-and-architecture.md` changes:

- Review `01-functional-refactor.md` (dead UI registry may change)
- Review `01-production-architecture.md` (feature matrix may change)
- Update IPC channel map if channels added/removed
- Update schema map if migrations added

### If `02-foundation-system.md` changes:

- Review `01-ui-system-parts1-6.md` (design tokens may change)
- Review `02-ui-system-parts7-11.md` (component specs may change)
- Update main.css @theme block if tokens change

### If `01-functional-refactor.md` changes:

- Review `01-production-architecture.md` (migration plan may change)
- Review `implementation-master-order-v1.md` Part 3 (file sequence may change)
- Update feature completion matrix

### If `02-runtime-engine.md` changes:

- Review `01-production-architecture.md` (runtime tracking may change)
- Review `implementation-master-order-v1.md` Part 5 (projection safety may change)
- Create ADR (Level 1 document — requires formal process)

### If `01-ui-system-parts1-6.md` changes:

- Review `02-ui-system-parts7-11.md` (visual language consistency)
- Review `01-production-architecture.md` (UI completion matrix)

### If `01-production-architecture.md` changes:

- Review `implementation-master-order-v1.md` Part 2 (phase order may change)
- Update feature completion matrix
- Update release milestone targets

---

## Circular Dependency Prevention

The following dependency directions are FORBIDDEN to prevent circular references:

```
FORBIDDEN:
  01-audit-and-architecture.md → any other doc in this system
    (it is the source of truth, not a consumer)

  02-runtime-engine.md → 01-functional-refactor.md
    (runtime engine is Level 1 immutable, functional refactor is Level 2)

  implementation-master-order-v1.md → any specific implementation detail
    (master order references documents, not specific code)
```

---

## Living Document Dependencies

The following directories contain living documents that depend on the static documents above:

```
05-migration-system/* → depends on: 01-functional-refactor.md (migration specs)
06-testing-system/*   → depends on: 02-runtime-engine.md (test specs)
07-release-system/*   → depends on: 01-production-architecture.md (release specs)
08-governance/*       → depends on: implementation-master-order-v1.md (ADR process)
09-dependency-maps/*  → depends on: all documents (reflects current architecture)
```
