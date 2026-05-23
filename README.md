# SION Media Desktop

**Professional Worship Presentation System** — Electron + React + TypeScript

> Untuk dokumentasi lengkap, lihat folder [`.docs/`](./.docs/)

---

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Verify & Test

```bash
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Vitest (16 tests)
npm run build        # Full production build
```

## Tech Stack

| Layer    | Teknologi                            |
| -------- | ------------------------------------ |
| Desktop  | Electron 39.2.6                      |
| Frontend | React 19.2.1 + TypeScript 5.9.3      |
| Styling  | TailwindCSS 4.2.4                    |
| State    | Zustand 5.0.13                       |
| Database | better-sqlite3 (SQLite + WAL + FTS5) |
| Build    | electron-vite 5.0 + Vite 7.2.6       |

## Dokumentasi

| Dokumen                                                                                          | Deskripsi                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| [`.docs/STATUS.md`](./.docs/STATUS.md)                                                           | Status implementasi terkini (fitur ✅/❌) |
| [`.docs/00-index/README.md`](./.docs/00-index/README.md)                                         | Hub dokumentasi lengkap                   |
| [`.docs/11-source-architecture/`](./.docs/11-source-architecture/)                               | Arsitektur domain per layer               |
| [`.docs/10-enterprise-refactor-system/INDEX.md`](./.docs/10-enterprise-refactor-system/INDEX.md) | Status enterprise refactor (12/12 ✅)     |

## Struktur Src

```
src/
├── main/           # Electron main process (IPC, DB, windows)
├── preload/        # Context bridge (window.api)
├── renderer/src/
│   ├── app/        # Bootstrap, router, providers
│   ├── core/       # Projection engine, runtime command bus
│   ├── features/   # Library, Projection, Playlist, Bible, Management...
│   ├── infrastructure/ # Electron IPC adapters, DB, Excel, cache
│   ├── components/ # Shared UI components + design system
│   ├── store/      # Zustand stores
│   └── screens/    # Top-level screens
└── shared/         # Shared types + IPC channel constants
```

## Operational Modes

- **PROJECTION** — CUE/PREVIEW → TAKE → PROGRAM (live worship output)
- **LIBRARY** — Song browser, immersive lyrics viewer
- **MANAGEMENT** — Hymnal CRUD, media library, backup, settings
- **BROADCAST** — Advanced output (planned)
