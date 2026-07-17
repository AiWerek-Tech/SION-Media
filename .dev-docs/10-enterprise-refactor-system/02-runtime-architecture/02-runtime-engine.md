# Runtime Engine Architecture — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.dev-docs/05-guides/phase2-part2-runtime-engine.md`  
> Authority Level: **Level 1 — IMMUTABLE**  
> Size: 65.2 KB | 2,664 lines | 6 Parts

---

## ⚠️ IMMUTABLE DOCUMENT

This document is **Level 1 — Immutable**. Changes require a formal Architecture Decision Record (ADR). Do not modify the content of this document without:

1. Writing an ADR in `08-governance/`
2. Getting architecture review
3. Updating `implementation-master-order-v1.md` if the projection safety protocol changes

---

## How to Access This Document

```
.dev-docs/05-guides/phase2-part2-runtime-engine.md
```

---

## Document Contents

| Part    | Title                       | Key Information                                                                                                                                                                                                                                                                                         |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 5  | Runtime Engine Architecture | Projection runtime overview, slide rendering pipeline, preload pipeline, slide generation settings, live presentation state machine (complete diagram), media runtime system (LRU cache), atmosphere layering, overlay engine, timer tick management, confidence monitor broadcast, performance targets |
| Part 6  | Data Layer Architecture     | Repository pattern decision, service layer rules, DB access rules, standard CRUD flow, optimistic update pattern, validation checkpoints, migration architecture (14-17), thumbnail generation, duplicate detection, backup architecture                                                                |
| Part 7  | Error Recovery Architecture | Error boundary hierarchy, per-mode boundaries, ProjectionMode fallback UI, IPC retry for SQLITE_BUSY, renderer crash auto-reload, complete crash recovery flow, debounced session save, safe-mode startup                                                                                               |
| Part 8  | Performance Architecture    | Virtualization rules with exact useVirtualizer implementation, memoization rules, DB index strategy (migration 17), getSongsSummary query, IPC debounce, projection window memory isolation, heartbeat interval                                                                                         |
| Part 9  | Feature Completion Matrix   | 8 tracking tables: Runtime (20), UI (20), Modal (15), IPC (6), Store (10), Accessibility (10), Performance (10)                                                                                                                                                                                         |
| Part 10 | Implementation Preparation  | 5-sprint order, new file list (18 new, 20 modified), risk assessment, architecture decision log                                                                                                                                                                                                         |

---

## Critical Data in This Document

### Projection State Machine (Part 5.3)

The complete state diagram for ProjectionState × ProgramLockState × NextReadyState. Reference before modifying any projection state logic.

### Critical Projection Chain (Part 5.1)

The exact sequence from keyboard input to congregation seeing lyrics. Reference before modifying any link in this chain.

### Slide Rendering Pipeline (Part 5.2)

The complete pipeline from song selection to slide generation. Reference before modifying slideEngine or setSlides.

### Media Runtime Architecture (Part 5.4)

The hardened MediaEngine with LRU cache. Reference when implementing `mediaEngine.ts` changes.

### Migration 14-17 Specifications (Part 6.3)

Exact SQL for migrations 14-17. Reference when implementing `migrations.ts` additions.

### Error Boundary Hierarchy (Part 7.1)

The complete error boundary tree. Reference when implementing per-mode ErrorBoundaries.

### Virtualization Implementation (Part 8.1)

Exact `useVirtualizer` implementation for Management Mode. Reference when implementing virtualization.

---

## When This Document Changes

This document changes ONLY when:

- A fundamental projection architecture decision is reversed
- A new constraint is discovered that invalidates existing decisions
- A security vulnerability requires architectural change

**Process:** Write ADR → Architecture review → Update document → Version bump to v2
