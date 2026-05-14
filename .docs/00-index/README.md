# SION Media Documentation Hub

Dokumentasi ini disusun untuk memberikan panduan yang jelas bagi AI Agent dan Developer dalam memahami arsitektur, perencanaan, dan riwayat implementasi SION Media.

## Struktur Direktori

```text
.docs/
├── 00-index/             # README dan indeks navigasi dokumentasi
├── 01-architecture/      # Arsitektur sistem, alur aplikasi, dan laporan audit backend
├── 02-planning/          # Roadmap, rencana fitur, dan strategi upgrade per versi
├── 03-design/            # Sistem desain, spesifikasi UI/UX, dan laporan audit desain
│   └── design-reports/   # Laporan usability dan audit UI/UX
├── 04-implementation/    # Log implementasi teknis per fitur/versi
├── 05-guides/            # Referensi data (daftar lagu) dan panduan operasional
├── 06-history/           # Catatan pembaruan historis, laporan audit, dan scratchpad
└── assets/               # Aset desain, branding, dan workspace
```

## Konvensi Penamaan File

Untuk menjaga kerapian, gunakan format penamaan berikut untuk file baru:

- **Architecture**: `arch-[topic].md` (contoh: `arch-database-schema.md`)
- **Planning**: `plan-[topic]-[vX].md` (contoh: `plan-feature-bible-v3.md`)
- **Design**: `design-[topic]-[vX].md` atau `audit-[topic].md` (contoh: `design-system-v1.md`)
- **Implementation**: `impl-[topic]-[vX].md` atau `log-impl-[topic]-[vX].md` (contoh: `impl-obs-integration-v2.md`)
- **Guides**: `guide-[topic].md` (contoh: `guide-user-manual.md`)
- **History**: `log-[type]-[date/vX].md` (contoh: `log-update-20240101.md`)

## Prinsip Dokumentasi

1. **Pembaruan Wajib**: Setiap perubahan pada fitur atau logika kode **WAJIB** diikuti dengan pembaruan dokumentasi pada folder yang relevan.
2. **Developer-First**: Dokumentasi harus mudah dibaca oleh manusia dan diurai oleh AI.
3. **Historical Context**: Gunakan file `impl-history-*` atau `plan-roadmap-*` untuk melacak progres jangka panjang.
4. **Isolated**: Seluruh isi folder ini **TIDAK** disertakan dalam build produksi.

---

_Terakhir diperbarui: 2026-05-13 (Settings Enterprise Redesign)_

## Current Implementation Snapshot (2026-05-13)

### Settings System Enterprise Redesign v1

Seluruh Settings System telah di-redesign menjadi **enterprise-grade control center** yang konsisten dengan Library Pro dan Management Studio:

**Shell & Navigation:**

- `SettingsScreen.tsx` — glass header, 252px sidebar dengan search, breadcrumb navigasi
- Unified `sp-*` design system (~1500 lines CSS) untuk semua 8 halaman settings
- Semua halaman menggunakan design language yang sama

**Halaman yang Diredesign (Functional):**

- **Display** — toggle proyektor show/hide, set monitor output, 8 settings keys baru tersimpan ke DB
- **Tema & Font** — live sync ke proyektor, `projection_font_weight` + `projection_line_height` + `projection_max_lines/chars` tersimpan
- **Tampilan** — `ui_layout_mode` + `workspace_name` tersimpan ke DB, 6 UI preference toggles
- **Backup** — backup langsung via `window.api.system.createBackup()`, memory monitoring, custom path
- **Keyboard** — data shortcut 100% akurat dari `useGlobalShortcuts.ts`, 21 shortcuts, 5 kategori
- **Tentang** — real system info dari `window.electron.process`, memory dari `window.api.system.getMemory()`, 3-tab navigation

**Bug Fix Kritis:**

- `ReferenceError: process is not defined` di halaman Tentang — fix menggunakan `window.electron.process`

**Lint & TypeCheck Hardening:**

- 26 ESLint errors diselesaikan (purity, set-state-in-effect, exhaustive-deps, unescaped-entities)
- 6 missing return types ditambahkan
- `Math.random` di `MotionEngine.tsx` dipindah ke module-level constant
- `npm run lint` → ✅ 0 errors · `npm run typecheck` → ✅ 0 errors

Dokumen rujukan:

- `04-implementation/29-log-impl-settings-system-enterprise-v1.md`
- `04-implementation/30-log-impl-lint-typecheck-hardening.md`
- `03-design/06-settings-enterprise-design-system.md`

---

## Current Implementation Snapshot (2026-05-13)

### Media Library Enterprise v11

Projection atmosphere kini sudah masuk ke fase **managed media asset system**:

- **Media Library CRUD**: import, edit metadata, favorite, delete, dan preview asset image/video
- **Offline-First Storage**: asset yang diimpor disalin ke storage aplikasi agar tidak bergantung pada path eksternal
- **SQLite Persistence**: tabel `media_assets` menyimpan metadata, kategori, tags, favorite state, thumbnail path, dan usage count
- **Asset Thumbnails**: image thumbnail nyata disimpan ke disk, sementara video memakai placeholder thumbnail yang stabil dan siap di-upgrade ke frame extraction
- **Usage Tracking**: setiap apply ke global atmosphere menaikkan `usage_count` untuk ranking asset yang paling sering dipakai
- **Settings Workspace Upgrade**: panel `Background` berubah menjadi workspace library yang lebih lebar dan lebih cocok untuk operator desktop
- **Workflow Safety**: menghapus asset aktif sekarang membersihkan referensi atmosphere/legacy fallback agar tidak meninggalkan broken media path

Dokumen rujukan:

- `04-implementation/25-log-impl-media-library-enterprise-v11.md`
- `03-design/05-projection-atmosphere-system-v1.md`

### Collections & Song Binding v12

Media layer sekarang sudah naik lagi ke fase **collection-aware and song-bindable background workflow**:

- **Media Collections**: asset dapat dikelompokkan menjadi pack/collection dengan cover dan membership terkelola
- **Bulk Actions**: favorite, kategorisasi, delete, dan assignment collection sekarang bisa dilakukan ke banyak asset sekaligus
- **Song-Level Binding**: `SongEditor` mendukung binding langsung ke asset library, bukan hanya preset global/preset statis
- **Management Visibility**: inspector di `ManagementMode` menampilkan status background binding lagu
- **Referential Cleanup**: delete asset kini membersihkan referensi di global atmosphere, legacy fallback, song overrides, dan cover collection

Dokumen rujukan:

- `04-implementation/26-log-impl-media-library-song-binding-v12.md`
- `04-implementation/25-log-impl-media-library-enterprise-v11.md`

## Roadmap Aktif (Audit & Hardening)

- `02-planning/plan-roadmap-audit-hardening-v1.md` - roadmap 90 hari berbasis audit teknis menyeluruh.
- `02-planning/plan-roadmap-audit-hardening-task-breakdown-v1.md` - checklist eksekusi per modul untuk breakdown ke tiket kerja.

## Historical Snapshot (2026-05-10)

### Runtime Infrastructure (Operator-Grade)

SION Media kini memiliki fondasi runtime yang observable dan extensible:

- **Runtime Command Bus**: unified routing → validation → handlers → event stream
- **Runtime Inspector v2**: tabbed Operations Console
  - `EVENTS` / `HEALTH` / `INPUTS` (+ `SIMULATOR` DEV-only)
- **Input Adapter Architecture (P2.1)**: device-agnostic input layer + adapter health
- **Virtual Input Simulator (P2.2)**: stress test + replay testing (DEV-only via Inspector)

### Workspace Adaptive Layout v10.2

Refined ManagementMode adaptive layout for **suite-class desktop experience**:

- **Resizable Panels**: Persisted split layouts for ProjectionMode, Dashboard, ManagementMode via Zustand + localStorage
- **Adaptive Density**: Container-query based responsiveness for width and height compression
- **Nested Scroll Harmony**: `overscroll-behavior: contain` prevents scroll chaining between inspector body and lyrics preview
- **Adaptive Max-Height**: Height-based container queries for lyrics preview (340px → 200px → 120px)
- **Scroll Shadows**: JS-detected `has-scroll` class toggles gradient shadows for edge awareness
- **Sticky Inspector Zones**: Header stays fixed with backdrop blur during scroll
- **Overflow Resilience**: Truncation, line-clamp, and typography compression under pressure
- **Resize Stress Stability**: `scrollbar-gutter: stable`, `contain: layout style`, `translateZ(0)` for smooth resize

### TitleBar Modernization v9

TitleBar kini memiliki estetika premium dengan sistem Glassmorphism 2.0:

- **Global Dropdown Style**: Blur 16px, border radius 12px, dan shadow-xl yang konsisten di semua menu (File, Edit, Mode Switcher).
- **Mode Switcher Enhancements**: Mikro-animasi pada pemicu, indikator aktif berupa pendaran (glow), dan skema warna yang lebih berani.
- **Performance**: Pembersihan z-index redundan dan optimalisasi transisi CSS.

### Library Perfection v8

Audit 360 derajat dan refaktorisasi pada Library Mode untuk standar produksi:

- **Action Affordance**: Tombol aksi (Favorite, Playlist, dll) kini memiliki opacity 20% saat idle dan 100% saat hover, menghilangkan re-render tiba-tiba.
- **Zebra Striping**: List view di `LibraryTitleView` kini memiliki baris selang-seling untuk meningkatkan scanability.
- **Grid Consistency**: Standarisasi toolbar height (56px) dan padding berbasis 4px grid.
- **Type Safety**: Pembersihan unused variables dan peningkatan keamanan data `Song`.

### Library Immersive Player v6

Library Mode kini menggunakan **full-width immersive lyrics overlay** menggantikan split-pane layout sebelumnya:

- Klik lagu -> langsung masuk ke viewer full-screen overlay dengan animasi smooth.
- **Stanza-based pagination**: 1 bait per layar dengan vertical dot navigation.
- **Keyboard navigation**: Escape (close), Arrow/Page keys (navigasi bait), Space (play/pause auto-scroll).
- **Responsive typography**: Slider font 14-48px, persist ke localStorage.
- **Glassmorphism design**: Background blur, dynamic gradient overlay.

### Song Number Normalization (Migration v9)

Nomor lagu dinormalisasi agar **tidak menampilkan leading zeros**:

- `001` -> `1`, `010` -> `10`, `001A` -> `1A`
- Migrasi DB v9 mengupdate semua nomor di database.
- Write-path normalization di `addSong/updateSong` mencegah regresi.
- UI tolerance untuk data lama yang mungkin masih memiliki leading zeros.
- FTS5 search konsisten dengan nomor yang dinormalisasi.

### Bug Fixes

- **Scroll jump fix**: Klik nomor lagu tidak lagi menyebabkan scroll melompat.
- **Lint fixes**: React hooks set-state-in-effect errors resolved.
- **Hook dependency**: ResizeObserver untuk grid width calculation.

### Verifikasi

- `npm run typecheck`: ✅
- `npm run lint`: ✅ (0 errors, 0 warnings)
- `npm run build`: ✅

Dokumen yang perlu dirujuk untuk perubahan ini:

- `04-implementation/12-log-impl-library-immersive-player-v6.md`
- `04-implementation/13-log-impl-library-perfection-v8.md`
- `04-implementation/19-log-impl-titlebar-modernization-v9.md`
- `04-implementation/24-log-impl-workspace-adaptive-v10.2.md`
- `02-planning/11-plan-library-immersive-player-v6.md`
- `02-planning/10-audit-library-perfection-v8.md`
- `02-planning/18-plan-titlebar-modernization-v9.md`
- `02-planning/20-plan-song-number-normalization.md`
- `01-architecture/03-arch-workspace-panels.md`

---

## Historical Snapshot (2026-05-08)

Perombakan renderer terbaru mendorong SION Presenter lebih dekat ke model operasi broadcast console untuk ibadah live.

- Dashboard sekarang memakai layout top-bottom split: monitor PREVIEW/PROGRAM di atas, mixer bar di tengah, song library dan playlist di bawah.
- Workflow live sekarang eksplisit `CUE/PREVIEW -> TAKE -> PROGRAM`. Memilih lagu dari library atau playlist hanya mengubah cue, bukan output jemaat.
- `useProjectionStore` memisahkan `slides` untuk cue deck dan `programSlides`/`programSlide` untuk live deck, sehingga navigasi live tetap stabil saat operator mengganti cue lain.
- Monitor PREVIEW dan PROGRAM memakai rasio 40/60 dengan simulasi confidence monitor 16:9, badge `LIRIK KOSONG`, dan warning monitor tunggal.
- `ControlBar` berubah menjadi switcher-style transport bar dengan tombol **TAKE** dominan, fade selector, live navigation, black, freeze, dan clear.
- Song Library dan Playlist sudah lebih padat dengan zebra striping, metadata `LS`, judul Indonesia/Inggris, nada dasar, tempo, dan action affordance 20% idle / 100% hover.
- Custom Title Bar tetap menjadi command center desktop dan kini juga menampilkan badge merah saat proyektor eksternal tidak terdeteksi.
- Dev startup menambahkan pembersihan cache Chromium khusus mode development untuk mengurangi error `disk_cache` saat menjalankan `npm run dev`.

Dokumen yang perlu dirujuk untuk perubahan ini:

- `06-history/01-log-update-20260507.md`
- `03-design/design-reports/01-ui-ux-audit.md`
- `02-planning/16-plan-feature-titlebar.md`
- `02-planning/15-plan-feature-songsion.md`
- `04-implementation/02-impl-history-v2.md`
