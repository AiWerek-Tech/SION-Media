# Functional Refactor Architecture — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.dev-docs/05-guides/phase2-functional-refactor-architecture-v1.md`  
> Authority Level: **Level 2**  
> Size: 41.8 KB | 1,289 lines | 4 Parts

---

## How to Access This Document

```
.dev-docs/05-guides/phase2-functional-refactor-architecture-v1.md
```

---

## Document Contents

| Part   | Title                            | Key Information                                                                                                                                                                                                                                |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 1 | Dead UI Elimination System       | DUI-001 through DUI-010 with root cause, affected files, fix strategy. FI-001 through FI-005 fake interactions. MW-001 through MW-007 missing workflows. BS-001 through BS-004 broken state. MM-001 through MM-020 missing modals.             |
| Part 2 | Modal Orchestration Architecture | useModalStore TypeScript interface, modal lifecycle state machine, stacking rules, promise-based pattern, modal type specifications (CreatePlaylist, DeleteConfirm, CrashRecovery, ImportProgress, SongRelations)                              |
| Part 3 | IPC Refactor Architecture        | Channel normalization (display_get-all → display:get-all), complete normalized channel map, 3 new IPC handlers with implementation specs, security hardening, timeout strategy, stale listener prevention                                      |
| Part 4 | State Management Refactor        | Store architecture map, store ownership rules, useAppStore decomposition (4 phases), usePlaylistStore persistence fix, useServiceStore for timer, usePanelLayoutStore 3-panel extension, projection sync architecture, state performance rules |

---

## Critical Data in This Document

### Dead UI Registry (Part 1)

DUI-001 through DUI-010 — the 10 broken interactions that must be fixed in Phase 2. Each entry has: root cause, affected component, affected IPC, fix strategy, validation requirements.

### Missing Modal Registry (Part 1.5)

MM-001 through MM-020 — 20 modals needed. Priority, backend status, complexity for each.

### useModalStore Interface (Part 2.1)

The complete TypeScript interface for the modal store. Reference when implementing `useModalStore.ts`.

### Promise-Based Modal Pattern (Part 2.1.4)

The `openAsync<T>()` pattern for async modals. Reference when implementing any modal that returns a value.

### IPC Channel Normalization (Part 3.1)

The complete normalized channel map. Reference when adding any new IPC channel.

### Store Ownership Rules (Part 4.1.2)

Which store owns which state. Reference before adding state to any store.

### useAppStore Decomposition Phases (Part 4.1.3)

The 4-phase migration plan for decomposing useAppStore. Reference before starting Phase 9.

---

## When This Document Changes

Update this document when:

- A dead UI issue is fixed (update DUI status)
- A modal is implemented (update MM status)
- A new IPC channel is added (update channel map)
- A store is created or decomposed (update store map)
- Store ownership rules change
