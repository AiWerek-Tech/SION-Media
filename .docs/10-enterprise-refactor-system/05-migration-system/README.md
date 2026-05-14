# Migration System Documents

This directory contains migration guides and records created during implementation.

## Purpose

Documents in this directory are created **during** implementation, not before. Each sprint that involves a migration produces a document here.

## Document Naming Convention

```
migration-[phase]-[sprint]-[description].md

Examples:
  migration-phase1-sprint1-infrastructure-stores.md
  migration-phase3-sprint3-modal-system.md
  migration-phase9-sprint9-store-decomposition.md
```

## Migration Document Template

```markdown
# Migration: [Description]

**Phase:** [N]  
**Sprint:** [N]  
**Date:** YYYY-MM-DD  
**Status:** In Progress | Complete | Rolled Back

## What Was Migrated

[Description of the migration]

## Files Changed

[List of files modified]

## Compatibility Layer

[Description of any compatibility layer created]

## Consumer Migration Status

| Consumer File | Status      | Notes |
| ------------- | ----------- | ----- |
| file.tsx      | ✅ Migrated |       |
| other.tsx     | ⬜ Pending  |       |

## Rollback Procedure

[Step-by-step rollback instructions]

## Validation Results

[Results of validation gate]
```

## Current Migrations

_No migrations completed yet. This directory will be populated during implementation._

## Key Migrations Planned

| Migration                        | Phase   | Complexity | Risk   |
| -------------------------------- | ------- | ---------- | ------ |
| usePlaylistStore persistence     | Phase 1 | Low        | Low    |
| usePanelLayoutStore 3-panel      | Phase 1 | Low        | Low    |
| window.confirm() → ConfirmDialog | Phase 3 | Medium     | Low    |
| useProjectionStore session save  | Phase 4 | Medium     | Medium |
| useAppStore → useSongStore       | Phase 9 | High       | High   |
| useAppStore → useHymnalStore     | Phase 9 | High       | High   |
| useAppStore → useDisplayStore    | Phase 9 | Medium     | Medium |
