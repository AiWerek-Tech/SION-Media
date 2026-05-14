# Governance Documents

This directory contains Architecture Decision Records (ADRs) and review records.

## ADR Template

Create new ADRs as: `adr-[N]-[kebab-case-title].md`

```markdown
# ADR-[N]: [Title]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded  
**Deciders:** [names or roles]

## Context

What situation requires a decision?

## Decision

What was decided?

## Rationale

Why was this decision made over alternatives?

## Consequences

Positive and negative consequences of this decision.

## Alternatives Considered

What other options were evaluated and why they were rejected.

## Related Documents

Links to relevant architecture documents.
```

## Implicit ADRs (To Be Documented)

The following architectural decisions were made before this governance system existed. They should be documented as ADRs:

| ADR     | Decision                                       | Status      |
| ------- | ---------------------------------------------- | ----------- |
| ADR-001 | Use Zustand for state management               | To document |
| ADR-002 | Use better-sqlite3 (vs Prisma, Drizzle)        | To document |
| ADR-003 | Use RuntimeCommandBus pattern                  | To document |
| ADR-004 | Use electron-vite build system                 | To document |
| ADR-005 | Frameless window with custom title bar         | To document |
| ADR-006 | Separate projection window (vs canvas overlay) | To document |
| ADR-007 | WAL mode for SQLite                            | To document |
| ADR-008 | FTS5 for song search                           | To document |

## Review Records

Create review records as: `review-[date]-[feature].md`

Document: what was reviewed, who reviewed it, what was found, what was approved.
