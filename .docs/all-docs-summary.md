# SION Media Documentation Summary

> **Generated**: 2026-05-12
> **Purpose**: Ringkasan lengkap seluruh dokumentasi di folder `.docs`
> **Last Updated**: 2026-05-12 (Metadata UI audit, field display implementation, database default configuration)

---

## GAMBARAN UMUM APLIKASI (Technical Overview)

### Apa itu SION Media?

**SION Media** adalah aplikasi desktop **Professional Worship Presentation System** yang dirancang untuk membantu operator multimedia gereja dalam mengelola proyeksi lagu, Alkitab, dan media selama ibadah. Aplikasi ini mengadopsi paradigma **Broadcast Console** (mirip vMix/OBS/ProPresenter) dengan workflow yang aman untuk live production.

### Target Pengguna

| User                   | Deskripsi                                            |
| ---------------------- | ---------------------------------------------------- |
| **Operator Proyektor** | Pengelola visual ibadah di gereja                    |
| **Pemusik/Singer**     | Pengguna Stage Display untuk melihat lirik dan chord |
| **Content Manager**    | Pengelola database lagu dan buku lagu (hymnal)       |
| **Administrator**      | Pengelola backup, restore, dan pengaturan sistem     |

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                     TECHNOLOGY STACK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND (Renderer)                      │ │
│  │                                                              │ │
│  │  • React 19.2.1        - UI Library                         │ │
│  │  • TypeScript 5.9.3    - Type Safety                        │ │
│  │  • TailwindCSS 4.2.4   - Styling (Design Tokens)            │ │
│  │  • Zustand 5.0.13      - State Management                   │ │
│  │  • Framer Motion 12.38 - Animations                         │ │
│  │  • Lucide React 1.14   - Icon System                        │ │
│  │  • i18next 26.0.10     - Internationalization               │ │
│  │  • @tanstack/react-virtual - Virtualized Lists              │ │
│  │  • @dnd-kit            - Drag and Drop                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    BACKEND (Main Process)                   │ │
│  │                                                              │ │
│  │  • Electron 39.2.6     - Desktop Framework                  │ │
│  │  • Node.js             - Runtime                            │ │
│  │  • better-sqlite3 12.9 - Database (SQLite + WAL mode)       │ │
│  │  • xlsx 0.18.5         - Excel Import/Export                │ │
│  │  • zod 3.24.x          - Runtime Schema Validation          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    BUILD TOOLS                              │ │
│  │                                                              │ │
│  │  • electron-vite 5.0   - Build System                       │ │
│  │  • Vite 7.2.6          - Bundler                             │ │
│  │  • electron-builder    - Installer Generator                │ │
│  │  • ESLint 9.39         - Linting                             │ │
│  │  • Prettier 3.7        - Formatting                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SION MEDIA ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         MAIN PROCESS (Backend)                         │ │
│  │                                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │ Windows      │  │ IPC Handlers │  │ Database     │                 │ │
│  │  │ Manager      │  │ (ipcMain)    │  │ (SQLite)     │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  │         │                  │                  │                        │ │
│  │         ▼                  ▼                  ▼                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │ │
│  │  │ Display      │  │ Theme       │  │ Migration   │                 │ │
│  │  │ Monitor      │  │ Manager     │  │ System      │                 │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          │ IPC (Inter-Process Communication)                │
│                          ▼                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         PRELOAD (Bridge)                               │ │
│  │                                                                        │ │
│  │  • Context Isolation: true                                            │ │
│  │  • Node Integration: false                                            │ │
│  │  • Exposes safe API to renderer via window.api                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      RENDERER PROCESSES (Frontend)                     │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ MAIN WINDOW     │  │ PROJECTION      │  │ STAGE DISPLAY   │        │ │
│  │  │ (Dashboard)     │  │ WINDOW          │  │ WINDOW          │        │ │
│  │  │                 │  │ (Audience View) │  │ (Musician View) │        │ │
│  │  │ • Operator UI   │  │ • Fullscreen    │  │ • Lyrics        │        │ │
│  │  │ • Library       │  │ • 16:9 aspect   │  │ • Chords        │        │ │
│  │  │ • Playlist      │  │ • Transitions   │  │ • Timer         │        │ │
│  │  │ • Preview/Prog  │  │ • Themes        │  │ • Cues          │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                        │ │
│  │  State Management: Zustand Stores                                      │ │
│  │  ├── useAppStore (global app state)                                   │ │
│  │  ├── useProjectionStore (cue/program decks)                           │ │
│  │  ├── usePlaylistStore (playlist management)                           │ │
│  │  └── useModeStore (operational modes)                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema (SQLite)

```sql
-- MULTI-HYMNAL ECOSYSTEM

┌─────────────────────┐       ┌─────────────────────┐
│      hymnals        │       │       songs         │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ hymnal_id (FK)      │
│ code (UNIQUE)       │       │ id (PK)             │
│ name                │       │ number              │
│ language            │       │ title               │
│ publisher           │       │ alternate_title     │
│ is_official         │       │ lyrics_raw          │
└─────────────────────┘       │ author, composer    │
                              │ key_note, tempo     │
                              │ category, tags      │
                              └─────────────────────┘
                                       │
                                       │ FTS5
                                       ▼
                              ┌─────────────────────┐
                              │     songs_fts       │
                              │ (Full-Text Search)  │
                              └─────────────────────┘

-- OTHER TABLES

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│     playlists       │  │   playlist_items    │  │   song_relations    │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ id (PK)             │  │ id (PK)             │  │ id (PK)             │
│ name                │  │ playlist_id (FK)    │  │ source_song_id (FK) │
│ created_at          │  │ song_id (FK)        │  │ target_song_id (FK) │
└─────────────────────┘  │ sort_order          │  │ relation_type       │
                         │ section_label       │  └─────────────────────┘
                         └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│      bibles         │  │    bible_verses     │  │    custom_slides    │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ id (PK)             │  │ id (PK)             │  │ id (PK)             │
│ name                │  │ bible_id (FK)       │  │ title               │
│ abbreviation        │  │ book, chapter       │  │ content             │
│ language            │  │ verse, text         │  │ bg_image            │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Core Features

| Feature                     | Deskripsi                                                      | Status          |
| --------------------------- | -------------------------------------------------------------- | --------------- |
| **Multi-Hymnal System**     | Mendukung banyak buku lagu dalam satu database (LS, SDAH, dll) | ✅              |
| **FTS5 Search**             | Pencarian instan ribuan lagu dengan fuzzy matching             | ✅              |
| **CUE → TAKE → PROGRAM**    | Workflow aman untuk live projection                            | ✅              |
| **Preview/Program Monitor** | Dual monitor 40/60 ratio ala broadcast console                 | ✅              |
| **Stage Display**           | Layar khusus pemusik dengan lirik, chord, timer                | ✅              |
| **Bible Module**            | Pencarian dan proyeksi ayat Alkitab                            | ✅              |
| **Announcement Slides**     | Custom slides dengan auto-cycling                              | ✅              |
| **Song Editor**             | Editor lirik dengan live preview                               | ✅              |
| **Playlist Management**     | Drag-drop, section dividers, mixed-hymnal                      | ✅              |
| **Theme System**            | Dark mode dengan design tokens                                 | ✅              |
| **Import/Export**           | Excel import, JSON export, backup/restore                      | ✅              |
| **Crash Recovery**          | Auto-save session state                                        | ✅              |
| **Virtualized Lists**       | Performa tinggi untuk ribuan lagu                              | ✅              |
| **Default Database**        | Fresh install otomatis dengan 525 lagu LS                      | ✅ (2026-05-12) |
| **Python Scraper**          | Scraper Python untuk import lagu tambahan                      | ✅ (2026-05-12) |

### Database Content

| Hymnal                      | Code | Jumlah Lagu | Status               |
| --------------------------- | ---- | ----------- | -------------------- |
| **Lagu Sion Edisi Lengkap** | LS   | 525         | ✅ Full (2026-05-12) |

### Recent Changes (2026-05-12)

#### 1. Scraper Module Removal

**Status**: ✅ Selesai

Sistem scraper internal telah dihapus sepenuhnya untuk mengurangi ukuran dan kompleksitas aplikasi.

**Yang dihapus:**

- Dependencies: `cheerio`, `playwright`
- Backend: `src/main/scraper/` (seluruh direktori)
- Frontend: `src/renderer/src/components/scraper/` (seluruh direktori)
- Types: `src/shared/contracts/scraper.ts`, `src/shared/errors/scraperErrors.ts`
- IPC: semua `IPC_SCRAPER` channels dan handlers
- Database: semua fungsi audit scraper
- Preload: scraper API di `preload/index.ts` dan `index.d.ts`
- Pages: `SongScraperPage.tsx`
- Menu: Song Scraper dari TitleBarMenu

**Alasan**: Scraper Python lebih fleksibel, mudah dimaintain, dan tidak memberatkan aplikasi.

#### 2. Lagu Sion Import (LS 1-525)

**Status**: ✅ Selesai

Total 525 lagu Lagu Sion Edisi Lengkap telah diimpor dengan lirik lengkap menggunakan section markers `[VERSE N]` dan `[CHORUS]`.

**Batch Import:**

- LS 1-5: Import awal untuk testing
- LS 6-100: 94 lagu
- LS 101-200: 100 lagu
- LS 201-500: 300 lagu
- LS 501-525: 25 lagu

**Struktur Lirik**: Section markers memungkinkan slide engine mengelompokkan baris menjadi slide yang tepat (4 baris per slide).

#### 3. Default Database Setup

**Status**: ✅ Selesai

Database dengan 525 lagu telah diset sebagai default untuk fresh install.

**Implementasi:**

- Database saat ini dicopy ke `resources/sion.db`
- `initDatabase()` dimodifikasi untuk copy database dari resources jika belum ada
- `package.json` include `resources/**/*` di build configuration

**Cara kerja**: Saat aplikasi diinstall pertama kali, database dari resources akan dicopy ke userData otomatis.

### Operational Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPERATIONAL MODES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  LIBRARY MODE   │  │ PROJECTION MODE │  │ BROADCAST MODE  │  │
│  │                 │  │                 │  │                 │  │
│  │  • Browse songs │  │  • Live control │  │  • Advanced     │  │
│  │  • Search       │  │  • TAKE workflow│  │  • NDI Output   │  │
│  │  • Edit lyrics  │  │  • Monitor view │  │  • Alpha Key    │  │
│  │  • Manage DB    │  │  • Stage sync   │  │  • Multi-output │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                        │
│  │ MANAGEMENT MODE │  │ FOCUS LIVE MODE │                        │
│  │                 │  │                 │                        │
│  │  • Hymnal CRUD  │  │  • Minimalist   │                        │
│  │  • Import/Export│  │  • Large monitor│                        │
│  │  • Backup       │  │  • Distraction-  │                        │
│  │  • Settings     │  │    free worship │                        │
│  └─────────────────┘  └─────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow: CUE → TAKE → PROGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BROADCAST WORKFLOW (Safe Live Production)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   OPERATOR ACTION                PREVIEW MONITOR        PROGRAM MONITOR      │
│                                                                              │
│   ┌─────────────┐               ┌─────────────┐        ┌─────────────┐       │
│   │ Select Song │──────────────▶│   CUE Deck  │        │ PROGRAM Deck│       │
│   │ from Library│               │  (Preview)  │        │  (Live Out) │       │
│   └─────────────┘               └─────────────┘        └─────────────┘       │
│                                        │                      ▲              │
│                                        │                      │              │
│                                        ▼                      │              │
│                                 ┌─────────────┐               │              │
│                                 │   PREVIEW   │               │              │
│                                 │   (Green)   │               │              │
│                                 └─────────────┘               │              │
│                                        │                      │              │
│                                        │  PRESS TAKE (SPACE)  │              │
│                                        └──────────────────────┘              │
│                                                                  │              │
│                                                                  ▼              │
│                                                          ┌─────────────┐       │
│                                                          │   PROGRAM   │       │
│                                                          │    (RED)    │       │
│                                                          │ → Audience  │       │
│                                                          └─────────────┘       │
│                                                                              │
│   SAFETY: Audience hanya melihat perubahan setelah operator                 │
│           menekan TAKE. Preview tidak mempengaruhi output live.             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Output States

| State      | Deskripsi                               | Visual Indicator    |
| ---------- | --------------------------------------- | ------------------- |
| **CLEAR**  | Tidak ada proyeksi (screen kosong/logo) | Badge abu-abu       |
| **LIVE**   | Proyeksi aktif (konten terlihat)        | Badge hijau + pulse |
| **BLACK**  | Hardware blackout (screen mati)         | Badge hitam         |
| **FREEZE** | Frame terakhir di-freeze                | Badge biru          |
| **LOGO**   | Standby logo ditampilkan                | Badge kuning        |

### File Structure

```
sion-media/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # Entry point
│   │   ├── database.ts          # SQLite operations
│   │   ├── windows.ts           # Window management
│   │   ├── ipc-handlers.ts      # IPC handlers
│   │   ├── display-monitor.ts   # Display detection
│   │   ├── theme-manager.ts     # Projection themes
│   │   └── migrations.ts        # DB migrations
│   │
│   ├── preload/                 # Bridge layer
│   │   ├── index.ts             # Preload script
│   │   └── index.d.ts           # Type declarations
│   │
│   ├── renderer/                # React Frontend
│   │   ├── src/
│   │   │   ├── components/      # UI Components
│   │   │   ├── screens/         # Mode Screens
│   │   │   ├── store/           # Zustand Stores
│   │   │   ├── engine/          # Slide Engine
│   │   │   └── assets/          # CSS, fonts
│   │   ├── index.html           # Main Window
│   │   ├── projection.html      # Projection Window
│   │   └── stageDisplay.html    # Stage Display Window
│   │
│   └── shared/                  # Shared types
│       ├── types.ts             # Type definitions
│       └── ipc-channels.ts      # IPC constants
│
├── resources/                   # App resources
├── build/                       # Build assets
└── .docs/                       # Documentation
```

### Performance Characteristics

| Metric           | Target  | Current         |
| ---------------- | ------- | --------------- |
| Startup time     | < 3s    | ✅ ~2s          |
| Search latency   | < 100ms | ✅ ~50ms (FTS5) |
| Slide transition | < 200ms | ✅ ~150ms       |
| Memory usage     | < 300MB | ✅ ~250MB       |
| Bundle size      | < 5MB   | ✅ ~3MB         |

### Security Features

- ✅ **Context Isolation**: Renderer tidak bisa akses Node.js langsung
- ✅ **nodeIntegration: false**: Tidak ada akses filesystem dari renderer
- ✅ **Content Security Policy (CSP)**: Mencegah XSS attacks
- ✅ **Type-safe IPC**: Semua komunikasi melalui typed preload bridge
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **xlsx Hardening**: File size/row/col limits, timeout, disabled formulas

### Platform Support

| Platform          | Status       | Notes                          |
| ----------------- | ------------ | ------------------------------ |
| **Windows 10/11** | ✅ Primary   | Native title bar, snap layouts |
| **macOS**         | ✅ Supported | Custom title bar               |
| **Linux**         | ✅ Supported | Custom title bar               |

---

## Struktur Direktori

```
.docs/
├── 00-index/                    # Indeks & README
├── 01-architecture/             # Arsitektur sistem (12 files)
├── 02-planning/                 # Roadmap & perencanaan (21 files)
├── 03-design/                   # Desain sistem (kosong)
├── 04-implementation/           # Log implementasi (kosong)
├── 05-guides/                   # Panduan operasional (kosong)
├── 06-history/                  # Riwayat pembaruan (kosong)
├── 07-song-scraper/             # Python scraper & import tools
│   ├── README.md                # Dokumentasi scraper & import
│   ├── scraper.py               # Python scraper script
│   ├── import-to-db.js          # Node.js import script
│   ├── songs-import-6-100.json  # LS 6-100 (94 lagu)
│   ├── songs-import-101-200.json # LS 101-200 (100 lagu)
│   ├── songs-import-201-500.json # LS 201-500 (300 lagu)
│   └── songs-import-501-525.json # LS 501-525 (25 lagu)
├── assets/                      # Aset desain (kosong)
├── 00 - 01 index & Architecture.md.md  # File konsolidasi
├── 02 Planning.md               # File konsolidasi
├── design-system-v4.md          # Design system documentation
├── log-impl-json-import-v11.md  # Log implementasi JSON import
└── plan-json-import-v11.md      # Plan JSON import
```

---

## 1. DOKUMENTASI INDEX (00-index/)

### README.md

**Fungsi**: Hub dokumentasi dan snapshot implementasi terkini

**Isi Utama**:

- Struktur direktori dokumentasi
- Konvensi penamaan file
- Prinsip dokumentasi
- **Current Implementation Snapshot (2026-05-10)**:
  - Runtime Infrastructure (Command Bus, Inspector v2, Input Adapter)
  - Workspace Adaptive Layout v10.2
  - TitleBar Modernization v9 (Glassmorphism 2.0)
  - Library Perfection v8 (Action Affordance, Zebra Striping)
  - Library Immersive Player v6 (Full-screen overlay)
  - Song Number Normalization (Migration v9)
- **Historical Snapshot (2026-05-08)**:
  - Broadcast console layout
  - CUE → TAKE → PROGRAM workflow
  - Preview/Program monitor 40/60 ratio

---

## 2. DOKUMENTASI ARSITEKTUR (01-architecture/)

### File-file yang Ada:

| File                               | Deskripsi                            |
| ---------------------------------- | ------------------------------------ |
| `01-arch-multimode-blueprint.md`   | Blueprint sistem multi-mode operasi  |
| `02-arch-multihymnal-ecosystem.md` | Arsitektur ekosistem multi-buku lagu |
| `03-arch-workspace-panels.md`      | Arsitektur panel workspace           |
| `04-arch-flow-features.md`         | Alur fitur dan fitur flow            |
| `05-interaction-polish-system.md`  | Sistem polish interaksi              |
| `06-ipc-health-v1.md`              | Indikator kesehatan IPC              |
| `07-title-bar-optimization.md`     | Optimasi title bar untuk Windows 11  |
| `08-arch-audit-report.md`          | Laporan audit arsitektur backend     |
| `09-audit-findings.md`             | Temuan audit dan status perbaikan    |
| `10-feature-gap-analysis.md`       | Analisis gap fitur vs kompetitor     |
| `11-implementation-schedule.md`    | Jadwal implementasi 6 sprint         |
| `12-improvement-plan.md`           | Rencana perbaikan detail per fase    |

### Ringkasan Isi:

#### 06-ipc-health-v1.md

- **Tujuan**: Visibility status koneksi endpoint eksternal
- **Komponen**: Endpoint Registry, Heartbeat Protocol, Health Store
- **Endpoints**: MAIN_DASHBOARD, PROJECTION_WINDOW, STAGE_DISPLAY, MIDI_BRIDGE, STREAM_DECK, REMOTE_APP

#### 07-title-bar-optimization.md

- **Tujuan**: Native Windows 11 title bar dengan snap layouts
- **Perubahan**:
  - `titleBarOverlay` enabled untuk Windows
  - Custom controls hidden di Windows
  - CSS Grid layout untuk title bar
  - Responsive padding untuk native caption area

#### 08-arch-audit-report.md

- **Scope**: Backend & Core Feature Audit
- **Temuan Utama**:
  - Main Process mengelola 3 window (Main, Projection, Stage Display)
  - Renderer menggunakan Zustand stores terpisah
  - Slide engine terpisah dari UI
  - Database SQLite + FTS5 dirombak ke Multi-Hymnal
- **Status**: typecheck ✅, lint ✅, build ✅

#### 09-audit-findings.md

- **Critical Bugs (P0)**: 7 bug sudah fixed
  - Error Boundaries ✅
  - Toast Timer Leak ✅
  - Missing Error Handling ✅
  - Video Preload Timeout ✅
  - Database Race Condition ✅
  - CSP Missing ✅
  - console.\* in Production ✅
- **Architecture Anti-Patterns (P1)**: Monolithic files sudah di-split
- **Multi-Hymnal & IPC Stabilization**: Duplicate handlers, channel mismatch sudah fixed

#### 10-feature-gap-analysis.md

- **Kompetitor**: ProPresenter, EasyWorship, vMix
- **Keunggulan SION Media**:
  - Cross-platform
  - Free & Open Source
  - Multi-Hymnal Support
  - Offline-First
  - Indonesian Localization
- **Feature Gaps Prioritas**:
  - 🔴 P1: Bible Module, Announcement Slides, NDI Output, Alpha Key
  - 🟡 P2: SongSelect/CCLI, Planning Center, MIDI Support, Custom Shortcuts
  - 🟢 P3: Audio Playback, Cloud Sync

#### 11-implementation-schedule.md

- **Total Durasi**: 12 minggu (6 sprint)
- **Sprint 1 (Week 1-2)**: Stability & Critical Fixes ✅
- **Sprint 2 (Week 3-4)**: Architecture Refactoring ✅
- **Sprint 3 (Week 5-6)**: Core Features (Bible, Announcement) ✅
- **Sprint 4-6**: Multi-Hymnal UX & Reliability (scope only)

#### 12-improvement-plan.md

- **PHASE 1**: Critical Fixes & Stability (P0) ✅
- **PHASE 2**: Architecture & Code Quality (P1) ✅
- **PHASE 3**: Feature Parity (Bible, Announcement, NDI)
- **PHASE 4**: Projection Enhancements (Layer Looks, Alpha Key)
- **PHASE 5-8**: Additional Enhancements

---

## 3. DOKUMENTASI PLANNING (02-planning/)

### File-file yang Ada:

| File                                             | Deskripsi                       |
| ------------------------------------------------ | ------------------------------- |
| `01-plan-roadmap-v1.md`                          | Roadmap V1 (fondasi awal)       |
| `02-plan-roadmap-v2.md`                          | Roadmap V2 (enterprise upgrade) |
| `03-plan-arch-multihymnal-ecosystem.md`          | Audit & fix multi-hymnal bugs   |
| `04-plan-db-multihymnal.md`                      | Rancangan DB multi-hymnal       |
| `05-plan-multi-hymnal-v3.md`                     | UI/UX multi-hymnal premium      |
| `06-arch-projection-runtime-state-machine-v1.md` | State machine proyeksi          |
| `07-audit-projection-workflow-v1.md`             | Audit workflow proyeksi         |
| `08-plan-projection-modernization-v9.md`         | Modernisasi proyeksi            |
| `09-plan-projection-layout-v9.1.md`              | Layout proyeksi                 |
| `10-audit-library-perfection-v8.md`              | Audit library mode              |
| `11-plan-library-immersive-player-v6.md`         | Player immersive                |
| `12-plan-ui-modernization.md`                    | Modernisasi UI                  |
| `13-plan-ui-multimode.md`                        | UI multi-mode                   |
| `14-plan-management-refactor-v10.md`             | Refactor management mode        |
| `15-plan-feature-songsion.md`                    | Fitur SongSion integration      |
| `16-plan-feature-titlebar.md`                    | Fitur title bar                 |
| `17-plan-theme-light-dark-system.md`             | Sistem tema Light/Dark/System   |
| `18-plan-titlebar-modernization-v9.md`           | Modernisasi title bar v9        |
| `19-plan-onboarding-v5.md`                       | Onboarding multi-phase          |
| `20-plan-song-number-normalization.md`           | Normalisasi nomor lagu          |
| `21-scratchpad-lagusionplus.md`                  | Analisis play.lagusion.org      |

### Ringkasan Isi:

#### 01-plan-roadmap-v1.md

- **Scope**: Pondasi awal SION Media V1
- **Isi**: UI/UX Implementation Plan, Core Flow Architecture, Initial Database Schema
- **Maintenance Update (2026-05-07)**:
  - Program output dipisahkan dari cue/preview
  - Stage Display aktif dengan state snapshot
  - Backup SQLite checkpoint WAL

#### 02-plan-roadmap-v2.md

- **Scope**: Enterprise Upgrade V2
- **Key Objectives**:
  - FTS5 integration
  - Multi-window management
  - Crash recovery system
  - Enterprise-grade UI (TailwindCSS V4)
- **Alignment (2026-05-08)**:
  - Dashboard broadcast console layout
  - CUE → TAKE → PROGRAM workflow
  - Control bar switcher-style

#### 03-plan-arch-multihymnal-ecosystem.md

- **Status**: ✅ All bugs fixed
- **Bug Fixes**:
  1. Duplicate IPC handlers ✅
  2. Display channel mismatch ✅
  3. Bible search SQL ✅
  4. Missing preload APIs ✅
  5. Type declaration incomplete ✅
  6. Theme state persistence ✅
  7. SongRelation type mismatch ✅

#### 04-plan-db-multihymnal.md

- **Skema Baru**:
  - `hymnals`: Koleksi buku lagu
  - `songs`: Master data dengan FK ke hymnals
  - `songs_fts`: FTS5 dengan hymnal_id
  - `song_relations`: Linked songs antar buku
- **Eksekusi**: Wipe-out DB lama, fresh schema, re-seeding

#### 05-plan-multi-hymnal-v3.md

- **Target**: Premium Desktop App bergaya broadcast console
- **Komponen Baru**:
  - `HymnalSidebar.tsx`: Collapsible sidebar navigasi
  - `CommandPalette.tsx`: Global search Ctrl+K
  - Warna aksen unik per buku lagu
  - Section dividers di playlist

#### 06-arch-projection-runtime-state-machine-v1.md

- **State Hierarchy**:
  - OUTPUT STATE: CLEAR, LIVE, BLACK, FREEZE, LOGO
  - PROGRAM STATE: programSlides, programSlide, LIVE-LOCK, LIVE-DIRTY
  - PREVIEW STATE: slides, currentSlideIndex, PREVIEW-CLEAN, PREVIEW-DIRTY
  - NEXT STATE: nextSlide, nextSong, queuedSlides
  - TRANSITION STATE: IDLE, TRANSITIONING, QUEUED-TRANSITION

#### 10-audit-library-perfection-v8.md

- **Temuan**: 42 item (7 Critical, 12 High, 15 Medium, 8 Low)
- **Area Audit**:
  - Grid Discipline (4px base grid)
  - Depth Layering (L1-L4)
  - Glassmorphism Precision
  - Song Card Perfection
  - Action Affordance (20% idle → 100% hover)
  - Number Normalization regression risk

#### 17-plan-theme-light-dark-system.md

- **Mode Tema**: Dark, Light, System
- **Scope**: Operator UI, Stage Display, Projection
- **Implementasi**:
  - Phase 1: Light token set di CSS
  - Phase 2: Theme engine (resolver + applier)
  - Phase 3: Persistensi DB
  - Phase 4: Settings UI
  - Phase 5: IPC broadcast + titleBarOverlay
  - Phase 6: QA & Polish

#### 20-plan-song-number-normalization.md

- **Objective**: Hilangkan leading zeros (001 → 1, 010 → 10, 001A → 1A)
- **Strategi**:
  - DB Migration v9: UPDATE dengan LTRIM
  - Prevent regression: normalize di addSong/updateSong

---

## 4. DOKUMENTASI HISTORY (06-history/)

### File-file yang Ada:

| File                                      | Deskripsi                                       |
| ----------------------------------------- | ----------------------------------------------- |
| `2026-05-12-scraper-removal-ls-import.md` | Riwayat penghapusan scraper dan import LS 1-525 |

### Ringkasan Isi:

#### 2026-05-12-scraper-removal-ls-import.md

- **Scraper Module Removal**:
  - Penghapusan dependencies: cheerio, playwright
  - Penghapusan backend: src/main/scraper/
  - Penghapusan frontend: src/renderer/src/components/scraper/
  - Penghapusan types: src/shared/contracts/scraper.ts, src/shared/errors/scraperErrors.ts
  - Penghapusan IPC: semua IPC_SCRAPER channels dan handlers
  - Penghapusan database: fungsi audit scraper
  - Penghapusan preload: scraper API
  - Penghapusan pages: SongScraperPage.tsx
  - Penghapusan menu: Song Scraper dari TitleBarMenu
  - Alasan: Scraper Python lebih fleksibel dan tidak memberatkan aplikasi

- **Lagu Sion Import (LS 1-525)**:
  - Total 525 lagu diimpor dengan lirik lengkap
  - Menggunakan Python scraper + Node.js import script
  - Batch import: 1-5, 6-100, 101-200, 201-500, 501-525
  - Struktur lirik dengan section markers [VERSE N] dan [CHORUS]
  - JSON files tersedia di .docs/07-song-scraper/

- **Default Database Setup**:
  - Database dicopy ke resources/sion.db
  - initDatabase() dimodifikasi untuk copy dari resources
  - Fresh install otomatis dengan 525 lagu

---

## 5. DOKUMENTASI SONG SCRAPER (07-song-scraper/)

### File-file yang Ada:

| File                        | Deskripsi                                    |
| --------------------------- | -------------------------------------------- |
| `README.md`                 | Dokumentasi lengkap scraper & import lagu    |
| `scraper.py`                | Python scraper script untuk extract lagu     |
| `import-to-db.js`           | Node.js script untuk import JSON ke database |
| `songs-import-6-100.json`   | Lagu LS 6-100 (94 lagu)                      |
| `songs-import-101-200.json` | Lagu LS 101-200 (100 lagu)                   |
| `songs-import-201-500.json` | Lagu LS 201-500 (300 lagu)                   |
| `songs-import-501-525.json` | Lagu LS 501-525 (25 lagu)                    |

### Ringkasan Isi:

#### README.md

- **Perubahan Penting (2026-05-12)**:
  - Penghapusan sistem scraper internal
  - Import lagu LS 1-525
  - Setup default database untuk fresh install

- **Python Scraper**:
  - Menggunakan Playwright dan BeautifulSoup
  - Menghasilkan JSON dengan struktur yang sesuai
  - Menambahkan section markers [VERSE N] dan [CHORUS]

- **Import Script**:
  - Menggunakan better-sqlite3
  - Mendukung OS-specific database path
  - Update lyrics untuk existing songs

- **Struktur Lirik**:
  - Section markers menggunakan huruf kapital
  - Setiap section dipisahkan dengan baris kosong
  - Verse diberi nomor berurutan

- **Troubleshooting**:
  - NODE_MODULE_VERSION mismatch
  - Database locked
  - File not found

---

## 6. DOKUMENTASI TAMBAHAN

### design-system-v4.md

- **Scope**: Design system documentation
- **Isi**: Design tokens, color system, typography, spacing

### log-impl-json-import-v11.md

- **Scope**: Log implementasi JSON import
- **Isi**: Riwayat implementasi import JSON ke database

### plan-json-import-v11.md

- **Scope**: Plan JSON import
- **Isi**: Perencanaan dan strategi import JSON

---

## END OF DOCUMENTATION
