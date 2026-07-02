# Runtime Architecture Documents

> **Status:** ✅ Semua spesifikasi runtime sudah diimplementasikan (Phase 4-9)

This directory contains the runtime engineering specifications for SION Media.

## Documents

| File                        | Source                                                    | Content                                                                                       | Authority |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| `01-functional-refactor.md` | `05-guides/phase2-functional-refactor-architecture-v1.md` | Dead UI elimination, modal orchestration, IPC refactor, state normalization                   | Level 2   |
| `02-runtime-engine.md`      | `05-guides/phase2-part2-runtime-engine.md`                | Projection engine, slide pipeline, media runtime, overlay engine, error recovery, performance | Level 1   |

## Reading Order

1. `01-functional-refactor.md` — understand what needs to be fixed and how
2. `02-runtime-engine.md` — understand the projection runtime architecture

## Key Information

- **01-functional-refactor.md** contains the complete dead UI registry (DUI-001 through DUI-010), missing modal registry (MM-001 through MM-020), IPC refactor plan, and state management normalization strategy.
- **02-runtime-engine.md** is LEVEL 1 IMMUTABLE. It defines the projection runtime engine, slide rendering pipeline, media system, and error recovery architecture. Do not modify without ADR.

## Critical Warning

`02-runtime-engine.md` defines the projection safety protocol. Any implementation that contradicts this document requires a formal ADR and architecture review.
