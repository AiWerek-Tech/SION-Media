# Production System Architecture — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.dev-docs/05-guides/phase4-production-system-architecture-v1.md`  
> Authority Level: **Level 2**  
> Size: 104.3 KB | 3,361 lines | 10 Parts

---

## How to Access This Document

```
.dev-docs/05-guides/phase4-production-system-architecture-v1.md
```

---

## Document Contents

| Part    | Title                             | Key Information                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 1  | Master Implementation Roadmap     | 11-phase plan (Phase 0-11), each with objectives, prerequisites, deliverables, success criteria, risk level, rollback strategy. Sprint architecture, milestone architecture, critical path, v1.1.0 vs v1.2.0 vs v1.3.0 scope.                                                             |
| Part 2  | Migration Architecture            | Component migration (parallel existence), modal migration (step-by-step), CSS migration (token-first), useAppStore decomposition (4 phases), persistence migration, hydration migration, IPC normalization, safeIpcHandle rollout, DB migration safety, projection engine adapter pattern |
| Part 3  | Component Dependency Map          | Full dependency tree, store ownership rules, IPC dependency map, critical projection chain, modal dependency map, high-risk dependency registry (6 risks)                                                                                                                                 |
| Part 4  | Feature Completion Tracking       | 9 matrices: Runtime (20), UI (20), Modal (15), IPC (6), Store (10), Accessibility (10), Performance (10). Production readiness matrix: 11/91 complete. 9 v1.1.0 blockers.                                                                                                                 |
| Part 5  | Refactor Safety System            | Rollback checkpoints (11), compatibility layer lifecycle, feature flag lifecycle, staged rollout, shadow runtime validation, dual-system validation, validation gates                                                                                                                     |
| Part 6  | Testing Architecture              | Vitest config extension, test utilities (mock window.api), unit tests (store, commandBus, slideEngine), integration tests (modal flows, projection sync), E2E tests (operator workflows), multi-window tests, performance tests                                                           |
| Part 7  | Release + Deployment Architecture | 5 release channels, version numbering, 6-step build pipeline, migration validation, auto-update architecture, update recovery, runtime diagnostics, crash telemetry                                                                                                                       |
| Part 8  | Coding Agent Execution Strategy   | 6-step AI protocol, Phase 1-3 file-by-file order (30 files), TypeScript standards, component standards, IPC standards, Zustand standards, forbidden patterns                                                                                                                              |
| Part 9  | Engineering Governance System     | ADR structure (8 implicit ADRs), architecture approval flow, PR review checklist, projection review protocol, performance budgets, accessibility gates, documentation requirements                                                                                                        |
| Part 10 | Final Production Readiness System | 4 readiness checklists (Runtime 20, UI 13, Projection 15, Data 10), launch readiness matrix (8 v1.1.0 blockers), 22-step projection simulation, 12-step multi-window test, 10-step stress test, 5-scenario failure test                                                                   |

---

## Critical Data in This Document

### 11-Phase Roadmap (Part 1)

The authoritative implementation sequence. Reference before starting any phase.

### Feature Completion Matrix (Part 4)

91 features tracked across 9 matrices. **Update this after every phase completion.**

### v1.1.0 Blockers (Part 4.9)

9 critical blockers that must be resolved before v1.1.0 release.

### Rollback Checkpoints (Part 5.1)

11 checkpoints with exact rollback procedures. Reference when a phase needs to be reverted.

### Test Specifications (Part 6)

Complete test code for useProjectionStore, RuntimeCommandBus, slideEngine, and modal components. Reference when writing tests.

### Coding Agent File Order (Part 8.2)

Exact file-by-file implementation order for Phases 1-3. Reference when implementing these phases.

### Production Readiness Checklist (Part 10.1)

The definitive checklist before any stable release.

### Projection Simulation Test (Part 10.3.1)

22-step test sequence. Reference before every release.

---

## Feature Completion Status

**Current:** 11/91 features complete (12%)  
**v1.1.0 target:** Phases 0-4 complete  
**v1.1.0 blockers:** 9 remaining

_Update the feature matrix in the source document after each phase completion._

---

## When This Document Changes

Update this document when:

- A phase is completed (update feature matrix)
- A new feature is added to the registry
- A blocker is resolved
- A test is written (update test coverage table)
- A release is made (update version history)
