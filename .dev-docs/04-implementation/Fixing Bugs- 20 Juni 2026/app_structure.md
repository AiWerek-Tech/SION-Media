# Struktur Direktori SION Media Desktop

Dokumen ini menjelaskan struktur direktori komprehensif dari **SION Media Desktop** (Professional Worship Presentation System). Proyek ini dibangun di atas **Electron + React + TypeScript** dengan bundler **electron-vite**.

Arsitektur aplikasi dibagi secara modular untuk memfasilitasi skalabilitas, keamanan (_Context Isolation_), performa tinggi (_Better-SQLite3_), dan alur kerja _Live Presentation_ (CUE → TAKE → PROGRAM) yang deterministik.

---

## 📂 Struktur Folder Tingkat Tinggi (Root)

Berikut adalah struktur root dari proyek `sion-media-desktop`:

```
sion-media-desktop/
├── .dev-docs/                    # 📚 Dokumentasi lengkap arsitektur, desain, & roadmap
├── .vscode/                  # ⚙️ Konfigurasi workspace VS Code
├── build/                    # 📦 Aset build ikon aplikasi untuk berbagai OS
├── dist/                     # 📤 Hasil bundling final untuk distribusi (.exe, .dmg, dll)
├── node_modules/             # 🛠️ Dependencies proyek
├── out/                      # ⚡ Hasil compile sementara dari proses build dev
├── resources/                # 🎨 Aset statis bawaan aplikasi (ikon, default backgrounds, dll)
├── scripts/                  # 📜 Script penunjang pengembangan & CI/CD
├── src/                      # 💻 Source code utama (Main, Preload, Shared, Renderer)
│   ├── main/                 # 🖥️ Electron Main Process (System-level & Database)
│   ├── preload/              # 🔗 Secure IPC Bridge (Context Isolation)
│   ├── shared/               # 🤝 Model tipe data & konstanta IPC yang dipakai bersama
│   └── renderer/             # 🎨 React Frontend (UI, State, Engine Presentasi)
├── electron-builder.yml      # 📦 Konfigurasi packaging produksi (NSIS installer)
├── electron.vite.config.ts   # ⚡ Konfigurasi bundler Vite untuk Electron
├── eslint.config.mjs         # 🔍 Konfigurasi linting kode
├── package.json              # 📄 Manifest proyek & dependencies
├── tsconfig.json             # ⚙️ Konfigurasi dasar TypeScript
└── vitest.config.ts          # 🧪 Konfigurasi unit/integration testing
```

---

## 🖥️ 1. Main Process (`src/main/`)

Main Process berjalan di lingkungan Node.js penuh dan bertanggung jawab untuk interaksi level OS, manajemen database, dan daur hidup _window_.

```
src/main/
├── services/
│   └── excel/
│       └── index.ts          # Layanan import/export lagu dari/ke file Excel (.xlsx)
├── database.ts               # Inisialisasi SQLite (Better-SQLite3) dengan mode WAL & FTS5
├── debug-report.ts           # Diagnostik sistem & log status crash untuk developer
├── display-monitor.ts        # Deteksi & kalkulasi posisi monitor fisik (Dual/Triple Monitor)
├── index.ts                  # Entry point utama Electron, menangani boot & lifecycle
├── ipc-handlers.ts           # Registrasi listener IPC untuk memproses request dari UI
├── ipc-health.ts             # Health check & monitor beban resource sistem
├── migrations.ts             # Skema migrasi database SQL (17+ migrasi struktur data)
├── safe-mode.ts              # Deteksi crash-loop & pertolongan pertama (safe mode boot)
├── seed-data.ts              # Seeding awal 525+ Lagu Sion & metadata default
├── theme-manager.ts          # Sinkronisasi warna & visual sistem dengan tema OS
└── windows.ts                # Manajemen pembuatan & posisi multi-window (Console, Projector, Stage Display)
```

---

## 🔗 2. Preload Script (`src/preload/`)

Bertindak sebagai jembatan (_bridge_) yang aman antara Main Process (Node.js) dan Renderer Process (Chrome Browser). Menjaga keamanan aplikasi dengan menerapkan _Context Isolation_ tanpa membocorkan API Node.js langsung ke frontend.

```
src/preload/
├── index.d.ts                # Deklarasi tipe TypeScript global untuk `window.api`
└── index.ts                  # Expose fungsi API aman ke UI menggunakan `contextBridge.revealInMainWorld`
```

---

## 🤝 3. Shared Layer (`src/shared/`)

Berisi kode modular yang diimpor baik oleh Main Process maupun Renderer Process guna menjaga konsistensi tipe data dan kanal komunikasi.

```
src/shared/
├── contracts/                # Tempat kontrak komunikasi terstruktur (bila ada)
├── errors/                   # Class error kustom untuk standarisasi penanganan error
├── ipc-channels.ts           # Deklarasi konstanta string channel komunikasi IPC
└── types.ts                  # Interface TypeScript untuk entitas Database (Songs, Playlist, settings, dll)
```

---

## 🎨 4. Renderer Process (`src/renderer/`)

Berisi aplikasi web React.js yang berjalan di dalam window Electron. Ini adalah bagian antarmuka (UI) yang dioperasikan oleh pengguna.

### 🌐 Entry HTML (`src/renderer/`)

Aplikasi ini memiliki arsitektur multi-window, sehingga memiliki beberapa file HTML entry point:

- `index.html`: Kontrol konsol operator utama (Dashboard & Mode Proyeksi).
- `projection.html`: Output proyeksi _full screen_ yang ditujukan untuk layar proyektor ibadah.
- `stageDisplay.html`: Monitor kepercayaan (_confidence monitor_) untuk pemusik/pembicara di panggung.
- `splash.html`: Layar pembuka (_startup loading screen_) saat aplikasi pertama kali dimuat.

---

### 📂 Struktur React Source (`src/renderer/src/`)

```
src/renderer/src/
├── app/                      # Bootstrap aplikasi, router utama, & global providers
│   ├── providers/            # StoreProvider (Zustand Context)
│   └── router/               # mainRouter.ts (Definisi navigasi Console & Projector)
│
├── core/                     # Jantung sistem operasional & logika deterministik
│   ├── projection/           # Engine Proyeksi: State machine, DEOS invariant checking, & slide engine
│   ├── runtime/              # Command Bus, typed events, runtime simulator, & event emitter
│   └── timing/               # Placeholder sistem timing / metronome / countdown
│
├── features/                 # Fitur bisnis mandiri yang modular
│   ├── bible/                # Modul pencarian ayat & presentasi Alkitab
│   ├── broadcast/            # Modul output broadcast (obs, transparent overlay)
│   ├── dashboard/            # Halaman awal pemilih mode & navigasi utama
│   ├── library/              # Browser lagu, pencarian FTS5, & navigasi slide lirik
│   ├── management/           # CRUD lagu, backup restore database, & status sistem
│   ├── playlist/             # Manajemen antrean lagu (Playlist) dengan drag & drop
│   ├── projection/           # Tampilan operator utama (Live Preview, CUE, PROGRAM decks)
│   └── stage-display/        # Tampilan khusus pemusik (chord lirik, timer, next slide preview)
│
├── infrastructure/           # Adapter penghubung UI ke sistem luar (IPC, Cache, SQLite, Excel)
│   ├── cache/                # Cache manajemen lokal untuk optimasi render background
│   ├── database/             # Adapter query database lokal via IPC
│   ├── electron/             # File IPC communication handler level frontend
│   └── excel/                # Adapter konversi file excel menjadi dataset lagu
│
├── store/                    # Zustand Store yang didekomposisi berdasarkan modulnya
│   ├── useAppStore.ts        # State global aplikasi & deteksi status online
│   ├── useProjectionStore.ts # State deck CUE dan PROGRAM proyeksi (Sangat krusial)
│   ├── usePlaylistStore.ts   # State daftar lagu aktif (Persisted lokal)
│   ├── useHymnalStore.ts     # State buku nyanyian aktif
│   ├── useSongStore.ts       # State detail lagu yang sedang dipilih
│   ├── useModalStore.ts      # Pengendali tumpukan modal/dialog (Zero window.confirm)
│   └── ... (store penunjang lainnya: display, health, atmosphere, notification)
│
├── components/               # Komponen UI reusable & Design System
│   ├── design-system/        # 27+ Komponen primitif atomik (Button, Badge, Select, ResizablePanels, dll)
│   ├── modals/               # 14+ modal terintegrasi (Dialog edit, crash recovery, settings, dll)
│   ├── titlebar/             # Custom window title bar bergaya glassmorphism dengan Mode Switcher
│   ├── RuntimeInspector.tsx  # Panel diagnostik internal (Event trace, health monitor, virtual input)
│   ├── LivePreviewPanel.tsx  # Layar preview visual apa yang sedang aktif di proyektor
│   └── ... (komponen layouting Console lainnya)
│
├── screens/                  # Halaman utama level tinggi yang dimuat oleh router
│   ├── modes/                # Layar khusus mode aktif (LibraryMode, ProjectionMode, ManagementMode)
│   ├── settings/             # Pusat kontrol pengaturan (Display, Theme, Background, Backup, Shortcuts)
│   ├── Dashboard.tsx         # Dashboard hub navigasi mode
│   ├── WelcomeScreen.tsx     # Layar awal saat aplikasi baru dipasang
│   └── SongEditorScreen.tsx  # Editor komprehensif lirik lagu & metadata relations
│
├── hooks/                    # Custom React hooks (keyboard shortcuts, resize, dll)
├── i18n/                     # Konfigurasi lokalisasi multibahasa (English & Indonesia)
├── utils/                    # Helper utility functions murni
└── assets/                   # File gambar lokal, logo, & motion backgrounds
```

---

## 📈 Alur Aliran Data (Data Flow)

Struktur di atas mendukung alur aliran data satu arah yang aman:

1.  **UI Event / Keyboard Shortcut**: Pengguna berinteraksi dengan React Component di `src/renderer/src/screens/modes/ProjectionMode.tsx`.
2.  **Runtime Command Bus**: Event diteruskan menjadi _Command_ terenkapsulasi di `src/renderer/src/core/runtime/command-bus.ts`.
3.  **State Transition**: Command memicu perubahan state proyeksi di `useProjectionStore.ts` melalui _Projection Engine_ (`src/renderer/src/core/projection/`).
4.  **IPC Sync**: State yang diperbarui dikirimkan ke Main Process via _Preload Bridge_ (`src/preload/index.ts`).
5.  **Multi-Window Dispatch**: Main Process (`src/main/windows.ts`) menerima update via `ipc-handlers.ts` dan memancarkan data baru tersebut ke Proyektor Window (`projection.html`) dan Stage Display Window (`stageDisplay.html`).
