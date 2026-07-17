# Governance Documents

> **Status:** ADR-001 s/d ADR-008 sudah diimplementasikan (keputusan arsitektur sudah ada di codebase)

This directory contains Architecture Decision Records (ADRs) and review records.

## Implemented Architectural Decisions

| ADR     | Decision                                       | Status         |
| ------- | ---------------------------------------------- | -------------- |
| ADR-001 | Zustand untuk state management                 | ✅ Implemented |
| ADR-002 | better-sqlite3 (vs Prisma, Drizzle)            | ✅ Implemented |
| ADR-003 | RuntimeCommandBus pattern                      | ✅ Implemented |
| ADR-004 | electron-vite build system                     | ✅ Implemented |
| ADR-005 | Frameless window + custom title bar            | ✅ Implemented |
| ADR-006 | Separate projection window (vs canvas overlay) | ✅ Implemented |
| ADR-007 | WAL mode untuk SQLite                          | ✅ Implemented |
| ADR-008 | FTS5 untuk song search                         | ✅ Implemented |

## ADR Template

Create new ADRs as: `adr-[N]-[kebab-case-title].md`

```markdown
# ADR-[N]: [Title]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded  
**Deciders:** [names or roles]

## Context

## Decision

## Rationale

## Consequences

## Alternatives Considered
```
