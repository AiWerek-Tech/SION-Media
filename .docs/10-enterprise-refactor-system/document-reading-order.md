# Document Reading Order System

## Purpose

This document defines the exact reading order for different roles and contexts. Reading documents in the wrong order creates confusion because later documents assume knowledge from earlier ones.

---

## Reading Order 1: AI Coding Agent (Mandatory Before Any Task)

**Time required:** 30–45 minutes  
**When to use:** Before implementing any feature, fix, or refactor

```
STEP 1 — Entry Point (5 min)
  Read: README.md
  Purpose: Understand the system, critical rules, and current status
  Key takeaway: Which phase is active, what is forbidden

STEP 2 — Implementation Bible (20 min)
  Read: implementation-master-order-v1.md
  Purpose: Understand the exact implementation order and safety rules
  Key takeaway: Which phase the task belongs to, what files can be touched,
                what is forbidden, what validation is required

STEP 3 — Codebase Context (10 min)
  Read: 01-foundation/01-audit-and-architecture.md
        → Focus on: the specific section relevant to the task
        → For IPC tasks: Part 9 (IPC channel map)
        → For store tasks: Part 4 (Zustand architecture)
        → For UI tasks: Part 3-5 (mode analyses)
  Purpose: Understand what currently exists in the codebase

STEP 4 — Feature Specification (5 min)
  Read: The relevant section of the architecture document for the feature
        → Dead UI fix: 02-runtime-architecture/01-functional-refactor.md Part 1
        → Modal: 02-runtime-architecture/01-functional-refactor.md Part 2
        → IPC: 02-runtime-architecture/01-functional-refactor.md Part 3
        → State: 02-runtime-architecture/01-functional-refactor.md Part 4
        → Projection: 02-runtime-architecture/02-runtime-engine.md Part 5
        → UI: 03-ui-modernization/01-ui-system-parts1-6.md (relevant part)
  Purpose: Understand the exact specification for the feature

THEN: Read the actual source files in the codebase before writing any code.
```

---

## Reading Order 2: New Developer Onboarding

**Time required:** 4–6 hours  
**When to use:** First time working on SION Media

```
DAY 1 — Architecture Understanding (2 hours)

  1. README.md (15 min)
     → Understand the system purpose and critical rules

  2. implementation-master-order-v1.md (45 min)
     → Understand the implementation philosophy and commandments
     → Focus on: Parts 1, 5 (projection safety), 10 (commandments)

  3. 01-foundation/01-audit-and-architecture.md (60 min)
     → Understand the complete codebase architecture
     → Focus on: Parts 1 (tech stack), 2 (window architecture),
                 3 (mode router), 4 (state management), 5 (database schema)

DAY 2 — Runtime and UI Understanding (2 hours)

  4. 02-runtime-architecture/02-runtime-engine.md (45 min)
     → Understand the projection runtime
     → Focus on: Parts 5.1-5.3 (projection engine), 5.3 (state machine)

  5. 02-runtime-architecture/01-functional-refactor.md (45 min)
     → Understand what needs to be fixed
     → Focus on: Part 1 (dead UI), Part 2 (modal system), Part 4 (state)

  6. 04-production-system/01-production-architecture.md (30 min)
     → Understand the implementation roadmap
     → Focus on: Part 1 (phases), Part 4 (feature matrix), Part 10 (readiness)

DAY 3 — Hands-On (2 hours)

  7. Run the app in development mode
  8. Run the 12-step projection validation gate manually
  9. Read the source files for the first assigned task
  10. Implement the first task following the workflow in Part 4 of master order
```

---

## Reading Order 3: Understanding the Projection System

**Time required:** 1–2 hours  
**When to use:** Before touching any projection-critical file

```
1. implementation-master-order-v1.md Part 5 (Projection Safety Protocol)
   → Understand the protection rules and validation gate

2. 02-runtime-architecture/02-runtime-engine.md Part 5 (Runtime Engine)
   → Understand the projection state machine and pipeline

3. 01-foundation/01-audit-and-architecture.md Part 4 (Projection Mode Analysis)
   → Understand the current projection mode implementation

4. 03-ui-modernization/01-ui-system-parts1-6.md Part 4 (Projection Mode Redesign)
   → Understand the target projection UI

5. 03-ui-modernization/02-ui-system-parts7-11.md Part 8 (Projection Visual System)
   → Understand the projection output visual specifications

Then: Read the actual source files:
  src/renderer/src/store/useProjectionStore.ts
  src/renderer/src/utils/runtimeCommandBus.ts
  src/renderer/src/components/LivePreviewPanel.tsx
  src/renderer/src/components/PresentationCanvas.tsx
```

---

## Reading Order 4: Understanding the Modal System

**Time required:** 30–45 minutes  
**When to use:** Before implementing any modal component

```
1. 02-runtime-architecture/01-functional-refactor.md Part 2 (Modal Orchestration)
   → Understand useModalStore design and promise-based pattern

2. 01-foundation/02-foundation-system.md Part 2.3 (Modal Component Standard)
   → Understand modal sizes, animations, accessibility requirements

3. 03-ui-modernization/01-ui-system-parts1-6.md Part 6 (Modal Ecosystem Redesign)
   → Understand the visual specification for each modal

4. 04-production-system/01-production-architecture.md Part 3 (Modal Dependency Map)
   → Understand what each modal depends on

Then: Read the source files:
  src/renderer/src/store/useModalStore.ts (Phase 1 — may not exist yet)
  src/renderer/src/components/modals/ (Phase 3 — may not exist yet)
```

---

## Reading Order 5: Understanding the State Architecture

**Time required:** 45–60 minutes  
**When to use:** Before modifying any Zustand store

```
1. 02-runtime-architecture/01-functional-refactor.md Part 4 (State Management Refactor)
   → Understand store ownership rules and decomposition plan

2. 01-foundation/01-audit-and-architecture.md Part 4 (State Management Architecture)
   → Understand current store inventory and responsibilities

3. implementation-master-order-v1.md Part 6 (Dependency Safety System)
   → Understand allowed dependency directions

4. 04-production-system/01-production-architecture.md Part 3 (Store Dependency Map)
   → Understand which stores depend on which

Then: Read the source files:
  src/renderer/src/store/useAppStore.ts
  src/renderer/src/store/useProjectionStore.ts
  src/renderer/src/store/usePlaylistStore.ts
  (and the specific store being modified)
```

---

## Reading Order 6: Understanding the IPC Architecture

**Time required:** 30 minutes  
**When to use:** Before adding or modifying any IPC channel

```
1. 01-foundation/01-audit-and-architecture.md Part 9 (IPC Channel Map)
   → Understand all existing channels and their purposes

2. 02-runtime-architecture/01-functional-refactor.md Part 3 (IPC Refactor Architecture)
   → Understand the normalization plan and new channels needed

3. implementation-master-order-v1.md Part 4.2 (Forbidden IPC Actions)
   → Understand what must not be changed

Then: Read the source files:
  src/main/ipc-handlers.ts
  src/preload/index.ts
  src/shared/ipc-channels.ts
```

---

## Reading Order 7: Understanding the Database Architecture

**Time required:** 30 minutes  
**When to use:** Before adding migrations or database functions

```
1. 01-foundation/01-audit-and-architecture.md Part 5 (Database Schema)
   → Understand all 13 tables and their relationships

2. 02-runtime-architecture/02-runtime-engine.md Part 6 (Data Layer Architecture)
   → Understand migration safety rules and new migrations needed

3. implementation-master-order-v1.md Part 7.4 (Recovery from Failed Migrations)
   → Understand the recovery procedure

Then: Read the source files:
  src/main/database.ts
  src/main/migrations.ts
  src/main/database.test.ts
```

---

## Reading Order 8: Understanding the UI Design System

**Time required:** 45–60 minutes  
**When to use:** Before building any UI component

```
1. 01-foundation/02-foundation-system.md Part 1 (Design Token System)
   → Understand all CSS custom properties and their semantic meanings

2. 01-foundation/02-foundation-system.md Part 2 (Component Standard System)
   → Understand component variants, sizes, states, and accessibility

3. 01-foundation/02-foundation-system.md Part 3 (Layout Standard System)
   → Understand layout templates and grid systems

4. 03-ui-modernization/01-ui-system-parts1-6.md Part 1 (Global Enterprise UI Language)
   → Understand the visual identity and motion system

Then: Read the source files:
  src/renderer/src/assets/main.css
  src/renderer/src/components/design-system/
```

---

## Quick Reference: Which Document Answers Which Question

| Question                                     | Document                                             | Section  |
| -------------------------------------------- | ---------------------------------------------------- | -------- |
| What phase should I implement next?          | `implementation-master-order-v1.md`                  | Part 2   |
| What files can I touch in Phase N?           | `implementation-master-order-v1.md`                  | Part 2.N |
| What is the exact file order for Phase N?    | `implementation-master-order-v1.md`                  | Part 3   |
| What are the forbidden actions?              | `implementation-master-order-v1.md`                  | Part 4.2 |
| How do I validate my change?                 | `implementation-master-order-v1.md`                  | Part 8   |
| What is the 12-step projection gate?         | `implementation-master-order-v1.md`                  | Part 5.3 |
| What does the current codebase look like?    | `01-foundation/01-audit-and-architecture.md`         | Part 1   |
| What IPC channels exist?                     | `01-foundation/01-audit-and-architecture.md`         | Part 9   |
| What is the database schema?                 | `01-foundation/01-audit-and-architecture.md`         | Part 5   |
| What design tokens exist?                    | `01-foundation/02-foundation-system.md`              | Part 1   |
| How should a component be built?             | `01-foundation/02-foundation-system.md`              | Part 2   |
| What dead UI needs to be fixed?              | `02-runtime-architecture/01-functional-refactor.md`  | Part 1   |
| How should the modal system work?            | `02-runtime-architecture/01-functional-refactor.md`  | Part 2   |
| How should IPC be normalized?                | `02-runtime-architecture/01-functional-refactor.md`  | Part 3   |
| How should stores be decomposed?             | `02-runtime-architecture/01-functional-refactor.md`  | Part 4   |
| How does the projection engine work?         | `02-runtime-architecture/02-runtime-engine.md`       | Part 5   |
| What migrations are needed?                  | `02-runtime-architecture/02-runtime-engine.md`       | Part 6   |
| How should errors be recovered?              | `02-runtime-architecture/02-runtime-engine.md`       | Part 7   |
| What should the Library Mode look like?      | `03-ui-modernization/01-ui-system-parts1-6.md`       | Part 3   |
| What should the Projection Mode look like?   | `03-ui-modernization/01-ui-system-parts1-6.md`       | Part 4   |
| What should the Management Mode look like?   | `03-ui-modernization/01-ui-system-parts1-6.md`       | Part 5   |
| What should each modal look like?            | `03-ui-modernization/01-ui-system-parts1-6.md`       | Part 6   |
| What should the projection output look like? | `03-ui-modernization/02-ui-system-parts7-11.md`      | Part 8   |
| What are the operator workflows?             | `03-ui-modernization/02-ui-system-parts7-11.md`      | Part 9   |
| What is the implementation roadmap?          | `04-production-system/01-production-architecture.md` | Part 1   |
| What features are complete/incomplete?       | `04-production-system/01-production-architecture.md` | Part 4   |
| What tests need to be written?               | `04-production-system/01-production-architecture.md` | Part 6   |
| What are the release channels?               | `04-production-system/01-production-architecture.md` | Part 7   |
| What is the production readiness checklist?  | `04-production-system/01-production-architecture.md` | Part 10  |
