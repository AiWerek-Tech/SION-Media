# Celestial Native Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a branded, modern, production-safe Windows assisted installer for SION Media.

**Architecture:** Keep electron-builder's native NSIS assisted flow and provide deterministic visual assets plus a scoped NSIS include. Validate configuration and binary asset contracts before running the real Windows packaging pipeline.

**Tech Stack:** electron-builder 26, NSIS MUI2, PowerShell/System.Drawing, Vitest.

---

### Task 1: Installer contract tests

- [x] Add failing tests for assisted mode, branding paths, upgrade-safe uninstall behavior, localized copy, and bitmap dimensions.
- [x] Run the focused test and confirm the current basic installer fails the contract.

### Task 2: Reproducible branding assets

- [x] Add a PowerShell generator for 164x314 sidebar and 150x57 header BMP files.
- [x] Generate installer and uninstaller assets from the existing SION Media icon.

### Task 3: NSIS experience

- [x] Add scoped Indonesian Welcome, directory, progress, Finish, launch, and uninstall copy.
- [x] Configure electron-builder to use the assets, include script, installer icon, single language, and safe upgrade/uninstall policies.

### Task 4: Verification

- [x] Pass focused configuration tests, lint, typechecks, and the full automated test suite.
- [x] Compile the Windows NSIS installer and verify the expected Setup artifact exists.
- [x] Run diff validation and mark the plan complete.
