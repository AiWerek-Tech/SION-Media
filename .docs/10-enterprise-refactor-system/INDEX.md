# SION Media Enterprise Refactor System — Master Index

## Complete File Inventory

```
10-enterprise-refactor-system/
│
├── README.md                          ← START HERE — system overview, critical rules
├── INDEX.md                           ← THIS FILE — complete file inventory
├── implementation-master-order-v1.md  ← THE BIBLE — implementation law
├── document-migration-map.md          ← Source → destination mapping
├── document-dependency-map.md         ← Document dependency hierarchy
├── document-reading-order.md          ← Reading sequences by role/context
│
├── 01-foundation/
│   ├── README.md                      ← Foundation directory guide
│   ├── 01-audit-and-architecture.md   ← [LINK] enterprise-redesign-system-v1.md
│   └── 02-foundation-system.md        ← [LINK] foundation-system-architecture-v1.md
│
├── 02-runtime-architecture/
│   ├── README.md                      ← Runtime architecture directory guide
│   ├── 01-functional-refactor.md      ← [LINK] phase2-functional-refactor-architecture-v1.md
│   └── 02-runtime-engine.md           ← [LINK] phase2-part2-runtime-engine.md
│
├── 03-ui-modernization/
│   ├── README.md                      ← UI modernization directory guide
│   ├── 01-ui-system-parts1-6.md       ← [LINK] phase3-ui-modernization-system-v1.md
│   └── 02-ui-system-parts7-11.md      ← [LINK] phase3-part2-ui-parts7-11.md
│
├── 04-production-system/
│   ├── README.md                      ← Production system directory guide
│   └── 01-production-architecture.md  ← [LINK] phase4-production-system-architecture-v1.md
│
├── 05-migration-system/
│   └── README.md                      ← Migration system guide (populated during implementation)
│
├── 06-testing-system/
│   └── README.md                      ← Testing system guide (populated during implementation)
│
├── 07-release-system/
│   └── README.md                      ← Release system guide (populated during release)
│
├── 08-governance/
│   └── README.md                      ← Governance guide + ADR template
│
├── 09-dependency-maps/
│   └── README.md                      ← Dependency maps guide (populated as architecture evolves)
│
└── archive/
    └── README.md                      ← Archive guide + supersession rules
```

**[LINK]** = Document references the source file in `.docs/05-guides/`. The source files are the actual content; these are canonical references.

---

## Document Summary Table

| Document                            | Size     | Parts | Authority | Purpose                            |
| ----------------------------------- | -------- | ----- | --------- | ---------------------------------- |
| `README.md`                         | 9.4 KB   | —     | Reference | System entry point, critical rules |
| `implementation-master-order-v1.md` | 77.7 KB  | 10    | Level 1   | Implementation bible               |
| `document-migration-map.md`         | —        | —     | Reference | Source → destination mapping       |
| `document-dependency-map.md`        | —        | —     | Reference | Document dependency hierarchy      |
| `document-reading-order.md`         | —        | —     | Reference | Reading sequences by role          |
| `01-audit-and-architecture.md`      | 96.5 KB  | 15    | Level 2   | Full codebase audit                |
| `02-foundation-system.md`           | 93.2 KB  | 7     | Level 2   | Design system                      |
| `01-functional-refactor.md`         | 41.8 KB  | 4     | Level 2   | Dead UI, modals, IPC, state        |
| `02-runtime-engine.md`              | 65.2 KB  | 6     | Level 1   | Projection engine                  |
| `01-ui-system-parts1-6.md`          | 102.2 KB | 6     | Level 2   | UI redesign (modes 1-6)            |
| `02-ui-system-parts7-11.md`         | 81.4 KB  | 5     | Level 2   | UI redesign (overlays, workflows)  |
| `01-production-architecture.md`     | 104.3 KB | 10    | Level 2   | Roadmap, tracking, governance      |

**Total documentation:** ~771 KB across 12 major documents

---

## Authority Level Quick Reference

```
LEVEL 1 — IMMUTABLE (require ADR to change):
  implementation-master-order-v1.md
  02-runtime-architecture/02-runtime-engine.md

LEVEL 2 — AUTHORITATIVE (require review to change):
  01-foundation/01-audit-and-architecture.md
  01-foundation/02-foundation-system.md
  02-runtime-architecture/01-functional-refactor.md
  03-ui-modernization/01-ui-system-parts1-6.md
  03-ui-modernization/02-ui-system-parts7-11.md
  04-production-system/01-production-architecture.md

LEVEL 3 — LIVING (updated per sprint):
  05-migration-system/*
  06-testing-system/*
  07-release-system/*
  08-governance/*
  09-dependency-maps/*

LEVEL 4 — ARCHIVE (historical reference only):
  archive/*
```

---

## Implementation Status Dashboard

```
PHASE 0  (Pre-flight):          ⬜ Not started
PHASE 1  (Infrastructure):      ⬜ Not started
PHASE 2  (Dead UI fixes):       ⬜ Not started
PHASE 3  (Modal system):        ⬜ Not started
PHASE 4  (Proj hardening):      ⬜ Not started
PHASE 5  (Design system):       ⬜ Not started
PHASE 6  (Library Mode):        ⬜ Not started
PHASE 7  (Projection Mode):     ⬜ Not started
PHASE 8  (Management Mode):     ⬜ Not started
PHASE 9  (Store decomp):        ⬜ Not started
PHASE 10 (Stabilization):       ⬜ Not started
PHASE 11 (Release):             ⬜ Not started

v1.1.0 Blockers: 9 remaining
v1.1.0 Target: Phases 0-4 complete
Features complete: 11/91 (12%)
```

_Update this dashboard after each phase completion._

---

## The Three Laws (Summary)

```
LAW 1: PROJECTION SAFETY
  The live output must never regress.
  Run the 12-step gate before merging any projection-critical change.

LAW 2: INCREMENTAL MIGRATION
  No big-bang rewrites. No skipped phases.
  Every change is small, validated, and revertible.

LAW 3: INFRASTRUCTURE FIRST
  New systems before new UI.
  Compatibility before migration.
  Foundation before features.
```

---

_SION Media Enterprise Refactor System_  
_Version 1.0 — May 2026_  
_This index is the navigation hub for the entire system._
