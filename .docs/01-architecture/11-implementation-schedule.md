# SION Media — Implementation Schedule

> **Date**: May 2026 | **Version**: 2.1 | **Total Duration**: 12 weeks (6 sprints)

---

## Overview

This document outlines the recommended implementation order for all improvements, organized into 6 two-week sprints. The schedule prioritizes critical stability fixes first, followed by architectural improvements, then core features, and finally polish and testing.

---

## Sprint 1 (Week 1-2): Stability & Critical Fixes

### 🔴 Phase 1: Critical Fixes

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 1.1 | ✅ Add Error Boundaries | P0 | 8h | `ErrorBoundary.tsx`, `main.tsx`, `projection/main.tsx`, `stageDisplay/main.tsx` |
| 1.2 | ✅ Fix Toast Timer Memory Leak | P0 | 2h | `useAppStore.ts` |
| 1.3 | ✅ Add Error Handling to Stores | P0 | 4h | `useAppStore.ts`, `usePlaylistStore.ts` |
| 1.4 | ✅ Add Video Preload Timeout | P0 | 3h | `mediaEngine.ts` |
| 1.5 | ✅ Fix DB Race Condition | P0 | 4h | `database.ts` |
| 1.6 | ✅ Add CSP Headers | P0 | 1h | `index.html`, `projection.html` |
| 1.7 | ✅ Replace console.* with logger.* | P0 | 2h | `SettingsScreen.tsx` |

**Total**: 24 hours (~3 full days)

**Deliverables**:
- App no longer crashes silently on component errors
- Toast notifications work reliably
- Video preloading doesn't hang
- Database startup is race-condition-free
- CSP headers in place for security

Additional completed hardening:
- Unhandled promise rejection prevention for common IPC calls (`settings.getAll`, `window.isMaximized`, some `settings.update` call sites)
- Added try/catch + toast feedback for several user actions that previously could fail silently (playlist delete, song delete/favorite)

---

## Sprint 2 (Week 3-4): Architecture Refactoring

### 🟠 Phase 2: Code Quality

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 2.1 | ✅ Split `index.ts` into modules | P1 | 12h | `windows.ts`, `ipc-handlers.ts`, `display-monitor.ts`, `theme-manager.ts` |
| 2.2 | ✅ Split `SettingsScreen.tsx` into sub-components | P1 | 8h | `settings/DisplaySettings.tsx`, `settings/ThemeSettings.tsx`, etc. |
| 2.3 | ✅ Create Shared Types | P1 | 8h | `src/shared/types.ts`, type-safe IPC wrapper |
| 2.4 | ✅ Create IPC Channel Constants | P1 | 3h | `src/shared/ipc-channels.ts` |
| 2.5 | ✅ Implement DB Migration System | P1 | 10h | `migrations.ts`, `schema_migrations` table |
| 2.6 | ✅ Decouple Zustand Stores | P2 | 6h | `toast-service.ts`, removed cross-store imports |
| 2.7 | ✅ i18n Foundation | P2 | 8h | `i18n/en.json`, `i18n/id.json`, `i18n/index.ts` |
| 2.8 | ✅ Security Hardening (xlsx) | P1 | 2h | File size/row/col limits, timeout, disabled formulas |

**Total**: 57 hours (~7 full days)

**Deliverables**:
- ✅ Main process modularized (4 new files)
- ✅ SettingsScreen modularized (7 sub-components)
- ✅ Type-safe IPC with shared types
- ✅ Non-destructive database migrations
- ✅ Stores decoupled
- ✅ i18n system ready for translations
- ✅ xlsx parsing hardened for security

**Completed Sprint 2 Tasks**:
- `src/main/index.ts` (453 lines → 82 lines orchestrator)
- `src/main/windows.ts` — Window creation and lifecycle
- `src/main/ipc-handlers.ts` — All IPC handlers centralized
- `src/main/display-monitor.ts` — Display change detection
- `src/main/theme-manager.ts` — Theme state management
- `src/main/migrations.ts` — DB migration system
- `src/shared/types.ts` — Shared type definitions
- `src/shared/ipc-channels.ts` — IPC channel constants
- `src/renderer/src/screens/SettingsScreen.tsx` (935 lines → 213 lines orchestrator)
- `src/renderer/src/screens/settings/` — 7 modular sub-components
- `src/renderer/src/services/toast-service.ts` — Decoupled toast service
- `src/renderer/src/i18n/` — i18n foundation (en.json, id.json, index.ts)

---

## Sprint 3 (Week 5-6): Core Features

### 🟠 Phase 3.1: Bible Module

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 3.1.1 | ✅ Create Bible DB Schema | P1 | 2h | `migrations.ts` (v4) |
| 3.1.2 | ✅ Bible CRUD IPC Handlers | P1 | 6h | `ipc-handlers.ts`, `database.ts`, `preload/index.ts` |
| 3.1.3 | ✅ BibleScreen UI | P1 | 16h | `BibleScreen.tsx` |
| 3.1.4 | ✅ Projection Bible Support | P1 | 8h | `useProjectionStore.ts`, `SlideData` type |
| 3.1.5 | USFM Bible Import | P2 | 10h | `usfm-parser.ts` |

### 🟠 Phase 3.2: Announcement Slides

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 3.2.1 | ✅ Custom Slides DB Schema | P1 | 2h | `migrations.ts` (v5) |
| 3.2.2 | ✅ Custom Slides CRUD | P1 | 6h | `ipc-handlers.ts`, `database.ts`, `preload/index.ts` |
| 3.2.3 | ✅ Announcement Loop Logic | P1 | 8h | `useAnnouncementStore.ts` |
| 3.2.4 | Playlist Integration | P1 | 4h | `usePlaylistStore.ts` |

### 🟡 Phase 6.1: Song List Virtualization

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 6.1.1 | ✅ Implement Virtual List | P2 | 6h | `SongLibraryPanel.tsx` with `@tanstack/react-virtual` |

**Total**: 68 hours (~8.5 full days)

**Deliverables**:
- ✅ Full Bible module with search and projection
- ✅ Announcement slides with auto-cycling store
- ✅ Song list virtualized (fast with 500+ songs)

**Completed Sprint 3 Tasks**:
- `src/main/migrations.ts` — Bible schema (v4), Custom Slides schema (v5)
- `src/main/database.ts` — Bible & Slides CRUD functions
- `src/main/ipc-handlers.ts` — Bible & Slides IPC handlers
- `src/shared/types.ts` — Bible & Slides type definitions
- `src/shared/ipc-channels.ts` — Bible & Slides IPC constants
- `src/preload/index.ts` — Bible & Slides API exposure
- `src/renderer/src/types.ts` — Renderer type definitions
- `src/renderer/src/screens/BibleScreen.tsx` — Bible UI with projection
- `src/renderer/src/store/useAnnouncementStore.ts` — Announcement loop logic
- `src/renderer/src/components/SongLibraryPanel.tsx` — Virtualized song list

---

## Sprint 4 (Week 7-8): Multi-Hymnal System (Scope Only)

### 🟠 Phase 4.MH: Hymnal Package Distribution & Hardening

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 4.MH.1 | ✅ Export Hymnal Package (metadata + songs) | P1 | 2h | `HymnalSettings.tsx` |
| 4.MH.2 | ✅ Import Hymnal Package + basic hardening (size limit, max songs) | P1 | 6h | `HymnalSettings.tsx` |
| 4.MH.3 | Dedupe / Conflict strategy (number/title/fingerprint) | P1 | 8h | Import pipeline |
| 4.MH.4 | Multi-Hymnal search performance review (FTS/index) | P2 | 6h | `database.ts` |

**Deliverables**:
- Hymnal package import/export works safely
- Foundation for future dedupe/conflict UI

### 📝 Out of Scope (Set to Pending)
- NDI Output / Alpha Key / Looks system
- Any broadcast-related integrations

---

## Sprint 5 (Week 9-10): Multi-Hymnal UX (Scope Only)

### 🟡 Phase 5.MH: Import Wizard & Conflict Review

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 5.MH.1 | Import preview (counts, duplicates, conflicts) | P1 | 8h | `HymnalSettings.tsx` |
| 5.MH.2 | Conflict resolution UI (skip/overwrite/merge) | P1 | 12h | `HymnalSettings.tsx` |
| 5.MH.3 | Default hymnal / official labeling UX | P2 | 4h | Settings UI |

**Deliverables**:
- Import UX for Multi-Hymnal is usable for admins

### � Out of Scope (Set to Pending)
- Drag & Drop playlist, shortcuts, remote/MIDI, UX polish, media cache

---

## Sprint 6 (Week 11-12): Multi-Hymnal Reliability (Scope Only)

### 🟡 Phase 6.MH: Integrity, Backup Strategy, and Smoke Tests

| # | Task | Priority | Est. Hours | Files |
|---|------|----------|------------|-------|
| 6.MH.1 | Integrity check tool (per-hymnal counts, orphan detection) | P1 | 8h | `database.ts` |
| 6.MH.2 | Backup/restore strategy for multi-hymnal DB (procedures) | P1 | 6h | Docs + `BackupSettings.tsx` |
| 6.MH.3 | Import hardening review (limits, timeouts, validation) | P1 | 6h | Import pipeline |
| 6.MH.4 | Smoke test checklist (manual) | P2 | 2h | Docs |

**Deliverables**:
- Multi-Hymnal data stays consistent and recoverable

### � Out of Scope (Set to Pending)
- Generic unit/e2e test suites, CI pipelines, crash reporting, countdown timer

---

## Total Summary

| Sprint | Focus | Hours | Weeks |
|--------|-------|-------|-------|
| 1 | Stability Fixes | 24h | 2 |
| 2 | Architecture | 47h | 2 |
| 3 | Core Features | 68h | 2 |
| 4 | Broadcast & Integration | 83h | 2 |
| 5 | UX & Polish | 69h | 2 |
| 6 | Testing & Release | 72h | 2 |
| **Total** | | **363h** | **12 weeks** |

**Assumptions**:
- 1 developer working full-time
- 40 hours per week
- Some buffer time for unexpected issues
- Code review and testing included in estimates

---

## Key Metrics to Track

### Performance Metrics
- **Startup time**: Target < 3s to interactive
- **Search latency**: Target < 100ms for FTS5 query
- **Projection transition**: Target < 200ms slide change
- **Memory usage**: Target < 300MB typical, < 500MB with video backgrounds
- **Bundle size**: Monitor renderer bundle size (target < 5MB)

### Quality Metrics
- **Test coverage**: Target > 60% for core modules
- **TypeScript coverage**: Target 100% (no `any`)
- **Linter errors**: Zero warnings in production build
- **Crash rate**: Target < 0.1% of sessions

### Feature Metrics
- **Bible verses indexed**: Track verse count per Bible
- **Song count**: Monitor library size performance
- **Playlist usage**: Track active playlists per session
- **Projection uptime**: Track continuous projection duration

---

## Milestones

| Milestone | Sprint | Date | Description |
|-----------|--------|------|-------------|
| M1: Stable Foundation | Sprint 1 | Week 2 | All critical bugs fixed, app no longer crashes silently |
| M2: Clean Architecture | Sprint 2 | Week 4 | Main process modularized, type-safe IPC, migrations ready |
| M3: Feature Parity Core | Sprint 3 | Week 6 | Bible module, announcements, virtualized song list |
| M4: Broadcast Ready | Sprint 4 | Week 8 | NDI output, alpha key, layer-based looks |
| M5: Polished UX | Sprint 5 | Week 10 | Drag-and-drop, shortcuts, remote support |
| M6: Production Ready | Sprint 6 | Week 12 | Tests passing, CI/CD active, crash reporting enabled |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| NDI library compatibility | High | Test on all platforms early, have fallback to window capture |
| Database migration failures | High | Always backup before migration, implement rollback |
| Virtual list performance regression | Medium | Benchmark before/after, keep old implementation as fallback |
| Test flakiness | Medium | Use retries, isolate tests, run in parallel |
| Scope creep | High | Stick to defined scope, defer P3 items to future releases |

---

## Dependencies

### External Libraries
- `@aspect/ndi` or `node-ndi` — NDI output
- `midi` — MIDI input support
- `@tanstack/react-virtual` — Already in deps, need to implement
- `vitest` — Unit testing
- `@playwright/test` — E2E testing
- `@sentry/electron` — Crash reporting

### System Requirements
- Windows/macOS/Linux support for NDI (NDI SDK platform-specific)
- Second display for testing projection
- USB clicker for testing remote support

---

## Post-Release Plan (Future)

### Phase 7 (Future): Advanced Features
- Audio playback and routing
- Cloud sync (Google Drive, Dropbox)
- ProPresenter file import (.pro6/.pro7)
- OpenLP/OpenSong import

### Phase 8 (Future): Enterprise Features
- Multi-user support (roles, permissions)
- Networked operation (multiple controllers)
- Integration with church management systems
- Live streaming integration (RTMP/SRT)
