# Dependency Maps

This directory contains dependency graphs and maps updated as the architecture evolves.

## Purpose

Dependency maps provide a visual and structured reference for understanding how components, stores, IPC channels, and runtime systems relate to each other. They are updated when the architecture changes.

## Document Naming Convention

```
dep-map-[domain]-v[N].md

Examples:
  dep-map-stores-v1.md
  dep-map-ipc-v1.md
  dep-map-components-v1.md
  dep-map-projection-runtime-v1.md
```

## Current Dependency Maps

The initial dependency maps are defined in the architecture documents:

| Map                       | Location                                                   | Status     |
| ------------------------- | ---------------------------------------------------------- | ---------- |
| Component dependency tree | `implementation-master-order-v1.md` Part 6                 | ✅ Defined |
| Store ownership rules     | `02-runtime-architecture/01-functional-refactor.md` Part 4 | ✅ Defined |
| IPC dependency map        | `implementation-master-order-v1.md` Part 6                 | ✅ Defined |
| Critical projection chain | `implementation-master-order-v1.md` Part 6                 | ✅ Defined |
| Modal dependency map      | `02-runtime-architecture/01-functional-refactor.md` Part 3 | ✅ Defined |

## When to Update Dependency Maps

Update a dependency map when:

- A new store is created
- A new IPC channel group is added
- A new component category is added
- A store is decomposed into multiple stores
- A circular dependency is detected and resolved

## Circular Dependency Detection

Run this check before any store or module creation:

```bash
# Check for circular imports in renderer
npx madge --circular src/renderer/src/

# Check for circular imports in main
npx madge --circular src/main/
```

If circular dependencies are found, they must be resolved before merging.

## High-Risk Dependencies (Do Not Break)

The following dependency chains are critical and must never be broken:

```
1. Keyboard → RuntimeCommandBus → useProjectionStore → sendLiveSlide → IPC → projectionWindow
2. useAppBootstrap → registerCommandHandlers → commandBus (must run before any projection command)
3. initDatabase → runMigrations → seedDatabase (must run in this order)
4. createMainWindow → createProjectionWindow (projection window needs main window reference)
```
