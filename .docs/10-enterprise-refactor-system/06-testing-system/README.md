# Testing System Documents

This directory contains test specifications and test results created during implementation.

## Purpose

Documents here track the testing strategy, test coverage, and validation results for each phase.

## Document Naming Convention

```
test-spec-[domain].md          — test specifications
test-results-[phase]-[date].md — test run results
validation-gate-[date].md      — projection validation gate records
```

## Test Infrastructure

**Current state (before Phase 0):**

- Vitest 3.2.4 configured for node environment only
- 1 test file: `src/main/database.test.ts` (2 tests)
- No renderer tests, no store tests, no component tests

**Target state (after Phase 0):**

- Vitest configured for both node and jsdom environments
- Mock window.api available in renderer tests
- Test utilities in `src/renderer/src/test-utils/`

## Test Coverage Targets

| Domain             | Current | Target (v1.1.0) | Target (v1.2.0) |
| ------------------ | ------- | --------------- | --------------- |
| database.ts        | 2 tests | 20 tests        | 30 tests        |
| useProjectionStore | 0 tests | 15 tests        | 25 tests        |
| RuntimeCommandBus  | 0 tests | 10 tests        | 15 tests        |
| slideEngine        | 0 tests | 8 tests         | 12 tests        |
| Modal components   | 0 tests | 12 tests        | 20 tests        |
| IPC handlers       | 0 tests | 10 tests        | 15 tests        |
| **Total**          | **2**   | **75**          | **117**         |

## Projection Validation Gate Records

After every projection-critical change, record the gate results here:

```
validation-gate-[YYYY-MM-DD]-[feature].md

Content:
  Date: YYYY-MM-DD
  Feature: [what was changed]
  Implementer: [name/agent]
  Reviewer: [name/agent]
  Steps 1-12: [PASS/FAIL for each]
  Overall: PASS / FAIL
  Notes: [any observations]
```

## Key Test Files to Create

| Test File                                           | Phase   | Priority |
| --------------------------------------------------- | ------- | -------- |
| `src/renderer/src/test-utils/setup.ts`              | Phase 0 | Critical |
| `src/renderer/src/store/useProjectionStore.test.ts` | Phase 4 | Critical |
| `src/renderer/src/utils/runtimeCommandBus.test.ts`  | Phase 4 | Critical |
| `src/renderer/src/engine/slideEngine.test.ts`       | Phase 4 | High     |
| `src/renderer/src/components/modals/Modal.test.tsx` | Phase 3 | High     |
| `src/renderer/src/store/useModalStore.test.ts`      | Phase 3 | High     |
