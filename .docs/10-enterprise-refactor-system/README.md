# SION Media — Enterprise Refactor System

## The Authoritative Implementation Governance Hub

**Version:** 1.0  
**Status:** Active — All implementation work governed by this system  
**Last Updated:** May 2026

---

## PURPOSE

This directory is the **single source of truth** for the entire SION Media enterprise transformation. Every architectural decision, implementation sequence, migration strategy, safety rule, and governance protocol lives here.

**Before writing a single line of code, every developer and AI coding agent MUST read:**

1. This README (you are here)
2. `implementation-master-order-v1.md` — the implementation bible

---

## CRITICAL RULES (Read Before Anything Else)

```
RULE 1: NEVER modify projection-critical files without running the
        12-step Projection Validation Gate first.

RULE 2: NEVER implement Phase N before Phase N-1 is complete
        and validated.

RULE 3: NEVER remove a compatibility layer before ALL consumers
        have been migrated.

RULE 4: NEVER use window.confirm() for any new code.
        Always use DeleteConfirmDialog or ConfirmDialog.

RULE 5: NEVER add cross-store reads inside Zustand store actions.

RULE 6: NEVER rewrite a working file "while you're at it."
        Only change what the task requires.

RULE 7: ALWAYS run npm run typecheck + lint + test after every change.

RULE 8: ALWAYS ensure every change can be independently reverted.
```

---

## DOCUMENT HIERARCHY

```
10-enterprise-refactor-system/
│
├── README.md                          ← YOU ARE HERE (start here)
├── implementation-master-order-v1.md  ← THE IMPLEMENTATION BIBLE (read second)
│
├── 01-foundation/                     ← Design tokens, component system, layout
│   ├── 01-audit-and-architecture.md   ← Full reverse-engineered architecture
│   └── 02-foundation-system.md        ← Design tokens, components, layout, windows
│
├── 02-runtime-architecture/           ← Projection engine, IPC, state management
│   ├── 01-functional-refactor.md      ← Dead UI, modal system, IPC refactor, state
│   └── 02-runtime-engine.md           ← Projection engine, media, overlays, recovery
│
├── 03-ui-modernization/               ← UI redesign specifications
│   ├── 01-ui-system-parts1-6.md       ← Global UI, Title Bar, Library, Projection, Management, Modals
│   └── 02-ui-system-parts7-11.md      ← Overlays, Projection Visual, Workflows, Pages, Handoff
│
├── 04-production-system/              ← Implementation roadmap, governance
│   └── 01-production-architecture.md  ← Roadmap, migration, tracking, testing, release
│
├── 05-migration-system/               ← Migration guides (populated during implementation)
├── 06-testing-system/                 ← Test suites (populated during implementation)
├── 07-release-system/                 ← Release artifacts (populated during release)
├── 08-governance/                     ← ADRs, review records (populated during implementation)
├── 09-dependency-maps/                ← Dependency graphs (populated during implementation)
└── archive/                           ← Superseded documents
```

---

## READING ORDER

### For AI Coding Agents (Mandatory)

```
1. README.md (this file) — 5 minutes
2. implementation-master-order-v1.md — 30 minutes
3. 01-foundation/01-audit-and-architecture.md — for context on what exists
4. 02-runtime-architecture/01-functional-refactor.md — for the specific feature being implemented
5. 04-production-system/01-production-architecture.md — for phase/sprint context
```

### For Understanding the Full System

```
1. README.md
2. implementation-master-order-v1.md
3. 01-foundation/01-audit-and-architecture.md (full audit)
4. 01-foundation/02-foundation-system.md (design system)
5. 02-runtime-architecture/01-functional-refactor.md (IPC, state, modals)
6. 02-runtime-architecture/02-runtime-engine.md (projection engine)
7. 03-ui-modernization/01-ui-system-parts1-6.md (UI redesign)
8. 03-ui-modernization/02-ui-system-parts7-11.md (workflows, pages)
9. 04-production-system/01-production-architecture.md (roadmap, governance)
```

---

## DOCUMENT AUTHORITY LEVELS

```
LEVEL 1 — IMMUTABLE (never change without ADR):
  implementation-master-order-v1.md
  02-runtime-architecture/02-runtime-engine.md (projection engine specs)

LEVEL 2 — AUTHORITATIVE (change requires review):
  01-foundation/01-audit-and-architecture.md
  02-runtime-architecture/01-functional-refactor.md
  04-production-system/01-production-architecture.md

LEVEL 3 — LIVING (updated as implementation progresses):
  05-migration-system/* (updated per sprint)
  06-testing-system/* (updated as tests are written)
  08-governance/* (ADRs added per decision)
  09-dependency-maps/* (updated as architecture evolves)

LEVEL 4 — ARCHIVE (historical reference only):
  archive/* (superseded documents, do not implement from these)
```

---

## SOURCE DOCUMENT MAP

The following documents from `.docs/05-guides/` have been reorganized into this system:

| Original File                                   | New Location                                         | Authority |
| ----------------------------------------------- | ---------------------------------------------------- | --------- |
| `enterprise-redesign-system-v1.md`              | `01-foundation/01-audit-and-architecture.md`         | Level 2   |
| `foundation-system-architecture-v1.md`          | `01-foundation/02-foundation-system.md`              | Level 2   |
| `phase2-functional-refactor-architecture-v1.md` | `02-runtime-architecture/01-functional-refactor.md`  | Level 2   |
| `phase2-part2-runtime-engine.md`                | `02-runtime-architecture/02-runtime-engine.md`       | Level 1   |
| `phase3-ui-modernization-system-v1.md`          | `03-ui-modernization/01-ui-system-parts1-6.md`       | Level 2   |
| `phase3-part2-ui-parts7-11.md`                  | `03-ui-modernization/02-ui-system-parts7-11.md`      | Level 2   |
| `phase4-production-system-architecture-v1.md`   | `04-production-system/01-production-architecture.md` | Level 2   |

**Original files in `.docs/05-guides/` remain as-is for backward compatibility.**  
**This directory contains the canonical, reorganized versions.**

---

## HOW AI CODING AGENTS MUST USE THIS SYSTEM

### Before Starting Any Task

```
1. Read implementation-master-order-v1.md
   → Identify which Phase the task belongs to
   → Verify all prerequisites for that Phase are complete
   → Verify the task is not in a "forbidden" category

2. Read the relevant architecture document for the feature
   → Understand the exact specification
   → Understand the dependencies
   → Understand the rollback strategy

3. Read the relevant source files in the codebase
   → Understand what currently exists
   → Understand what must NOT change

4. Validate safety
   → Is this a projection-critical file? → Run validation gate
   → Is this an IPC change? → Check compatibility rules
   → Is this a store change? → Check ownership rules
```

### During Implementation

```
1. Make the MINIMUM change needed
2. No refactoring of unrelated code
3. No "while I'm here" improvements
4. Follow TypeScript standards exactly
5. Follow component standards exactly
6. Add error handling to all async operations
7. Add aria-label to all icon-only buttons
```

### After Implementation

```
1. npm run typecheck → must pass
2. npm run lint → must pass
3. npm run test → must pass
4. Manual: verify the specific feature works
5. Manual: verify projection controls still work (Space, B, Esc)
6. Update feature completion matrix in 04-production-system/
7. Create implementation log in .docs/04-implementation/
```

---

## PROJECTION SAFETY QUICK REFERENCE

```
PROJECTION-CRITICAL FILES (require 12-step validation gate):
  src/renderer/src/store/useProjectionStore.ts
  src/renderer/src/utils/runtimeCommandBus.ts
  src/renderer/src/utils/runtimeCommandHandlers.ts
  src/renderer/src/components/LivePreviewPanel.tsx
  src/renderer/src/components/PresentationCanvas.tsx
  src/renderer/src/atmosphere/AtmosphereRenderer.tsx
  src/main/windows.ts
  src/main/ipc-handlers.ts (projection channels only)

12-STEP PROJECTION VALIDATION GATE:
  1. Select song → verify preview loads
  2. Space → verify LIVE state
  3. → key → verify next slide
  4. ← key → verify previous slide
  5. B → verify BLACK
  6. B again → verify returns to LIVE
  7. F → verify FREEZE
  8. F again → verify returns to LIVE
  9. Esc → verify CLEAR
  10. Click different song → verify preview loads
  11. Space → verify new song goes LIVE
  12. Verify projection window shows correct content throughout
```

---

## CURRENT IMPLEMENTATION STATUS

```
Phase 0 (Pre-flight):     ⬜ Not started
Phase 1 (Infrastructure): ⬜ Not started
Phase 2 (Dead UI fixes):  ⬜ Not started
Phase 3 (Modal system):   ⬜ Not started
Phase 4 (Proj hardening): ⬜ Not started
Phase 5 (Design system):  ⬜ Not started
Phase 6 (Library Mode):   ⬜ Not started
Phase 7 (Projection Mode):⬜ Not started
Phase 8 (Management Mode):⬜ Not started
Phase 9 (Store decomp):   ⬜ Not started
Phase 10 (Stabilization): ⬜ Not started
Phase 11 (Release):       ⬜ Not started

v1.1.0 Blockers Remaining: 9
v1.1.0 Target: Phases 0-4 complete
```

---

_SION Media Enterprise Refactor System_  
_This README is the entry point for all implementation work._  
_Do not implement anything without reading implementation-master-order-v1.md first._
