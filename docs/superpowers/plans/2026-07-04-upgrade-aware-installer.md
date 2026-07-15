# Upgrade-Aware Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Windows setup present install/update/repair states while safely refreshing bundled content and preserving user-owned data.

**Architecture:** NSIS detects the existing uninstall registry entry and installed semantic version, reuses the registered install directory, and customizes setup copy. The application owns bundled packs under `process.resourcesPath`; the writable SQLite database remains under `userData`, is backed up before pending migrations, and uses explicit provenance for release-owned seed records.

**Tech Stack:** Electron 39, electron-builder/NSIS, TypeScript, better-sqlite3, Vitest

---

### Task 1: Installer mode detection

**Files:**
- Modify: `build/installer.nsh`
- Modify: `src/main/installer-config.test.ts`

- [x] Add failing contract tests for registry detection, update/repair labels, install-directory reuse, and downgrade blocking.
- [x] Run `npx vitest run src/main/installer-config.test.ts --no-file-parallelism` and confirm the new assertions fail.
- [x] Implement NSIS `customInit` mode detection using the stable electron-builder uninstall key and semantic version comparison.
- [x] Update welcome/finish copy and primary button text for update and repair modes without changing uninstall data retention.
- [x] Re-run the installer contract tests and confirm they pass.

### Task 2: Pre-migration backup boundary

**Files:**
- Create: `src/main/database-upgrade.ts`
- Create: `src/main/database-upgrade.test.ts`
- Modify: `src/main/database.ts`

- [x] Add tests proving no backup is created when no migration is pending, a WAL checkpoint and backup occur before pending migration writes, retention is bounded, and a failed migration restores the original database.
- [x] Run `npx vitest run src/main/database-upgrade.test.ts --no-file-parallelism` and confirm failure because the upgrade coordinator is absent.
- [x] Implement a focused upgrade coordinator accepting database path, migration callback, current/target versions, and filesystem dependencies.
- [x] Invoke it from database initialization before schema migration and keep normal startup blocked on unrecoverable restore failure.
- [x] Re-run focused tests and confirm pass.

### Task 3: Explicit bundled provenance

**Files:**
- Modify: `src/main/migrations.ts`
- Create: `src/main/bundled-content-upgrade.ts`
- Create: `src/main/bundled-content-upgrade.test.ts`
- Modify: `src/main/database.ts`

- [x] Add tests for the next migration adding `content_origin` and `bundled_key`, conservative classification, stable uniqueness, bundled-record correction, and preservation of user songs and playlist references.
- [x] Run the focused test and confirm the provenance behavior fails.
- [x] Add the migration with `user` as the safe default; classify only known seeded hymnal/song identities as `bundled`.
- [x] Implement transactional upsert of release-owned hymnals/songs by stable bundled key while leaving user rows untouched.
- [x] Rebuild song FTS through existing update triggers after bundled content changes and run focused tests.

### Task 4: Release and packaged verification

**Files:**
- Modify: `src/main/installer-config.test.ts`
- Modify: `docs/superpowers/plans/2026-07-04-upgrade-aware-installer.md`

- [x] Run focused tests for installer, database upgrade, migrations, and bundled content.
- [x] Run `npm test`, `npm run typecheck`, and `git diff --check`.
- [x] Build the unpacked application and verify the packaged Bible SQLite checksum equals the source checksum.
- [x] Run `npm run build:win` to compile the custom NSIS logic into a real setup executable.
- [x] Mark completed plan steps and report any environment-only validation still requiring an installed previous release.
