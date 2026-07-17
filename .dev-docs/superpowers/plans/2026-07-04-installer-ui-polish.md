# Installer UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate clipped buttons, irrelevant repair guidance, and corrupted characters in the Windows installer.

**Architecture:** Keep the native NSIS layout and adapt content by installer mode. The custom SmartScreen page aborts itself for update and repair, while native action labels use short strings that fit fixed-size controls.

**Tech Stack:** electron-builder, NSIS, Vitest

---

### Task 1: Add UI regression contract

**Files:**

- Modify: `src/main/installer-config.test.ts`

- [x] Assert that SmartScreen aborts for every mode except `install`.
- [x] Assert action labels are exactly `Perbarui` and `Perbaiki`.
- [x] Assert the NSIS source contains no Unicode separator characters.
- [x] Run `npx vitest run src/main/installer-config.test.ts --no-file-parallelism` and confirm failure against the current installer source.

### Task 2: Correct native installer presentation

**Files:**

- Modify: `build/installer.nsh`

- [x] Add an early `Abort` in `SmartScreenGuidancePage` when `$InstallerMode != "install"`.
- [x] Replace long button labels with `Perbarui` and `Perbaiki` while keeping full window titles.
- [x] Replace Unicode line separators with plain ASCII copy.
- [x] Run the focused installer test and confirm it passes.

### Task 3: Build verification

**Files:**

- Modify: `docs/superpowers/plans/2026-07-04-installer-ui-polish.md`

- [x] Run `npm run typecheck` and `git diff --check`.
- [x] Run `npx electron-builder --win` and confirm NSIS compilation succeeds.
- [x] Confirm the rebuilt installer exists and mark this plan complete.
