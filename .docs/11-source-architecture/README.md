# Source Architecture Documentation

> **Terakhir diperbarui:** 2026-05-23  
> **Catatan:** Dokumen-dokumen ini adalah salinan dari README.md yang ada di dalam `src/` untuk kemudahan navigasi terpusat.

Folder ini berisi dokumentasi arsitektur domain untuk setiap layer dalam `src/renderer/src/`.

---

## Struktur Layer

```
src/renderer/src/
├── app/              → app-layer.md
├── core/
│   ├── projection/   → core/projection-system.md
│   ├── runtime/      → core/runtime-system.md
│   │   └── contracts/→ core/runtime-contracts.md
│   └── timing/       → core/timing-system.md
├── features/
│   ├── bible/        → features/feature-bible.md
│   ├── broadcast/    → features/feature-broadcast.md
│   ├── dashboard/    → features/feature-dashboard.md
│   ├── library/      → features/feature-library.md
│   ├── management/   → features/feature-management.md
│   ├── playlist/     → features/feature-playlist.md
│   ├── projection/   → features/feature-projection.md
│   └── stage-display/→ features/feature-stage-display.md
└── infrastructure/   → infrastructure/infrastructure-layer.md
```

---

## Status Implementasi per Domain

| Domain                    | Status     | Catatan                                |
| ------------------------- | ---------- | -------------------------------------- |
| `app/`                    | ✅ Active  | Bootstrap, router, providers           |
| `core/projection/`        | ✅ Active  | Formal state machine, DEOS, replay     |
| `core/runtime/`           | ✅ Active  | Command bus, event system, health      |
| `core/runtime/contracts/` | ✅ Active  | Typed events/commands, correlation     |
| `core/timing/`            | ⬜ Planned | Placeholder — belum diimplementasikan  |
| `features/bible/`         | ✅ Active  | Bible screen + projection panel        |
| `features/broadcast/`     | ⬜ Planned | Placeholder — NDI/OBS future           |
| `features/dashboard/`     | ✅ Active  | Mode hub, navigation                   |
| `features/library/`       | ✅ Active  | Song browser, editor, import/export    |
| `features/management/`    | ✅ Active  | Settings, backup, system info          |
| `features/playlist/`      | ✅ Active  | Playlist CRUD, drag-drop               |
| `features/projection/`    | ✅ Active  | **OPERATIONAL CRITICAL** — live output |
| `features/stage-display/` | ✅ Active  | Confidence monitor window              |
| `infrastructure/`         | ✅ Active  | Electron IPC, SQLite, Excel, cache     |

---

## Referensi Terkait

- `01-architecture/01-arch-multimode-blueprint.md` — blueprint multi-mode
- `10-enterprise-refactor-system/INDEX.md` — status enterprise refactor
- `STATUS.md` — status implementasi terkini
