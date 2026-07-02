# Projection Mode Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep audience projection output alive across application mode changes and keep the Output ON/OFF indicator truthful.

**Architecture:** Treat projection visibility as an independent operator-controlled lifecycle. The main-process mode handler validates modes but always preserves output visibility, while renderer bootstrap reconciles its display store against the actual Electron window state.

**Tech Stack:** Electron, React, Zustand, TypeScript, Vitest.

---

### Task 1: Reproduce lifecycle failure

- [x] Add failing policy tests for every application mode.
- [x] Add source-contract tests for IPC preservation and startup status reconciliation.
- [x] Confirm failures against the existing hide-on-Library behavior.

### Task 2: Separate output from workspace navigation

- [x] Add a validated preserve-only mode policy.
- [x] Remove projection hide/create side effects from `system:set-mode`.
- [x] Keep manual `projection:show` and `projection:hide` as the only visibility controls.
- [x] Reconcile renderer output status with the Electron window during bootstrap.

### Task 3: Verification

- [x] Pass focused main-process and renderer lifecycle tests.
- [x] Run formatting, lint, full tests, typechecks, production build, and diff validation.
