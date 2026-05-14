# Archive

This directory contains superseded documents that are kept for historical reference only.

## Purpose

When a document is superseded by a newer version, the old version is moved here rather than deleted. This preserves the history of architectural decisions.

## Rules

1. **Never implement from archived documents.** They are historical reference only.
2. **Never delete archived documents.** They may contain context for understanding why decisions were made.
3. **Always add a supersession notice** when archiving a document.

## Supersession Notice Template

Add this to the top of any document being archived:

```markdown
> ⚠️ ARCHIVED — This document has been superseded by [new document name].
> Do not implement from this document. It is kept for historical reference only.
> Archived: YYYY-MM-DD
```

## Currently Archived Documents

_No documents archived yet._

## Documents That May Be Archived in Future

The following documents in `.docs/05-guides/` are the source documents for this system. They will be archived here if they are superseded by updated versions:

- `enterprise-redesign-system-v1.md` → if v2 is created
- `foundation-system-architecture-v1.md` → if v2 is created
- `phase2-functional-refactor-architecture-v1.md` → if v2 is created
- `phase2-part2-runtime-engine.md` → if v2 is created
- `phase3-ui-modernization-system-v1.md` → if v2 is created
- `phase3-part2-ui-parts7-11.md` → if v2 is created
- `phase4-production-system-architecture-v1.md` → if v2 is created
