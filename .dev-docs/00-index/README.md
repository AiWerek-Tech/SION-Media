# SION Media — Documentation Hub

> **Terakhir diperbarui:** 2026-05-23  
> **Versi Aplikasi:** 1.0.0  
> **Status Build:** ✅ `npm run typecheck` PASS | ✅ `npm run build` PASS | ✅ 16/16 tests PASS

Dokumentasi ini disusun untuk memberikan panduan yang jelas bagi AI Agent dan Developer dalam memahami arsitektur, perencanaan, dan riwayat implementasi SION Media.

---

## Apa itu SION Media?

**SION Media** adalah aplikasi desktop **Professional Worship Presentation System** berbasis Electron, dirancang untuk operator multimedia gereja. Mengadopsi paradigma **Broadcast Console** (mirip vMix/OBS/ProPresenter) dengan workflow CUE → TAKE → PROGRAM yang aman untuk live production.

**Target pengguna:** Operator proyektor, pemusik (Stage Display), content manager, administrator gereja.

---

## Struktur Direktori Dokumentasi

```
.dev-docs/
├── STATUS.md             # ← MULAI DI SINI — quick-reference status terkini
├── 00-index/             # README dan indeks navigasi (file ini)
├── 01-architecture/      # Arsitektur sistem, blueprint, audit backend
├── 02-planning/          # Roadmap, rencana fitur (semua ✅/❌ ditandai)
├── 03-design/            # Sistem desain, spesifikasi UI/UX, audit desain
│   └── design-reports/   # Laporan usability dan audit UI/UX
├── 04-implementation/    # 34 log implementasi teknis per fitur/versi
├── 05-guides/            # Panduan operasional, code signing, dan referensi data
├── 06-history/           # Catatan pembaruan historis dan changelog
├── 07-song-scraper/      # Python scraper + JSON data 525 lagu LS
├── 08-audit/             # Audit mendalam projection mode
├── 10-enterprise-refactor-system/  # Enterprise refactor (12/12 ✅ SELESAI)
├── 11-source-architecture/         # Arsitektur domain src/ (NEW)
│   ├── README.md         # Index + status per domain
│   ├── app-layer.md      # App bootstrap, router, providers
│   ├── core/             # projection-system, runtime-system, contracts, timing
│   ├── features/         # bible, broadcast, dashboard, library, management...
│   └── infrastructure/   # Electron IPC, SQLite, Excel, cache
├── superpowers/          # Rencana & spesifikasi fitur tambahan (plans + specs)
└── assets/               # Aset desain dan branding
```

---

## Konvensi Penamaan File

| Kategori       | Format                     | Contoh                           |
| -------------- | -------------------------- | -------------------------------- |
| Architecture   | `arch-[topic].md`          | `arch-database-schema.md`        |
| Planning       | `plan-[topic]-[vX].md`     | `plan-feature-bible-v3.md`       |
| Design         | `design-[topic]-[vX].md`   | `design-system-v4.md`            |
| Implementation | `log-impl-[topic]-[vX].md` | `log-impl-obs-integration-v2.md` |
| Guides         | `guide-[topic].md`         | `guide-user-manual.md`           |
| History        | `log-[type]-[date].md`     | `log-update-20260507.md`         |

---

## Prinsip Dokumentasi

1. **Pembaruan Wajib** — Setiap perubahan fitur/logika kode WAJIB diikuti pembaruan dokumentasi.
2. **Developer-First** — Dokumentasi harus mudah dibaca manusia dan diurai AI.
3. **Historical Context** — Gunakan `impl-history-*` atau `plan-roadmap-*` untuk melacak progres.
4. **Isolated** — Seluruh isi folder ini TIDAK disertakan dalam build produksi.

---

## Tech Stack

| Layer     | Teknologi                                 |
| --------- | ----------------------------------------- |
| Desktop   | Electron 39.2.6                           |
| Frontend  | React 19.2.1 + TypeScript 5.9.3           |
| Styling   | TailwindCSS 4.2.4 + Design Tokens         |
| State     | Zustand 5.0.13                            |
| Animasi   | Framer Motion 12.38                       |
| Database  | better-sqlite3 12.9 (SQLite + WAL + FTS5) |
| Build     | electron-vite 5.0 + Vite 7.2.6            |
| Packaging | electron-builder (NSIS Windows)           |
| Testing   | Vitest + Testing Library + fast-check     |
| i18n      | i18next 26 (EN + ID)                      |

---

## Status Implementasi Terkini (2026-05-23)

### ✅ Enterprise Refactor System — SELESAI SEMUA (12/12 Phase)

Seluruh 12 phase enterprise refactor telah selesai diimplementasikan. Lihat detail di:

- `10-enterprise-refactor-system/INDEX.md` — status lengkap per phase
- `10-enterprise-refactor-system/10-implementation/` — laporan per phase

**Ringkasan Phase:**

| Phase    | Deskripsi                        | Status     |
| -------- | -------------------------------- | ---------- |
| Phase 0  | Pre-flight Safety Infrastructure | ✅ SELESAI |
| Phase 1  | Infrastructure Additions         | ✅ SELESAI |
| Phase 2  | Critical Dead UI Fixes           | ✅ SELESAI |
| Phase 3  | Modal System Foundation          | ✅ SELESAI |
| Phase 4  | Projection Runtime Hardening     | ✅ SELESAI |
| Phase 5  | Design System Components         | ✅ SELESAI |
| Phase 6  | Library Mode Improvements        | ✅ SELESAI |
| Phase 7  | Projection Mode Improvements     | ✅ SELESAI |
| Phase 8  | Management Mode Improvements     | ✅ SELESAI |
| Phase 9  | Store Decomposition              | ✅ SELESAI |
| Phase 10 | Stabilization + Performance      | ✅ SELESAI |
| Phase 11 | Release Preparation              | ✅ SELESAI |

---

## Fitur yang Sudah Diimplementasikan ✅

### Core Infrastructure

- ✅ 3-window Electron architecture (Main, Projection, Stage Display)
- ✅ SQLite database (WAL mode, FTS5, 17+ migrasi)
- ✅ Multi-hymnal system (LS, SDAH, dll dalam satu DB)
- ✅ 525 lagu Lagu Sion pre-seeded
- ✅ IPC bridge type-safe via preload context isolation
- ✅ Safe mode / crash-loop detection
- ✅ Crash recovery (auto-save session, restore on restart)

### Operational Modes

- ✅ **PROJECTION mode** — CUE/PREVIEW → TAKE → PROGRAM workflow, dual monitor
- ✅ **LIBRARY mode** (redesigned) — immersive lyrics viewer, stanza pagination, search
- ✅ **MANAGEMENT mode** — hymnal CRUD, song management, media library, backup
- ✅ **BROADCAST mode** — scaffolded (partial implementation)

### Song & Playlist System

- ✅ Song CRUD dengan metadata lengkap
- ✅ Song relations (translation, same_tune, same_text, medley, response)
- ✅ Playlist management dengan drag-drop reordering
- ✅ Song number normalization (no leading zeros)
- ✅ Duplicate song functionality

### Projection Engine

- ✅ Formal state machine (guards, effects, reducers)
- ✅ DEOS (Deterministic Execution Oracle System) — verification/replay
- ✅ Projection states: LIVE / BLACK / FREEZE / CLEAR / LOGO
- ✅ Architecture policy engine + shadow monitoring
- ✅ Next song preload (500ms delay)
- ✅ Settings-aware slide config (maxLines, maxChars)
- ✅ Debounced session save (2000ms)
- ✅ Per-mode ErrorBoundary

### Runtime Command Bus

- ✅ Typed command/event contracts
- ✅ Handlers: navigation, projection, playlist, operator, protection, timer
- ✅ Virtual input simulator (dev-only)
- ✅ Runtime Inspector (EVENTS / HEALTH / INPUTS / SIMULATOR tabs)

### UI System

- ✅ Custom title bar (glassmorphism, mode switcher, status badges, clock)
- ✅ Design system: 27+ reusable primitives
- ✅ Command palette (Ctrl+K)
- ✅ Quick jump overlay
- ✅ Keyboard cheat sheet
- ✅ Emergency panel
- ✅ Toast notifications
- ✅ Modal registry (14 dialog types, zero `window.confirm()`)
- ✅ Resizable panels dengan persistence
- ✅ Animated mode transitions (Framer Motion)
- ✅ Dark/light/system theme dengan live sync ke projection

### Settings System (Enterprise Redesign)

- ✅ 8 halaman settings: Display, Theme & Font, App Theme, Background, Backup, Hymnal, Shortcuts, About
- ✅ Live projection sync dari settings
- ✅ Real system info (memory, version, process)
- ✅ 21 keyboard shortcuts terdokumentasi

### Media Library (v11/v12)

- ✅ Media asset CRUD (image/video) offline-first
- ✅ SQLite persistence: metadata, categories, tags, favorites, thumbnails
- ✅ Media collections (grouping assets)
- ✅ Bulk actions
- ✅ Song-level background binding
- ✅ LRU cache eviction (max 50 items)

### Bible Module

- ✅ Bible translations, books, verses di SQLite
- ✅ Verse range queries, full-text search
- ✅ BibleScreen UI + BiblePanel di projection

### Announcement / Custom Slides

- ✅ Custom slides (announcement, liturgy, welcome, offering, custom)
- ✅ Slide groups dengan loop interval
- ✅ Full CRUD + group management

### Import / Export

- ✅ Excel import (xlsx, hardened)
- ✅ JSON import/export (dengan dry-run mode)
- ✅ DB backup/restore
- ✅ DB reseed

### Atmosphere / Background System

- ✅ AtmosphereRenderer + MotionEngine
- ✅ Preset backgrounds
- ✅ Per-song background binding

### Store System (Decomposed)

- ✅ `useAppStore` — global app state
- ✅ `useModeStore` — mode switching
- ✅ `useProjectionStore` — CUE/PROGRAM decks
- ✅ `usePlaylistStore` — playlist management (persisted)
- ✅ `useHymnalStore` — hymnal state (extracted)
- ✅ `useSongStore` — song state (extracted)
- ✅ `useDisplayStore` — display state (extracted)
- ✅ `useModalStore` — modal stack management
- ✅ `useServiceStore` — service session
- ✅ `useNotificationStore` — notification queue
- ✅ `useAtmosphereStore`, `useHealthStore`, `usePanelLayoutStore`, `useCacheStore`

---

## Fitur yang Belum Diimplementasikan ❌

### P1 — Prioritas Tinggi

- ❌ NDI Output
- ❌ Alpha Key / Transparent output
- ❌ Layer-based looks system
- ❌ Auto-update system (stub only)

### P2 — Prioritas Sedang

- ❌ Customizable keyboard shortcuts
- ❌ Countdown timer on projection
- ❌ Lower thirds / ticker
- ❌ SongSelect / CCLI integration
- ❌ Planning Center integration
- ❌ MIDI / presenter remote
- ❌ Role-based safety mode (Operator vs Admin)
- ❌ Auto-backup scheduler + retention policy

### P3 — Prioritas Rendah

- ❌ Audio playback
- ❌ Cloud sync
- ❌ Firebase integration (stub only)
- ❌ Multi-user collaboration

---

## Roadmap Aktif

Roadmap saat ini mengacu pada:

- `02-planning/plan-roadmap-audit-hardening-v1.md` — roadmap 90 hari pasca audit
- `02-planning/plan-roadmap-audit-hardening-task-breakdown-v1.md` — checklist eksekusi per modul

**Sprint aktif:** Sprint 1 — Security Baseline (hardening Electron webPreferences, IPC payload validation)

---

## Dokumen Rujukan Utama

| Dokumen                                                            | Fungsi                         |
| ------------------------------------------------------------------ | ------------------------------ |
| `01-architecture/01-arch-multimode-blueprint.md`                   | Blueprint sistem multi-mode    |
| `01-architecture/08-arch-audit-report.md`                          | Laporan audit arsitektur       |
| `03-design/01-sion-design-system-v1.md`                            | Design system v1               |
| `03-design/07-design-system-v4.md`                                 | Design system v4 (terkini)     |
| `04-implementation/31-log-impl-projection-system-foundation-v1.md` | Projection system foundation   |
| `10-enterprise-refactor-system/INDEX.md`                           | Status enterprise refactor     |
| `10-enterprise-refactor-system/10-implementation/`                 | Laporan implementasi per phase |

---

## Snapshot Historis

### 2026-05-17 — Recovery Contract Hardening

- Preload IPC contract untuk recovery dan emergency projection handlers diperketat
- Typed contract: `emergencyUpdate`, `onEmergencyUpdate`, `notifyShellReady`, `isSafeMode`
- Lihat: `06-history/2026-05-17-boot-recovery-contract-hardening.md`

### 2026-05-16 — Build & Modal Polish

- Fix TypeScript errors di verification/instrumentation modules
- CrashRecoveryDialog UI diselaraskan dengan modal pattern
- Lihat: `06-history/2026-05-16-build-modal-polish.md`

### 2026-05-15 — Enterprise Refactor Phase 0-6

- Phase 0-6 selesai dalam satu sesi
- Dead UI fixes, modal system, projection hardening, design system, library improvements
- Lihat: `10-enterprise-refactor-system/10-implementation/`

### 2026-05-13 — Settings Enterprise Redesign

- Settings system di-redesign menjadi enterprise-grade control center
- 8 halaman settings dengan design language konsisten
- Lihat: `04-implementation/29-log-impl-settings-system-enterprise-v1.md`

### 2026-05-12 — Scraper Removal + LS Import

- Scraper internal dihapus (diganti Python scraper)
- 525 lagu Lagu Sion diimpor ke default database
- Lihat: `06-history/2026-05-12-scraper-removal-ls-import.md`

### 2026-05-10 — Runtime Infrastructure

- Runtime Command Bus, Inspector v2, Input Adapter Architecture
- Workspace Adaptive Layout v10.2
- Lihat: `06-history/01-log-update-20260507.md`
