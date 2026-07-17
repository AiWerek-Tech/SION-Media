# Foundation Documents

> **Status:** ✅ Semua spesifikasi di folder ini sudah diimplementasikan

This directory contains the foundational architecture documents for SION Media.

## Documents

| File                           | Source                                           | Content                                                                                               | Authority |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------- |
| `01-audit-and-architecture.md` | `05-guides/enterprise-redesign-system-v1.md`     | Full reverse-engineered architecture, IPC map, DB schema, workflow analysis, dead UI registry         | Level 2   |
| `02-foundation-system.md`      | `05-guides/foundation-system-architecture-v1.md` | Design token system, component standards, layout standards, window standards, accessibility standards | Level 2   |

## Reading Order

1. `01-audit-and-architecture.md` — understand what currently exists
2. `02-foundation-system.md` — understand the design system to build on top of

## Key Information

- **01-audit-and-architecture.md** contains the complete IPC channel map, SQLite schema, Zustand store inventory, and dead UI registry. Read this before implementing any feature.
- **02-foundation-system.md** contains all design tokens, component specifications, and layout templates. Read this before building any UI component.

## Source Files

Original documents remain in `.dev-docs/05-guides/` for backward compatibility.
These are the canonical, reorganized versions.
