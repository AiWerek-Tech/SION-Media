# Audit & Architecture — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.dev-docs/05-guides/enterprise-redesign-system-v1.md`  
> Authority Level: **Level 2**  
> Size: 96.5 KB | 2,043 lines | 15 Parts

---

## How to Access This Document

**Option A — Read the source directly:**

```
.dev-docs/05-guides/enterprise-redesign-system-v1.md
```

**Option B — Open in editor:**

```
d:\my_dev\SION-Media\.docs\05-guides\enterprise-redesign-system-v1.md
```

---

## Document Contents

| Part    | Title                             | Key Information                                                                     |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Part 1  | Reverse-Engineered Architecture   | Tech stack, window architecture, mode router, state stores, DB schema, IPC channels |
| Part 2  | Title Bar System Analysis         | All menus, context rules, status indicators, gaps                                   |
| Part 3  | Library Mode Analysis             | Pages, workspaces, dead UI, missing modals, context menu spec                       |
| Part 4  | Projection Mode Analysis          | Runtime state machine, detected issues, redesigned layout                           |
| Part 5  | Management Mode Analysis          | Current structure, fake data, dead UI, missing pages                                |
| Part 6  | Overlay Screens Analysis          | SongEditor, Settings, ImportExport, Bible, Onboarding                               |
| Part 7  | Modal & Dialog System Audit       | All existing modals, 20 missing modals                                              |
| Part 8  | Unified Design System             | Token reference, component library, interaction standards                           |
| Part 9  | Backend Validation                | IPC handler coverage table, state management validation, security audit             |
| Part 10 | UX Standards Audit                | Navigation consistency, accessibility, performance                                  |
| Part 11 | System Engineering Validation     | Scalability, maintainability, fail-safe operation                                   |
| Part 12 | Feature Completion Matrix         | Priority matrix for all fixes                                                       |
| Part 13 | Complete Page & Workflow Registry | All 12 pages, 35 workflows with status                                              |
| Part 14 | Redesign Specifications           | Actionable implementation specs with code snippets                                  |
| Part 15 | Production Readiness Checklist    | v1.0 and post-v1.0 checklists                                                       |

---

## Critical Data in This Document

### IPC Channel Map (Part 9)

Complete list of all 60+ IPC channels with handler status. Reference before adding any new channel.

### SQLite Schema (Part 1.5)

All 13 tables + FTS5 virtual tables. Reference before adding any migration.

### Zustand Store Inventory (Part 1.4)

All 9 stores with persistence status. Reference before creating any new store.

### Dead UI Registry (Part 1.2)

DUI-001 through DUI-010 with root causes and fix strategies.

### Missing Modal Registry (Part 1.5)

MM-001 through MM-020 with priority, backend status, and complexity.

---

## When This Document Changes

Update this document when:

- New IPC channels are added (update Part 9 IPC map)
- New database tables are added (update Part 1.5 schema)
- New stores are created (update Part 1.4 store inventory)
- Dead UI issues are fixed (update Part 12 feature matrix)
- Missing modals are implemented (update Part 1.5 modal registry)
